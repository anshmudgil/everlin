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
import { auCashRate, type Fact } from "@/lib/data-sources";
import { validateOutput } from "@/lib/everlin/validate";
import { DISCLAIMER, type MorningBrief } from "@/lib/everlin/schemas";

/**
 * Graph state. `cashRate` is populated by retrieve; `brief` by assemble;
 * `ok`/`errors` by validate. Nullable/optional so partial updates flow.
 */
const BriefState = new StateSchema({
  asOfDate: z.string(),
  cashRate: z.custom<Fact>().nullable().default(null),
  brief: z.unknown().nullable().default(null),
  ok: z.boolean().default(false),
  errors: z.array(z.string()).default(() => []),
});

/** retrieve: fetch the RBA cash rate Fact and stash it in state. */
async function retrieve(state: typeof BriefState.State) {
  const cashRate = await auCashRate();
  return { cashRate };
}

/**
 * assemble: build the MorningBrief from the retrieved Fact.
 * The figure value is the Fact value verbatim — no model-authored numbers.
 */
function assemble(state: typeof BriefState.State) {
  const asOf = state.asOfDate;
  const fact = state.cashRate;
  // Prefer the Fact's own unit for prose; fall back cleanly if not obtained.
  const rateDisplay =
    fact && fact.value !== null ? `${fact.value}${fact.unit ? ` ${fact.unit}` : ""}` : "not obtained";

  const brief: MorningBrief = {
    envelope: {
      docId: `EVL-DAILY-${asOf}`,
      band: "Red",
      status: "Draft for review — verify all facts before use",
      classificationLabel: "Internal",
      preparedBy: null,
    },
    asOf,
    executiveSummary: `As of ${asOf}, the RBA cash rate target is ${rateDisplay}.`,
    figures: [factToFigure(fact)],
    claims: [],
    escalations: [],
    questionForIC:
      "Given the current RBA cash rate, does the IC want to revisit the cash allocation before the next meeting?",
    disclaimer: DISCLAIMER,
  };

  return { brief };
}

/** Map a retrieved Fact into a Figure via the retrieved-provenance branch. */
function factToFigure(fact: Fact | null): MorningBrief["figures"][number] {
  if (!fact || fact.value === null || typeof fact.value !== "number") {
    return {
      label: fact?.label ?? "RBA cash rate target",
      value: null,
      unit: fact?.unit ?? "",
      calcKey: null,
      source: null,
      sourceUrl: null,
      asOf: null,
      missing: true,
      note: fact?.note ?? "Cash rate not obtained.",
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
