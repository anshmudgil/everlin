/**
 * T3 — runnable red-team proof for the ClientCleanGate + OverrideAudit.
 *   npx tsx src/lib/everlin/verification/client-clean-gate.selftest.ts
 * The gate is the irreversible boundary; a red-team bypass here is a client-data
 * leak. Exits non-zero on any failure.
 */
import { clientCleanGate, OverrideAudit, type Override } from "./client-clean-gate";
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
const clean: Fig = { label: "RBA cash rate target", value: 4.35, unit: "% p.a.", calcKey: null, source: "RBA — Table F1 (Cash Rate Target)", sourceUrl: "https://rba.gov.au", asOf: "2026-09-07", missing: false, note: "" };
// A scraped/FRED index level trying to reach a client brief.
const risky: Fig = { label: "S&P/ASX 200 index", value: 9123.4, unit: "", calcKey: null, source: "FRED (St. Louis Fed)", sourceUrl: "https://fred.stlouisfed.org", asOf: "2026-09-07", missing: false, note: "" };

section("client band blocks non-clean by default (default-deny)");
{
  const r = clientCleanGate([clean, risky], { band: "client", nowIso: "2026-09-07T00:00:00Z" });
  const idx = r.figures.find((f) => f.label === "S&P/ASX 200 index")!;
  check("index figure coerced to missing (leak count 0)", idx.missing === true && idx.value === null, `missing=${idx.missing} value=${idx.value}`);
  check("clean figure untouched", r.figures.find((f) => f.label === "RBA cash rate target")!.value === 4.35);
  check("coercedCount = 1", r.coercedCount === 1, String(r.coercedCount));
  check("no internal-distribution footer (nothing shipped under override)", r.internalDistribution === false);
}

section("red-team — invalid override is rejected (fail closed)");
{
  const badOwner: Override = { flag: true, owner: "Eve", reason: "trust me" };
  const r = clientCleanGate([risky], { band: "client", override: badOwner, nowIso: "2026-09-07T00:00:00Z" });
  check("bad-owner override rejected", r.overrideRejected !== null, "no rejection recorded");
  check("figure still coerced to missing", r.figures[0].missing === true);
  check("nothing shipped under override", r.shippedUnderOverride.length === 0);
}
{
  const emptyReason: Override = { flag: true, owner: "Ansh", reason: "  " };
  const r = clientCleanGate([risky], { band: "client", override: emptyReason, nowIso: "2026-09-07T00:00:00Z" });
  check("empty-reason override rejected", r.overrideRejected !== null && r.figures[0].missing === true);
}

section("valid override ships figure + audits + internal footer");
{
  const audit = new OverrideAudit();
  const good: Override = { flag: true, owner: "Jordan Lin", reason: "IC internal review — levels needed for context" };
  const r = clientCleanGate([risky], { band: "client", override: good, audit, nowIso: "2026-09-07T00:00:00Z" });
  check("figure ships under valid override", r.figures[0].missing === false && r.figures[0].value === 9123.4);
  check("shippedUnderOverride records the label", r.shippedUnderOverride.includes("S&P/ASX 200 index"));
  check("internal-distribution footer set", r.internalDistribution === true);
  check("audit has one entry", audit.list().length === 1);
  check("audit entry names the owner + reason", audit.list()[0].owner === "Jordan Lin" && audit.list()[0].reason.length > 0);
}

section("internal band ships everything (internal view)");
{
  const r = clientCleanGate([clean, risky], { band: "internal", nowIso: "2026-09-07T00:00:00Z" });
  check("internal band coerces nothing", r.coercedCount === 0 && r.figures.find((f) => f.label === "S&P/ASX 200 index")!.value === 9123.4);
  check("internal band flags internal-distribution", r.internalDistribution === true);
}

section("audit chain integrity (tamper detection)");
{
  const audit = new OverrideAudit();
  const good: Override = { flag: true, owner: "Ansh", reason: "context" };
  clientCleanGate([risky], { band: "client", override: good, audit, nowIso: "2026-09-07T00:00:00Z" });
  clientCleanGate([{ ...risky, label: "VIX" }], { band: "client", override: good, audit, nowIso: "2026-09-07T00:01:00Z" });
  check("valid chain verifies", audit.verifyChain() === true);
  // Tamper: mutate an entry's reason without recomputing the chain.
  (audit.list() as unknown as { reason: string }[])[0].reason = "TAMPERED";
  check("tampered chain fails verification", audit.verifyChain() === false);
}

console.log("\n====================================================");
if (fails.length) {
  console.log(`FAILED: ${fails.length} — ${fails.join(", ")}`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
