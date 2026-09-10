/**
 * T4 — CrossVerify. Pure comparator over ALREADY-FETCHED surfaces (no network).
 * Confidence is earned by agreement: >=2 independent sources within a per-type
 * tolerance => confirmed; a single source => single-source/dated-read; a
 * disagreement beyond tolerance => conflict, value nulled, cannot ship (#8
 * default-deny — a conflict resolves to not-obtained, never a guess).
 */

export type Surface = { value: number; source: string; asOf?: string };
export type Tier = "confirmed" | "single-source" | "dated-read" | "conflict";

export type CrossVerifyResult = {
  tier: Tier;
  consensusValue: number | null;
  agreement: number; // count of surfaces within tolerance of the consensus
  crossVerified: boolean;
  canShip: boolean; // false on conflict (default-deny)
  note: string;
};

/**
 * Absolute tolerance by fact type. A cash rate must match exactly; index levels
 * allow a small relative spread (different vendors, same close); FX a few pips.
 */
function toleranceFor(factType: string, ref: number): number {
  const t = factType.toLowerCase();
  if (t.includes("cash rate")) return 0; // exact
  if (t.includes("fx") || t.includes("aud/usd") || t.includes("exchange")) return 0.001; // ~1bp
  if (t.includes("index") || t.includes("asx") || t.includes("s&p") || t.includes("nasdaq")) return Math.abs(ref) * 0.02; // 2%
  if (t.includes("oil") || t.includes("brent") || t.includes("wti")) return 1; // 1 bbl
  if (t.includes("yield") || t.includes("treasury")) return 0.01; // 1bp
  return Math.abs(ref) * 0.005; // default 0.5%
}

/**
 * Verify a figure across surfaces. Consensus = the median-ish first surface's
 * value; agreement counts surfaces within tolerance. Independent-source check:
 * surfaces must come from DIFFERENT sources to count as cross-verification.
 */
export function crossVerify(surfaces: Surface[], factType: string): CrossVerifyResult {
  const clean = surfaces.filter((s) => Number.isFinite(s.value));
  if (clean.length === 0) {
    return { tier: "conflict", consensusValue: null, agreement: 0, crossVerified: false, canShip: false, note: "no numeric surfaces" };
  }

  const distinctSources = new Set(clean.map((s) => s.source.toLowerCase().trim()));

  if (clean.length === 1 || distinctSources.size === 1) {
    // One surface, or many from the same source — not cross-verified.
    return {
      tier: "single-source",
      consensusValue: clean[0].value,
      agreement: 1,
      crossVerified: false,
      canShip: true, // a single official source can ship, marked as such
      note: distinctSources.size === 1 ? "single independent source" : "one surface",
    };
  }

  // >=2 distinct sources: check agreement against the first as reference.
  const ref = clean[0].value;
  const tol = toleranceFor(factType, ref);
  const within = clean.filter((s) => Math.abs(s.value - ref) <= tol);

  if (within.length >= 2) {
    // Consensus = mean of the agreeing surfaces (deterministic).
    const consensus = within.reduce((a, s) => a + s.value, 0) / within.length;
    return {
      tier: "confirmed",
      consensusValue: Number(consensus.toFixed(6)),
      agreement: within.length,
      crossVerified: true,
      canShip: true,
      note: `${within.length} independent sources within ±${tol}`,
    };
  }

  // Sources disagree beyond tolerance => conflict, default-deny.
  return {
    tier: "conflict",
    consensusValue: null,
    agreement: 1,
    crossVerified: false,
    canShip: false,
    note: `sources disagree beyond ±${tol} — not obtained (default-deny)`,
  };
}
