/**
 * T03 — Font registry for byte-stable glyphs.
 *
 * Determinism requires that the same input renders the same bytes. Fonts are the
 * usual source of non-determinism: a system-resolved or network-fetched font
 * varies by machine and by fetch. We therefore pin to react-pdf's built-in
 * standard PDF font family (Helvetica), which is one of the PDF-14 base fonts:
 * it needs no external file, no network, and no subsetting step, so it renders
 * identically on every machine. Numeric columns use the same family; react-pdf's
 * Helvetica metrics are fixed, giving stable (if not truly tabular) alignment.
 *
 * UPGRADE PATH: to match the golden's exact typeface, drop a subsetted .ttf into
 * this directory and `Font.register({ family, src })` it here, then flip
 * BODY_FONT. Keep the file committed (not fetched) so bytes stay stable. Until a
 * licensed brand font is provided, Helvetica is the deterministic default.
 */
import { Font } from "@react-pdf/renderer";

export const BODY_FONT = "Helvetica" as const;
export const BODY_FONT_BOLD = "Helvetica-Bold" as const;
export const BODY_FONT_OBLIQUE = "Helvetica-Oblique" as const;

let registered = false;

/**
 * Ensure fonts are registered before rendering. For the built-in Helvetica
 * family this is a no-op (the fonts are always available), but we also disable
 * react-pdf's hyphenation callback, which otherwise introduces layout variance.
 * Idempotent — safe to call before every render.
 */
export function ensureFontsRegistered(): void {
  if (registered) return;
  // Deterministic wrapping: no hyphenation splitting (varies by dictionary).
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
