/**
 * V05 — vernacular lint. Asserts a brief's prose is in the Everlin house register
 * (derived in docs/brief-pattern-deconstruction.md) and flags off-voice writing.
 * The narrative gate (V07) runs this over LLM-authored slots; a fail routes to
 * the deterministic fallback. This is voice enforcement, not fact-checking
 * (no-fabrication is a separate gate).
 */

// Hype / AI-slop / marketing words that never appear in the golden briefs.
// Matched as WHOLE WORDS (word boundaries) — "leverage" must not fire on the
// legitimate finance term "leveraged"/"deleverage", so it is dropped from the
// single-word list (too false-positive-prone) and only the phrase forms remain.
const BANNED_WORDS = [
  "delve",
  "unlock",
  "seamless",
  "supercharge",
  "unprecedented",
  "synergy",
  "paradigm",
];
// Multi-word hype phrases (matched as substrings — they are unambiguous).
const BANNED_PHRASES = [
  "game-chang",
  "cutting-edge",
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

  // 1. No banned hype/slop words (whole-word) or phrases (substring).
  const wordHit = BANNED_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
  const phraseHit = BANNED_PHRASES.filter((p) => lower.includes(p));
  const bannedHit = [...wordHit, ...phraseHit];
  if (bannedHit.length) findings.push(`banned register words: ${bannedHit.join(", ")}`);

  // 2. No emoji.
  const hasEmoji = EMOJI_RE.test(text);
  if (hasEmoji) findings.push("contains emoji (house style uses none)");

  // 3. No US-spelling tells where the golden uses AU/British. Whole-word only —
  //    "toward the" was dropped (the golden itself uses "toward"), "color" as a
  //    bare word only (not inside "colored"/"discolored").
  const usSpellings = ["favorite", "color", "analyze", "behavior", "defense"];
  const usHit = usSpellings.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
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
