/**
 * Golden fidelity checklist — the machine-readable contract for "identical to
 * the client brief". Every value here is transcribed VERBATIM from the client
 * reference PDF (tests/fixtures/golden/golden-morning-brief.pdf,
 * Everlin_Morning_Brief_07-09-2026). This module is the single source of truth
 * for the fidelity eval (golden-diff): the renderer must reproduce these
 * sections, this instrument list, this footer, this vernacular and these
 * design tokens. Nothing here is generated or inferred — if the golden changes,
 * re-transcribe from the new reference and bump GOLDEN_REF.
 */

export const GOLDEN_REF = "Everlin_Morning_Brief_07-09-2026" as const;

/**
 * Ordered section identifiers as they appear top-to-bottom in the golden.
 * The rendered PDF must emit these sections in this order.
 */
export const GOLDEN_SECTIONS = [
  "masthead", // "EVERLIN MORNING BRIEF" + italic gold "Enduring Legacy."
  "coverage-line", // "Monday DD/MM/YYYY | Covering close ... | IC distribution — do not forward"
  "retrieval-provenance", // retrieval window + confirmed/backfilled + ~ convention + "unitless"
  "headline-stack", // em-dash separated market-narrative clauses
  "markets-at-a-glance", // 10-instrument level+%change strip
  "pct-change-chart", // horizontal bar "% CHANGE"
  "markets-table", // Equities + Thursday-backfill sub-band + FX
  "retrieval-failures", // "RETRIEVAL FAILURES & SOURCE CONFLICTS"
  "the-one-thing", // "THE FACTS." + "THE INTERPRETATION."
  "world-and-macro", // key-figure line + Rates/Middle East/Corporate/Asia
  "australia", // key-figure line + body + "INTERPRETATION."
  "taiwan", // body
  "portfolio-watch", // per-holding: Gold, SpaceX, TSMC, Crypto
  "todays-fact", // one punchy paragraph
  "one-question-for-ic", // boxed
  "sources", // PRIMARY / ATTRIBUTED NEWS / NOT OBTAINED THIS RUN
] as const;
export type GoldenSection = (typeof GOLDEN_SECTIONS)[number];

/**
 * The exact 10 instruments in the "Markets at a glance" strip, in order.
 * The renderer must show exactly these, exactly this many, this order.
 */
export const GOLDEN_INSTRUMENTS = [
  "ASX 200",
  "S&P 500",
  "NASDAQ",
  "TAIEX",
  "AUD/USD",
  "USD/TWD",
  "BRENT OIL",
  "GOLD",
  "VIX",
  "BITCOIN",
] as const;
export type GoldenInstrument = (typeof GOLDEN_INSTRUMENTS)[number];

/**
 * The footer, verbatim, printed on every page (page number appended per page).
 * The disclaimer half must match the DISCLAIMER contract in schemas.ts intent.
 */
export const GOLDEN_FOOTER =
  "Internal — Investment Committee only. Every figure sourced; unobtained figures marked and not estimated. Not financial product advice." as const;

/**
 * Vernacular phrases that signal the Everlin house voice. The fidelity lint
 * asserts the rendered brief's vocabulary is drawn from this register (a
 * fabricated or off-brand brief would miss them). Each is transcribed from the
 * golden. Not every phrase appears in every edition — the lint checks that the
 * CONVENTIONS (markers below) hold and that the voice register is present, not
 * that all phrases appear.
 */
export const GOLDEN_VERNACULAR = [
  "IC distribution — do not forward",
  "triple-confirmed",
  "not obtained this run",
  "every figure sourced",
  "unobtained figures marked and not estimated",
  "backfilled in full",
  "confirmed close",
  "dated morning read",
  "derived from the RBA's own table",
  "every directional estimate states its sourcing basis",
] as const;

/**
 * Typographic conventions that MUST hold in any rendered edition:
 *  - UNCONFIRMED_MARKER precedes any figure that is not a confirmed close.
 *  - SOURCE_BRACKET wraps inline source attributions.
 *  - NOT_OBTAINED is the exact string used for a deliberate gap (never a number).
 */
export const GOLDEN_CONVENTIONS = {
  unconfirmedMarker: "~",
  sourceBracketOpen: "[",
  sourceBracketClose: "]",
  notObtained: "not obtained",
} as const;

/**
 * Design tokens sampled from the golden PDF (green masthead/section bands, gold
 * accent, white page). RGB values are read from the reference; the renderer's
 * token module (T02) must resolve to these. Kept here so the fidelity eval can
 * assert the rendered PDF uses the same palette.
 */
export const GOLDEN_TOKENS = {
  color: {
    // Deep green masthead + section-header bands.
    brandGreen: { r: 26, g: 58, b: 42 },
    // Italic "Enduring Legacy." + accents.
    accentGold: { r: 176, g: 141, b: 87 },
    // Page background.
    paper: { r: 255, g: 255, b: 255 },
    // Body ink.
    ink: { r: 17, g: 24, b: 20 },
    // Muted note/secondary text.
    muted: { r: 90, g: 95, b: 92 },
  },
  page: {
    // A4 portrait, 3 pages in the golden.
    size: "A4" as const,
    pageCount: 3,
  },
  type: {
    // Dense, small type; tabular figures in numeric columns.
    tabularNums: true,
  },
} as const;

export type GoldenTokens = typeof GOLDEN_TOKENS;
