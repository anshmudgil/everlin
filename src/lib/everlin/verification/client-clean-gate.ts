/**
 * T3 — ClientCleanGate + OverrideAudit. The irreversible boundary (#4): a figure
 * entering a CLIENT-distributed brief.
 *
 * Rule: any Figure whose provenance is internal-tos-risk or unverified is coerced
 * to missing:true for a client-band render — UNLESS an explicit, authorised
 * override is supplied. The override needs a named owner from a fixed allow-list,
 * a non-empty reason, and is appended to a checksum-chained audit log. Default is
 * to BLOCK (fail closed): no override, or a bad override, means the figure does
 * not ship.
 *
 * This is what keeps a scraped/aggregated/FRED-sourced level (internal-only) out
 * of a client brief without a human deciding, on the record, to include it.
 */
import { classifyProvenance, type Provenance } from "@/lib/everlin/verification/provenance";
import type { MorningBrief } from "@/lib/everlin/schemas";

// Only these named humans may override the client-clean boundary.
const OVERRIDE_OWNERS = ["Ansh", "Jordan Lin"] as const;
export type OverrideOwner = (typeof OVERRIDE_OWNERS)[number];

export type Override = { flag: boolean; owner: string; reason: string };

export type GateResult = {
  figures: MorningBrief["figures"];
  coercedCount: number; // internal/unverified figures blocked (coerced to missing)
  shippedUnderOverride: string[]; // labels that shipped because of a valid override
  overrideRejected: string | null; // why an override was rejected, if any
  internalDistribution: boolean; // true if any override applied => footer must say internal-only
};

// --- OverrideAudit: append-only, checksum-chained ---------------------------
export type AuditEntry = {
  ts: string;
  owner: string;
  reason: string;
  labels: string[];
  prevChecksum: string;
  checksum: string;
};

// djb2 — small deterministic hash for the chain (no crypto dep needed for the
// chain integrity check; a tamper breaks the next entry's prevChecksum match).
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export class OverrideAudit {
  private entries: AuditEntry[] = [];

  append(owner: string, reason: string, labels: string[], nowIso: string): AuditEntry {
    const prevChecksum = this.entries.length ? this.entries[this.entries.length - 1].checksum : "genesis";
    const body = JSON.stringify({ ts: nowIso, owner, reason, labels, prevChecksum });
    const checksum = hash(body);
    const entry: AuditEntry = { ts: nowIso, owner, reason, labels, prevChecksum, checksum };
    this.entries.push(entry);
    return entry;
  }

  list(): readonly AuditEntry[] {
    return this.entries;
  }

  /** Verify the chain: every entry's prevChecksum must match the prior checksum. */
  verifyChain(): boolean {
    let prev = "genesis";
    for (const e of this.entries) {
      if (e.prevChecksum !== prev) return false;
      const body = JSON.stringify({ ts: e.ts, owner: e.owner, reason: e.reason, labels: e.labels, prevChecksum: e.prevChecksum });
      if (hash(body) !== e.checksum) return false;
      prev = e.checksum;
    }
    return true;
  }
}

function overrideIsValid(o: Override | undefined): o is Override {
  return !!o && o.flag === true && OVERRIDE_OWNERS.includes(o.owner as OverrideOwner) && o.reason.trim().length > 0;
}

/**
 * Gate figures for a client-band render. Coerces internal/unverified figures to
 * missing unless a valid override includes them. Records any override in the audit.
 *
 * `band`: "client" applies the gate; "internal" ships everything (internal view).
 */
export function clientCleanGate(
  figures: MorningBrief["figures"],
  opts: { band: "client" | "internal"; override?: Override; audit?: OverrideAudit; nowIso: string },
): GateResult {
  // Internal band: no coercion, everything shows (this is the internal view).
  if (opts.band === "internal") {
    return { figures, coercedCount: 0, shippedUnderOverride: [], overrideRejected: null, internalDistribution: true };
  }

  // Client band: classify each figure; block internal/unverified.
  const risky = figures.filter((f) => {
    if (f.missing) return false; // already not-obtained
    const p: Provenance = classifyProvenance({ label: f.label, source: f.source ?? "", sourceUrl: f.sourceUrl }).provenance;
    return p !== "client-clean";
  });

  // An override that is present but invalid is REJECTED (fail closed) — the
  // figures are still coerced, and we report why.
  let overrideRejected: string | null = null;
  let allowOverride = false;
  if (opts.override && opts.override.flag) {
    const attemptedOwner = opts.override.owner;
    if (overrideIsValid(opts.override)) {
      allowOverride = true;
    } else {
      overrideRejected = `override rejected: owner '${attemptedOwner}' not in {${OVERRIDE_OWNERS.join(", ")}} or empty reason`;
    }
  }

  const shippedUnderOverride: string[] = [];
  const out = figures.map((f) => {
    const isRisky = risky.some((r) => r.label === f.label);
    if (!isRisky) return f;
    if (allowOverride) {
      shippedUnderOverride.push(f.label);
      return f; // ships under override
    }
    // Block: coerce to not-obtained with a provenance note.
    return {
      ...f,
      value: null,
      missing: true,
      source: null,
      sourceUrl: null,
      note: `Blocked from client distribution: not client-clean provenance. ${f.note ?? ""}`.trim(),
    };
  });

  if (allowOverride && shippedUnderOverride.length && opts.audit) {
    opts.audit.append(opts.override!.owner, opts.override!.reason, shippedUnderOverride, opts.nowIso);
  }

  return {
    figures: out,
    coercedCount: risky.length - shippedUnderOverride.length,
    shippedUnderOverride,
    overrideRejected,
    internalDistribution: shippedUnderOverride.length > 0,
  };
}
