/**
 * Deterministic calculators — the calc-keys the skills cite.
 *
 * TS port of the Python `agent/tools`. Operating-context rule #2: exact
 * calculations use deterministic code; the model never arithmetics. Each
 * calculator returns a `CalcResult` with a content-addressed `calcKey` so the
 * number is reproducible and traceable, plus `flags` for the Everlin ceilings.
 *
 * The model calls these as tools, then narrates the result into a `Figure`
 * (calcKey attached) — it never computes the number itself.
 */
import { createHash } from "node:crypto";

export type CalcResult = {
  name: string;
  value: number | Record<string, number>;
  unit: string;
  inputs: Record<string, unknown>;
  detail: Record<string, unknown>;
  flags: string[];
  calcKey: string;
};

/** Stable key: NAME-<8 hex of sorted inputs>. Same inputs -> same key. */
export function calcKey(name: string, inputs: Record<string, unknown>): string {
  const blob = JSON.stringify(inputs, Object.keys(inputs).sort());
  const h = createHash("sha256").update(blob).digest("hex").slice(0, 8).toUpperCase();
  return `${name.toUpperCase()}-${h}`;
}

function result(
  name: string,
  value: CalcResult["value"],
  unit: string,
  inputs: Record<string, unknown>,
  detail: Record<string, unknown> = {},
  flags: string[] = [],
): CalcResult {
  return { name, value, unit, inputs, detail, flags, calcKey: calcKey(name, inputs) };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

// --- Everlin ceilings (operating-context analytical standards) -------------
export const FEE_DRAG_CEILING = 2.5; // % p.a.
export const BUFFETT_MOS_LOW = 25; // %
export const DEV_MARGIN_FLOOR = 20; // % on TDC
export const GC_YIELD_LOW = 7;
export const GC_YIELD_HIGH = 9;

// --- finance ---------------------------------------------------------------

export function marginOfSafety(price: number, intrinsicValue: number): CalcResult {
  if (intrinsicValue <= 0) throw new Error("intrinsicValue must be > 0");
  const mos = ((intrinsicValue - price) / intrinsicValue) * 100;
  const flags: string[] = [];
  if (mos < BUFFETT_MOS_LOW) flags.push(`MoS ${mos.toFixed(1)}% below Buffett floor ${BUFFETT_MOS_LOW}%`);
  return result("mos", round2(mos), "%", { price, intrinsicValue }, { buffettFloorPct: BUFFETT_MOS_LOW }, flags);
}

export function feeDrag(managementPct: number, performancePct: number, otherPct = 0): CalcResult {
  const total = managementPct + performancePct + otherPct;
  const flags: string[] = [];
  if (total > FEE_DRAG_CEILING)
    flags.push(`All-in fee ${total.toFixed(2)}% p.a. exceeds Everlin ceiling ${FEE_DRAG_CEILING}% — flag AMBER at least`);
  return result("fee_drag", round2(total), "% p.a.", { managementPct, performancePct, otherPct }, { ceilingPct: FEE_DRAG_CEILING }, flags);
}

export function feeDecomposition(components: Record<string, number>): CalcResult {
  const keys = Object.keys(components);
  if (keys.length === 0) throw new Error("PE requires a full, named fee decomposition");
  const total = keys.reduce((s, k) => s + components[k], 0);
  const flags: string[] = [];
  if (total > FEE_DRAG_CEILING) flags.push(`Decomposed load ${total.toFixed(2)}% p.a. exceeds ceiling ${FEE_DRAG_CEILING}%`);
  return result("fee_decomp", round2(total), "% p.a.", { components }, { ...components }, flags);
}

/** IRR via Newton with bisection fallback. Throws if undefined/non-convergent. */
export function irr(cashflows: number[], guess = 0.1, tol = 1e-7, maxIter = 200): CalcResult {
  if (cashflows.length < 2) throw new Error("IRR needs >= 2 cashflows");
  const hasPos = cashflows.some((x) => x > 0);
  const hasNeg = cashflows.some((x) => x < 0);
  if (!(hasPos && hasNeg)) throw new Error("IRR undefined: need a sign change");
  const npv = (r: number) => cashflows.reduce((s, c, t) => s + c / (1 + r) ** t, 0);
  const dnpv = (r: number) => cashflows.reduce((s, c, t) => s + (-t * c) / (1 + r) ** (t + 1), 0);

  let r = guess;
  let converged = false;
  for (let i = 0; i < maxIter; i++) {
    const f = npv(r);
    const d = dnpv(r);
    if (Math.abs(d) < 1e-12) break;
    let rn = r - f / d;
    if (rn <= -0.9999999) rn = (r - 0.9999999) / 2;
    if (Math.abs(rn - r) < tol) { r = rn; converged = true; break; }
    r = rn;
  }
  if (!converged) {
    let lo = -0.9999, hi = 10.0;
    let flo = npv(lo);
    if (flo * npv(hi) > 0) throw new Error("IRR did not converge and no bracket found");
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const fm = npv(mid);
      if (Math.abs(fm) < tol) { r = mid; break; }
      if (flo * fm < 0) hi = mid;
      else { lo = mid; flo = fm; }
      r = (lo + hi) / 2;
    }
  }
  return result("irr", round2(r * 1e4) / 1e2, "% (per period)", { cashflows, guess }, { npvAtIrr: round2(npv(r) * 1e6) / 1e6 }, []);
}

// --- property --------------------------------------------------------------

export function developmentMargin(grv: number, tdc: number): CalcResult {
  if (tdc <= 0) throw new Error("TDC must be > 0");
  const margin = ((grv - tdc) / tdc) * 100;
  const flags: string[] = [];
  if (margin < DEV_MARGIN_FLOOR) flags.push(`Margin ${margin.toFixed(1)}% below 20% floor on TDC`);
  return result("dev_margin", round2(margin), "%", { grv, tdc }, { profit: round2(grv - tdc) }, flags);
}

export function feasibilityStress(grv: number, tdc: number, costShockPct = 10, priceShockPct = 10): CalcResult {
  const stressedTdc = tdc * (1 + costShockPct / 100);
  const stressedGrv = grv * (1 - priceShockPct / 100);
  if (stressedTdc <= 0) throw new Error("stressed TDC must be > 0");
  const margin = ((stressedGrv - stressedTdc) / stressedTdc) * 100;
  const passes = margin >= DEV_MARGIN_FLOOR;
  const flags: string[] = [];
  if (!passes) flags.push(`FAILS stress: margin ${margin.toFixed(1)}% < 20% at cost +${costShockPct}% / price -${priceShockPct}%`);
  return result("feas_stress", round2(margin), "%", { grv, tdc, costShockPct, priceShockPct }, { stressedGrv: round2(stressedGrv), stressedTdc: round2(stressedTdc), passes }, flags);
}

export function goingConcernYield(noi: number, assetValue: number): CalcResult {
  if (assetValue <= 0) throw new Error("assetValue must be > 0");
  const y = (noi / assetValue) * 100;
  const flags: string[] = [];
  if (y < GC_YIELD_LOW) flags.push(`Yield ${y.toFixed(2)}% below 7% band`);
  else if (y > GC_YIELD_HIGH) flags.push(`Yield ${y.toFixed(2)}% above 9% band — verify NOI is net/unlevered`);
  return result("gc_yield", round2(y), "%", { noi, assetValue }, { band: `${GC_YIELD_LOW}-${GC_YIELD_HIGH}%` }, flags);
}

// --- accounting ------------------------------------------------------------

export function reconciliationGrossNet(ledgerBalance: number, statementBalance: number, reconcilingItems: number[]): CalcResult {
  const grossPos = reconcilingItems.filter((x) => x > 0).reduce((s, x) => s + x, 0);
  const grossNeg = reconcilingItems.filter((x) => x < 0).reduce((s, x) => s + x, 0);
  const net = grossPos + grossNeg;
  const residual = statementBalance + net - ledgerBalance;
  const flags: string[] = [];
  if (residual === 0 && grossPos > 0 && grossNeg < 0)
    flags.push(`Zero residual produced by offsetting gross movements (+${grossPos} / ${grossNeg}) — do NOT sign off on net alone; explain each gross item.`);
  if (residual !== 0) flags.push(`Unexplained residual ${round2(residual)} — not reconciled`);
  return result("recon_gross_net", round2(residual), "AUD", { ledgerBalance, statementBalance, reconcilingItems }, { grossPositive: round2(grossPos), grossNegative: round2(grossNeg), netReconciling: round2(net) }, flags);
}

export const CALC_TOOLS = {
  marginOfSafety, feeDrag, feeDecomposition, irr,
  developmentMargin, feasibilityStress, goingConcernYield,
  reconciliationGrossNet,
} as const;
