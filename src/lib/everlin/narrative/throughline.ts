/**
 * V08 — throughline coherence check. The golden briefs thread THE ONE THING's
 * frame through later sections (callback discipline). This asserts that at least
 * one salient keyword from the-one-thing's interpretation reappears in a later
 * section — a cheap proxy for "the brief coheres around one idea" rather than
 * reading as disconnected section stubs.
 */
import type { SectionReasoning } from "@/lib/everlin/schemas";

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "this", "that", "with", "as", "at", "by", "it", "its", "be", "not",
  "one", "thing", "run", "brief", "every", "figure", "read", "should", "committee",
  "than", "from", "into", "most", "more", "less", "over", "under", "about", "which",
]);

function keywords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? []).filter((w) => !STOP.has(w));
}

export type ThroughlineReport = { pass: boolean; anchor: string[]; hits: string[] };

/**
 * Pass iff THE ONE THING's interpretation shares >=1 salient keyword with a later
 * section's prose. If there is no the-one-thing section, it passes vacuously
 * (nothing to thread).
 */
export function checkThroughline(sections: SectionReasoning[]): ThroughlineReport {
  const one = sections.find((s) => s.section === "the-one-thing");
  if (!one || !one.interpretation.trim()) return { pass: true, anchor: [], hits: [] };
  const anchor = [...new Set(keywords(one.interpretation))];
  const later = sections
    .filter((s) => s.section !== "the-one-thing")
    .flatMap((s) => keywords(`${s.interpretation} ${s.facts.map((f) => f.text).join(" ")}`));
  const laterSet = new Set(later);
  const hits = anchor.filter((w) => laterSet.has(w));
  return { pass: hits.length > 0, anchor, hits };
}
