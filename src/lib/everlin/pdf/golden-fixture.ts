/**
 * T09 — frozen render fixture: a fixed MorningBrief (figures + reasoning) that
 * stands in for a fully-populated golden edition. It uses the SAME figure labels,
 * sources, and section structure the live pipeline emits, with values transcribed
 * from the golden (Everlin_Morning_Brief_07-09-2026) so the fidelity harness (T13)
 * has a stable, offline input — no network, no clock — to assert determinism and
 * golden-fidelity against.
 */
import type { MorningBrief } from "@/lib/everlin/schemas";
import { DISCLAIMER } from "@/lib/everlin/schemas";

export const GOLDEN_FIXTURE: MorningBrief = {
  envelope: {
    docId: "EVL-DAILY-2026-09-07",
    band: "Red",
    status: "Draft for review — verify all facts before use",
    classificationLabel: "Internal",
    preparedBy: null,
  },
  asOf: "2026-09-07",
  executiveSummary:
    "Macro dashboard as of 2026-09-07. RBA cash rate 4.35 % p.a. 3 of 4 free/official series obtained; " +
    "index, equity, VIX and gold figures require a licensed data source and are marked not obtained.",
  figures: [
    { label: "RBA cash rate target", value: 4.35, unit: "% p.a.", calcKey: null, source: "RBA — Table F1 (Cash Rate Target)", sourceUrl: "https://rba.gov.au", asOf: "2026-09-07", missing: false, note: "held 11/08, unanimous" },
    { label: "AUD/USD exchange rate", value: 0.721, unit: "USD per AUD", calcKey: null, source: "RBA — Table F11.1 (Exchange Rates)", sourceUrl: "https://rba.gov.au", asOf: "2026-09-04", missing: false, note: "official 4pm" },
    { label: "ABS CPI (All groups, index, Australia)", value: 102.31, unit: "index", calcKey: null, source: "Australian Bureau of Statistics (CC BY 4.0)", sourceUrl: "https://abs.gov.au", asOf: "2026-Q2", missing: false, note: "" },
    { label: "S&P/ASX 200 index", value: null, unit: "", calcKey: null, source: null, sourceUrl: null, asOf: null, missing: true, note: "Licensed index IP (S&P DJI/ASX) — no free commercial source. Not obtained." },
    { label: "VIX", value: null, unit: "", calcKey: null, source: null, sourceUrl: null, asOf: null, missing: true, note: "CBOE-copyrighted — no free commercial source. Not obtained." },
  ],
  claims: [],
  sections: [
    {
      section: "the-one-thing",
      facts: [{ text: "August payrolls grew 162,000 vs 55,000 consensus", source: "BLS", assertion: false }],
      interpretation: "The rate-path narrative can whipsaw on a single data point; treat the volatility in the odds as the durable signal.",
    },
    {
      section: "australia",
      facts: [{ text: "ASX 200 closed down ~0.16% at ~9,005.9, triple-confirmed", source: "Investing.com", assertion: false }],
      interpretation: "The local market is trading primarily on RBA rate-hike risk rather than the underlying strength of the data.",
    },
  ],
  escalations: [],
  questionForIC:
    "With September Fed hike odds swinging from a coin-toss to ~65% within 48 hours and the VIX in one of its calmest stretches, does the IC read this as low near-term risk or complacency?",
  disclaimer: DISCLAIMER,
};
