/**
 * Daily-brief graph — thinnest slice.
 *
 * A linear LangGraph StateGraph (v1): retrieve → assemble → validate.
 * No verify-loop, no HITL, no streaming (those are other nodes/later).
 *
 *   retrieve  — pull the RBA cash rate as a sourced Fact (data-sources.ts).
 *   assemble  — build a MorningBrief object. The model writes NO numbers:
 *               the figure's value comes straight from the retrieved Fact,
 *               mapped into the Figure's retrieved-provenance branch.
 *   validate  — run the object through validateOutput() and return the result.
 *
 * The trust-spine rule (schemas.ts) is why this shape exists: a number in an
 * output must cite a source (retrieved) or a calcKey (computed), never be
 * model-guessed. A retrieved cash rate takes the `source` branch, no calcKey.
 */
import { z } from "zod";
import { StateSchema, StateGraph, START, END } from "@langchain/langgraph";
import {
  auCashRate,
  auFxRate,
  absSeries,
  treasuryYield,
  eiaOil,
  type Fact,
} from "@/lib/data-sources";
import { validateOutput } from "@/lib/everlin/validate";
import { DISCLAIMER, type MorningBrief } from "@/lib/everlin/schemas";

/**
 * Graph state. `facts` is the full retrieved macro set (populated by retrieve);
 * `brief` by assemble; `ok`/`errors` by validate.
 */
const BriefState = new StateSchema({
  asOfDate: z.string(),
  facts: z.array(z.custom<Fact>()).default(() => []),
  brief: z.unknown().nullable().default(null),
  ok: z.boolean().default(false),
  errors: z.array(z.string()).default(() => []),
});

// Licensed-IP figures that have NO free, commercially-usable official source
// (verified in docs/research/full-brief-data-sources.md). We surface them as
// explicit not-obtained rows rather than fabricate or scrape — the trust-spine
// rule. This keeps the dashboard honest about its coverage boundary.
const LICENSED_GAPS: { label: string; note: string }[] = [
  { label: "S&P/ASX 200 index", note: "Licensed index IP (S&P DJI/ASX) — no free commercial source. Not obtained." },
  { label: "S&P 500 / Nasdaq / Dow", note: "Licensed index IP (S&P DJI) — reproduction requires a licence. Not obtained." },
  { label: "VIX", note: "CBOE-copyrighted — no free commercial source. Not obtained." },
  { label: "Gold (LBMA)", note: "ICE-administered licensed benchmark — no free commercial source. Not obtained." },
];

/**
 * retrieve: pull the full free/official macro set in parallel. Each is a sourced
 * Fact or a clean not-obtained; nothing here can throw the graph.
 */
async function retrieve() {
  const [cashRate, fx, cpi, gdp, treasury, brent] = await Promise.all([
    auCashRate(),
    auFxRate(),
    absSeries("CPI"),
    absSeries("GDP"),
    treasuryYield(),
    eiaOil("brent"),
  ]);
  return { facts: [cashRate, fx, cpi, gdp, treasury, brent] };
}

/**
 * assemble: build the macro-dashboard MorningBrief from the retrieved Facts.
 * The model writes NO numbers — every figure value is a Fact value verbatim,
 * and the licensed gaps are explicit not-obtained rows.
 */
function assemble(state: typeof BriefState.State) {
  const asOf = state.asOfDate;
  const facts = state.facts;
  const byLabelHas = (frag: string) =>
    facts.find((f) => f.label.toLowerCase().includes(frag) && f.value !== null);
  const cash = byLabelHas("cash rate");

  const figures = [
    ...facts.map(factToFigure),
    ...LICENSED_GAPS.map(
      (g): MorningBrief["figures"][number] => ({
        label: g.label,
        value: null,
        unit: "",
        calcKey: null,
        source: null,
        sourceUrl: null,
        asOf: null,
        missing: true,
        note: g.note,
      }),
    ),
  ];

  const obtained = facts.filter((f) => f.value !== null).length;
  const cashDisplay = cash ? `${cash.value}${cash.unit ? ` ${cash.unit}` : ""}` : "not obtained";

  const brief: MorningBrief = {
    envelope: {
      docId: `EVL-DAILY-${asOf}`,
      band: "Red",
      status: "Draft for review — verify all facts before use",
      classificationLabel: "Internal",
      preparedBy: null,
    },
    asOf,
    executiveSummary:
      `Macro dashboard as of ${asOf}. RBA cash rate ${cashDisplay}. ` +
      `${obtained} of ${facts.length} free/official series obtained; index, equity, VIX and gold ` +
      `figures require a licensed data source and are marked not obtained.`,
    figures,
    claims: [],
    sections: [],
    escalations: [],
    questionForIC:
      "Given the current RBA cash rate and the flat/softening macro reads, does the IC want to revisit " +
      "the cash and duration allocation before the next meeting?",
    disclaimer: DISCLAIMER,
  };

  return { brief };
}

/** Map a retrieved Fact into a Figure via the retrieved-provenance branch. */
function factToFigure(fact: Fact | null): MorningBrief["figures"][number] {
  if (!fact || fact.value === null || typeof fact.value !== "number") {
    return {
      label: fact?.label ?? "figure",
      value: null,
      unit: fact?.unit ?? "",
      calcKey: null,
      source: null,
      sourceUrl: null,
      asOf: null,
      missing: true,
      note: fact?.note ?? "Not obtained.",
    };
  }
  return {
    label: fact.label,
    value: fact.value,
    unit: fact.unit ?? "",
    calcKey: null,
    source: fact.source,
    sourceUrl: fact.sourceUrl ?? null,
    asOf: fact.asOf ?? null,
    missing: false,
    note: fact.note ?? "",
  };
}

/** validate: gate the assembled brief through the skill schema + text lint. */
function validate(state: typeof BriefState.State) {
  const brief = state.brief as MorningBrief;
  const result = validateOutput("everlin-morning-brief", brief, brief.executiveSummary);
  if (result.ok) {
    return { ok: true, brief: result.data, errors: [] };
  }
  return { ok: false, errors: [...result.errors, ...result.lint] };
}

const compiled = new StateGraph(BriefState)
  .addNode("retrieve", retrieve)
  .addNode("assemble", assemble)
  .addNode("validate", validate)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "assemble")
  .addEdge("assemble", "validate")
  .addEdge("validate", END)
  .compile();

/**
 * Build a daily brief for the given as-of date (YYYY-MM-DD).
 * Returns { ok, brief?, errors? } — never throws for a validation failure.
 */
export async function buildDailyBrief(
  asOfDate: string,
): Promise<{ ok: boolean; brief?: unknown; errors?: string[] }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
    return { ok: false, errors: [`asOfDate must be YYYY-MM-DD, got '${asOfDate}'`] };
  }
  const final = await compiled.invoke({ asOfDate });
  if (final.ok) {
    return { ok: true, brief: final.brief };
  }
  return { ok: false, errors: final.errors, brief: final.brief ?? undefined };
}
