/**
 * Skill router: query -> ordered multi-skill plan.
 *
 * TS port of the Python `agent/router`. Deterministic keyword/phrase scoring,
 * no LLM at the routing layer, so the plan is auditable. Stage ordering:
 * 10 intake/prep -> 20 briefing -> 30 analysis -> 40 vendor -> 50 record ->
 * 70+ accounting/verify.
 */

export type SkillDef = {
  id: string;
  phrases: string[];
  keywords: string[];
  stage: number;
  tools: string[];
  note: string;
};

export const SKILLS: Record<string, SkillDef> = {
  "everlin-morning-brief": {
    id: "everlin-morning-brief",
    phrases: ["morning brief", "daily market", "market pulse", "overnight", "fx watch", "portfolio watch", "clyde's brief", "evl-daily"],
    keywords: ["daily", "market", "fx", "macro", "geopolitics"],
    stage: 20, tools: [], note: "Daily EVL-DAILY market/FX/portfolio pulse (Clyde).",
  },
  "everlin-weekly-ic-brief": {
    id: "everlin-weekly-ic-brief",
    phrases: ["weekly ic", "weekly brief", "ic briefing", "ic pack", "investment and property", "cross-domain", "evl-weekly"],
    keywords: ["weekly", "ic"],
    stage: 20, tools: ["feeDrag"], note: "Weekly IC pack, both arms.",
  },
  "everlin-investment-screener": {
    id: "everlin-investment-screener",
    phrases: ["screen this deal", "screening memo", "inbound deal", "cim", "founder email", "pitch deck", "triage deal", "evl-inv-scr"],
    keywords: ["screen", "deal", "cim", "screening"],
    stage: 30, tools: ["marginOfSafety", "feeDrag", "irr"], note: "Lean investment screen -> EVL-INV-SCR.",
  },
  "everlin-manager-diligence": {
    id: "everlin-manager-diligence",
    phrases: ["manager diligence", "pitch book", "ddq", "fact sheet", "factsheet", "fee stacking", "fund manager", "fee decomposition"],
    keywords: ["manager", "fund", "ddq", "diligence"],
    stage: 30, tools: ["feeDecomposition", "feeDrag"], note: "Manager/fund diligence; foregrounds fees/liquidity/risk.",
  },
  "everlin-meeting-prep": {
    id: "everlin-meeting-prep",
    phrases: ["prep for a meeting", "meeting prep", "prepare for the meeting", "prep clyde", "prep jordan", "counterparty meeting", "manager meeting"],
    keywords: ["prep", "prepare", "agenda"],
    stage: 10, tools: [], note: "Brief an attendee before a meeting.",
  },
  "everlin-meeting-actions": {
    id: "everlin-meeting-actions",
    phrases: ["meeting notes", "action items", "post-meeting", "decisions and actions", "extract actions", "follow-up draft", "turn these notes"],
    keywords: ["notes", "actions", "decisions"],
    stage: 50, tools: [], note: "Notes -> decisions + owned actions + internal follow-up draft.",
  },
  "everlin-vendor-review": {
    id: "everlin-vendor-review",
    phrases: ["vendor review", "renewal", "msp", "data vendor", "sow review", "azure proposal", "review this vendor", "bloomberg", "corelogic"],
    keywords: ["vendor", "renewal", "msp", "sow", "proposal"],
    stage: 40, tools: [], note: "Vendor/renewal review; governance screens.",
  },
  "everlin-document-digest": {
    id: "everlin-document-digest",
    phrases: ["document digest", "make this legible", "digest this doc", "information memorandum", "subscription document", "nda", "questions for counsel", "trust deed"],
    keywords: ["document", "im", "digest", "counsel", "legible"],
    stage: 30, tools: [], note: "Make an admin/legal doc legible; questions for counsel.",
  },
  "everlin-pre-booking-gap": {
    id: "everlin-pre-booking-gap",
    phrases: ["about to book", "pre-booking", "coverage table", "genuine gap", "what is unbooked", "before i book", "ap gap", "bank feed vs ledger"],
    keywords: ["unbooked", "coverage", "booking"],
    stage: 70, tools: ["coverageMatch"], note: "Establish the genuine unbooked gap before entries.",
  },
  "everlin-post-write-verify": {
    id: "everlin-post-write-verify",
    phrases: ["verify the write", "did it land", "write-back", "post-write", "confirm it landed", "verify the change", "read back", "check it posted"],
    keywords: ["verify", "landed", "posted", "writeback"],
    stage: 80, tools: [], note: "Confirm an approved write landed; indeterminate = failure.",
  },
  "everlin-transfer-duplicate": {
    id: "everlin-transfer-duplicate",
    phrases: ["counted twice", "duplicate representation", "internal transfer", "inter-entity transfer", "transfer plus fee", "one movement", "duplicate flow"],
    keywords: ["transfer", "duplicate"],
    stage: 70, tools: ["transferPairs"], note: "Group rows that may be one event; never remove a leg.",
  },
  "everlin-reconciliation-pack": {
    id: "everlin-reconciliation-pack",
    phrases: ["reconcile", "reconciliation", "evidence pack", "aged schedule", "reconciling items", "tie out", "completeness and validity"],
    keywords: ["reconcile", "reconciliation"],
    stage: 75, tools: ["reconciliationGrossNet"], note: "Assemble evidence for a person to reconcile; does not sign off.",
  },
};

export type Step = {
  skillId: string;
  stage: number;
  score: number;
  matched: string[];
  tools: string[];
  note: string;
};

export type Plan = {
  query: string;
  steps: Step[];
  unrouted: boolean;
};

const WORD = /[a-z0-9\-']+/g;

function scoreSkill(queryL: string, sd: SkillDef): { score: number; matched: string[] } {
  const matched: string[] = [];
  let score = 0;
  for (const p of sd.phrases) if (queryL.includes(p)) { score += 2; matched.push(p); }
  const words = new Set(queryL.match(WORD) ?? []);
  for (const k of sd.keywords) if (words.has(k)) { score += 1; matched.push(k); }
  return { score, matched };
}

export function route(query: string, threshold = 2, maxSteps = 4): Plan {
  const q = query.toLowerCase();
  const steps: Step[] = [];
  for (const sd of Object.values(SKILLS)) {
    const { score, matched } = scoreSkill(q, sd);
    if (score >= threshold) steps.push({ skillId: sd.id, stage: sd.stage, score, matched, tools: sd.tools, note: sd.note });
  }
  if (steps.length === 0) return { query, steps: [], unrouted: true };
  steps.sort((a, b) => (a.stage - b.stage) || (b.score - a.score));
  return { query, steps: steps.slice(0, maxSteps), unrouted: false };
}

export function renderPlan(plan: Plan): string {
  if (plan.unrouted) return `No skill matched confidently. Load everlin-resolver and pick manually.\nQuery: ${JSON.stringify(plan.query)}`;
  const lines = [`Plan for: ${JSON.stringify(plan.query)}`, ""];
  plan.steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.skillId}  (stage ${s.stage}, score ${s.score})`);
    lines.push(`   why: matched ${s.matched.map((m) => JSON.stringify(m)).join(", ")}`);
    lines.push(`   ${s.note}`);
    if (s.tools.length) lines.push(`   tools: ${s.tools.join(", ")}`);
  });
  lines.push("", "Always: read the operating context first. Draft only. Ansh sends client comms.");
  return lines.join("\n");
}
