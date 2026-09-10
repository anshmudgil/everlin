/**
 * T16 — headless brief pipeline entry.
 *
 * buildDailyBriefHeadless(asOf) runs the full flow with no chat UI: retrieve
 * (RBA/ABS/Treasury/EIA + FX backup) -> build reasoning sections -> assemble a
 * MorningBrief carrying figures + sections -> validate -> render the
 * deterministic PDF -> persist to the BriefStore (idempotent by date). The cron
 * (T18) and the sync PDF route call this. Returns the stored artifact + hash so
 * callers can dedupe/deliver.
 *
 * Determinism: the render is byte-stable (T08). Retrieval is live data, so two
 * runs on the same day with the same upstream data produce the same brief; the
 * store's has(date) makes a same-day re-run idempotent.
 */
import {
  auCashRate,
  auFxRateWithBackup,
  absSeries,
  treasuryYield,
  eiaOil,
  type Fact,
} from "@/lib/data-sources";
import { buildReasoning } from "@/lib/everlin/reasoning";
import { renderBriefPdf } from "@/lib/everlin/pdf/render";
import { validateOutput } from "@/lib/everlin/validate";
import { DISCLAIMER, MorningBrief } from "@/lib/everlin/schemas";
import { getBriefStore, type BriefStore } from "@/lib/everlin/pipeline/store";

const LICENSED_GAPS: { label: string; note: string }[] = [
  { label: "S&P/ASX 200 index", note: "Licensed index IP (S&P DJI/ASX) — no free commercial source. Not obtained." },
  { label: "S&P 500 / Nasdaq / Dow", note: "Licensed index IP (S&P DJI) — reproduction requires a licence. Not obtained." },
  { label: "VIX", note: "CBOE-copyrighted — no free commercial source. Not obtained." },
  { label: "Gold (LBMA)", note: "ICE-administered licensed benchmark — no free commercial source. Not obtained." },
];

function factToFigure(f: Fact): MorningBrief["figures"][number] {
  // A finite number renders as an obtained figure. Anything else — null, a
  // non-finite number, or a string value the numeric Figure schema can't hold —
  // degrades GRACEFULLY to a marked not-obtained row, so one bad upstream cell
  // never fabricates a value AND never hard-fails the whole day's brief.
  if (typeof f.value === "number" && Number.isFinite(f.value)) {
    return { label: f.label, value: f.value, unit: f.unit ?? "", calcKey: null, source: f.source, sourceUrl: f.sourceUrl ?? null, asOf: f.asOf ?? null, missing: false, note: f.note ?? "" };
  }
  const note =
    typeof f.value === "string"
      ? `${f.label}: '${f.value}' is non-numeric; the brief's Figure column holds numbers only. Not obtained here.`
      : f.note ?? "Not obtained.";
  return { label: f.label, value: null, unit: f.unit ?? "", calcKey: null, source: null, sourceUrl: null, asOf: null, missing: true, note };
}

export type HeadlessResult =
  | { ok: true; date: string; byteHash: string; bytes: number; deduped: boolean; pdf: Buffer }
  | { ok: false; date: string; errors: string[] };

export async function buildDailyBriefHeadless(
  asOf: string,
  opts: { store?: BriefStore; force?: boolean; nowIso: string } = { nowIso: "1970-01-01T00:00:00Z" },
): Promise<HeadlessResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return { ok: false, date: asOf, errors: [`asOf must be YYYY-MM-DD, got '${asOf}'`] };
  }
  const store = opts.store ?? getBriefStore();

  // Idempotency: one brief per trading day unless forced.
  if (!opts.force && (await store.has(asOf))) {
    const existing = await store.get(asOf);
    if (existing) {
      return { ok: true, date: asOf, byteHash: existing.byteHash, bytes: existing.pdf.length, deduped: true, pdf: existing.pdf };
    }
    // has() true but get() failed — fall through and rebuild rather than return an
    // empty/hashless result.
  }

  // Retrieve the free/official macro set (FX uses the RBA->ECB backup chain).
  const [cash, fx, cpi, gdp, treasury, brent] = await Promise.all([
    auCashRate(),
    auFxRateWithBackup(),
    absSeries("CPI"),
    absSeries("GDP"),
    treasuryYield(),
    eiaOil("brent"),
  ]);
  const facts = [cash, fx, cpi, gdp, treasury, brent];

  const figures = [
    ...facts.map(factToFigure),
    ...LICENSED_GAPS.map((g): MorningBrief["figures"][number] => ({
      label: g.label, value: null, unit: "", calcKey: null, source: null, sourceUrl: null, asOf: null, missing: true, note: g.note,
    })),
  ];
  const sections = buildReasoning(facts);
  const obtained = facts.filter((f) => f.value !== null).length;
  const cashDisplay = cash.value !== null ? `${cash.value}${cash.unit ? ` ${cash.unit}` : ""}` : "not obtained";

  const draft = {
    envelope: { docId: `EVL-DAILY-${asOf}`, band: "Red" as const, status: "Draft for review — verify all facts before use", classificationLabel: "Internal", preparedBy: null },
    asOf,
    executiveSummary:
      `Macro dashboard as of ${asOf}. RBA cash rate ${cashDisplay}. ${obtained} of ${facts.length} ` +
      `free/official series obtained; index, equity, VIX and gold figures require a licensed data source and are marked not obtained.`,
    figures,
    claims: [],
    sections,
    escalations: [],
    questionForIC:
      "Given the current RBA cash rate and the macro reads, does the IC want to revisit the cash and duration allocation before the next meeting?",
    disclaimer: DISCLAIMER,
  };

  const gate = validateOutput("everlin-morning-brief", draft, draft.executiveSummary);
  if (!gate.ok) {
    return { ok: false, date: asOf, errors: [...(gate.errors ?? []), ...(gate.lint ?? [])] };
  }
  const parsed = MorningBrief.safeParse(gate.data ?? draft);
  if (!parsed.success) {
    return { ok: false, date: asOf, errors: parsed.error.issues.map((i) => i.message) };
  }

  const rendered = await renderBriefPdf(parsed.data);
  await store.put({ date: asOf, briefJson: parsed.data, pdf: rendered.pdf, byteHash: rendered.byteHash, generatedAt: opts.nowIso });

  return { ok: true, date: asOf, byteHash: rendered.byteHash, bytes: rendered.bytes, deduped: false, pdf: rendered.pdf };
}
