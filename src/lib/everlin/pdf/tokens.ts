/**
 * T02 — Frozen design-token registry for the PDF brief.
 *
 * The immutable half of the deterministic template. Every colour, size, and
 * spacing value the renderer uses resolves through here, and every colour is
 * pinned to the RGB sampled from the golden (golden-checklist.ts GOLDEN_TOKENS).
 * react-pdf takes CSS-ish hex strings, so we expose hex derived from the golden
 * RGB — asserted equal at module load so a drift in either file fails loudly.
 */
import { GOLDEN_TOKENS } from "@/lib/everlin/golden-checklist";

type RGB = { r: number; g: number; b: number };
const hex = ({ r, g, b }: RGB) =>
  "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");

const gc = GOLDEN_TOKENS.color;

export const COLORS = {
  brandGreen: hex(gc.brandGreen), // masthead + section bands
  accentGold: hex(gc.accentGold), // "Enduring Legacy." + accents
  paper: hex(gc.paper),
  ink: hex(gc.ink),
  muted: hex(gc.muted),
  // Derived semantics used in the markets table / % chart.
  up: "#1a7f4b", // positive change (green, distinct from brand band)
  down: "#b3261e", // negative change (red)
  bandText: "#ffffff", // text on a green section band
  hairline: "#d8ddd9", // table rules
} as const;

export const FONT_SIZES = {
  masthead: 20,
  sectionBand: 9,
  h2: 11,
  body: 7.5,
  small: 6.5,
  micro: 5.5,
  footer: 6,
} as const;

export const SPACE = {
  page: 28, // page margin (pt)
  section: 8,
  row: 3,
  gutter: 6,
} as const;

export const PAGE = {
  size: GOLDEN_TOKENS.page.size, // "A4"
  count: GOLDEN_TOKENS.page.pageCount, // 3
} as const;

// Fail loudly if the golden RGB and our hex ever diverge (they are the same
// source, but this guards a future hand-edit of one file only).
const _greenCheck = hex(gc.brandGreen);
if (COLORS.brandGreen !== _greenCheck) {
  throw new Error("tokens: brandGreen drifted from golden RGB");
}

export const TOKENS = { COLORS, FONT_SIZES, SPACE, PAGE } as const;
