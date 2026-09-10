/**
 * Runtime skill creation — PROPOSE → GATE → THEN USABLE.
 * Spec: docs/specs/runtime-skill-creation.md.
 *
 * The agent may AUTHOR a new Everlin-aligned skill when planning hits a
 * capability gap, but only as a PROPOSAL. A proposed skill is inert data in a
 * store; it is NEVER routable until a human approves it AND it passes the
 * automated Layer-A validator. There is no code path from "proposed" to
 * "executable" — the load boundary is `status === "APPROVED"`, enforced here
 * in code, not prose.
 *
 * The one-sentence execution boundary: an approved skill is a NAMED COMPOSITION
 * of already-trusted deterministic tools (calc.ts / data-sources.ts) bound to a
 * trust-spine schema — never a program. No token in the whitelist touches the
 * shell, network (beyond named read-only retrievers), filesystem, auth, or send.
 * A skill cannot be a shell-exec backdoor because there is no shell handle to hand it.
 *
 * v1 decisions (from the spec's open questions):
 *  - Persistence: in-memory JSON store (module-scoped Map) — the loader's
 *    WHERE status=APPROVED is the real gate, not the substrate.
 *  - Approver: Jordan Lin (final authority, matches schemas.ts).
 *  - No new data sources / no new arithmetic / no scripts/ execution in v1.
 *  - The frontmatter/naming validator is reimplemented in TS (no exec at the gate).
 *  - A human edit re-runs Layer A and cannot override a Layer-A rejection.
 */
import { createHash } from "node:crypto";
import { CALC_TOOLS } from "@/lib/everlin/calc";
import { SKILLS, type SkillDef } from "@/lib/everlin/router";
import { SCHEMA_BY_SKILL } from "@/lib/everlin/schemas";
import * as dataSources from "@/lib/data-sources";

export type ProposalStatus = "PROPOSED" | "PENDING_REVIEW" | "REJECTED" | "APPROVED";

export type UseCase =
  | "brief-variant"
  | "retrieval-wrapper"
  | "analysis-template"
  | "document-digest-variant";

const USE_CASES: readonly UseCase[] = [
  "brief-variant",
  "retrieval-wrapper",
  "analysis-template",
  "document-digest-variant",
];

/** The model authors these fields (+ SKILL.md). Everything trust-bearing is orchestration-owned. */
export type SkillProposalDraft = {
  name: string; // must be everlin-<...>
  useCase: UseCase;
  capabilities: string[]; // must be a subset of the capability whitelist
  outputSkillId: string | null;
  skillMd: string; // the SKILL.md body (frontmatter + markdown)
  phrases?: string[]; // routing phrases the skill would match (for the loader)
  keywords?: string[];
  stage?: number;
};

export type Provenance = {
  proposedBy: string;
  fromQuery: string;
  fromQueryHadUntrustedDoc: boolean;
  proposedAt: string;
  graphTraceId: string;
};

export type ValidatorReport = { passed: boolean; rejectReasons: string[] };

export type ApprovalAuditEntry = { action: "APPROVED" | "REJECTED"; by: string; at: string; onProposalHash: string };

export type SkillProposal = {
  proposalId: string;
  name: string;
  proposalHash: string;
  status: ProposalStatus; // orchestration-owned ONLY
  useCase: UseCase;
  capabilities: string[];
  outputSkillId: string | null;
  skillMd: string;
  phrases: string[];
  keywords: string[];
  stage: number;
  provenance: Provenance;
  validatorReport: ValidatorReport;
  approvalAudit: ApprovalAuditEntry[];
};

// ---------------------------------------------------------------------------
// Capability whitelist — the crux. The ONLY tokens a proposal may declare.
// A handle is `everlin-calc:<name>` / `everlin-retrieve:<name>` / `everlin-schema:<id>`
// / `everlin-brief-node`. Everything else (Bash, fetch, Write, env, URLs) is
// off-whitelist by construction and auto-rejects.
// ---------------------------------------------------------------------------
const CALC_NAMES = new Set(Object.keys(CALC_TOOLS));
// Retrievers are the exported sourced-Fact functions in data-sources.ts.
const RETRIEVER_NAMES = new Set(
  Object.keys(dataSources).filter((k) => typeof (dataSources as Record<string, unknown>)[k] === "function"),
);

// Patterns that, if they appear in a capability list, an allowed-tools string,
// or the SKILL.md body, are an immediate reject. Denylist layered UNDER the
// allowlist (defense in depth): the allowlist already refuses anything not
// `everlin-*`; this catches obvious shell/net/fs/auth strings hidden in prose.
// Word-boundary matched so "cash", "push", "sending" don't false-positive on
// "sh"/"send" — only the real shell/net/fs/auth/send tokens trip it.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bbash\b/i, /\bexec\b/i, /\bspawn\b/i, /child_process/i, /\bcurl\b/i, /\bwget\b/i,
  /\|\s*sh\b/i, /\bsh\s+-c\b/i,
  /\bfetch\s*\(/i, /https?:\/\//i, /\bwebsocket\b/i,
  /fs\.write/i, /\bwritefile\b/i, /\breadfile\b/i,
  /process\.env/i, /\.env\b/i, /\bcredential/i, /\bsecret\b/i, /\btoken\b/i,
  /\beval\s*\(/i, /\brequire\s*\(/i, /\bimport\s*\(/i,
  /\bpublish\b/i, /\bwebhook\b/i, /\bsmtp\b/i,
];

function sha256Hex(s: string): string {
  // Node crypto — this module is server-only (imported by the route/graph).
  return createHash("sha256").update(s).digest("hex");
}

/** Base agentskills.io frontmatter/naming validity, reimplemented in TS (no exec at the gate). */
function validateSpecName(name: string): string[] {
  const errs: string[] = [];
  if (name.length === 0 || name.length > 64) errs.push(`name length must be 1-64 (got ${name.length})`);
  if (!/^[a-z0-9-]+$/.test(name)) errs.push("name may contain only lowercase letters, numbers, and hyphens");
  if (name.startsWith("-") || name.endsWith("-")) errs.push("name must not start or end with a hyphen");
  if (name.includes("--")) errs.push("name must not contain consecutive hyphens");
  return errs;
}

/**
 * LAYER A — the automated validator. Deterministic, returns a report, never
 * throws. All checks must pass to advance to PENDING_REVIEW. Any failure ⇒
 * REJECTED with the specific reason(s). Mirrors validateOutput's contract.
 */
export function validateProposal(draft: SkillProposalDraft): ValidatorReport {
  const reasons: string[] = [];
  const bodyL = (draft.skillMd || "").toLowerCase();

  // 1. Spec validity (name).
  reasons.push(...validateSpecName(draft.name));

  // 2. Namespace lock + no collision with built-in or approved skills.
  if (!draft.name.startsWith("everlin-")) reasons.push("name must be prefixed 'everlin-' (namespace lock)");
  if (draft.name in SKILLS) reasons.push(`name '${draft.name}' collides with a built-in skill`);
  if (approvedNames().has(draft.name)) reasons.push(`name '${draft.name}' collides with an already-approved skill`);

  // 3. Capability whitelist (the crux) — every token must resolve to a real handle.
  for (const cap of draft.capabilities) {
    const r = classifyCapability(cap);
    if (!r.ok) reasons.push(`capability '${cap}' off-whitelist: ${r.reason}`);
  }

  // 4. Use-case allowlist.
  if (!USE_CASES.includes(draft.useCase)) reasons.push(`useCase '${draft.useCase}' not in the allowlist`);

  // 5. Static ban: no forbidden shell/net/fs/auth/send pattern anywhere (caps, allowed-tools, or body prose).
  const haystacks = [draft.capabilities.join(" "), draft.skillMd || ""];
  for (const pat of FORBIDDEN_PATTERNS) {
    for (const hay of haystacks) {
      if (pat.test(hay)) { reasons.push(`forbidden pattern ${pat} present (shell/network/fs/auth/send are banned)`); break; }
    }
  }

  // 6. Description ↔ use-case coherence (cheap keyword overlap).
  if (!coherent(draft.useCase, bodyL)) {
    reasons.push(`SKILL.md body does not cohere with declared useCase '${draft.useCase}'`);
  }

  // 7. Output-schema binding: if outputSkillId set, it must resolve to a trust-spine schema.
  if (draft.outputSkillId && !(draft.outputSkillId in SCHEMA_BY_SKILL)) {
    reasons.push(`outputSkillId '${draft.outputSkillId}' has no registered trust-spine schema (new schemas are human-authored in v1)`);
  }

  return { passed: reasons.length === 0, rejectReasons: reasons };
}

/** Classify one capability token against the whitelist. */
function classifyCapability(cap: string): { ok: boolean; reason?: string } {
  if (cap === "everlin-brief-node") return { ok: true };
  const [kind, name] = cap.split(":", 2);
  if (kind === "everlin-calc") {
    return CALC_NAMES.has(name ?? "") ? { ok: true } : { ok: false, reason: `no calculator named '${name}'` };
  }
  if (kind === "everlin-retrieve") {
    return RETRIEVER_NAMES.has(name ?? "") ? { ok: true } : { ok: false, reason: `no registered retriever named '${name}'` };
  }
  if (kind === "everlin-schema") {
    return name && name in SCHEMA_BY_SKILL ? { ok: true } : { ok: false, reason: `no schema '${name}'` };
  }
  return { ok: false, reason: "not an everlin-calc/retrieve/schema/brief-node handle" };
}

const USECASE_KEYWORDS: Record<UseCase, string[]> = {
  "brief-variant": ["brief", "pulse", "daily", "weekly", "monthly", "market", "macro"],
  "retrieval-wrapper": ["retrieve", "wrap", "watch", "rate", "index", "series", "fact"],
  "analysis-template": ["analysis", "scenario", "feasibility", "margin", "fee", "summary", "template"],
  "document-digest-variant": ["digest", "document", "deed", "memorandum", "legible", "counsel"],
};

function coherent(useCase: UseCase, bodyL: string): boolean {
  const kws = USECASE_KEYWORDS[useCase] ?? [];
  return kws.some((k) => bodyL.includes(k));
}

// ---------------------------------------------------------------------------
// The store. In-memory Map (v1). status is orchestration-owned; the model never
// writes it. Every transition is auditable via provenance + approvalAudit.
// ---------------------------------------------------------------------------
const store = new Map<string, SkillProposal>();
let idCounter = 0;

function approvedNames(): Set<string> {
  const s = new Set<string>();
  for (const p of store.values()) if (p.status === "APPROVED") s.add(p.name);
  return s;
}

/**
 * PERSIST a draft as PROPOSED, then run Layer A. The model authored `draft`;
 * orchestration owns provenance/status/validatorReport. Returns the stored
 * proposal (status is PENDING_REVIEW if Layer A passed, else REJECTED). The
 * proposal is INERT either way — never routable until APPROVED.
 */
export function submitProposal(
  draft: SkillProposalDraft,
  ctx: { fromQuery: string; fromQueryHadUntrustedDoc: boolean; proposedAt: string; graphTraceId: string },
): SkillProposal {
  const proposalId = `prop-${++idCounter}`;
  const proposalHash = sha256Hex(`${draft.name}\n${draft.skillMd}\n${draft.capabilities.slice().sort().join(",")}`).slice(0, 16);

  // Layer A runs on the draft. The model's status/provenance (if any) are ignored.
  const validatorReport = validateProposal(draft);

  const proposal: SkillProposal = {
    proposalId,
    name: draft.name,
    proposalHash,
    status: validatorReport.passed ? "PENDING_REVIEW" : "REJECTED",
    useCase: draft.useCase,
    capabilities: draft.capabilities,
    outputSkillId: draft.outputSkillId,
    skillMd: draft.skillMd,
    phrases: draft.phrases ?? [],
    keywords: draft.keywords ?? [],
    stage: draft.stage ?? 30,
    provenance: {
      proposedBy: "propose-skill-node",
      fromQuery: ctx.fromQuery,
      fromQueryHadUntrustedDoc: ctx.fromQueryHadUntrustedDoc,
      proposedAt: ctx.proposedAt,
      graphTraceId: ctx.graphTraceId,
    },
    validatorReport,
    approvalAudit: [],
  };
  store.set(proposalId, proposal);
  return proposal;
}

/**
 * Human approval (Layer B). Only advances a PENDING_REVIEW proposal to APPROVED.
 * A REJECTED proposal can NEVER be approved (a human cannot override Layer A).
 * Non-call = stays PENDING_REVIEW (no timeout auto-approve exists).
 */
export function approveProposal(proposalId: string, by = "Jordan Lin", at = new Date().toISOString()): { ok: boolean; error?: string } {
  const p = store.get(proposalId);
  if (!p) return { ok: false, error: "no such proposal" };
  if (p.status !== "PENDING_REVIEW") {
    return { ok: false, error: `cannot approve a proposal in status '${p.status}' (only PENDING_REVIEW is approvable; Layer-A rejections are final)` };
  }
  p.status = "APPROVED";
  p.approvalAudit.push({ action: "APPROVED", by, at, onProposalHash: p.proposalHash });
  return { ok: true };
}

export function rejectProposal(proposalId: string, by = "Jordan Lin", at = new Date().toISOString()): { ok: boolean } {
  const p = store.get(proposalId);
  if (!p) return { ok: false };
  p.status = "REJECTED";
  p.approvalAudit.push({ action: "REJECTED", by, at, onProposalHash: p.proposalHash });
  return { ok: true };
}

export function getProposal(proposalId: string): SkillProposal | undefined {
  return store.get(proposalId);
}

export function listProposals(status?: ProposalStatus): SkillProposal[] {
  const all = [...store.values()];
  return status ? all.filter((p) => p.status === status) : all;
}

/** Test/reset hook. */
export function _clearProposals(): void {
  store.clear();
  idCounter = 0;
}

/**
 * THE LOAD BOUNDARY. Materialize APPROVED proposals into SkillDefs. This is the
 * ONLY function that turns a proposal into a routable capability, and it reads
 * ONLY status === "APPROVED". `tools` is populated only from whitelisted calc/
 * retrieve handles, resolved to real names; a handle that no longer resolves
 * fails closed (skill not loaded).
 */
export function approvedSkillDefs(): Record<string, SkillDef> {
  const out: Record<string, SkillDef> = {};
  for (const p of store.values()) {
    if (p.status !== "APPROVED") continue; // ← the gate, in code
    const tools: string[] = [];
    let loadable = true;
    for (const cap of p.capabilities) {
      const [kind, name] = cap.split(":", 2);
      if (kind === "everlin-calc") {
        if (CALC_NAMES.has(name ?? "")) tools.push(name!);
        else { loadable = false; break; } // fail closed
      } else if (kind === "everlin-retrieve") {
        if (RETRIEVER_NAMES.has(name ?? "")) tools.push(name!);
        else { loadable = false; break; }
      }
      // everlin-schema / everlin-brief-node grant no callable tool handle
    }
    if (!loadable) continue;
    out[p.name] = {
      id: p.name,
      phrases: p.phrases,
      keywords: p.keywords,
      stage: p.stage,
      tools,
      note: `Approved skill (${p.useCase}); proposed ${p.provenance.proposedAt}.`,
    };
  }
  return out;
}

/** The full routable registry = built-ins ∪ APPROVED proposals. Never includes non-APPROVED. */
export function routableSkills(): Record<string, SkillDef> {
  return { ...SKILLS, ...approvedSkillDefs() };
}
