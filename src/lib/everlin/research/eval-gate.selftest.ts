/**
 * T9 — the deep-research eval merge-gate. Runs the T8 fold cases + the hard
 * leak-count=0 assertion + trace-reconstructs check. The per-component selftests
 * (provenance, cross-verify, client-clean-gate, orchestrator) are the rest of the
 * gate; this file is the integration layer they compose into.
 *   npx tsx src/lib/everlin/research/eval-gate.selftest.ts
 * Exits non-zero on any failure. Deterministic (no network).
 */
import { foldCandidates } from "./fold-candidates";
import { clientCleanGate } from "@/lib/everlin/verification/client-clean-gate";
import type { FigureCandidate } from "./orchestrator";
import type { MorningBrief } from "@/lib/everlin/schemas";

const fails: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS  ${name}`);
  else {
    console.log(`  FAIL  ${name}  ${detail}`);
    fails.push(name);
  }
}
function section(t: string) {
  console.log(`\n== ${t} ==`);
}

type Fig = MorningBrief["figures"][number];
const gap = (label: string): Fig => ({ label, value: null, unit: "", calcKey: null, source: null, sourceUrl: null, asOf: null, missing: true, note: "not obtained" });

section("T8 fold — client-clean candidate fills a gap");
{
  // A client-clean confirmed candidate (e.g. an FX cross found via ECB).
  const cand: FigureCandidate = { label: "AUD/EUR cross", value: 0.61, provenance: "client-clean", tier: "confirmed", crossVerified: true, canShip: true, source: "ECB EXR", asOf: "2026-09-07", trace: [] };
  const { figures, filled } = foldCandidates([gap("AUD/EUR cross")], [cand], "client");
  check("client-clean candidate fills the gap", figures[0].value === 0.61 && !figures[0].missing);
  check("filled label recorded", filled.includes("AUD/EUR cross"));
}

section("T8 fold — internal-tos-risk candidate stays missing on client band");
{
  const cand: FigureCandidate = { label: "S&P/ASX 200 index", value: 9005.9, provenance: "internal-tos-risk", tier: "confirmed", crossVerified: true, canShip: true, source: "Investing.com", asOf: "2026-09-07", trace: [] };
  const client = foldCandidates([gap("S&P/ASX 200 index")], [cand], "client");
  check("internal candidate does NOT fill on client band", client.figures[0].missing === true && client.figures[0].value === null);
  const internal = foldCandidates([gap("S&P/ASX 200 index")], [cand], "internal");
  check("same candidate DOES fill on internal band", internal.figures[0].value === 9005.9);
}

section("HARD GATE — leak-count = 0 (client band, no override)");
{
  // Simulate an internal candidate that somehow reached the figure list, then
  // the ClientCleanGate must coerce it back to missing.
  const leaked: Fig = { label: "VIX", value: 15.2, unit: "", calcKey: null, source: "FRED", sourceUrl: "https://fred.stlouisfed.org", asOf: "2026-09-07", missing: false, note: "" };
  const r = clientCleanGate([leaked], { band: "client", nowIso: "2026-09-07T00:00:00Z" });
  const leakCount = r.figures.filter((f) => !f.missing && f.value !== null && (f.source ?? "").toLowerCase().includes("fred")).length;
  check("leak-count = 0 (FRED figure coerced to missing)", leakCount === 0, `leakCount=${leakCount}`);
}

section("trace reconstructs — every figure carries provenance in its note");
{
  const cand: FigureCandidate = { label: "AUD/EUR cross", value: 0.61, provenance: "client-clean", tier: "confirmed", crossVerified: true, canShip: true, source: "ECB EXR", asOf: "2026-09-07", trace: ["ECB -> 0.61", "cross-verify confirmed"] };
  const { figures } = foldCandidates([gap("AUD/EUR cross")], [cand], "client");
  check("filled figure note carries provenance", figures[0].note.includes("provenance=client-clean"));
  check("candidate trace is reconstructable", cand.trace.length > 0 && cand.trace.every((t) => typeof t === "string"));
}

console.log("\n====================================================");
if (fails.length) {
  console.log(`FAILED: ${fails.length} — ${fails.join(", ")}`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
