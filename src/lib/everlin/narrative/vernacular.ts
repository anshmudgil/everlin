/**
 * V05 — vernacular lint. Asserts a brief's prose is in the Everlin house register
 * (derived in docs/brief-pattern-deconstruction.md) and flags off-voice writing.
 * The narrative gate (V07) runs this over LLM-authored slots; a fail routes to
 * the deterministic fallback. This is voice enforcement, not fact-checking
 * (no-fabrication is a separate gate).
 */

// Hype / AI-slop / marketing words that never appear in the golden briefs.
const BANNED = [
  "delve",
  "leverage", // as a verb; the briefs say "support"/"drive"
  "unlock",
  "game-chang",
  "revolution",
  "seamless",
  "cutting-edge",
  "supercharge",
  "unprecedented",
  "robust",
  "synergy",
  "paradigm",
  "in today's fast-paced",
  "in conclusion",
];

// Emoji / decorative symbols (the briefs use none).
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;

export type VernacularReport = {
  pass: boolean;
  findings: string[];
  checks: { name: string; ok: boolean }[];
};

/**
 * Lint prose against the house register. `claims` (optional) are the sourced
 * claims underlying the prose — used to assert the [source] bracket discipline
 * is possible (interpretation prose itself carries no sources, that's expected).
 */
export function lintVernacular(text: string, opts: { requireSourceBrackets?: boolean } = {}): VernacularReport {
  const findings: string[] = [];
  const lower = text.toLowerCase();

  // 1. No banned hype/slop words.
  const bannedHit = BANNED.filter((w) => lower.includes(w));
  if (bannedHit.length) findings.push(`banned register words: ${bannedHit.join(", ")}`);

  // 2. No emoji.
  const hasEmoji = EMOJI_RE.test(text);
  if (hasEmoji) findings.push("contains emoji (house style uses none)");

  // 3. No US-spelling tells where the golden uses AU/British. (Soft: flag the
  //    most common divergences that would read as off-brand.)
  const usSpellings = ["favorite", "color ", "analyze", "behavior", "defense", "toward the"];
  const usHit = usSpellings.filter((w) => lower.includes(w));
  if (usHit.length) findings.push(`US spelling (prefer AU/British): ${usHit.join(", ")}`);

  // 4. Source-bracket discipline (only when asserted, e.g. a FACTS block).
  let bracketOk = true;
  if (opts.requireSourceBrackets) {
    bracketOk = /\[[^\]]+\]/.test(text);
    if (!bracketOk) findings.push("FACTS block missing any [source] bracket");
  }

  // 5. Not-obtained discipline: if the text mentions an unobtained figure it must
  //    say "not obtained", never present a bare guess. (Heuristic: flag the word
  //    "estimated" used affirmatively, which the briefs explicitly forbid.)
  const estimatedMisuse = /\bestimated\b/i.test(text) && !/not\s+estimated/i.test(text);
  if (estimatedMisuse) findings.push("uses 'estimated' affirmatively (house rule: figures are sourced or not obtained, never estimated)");

  const checks = [
    { name: "no-banned-words", ok: bannedHit.length === 0 },
    { name: "no-emoji", ok: !hasEmoji },
    { name: "au-spelling", ok: usHit.length === 0 },
    { name: "source-brackets", ok: bracketOk },
    { name: "no-estimation", ok: !estimatedMisuse },
  ];

  return { pass: findings.length === 0, findings, checks };
}
