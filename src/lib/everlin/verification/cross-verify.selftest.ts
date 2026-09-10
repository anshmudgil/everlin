/**
 * T4 + T6 — runnable proof for CrossVerify + UntrustedRead.
 *   npx tsx src/lib/everlin/verification/cross-verify.selftest.ts
 * Exits non-zero on any failure.
 */
import { crossVerify } from "./cross-verify";
import { readUntrustedText } from "@/lib/everlin/research/untrusted-read";

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

section("T4 cross-verify");

// AUD/USD from RBA + ECB within tolerance => confirmed.
const fx = crossVerify(
  [
    { value: 0.6547, source: "RBA F11.1" },
    { value: 0.6549, source: "ECB EXR" },
  ],
  "AUD/USD exchange rate",
);
check("confirmed within tolerance (RBA+ECB FX)", fx.tier === "confirmed" && fx.crossVerified && fx.canShip, JSON.stringify(fx));

// Cash rate exact match.
const cash = crossVerify([{ value: 4.35, source: "RBA F1" }, { value: 4.35, source: "RBA decisions page" }], "cash rate");
check("cash rate exact => confirmed", cash.tier === "confirmed" && cash.consensusValue === 4.35);

// Conflict beyond tolerance => null value, cannot ship (default-deny).
const conflict = crossVerify([{ value: 4.35, source: "F1 CSV" }, { value: 4.25, source: "decisions page" }], "cash rate");
check("conflict => value null + canShip false", conflict.tier === "conflict" && conflict.consensusValue === null && !conflict.canShip, JSON.stringify(conflict));

// Single official commodity source => single-source, may ship marked.
const oil = crossVerify([{ value: 90.5, source: "EIA" }], "Brent oil");
check("single official source => single-source, canShip", oil.tier === "single-source" && oil.canShip && !oil.crossVerified);

// Same source twice is NOT cross-verification.
const sameSrc = crossVerify([{ value: 100, source: "Yahoo" }, { value: 100, source: "yahoo" }], "index");
check("same source twice => not cross-verified", !sameSrc.crossVerified);

section("T6 untrusted-read (tool-free, #13)");

const realText = "The ASX 200 closed at 9,005.9 on Friday, triple-confirmed across sources.";
// Figure present literally => accepted.
const ok = readUntrustedText({ rawText: realText, outlet: "Investing.com", url: "https://investing.com/x", target: "ASX 200" }, 9005.9);
check("figure present in text => accepted", ok.figure === 9005.9 && !ok.fabricated, JSON.stringify(ok));

// Fabricated figure NOT in text => rejected, stays not-obtained.
const fab = readUntrustedText({ rawText: realText, outlet: "Investing.com", url: "https://investing.com/x", target: "ASX 200" }, 9999);
check("fabricated figure rejected", fab.fabricated === true && fab.figure === null, JSON.stringify(fab));

// No attribution => no claim.
const noAttr = readUntrustedText({ rawText: realText, outlet: "", url: "notaurl", target: "ASX 200" }, 9005.9);
check("no attribution => no claim", noAttr.claim === null);

// Long text truncated to <=200 chars.
const long = "x".repeat(300) + " 42";
const trunc = readUntrustedText({ rawText: long, outlet: "CNBC", url: "https://cnbc.com/y", target: "z" });
check("headline truncated <=200", (trunc.claim?.text.length ?? 999) <= 200, String(trunc.claim?.text.length));

console.log("\n====================================================");
if (fails.length) {
  console.log(`FAILED: ${fails.length} — ${fails.join(", ")}`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
