/**
 * T2 — runnable proof for the ProvenanceClassifier (the trust-spine boundary).
 *   npx tsx src/lib/everlin/verification/provenance.selftest.ts
 * Exits non-zero on any failure so it can gate the merge.
 */
import { classifyProvenance } from "./provenance";

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

section("provenance eval cases");

const cleanOfficial = classifyProvenance({ label: "RBA cash rate target", source: "RBA — Table F1 (Cash Rate Target)", sourceUrl: "https://rba.gov.au" });
check("client-clean: official RBA", cleanOfficial.provenance === "client-clean", cleanOfficial.rationale);

const cleanEcb = classifyProvenance({ label: "AUD/USD exchange rate", source: "European Central Bank (SDMX EXR)", sourceUrl: "https://data-api.ecb.europa.eu" });
check("client-clean: ECB FX", cleanEcb.provenance === "client-clean", cleanEcb.rationale);

const fredIndex = classifyProvenance({ label: "S&P/ASX 200 index", source: "FRED (St. Louis Fed)", sourceUrl: "https://fred.stlouisfed.org" });
check("internal-tos-risk: FRED index level", fredIndex.provenance === "internal-tos-risk", fredIndex.rationale);

const emptySource = classifyProvenance({ label: "VIX", source: "", sourceUrl: null });
check("unverified: empty source (default-deny)", emptySource.provenance === "unverified", emptySource.rationale);

section("red-team — mislabel guard");

// A licensed level dressed up with a clean source string must NOT pass as client-clean.
const goldViaRba = classifyProvenance({ label: "Gold (LBMA)", source: "RBA", sourceUrl: "https://rba.gov.au" });
check("mislabel: Gold via RBA source => internal-tos-risk", goldViaRba.provenance === "internal-tos-risk", goldViaRba.rationale);

const spViaTreasury = classifyProvenance({ label: "S&P 500", source: "US Treasury", sourceUrl: "https://treasury.gov" });
check("mislabel: S&P 500 via Treasury => internal-tos-risk", spViaTreasury.provenance === "internal-tos-risk", spViaTreasury.rationale);

// A scraped/aggregated source is internal-tos-risk even with a non-licensed label.
const scraped = classifyProvenance({ label: "some macro number", source: "aggregated from Yahoo", sourceUrl: "https://finance.yahoo.com" });
check("scraped/yahoo source => internal-tos-risk", scraped.provenance === "internal-tos-risk", scraped.rationale);

// An unknown source fails closed.
const unknown = classifyProvenance({ label: "mystery figure", source: "some random blog", sourceUrl: "https://x.example" });
check("unknown source => unverified (fail closed)", unknown.provenance === "unverified", unknown.rationale);

section("purity");
// classifyProvenance must be deterministic — same input, same output.
const a = classifyProvenance({ label: "RBA cash rate target", source: "RBA F1" });
const b = classifyProvenance({ label: "RBA cash rate target", source: "RBA F1" });
check("deterministic (same in, same out)", JSON.stringify(a) === JSON.stringify(b));

console.log("\n====================================================");
if (fails.length) {
  console.log(`FAILED: ${fails.length} — ${fails.join(", ")}`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
