/**
 * T6 — UntrustedRead. The step that reads external web/news text. Per invariant
 * #13, this node holds NO tools: the text is DATA, never instructions. It
 * proposes a Claim (and optionally a figure), and a post-check REJECTS any
 * figure not literally present in the raw text — the model cannot invent a
 * number here. Attribution is required (outlet + url), else no claim is emitted.
 *
 * This is deliberately not an LLM call in the deterministic core: it is a pure
 * extractor over already-fetched text. When an LLM summariser is added later it
 * must run behind this same post-check, so a fabricated figure can never survive.
 */
import { MAX_HEADLINE } from "@/lib/everlin/news-sources";

export type UntrustedInput = {
  rawText: string;
  outlet: string;
  url: string;
  /** The figure the caller is trying to source, e.g. "S&P/ASX 200 index". */
  target: string;
};

export type UntrustedProposal = {
  claim: { text: string; source: string } | null;
  figure: number | null;
  fabricated: boolean; // true if a candidate figure was NOT found literally in the text
  note: string;
};

/** Numeric values present literally in the text (thousands separators stripped). */
function numericValues(text: string): number[] {
  const raw = text.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [];
  return raw.map((s) => Number(s.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}

const URL_RE = /^https?:\/\/.+/i;

/**
 * Read untrusted text and propose an attributed claim + optional figure.
 * `candidateFigure` is what an upstream extractor (or future LLM) suggests; it is
 * accepted ONLY if it appears literally in rawText.
 */
export function readUntrustedText(input: UntrustedInput, candidateFigure?: number): UntrustedProposal {
  const outlet = (input.outlet ?? "").trim();
  const url = (input.url ?? "").trim();

  // Attribution is mandatory — no unattributed claim survives (#13 + trust-spine).
  if (!outlet || !URL_RE.test(url) || !input.rawText.trim()) {
    return { claim: null, figure: null, fabricated: false, note: "missing attribution or empty text" };
  }

  // Truncate to the redistributable slice (same rule as the news layer).
  const headline = input.rawText.trim().length <= MAX_HEADLINE
    ? input.rawText.trim()
    : input.rawText.trim().slice(0, MAX_HEADLINE - 1).trimEnd() + "…";

  const claim = { text: headline, source: outlet };

  // A proposed figure must be present LITERALLY in the raw text, else it is
  // fabricated and rejected — the figure stays not-obtained.
  if (candidateFigure !== undefined) {
    const present = numericValues(input.rawText).includes(candidateFigure);
    if (!present) {
      return { claim, figure: null, fabricated: true, note: `figure ${candidateFigure} not present in source text — rejected` };
    }
    return { claim, figure: candidateFigure, fabricated: false, note: "figure verified present in source text" };
  }

  return { claim, figure: null, fabricated: false, note: "claim only, no figure proposed" };
}
