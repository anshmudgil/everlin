/**
 * Runnable proof for the Everlin wiring. No test runner needed:
 *   npx tsx src/lib/everlin/selftest.ts
 * Exits non-zero on any failure.
 */
import { route } from "./router";
import {
  marginOfSafety, feeDrag, feeDecomposition, irr,
  developmentMargin, feasibilityStress, goingConcernYield,
  reconciliationGrossNet,
} from "./calc";
import { validateOutput, lintText } from "./validate";
import { DISCLAIMER, SCHEMA_BY_SKILL } from "./schemas";

const fails: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS  ${name}`);
  else { console.log(`  FAIL  ${name}  ${detail}`); fails.push(name); }
}
function section(t: string) { console.log(`\n== ${t} ==`); }

// --- router ---------------------------------------------------------------
section("router");
const p1 = route("draft this week's IC briefing for Jordan Lin and Clyde");
check("weekly query -> weekly-ic-brief",
  JSON.stringify(p1.steps.map((s) => s.skillId)) === JSON.stringify(["everlin-weekly-ic-brief"]),
  JSON.stringify(p1.steps.map((s) => s.skillId)));

const p2 = route("turn these meeting notes into actions, then verify the ledger write-back actually landed");
check("multi-skill routes both in stage order",
  JSON.stringify(p2.steps.map((s) => s.skillId)) === JSON.stringify(["everlin-meeting-actions", "everlin-post-write-verify"]),
  JSON.stringify(p2.steps.map((s) => s.skillId)));

const p3 = route("screen this inbound CIM and run manager diligence on the fund");
check("screen+diligence both fire",
  ["everlin-investment-screener", "everlin-manager-diligence"].every((id) => p3.steps.some((s) => s.skillId === id)),
  JSON.stringify(p3.steps.map((s) => s.skillId)));

check("off-topic unrouted", route("what's the weather in Robina").unrouted);

// --- calc -----------------------------------------------------------------
section("calc");
const mos = marginOfSafety(70, 100);
check("MoS = 30", mos.value === 30, String(mos.value));
check("MoS calcKey shaped", /^MOS-[0-9A-F]{8}$/.test(mos.calcKey), mos.calcKey);
const fd = feeDrag(2.0, 1.0);
check("fee_drag flags >2.5%", fd.flags.some((f) => f.includes("ceiling")), JSON.stringify(fd.flags));
const decomp = feeDecomposition({ management: 2.0, carry_equiv: 2.5, admin: 0.3, fund_expenses: 0.2 });
check("PE decomposition = 5.00 and flagged", decomp.value === 5 && decomp.flags.length === 1, JSON.stringify([decomp.value, decomp.flags]));
const r = irr([-100, 0, 0, 0, 0, 201.135]);
check("IRR ~15%", typeof r.value === "number" && r.value > 14 && r.value < 16, String(r.value));
let threw = false;
try { irr([-100, -50, -20]); } catch { threw = true; }
check("IRR undefined throws", threw);
check("dev margin = 30", developmentMargin(13_000_000, 10_000_000).value === 30);
check("feasibility stress fails 20% floor",
  feasibilityStress(13_000_000, 10_000_000).flags.some((f) => f.includes("FAILS")));
check("gc yield = 8", goingConcernYield(800_000, 10_000_000).value === 8);
const rn = reconciliationGrossNet(1000, 1000, [280, -280]);
check("zero-net offsetting-error flagged", rn.flags.some((f) => f.includes("offsetting")), JSON.stringify(rn.flags));

// --- validate gate --------------------------------------------------------
section("validate gate (structured output contract)");

const goodWeekly = {
  envelope: { docId: "EVL-WEEKLY-2026-09-12", band: "Red" },
  weekOf: "8-12 Sep 2026",
  executiveSummary: "Two items need Jordan Lin this week.",
  decisions: [{ number: 1, decision: "Advance Aster to an IC paper?", context: "DDQ outstanding" }],
  crossDomain: [{ signal: "AUD 10yr +40bps", reaches: "Property", why: "may bite Meridian", ownerToTest: "Jordan Hickey" }],
  investmentItems: [{ text: "Aster fee ~1.9% p.a.", source: "pitch", assertion: true }],
  figures: [{ label: "AUD 10yr chg", value: 40, unit: "bps", calcKey: "WK-RATES-0099AA11" }],
  followUps: [{ text: "Confirm FX source", owner: "Jordan Lin", unfilledRole: "FX-source owner" }],
  disclaimer: DISCLAIMER,
};
const v1 = validateOutput("everlin-weekly-ic-brief", goodWeekly,
  "Jordan Lin approves; AUD 10yr +40bps reaches Meridian Rise. Everlin.");
check("valid weekly brief passes", v1.ok, v1.ok ? "" : JSON.stringify(v1.errors));

// guessed number (no calcKey)
const badNum = structuredClone(goodWeekly);
badNum.figures.push({ label: "AUD/USD", value: 0.664, unit: "", calcKey: null as unknown as string } as never);
const v2 = validateOutput("everlin-weekly-ic-brief", badNum);
check("guessed number (no calcKey) rejected", !v2.ok && v2.errors.some((e) => e.includes("calcKey")), JSON.stringify(v2));

// retrieved figure (source, no calcKey) now passes — the retrieved-provenance branch
const retrievedFig = structuredClone(goodWeekly);
retrievedFig.figures.push({ label: "RBA cash rate", value: 4.35, unit: "% p.a.", source: "Source: RBA — Table F1", sourceUrl: "https://www.rba.gov.au/statistics/tables/csv/f1-data.csv", asOf: "09-Sep-2026" } as never);
const vRet = validateOutput("everlin-weekly-ic-brief", retrievedFig,
  "Jordan Lin approves; AUD 10yr +40bps reaches Meridian Rise. Everlin.");
check("retrieved figure (source, no calcKey) passes", vRet.ok, vRet.ok ? "" : JSON.stringify(vRet.errors));

// a true guess (no calcKey AND no source) is still rejected
const guessFig = structuredClone(goodWeekly);
guessFig.figures.push({ label: "AUD/USD guess", value: 0.664, unit: "", calcKey: null as unknown as string } as never);
const vGuess = validateOutput("everlin-weekly-ic-brief", guessFig);
check("guess with neither calcKey nor source rejected", !vGuess.ok && vGuess.errors.some((e) => e.includes("provenance")), JSON.stringify(vGuess.ok));

// IC-paper verdict in a weekly decision
const badVerdict = structuredClone(goodWeekly);
badVerdict.decisions.push({ number: 2, decision: "DECLINE Aster", context: "" });
const v3 = validateOutput("everlin-weekly-ic-brief", badVerdict);
check("PROCEED/DECLINE verdict rejected", !v3.ok && v3.errors.some((e) => e.includes("DECLINE")), JSON.stringify(v3.ok));

// altered disclaimer
const badDisc = { ...goodWeekly, disclaimer: "No advice." };
const v4 = validateOutput("everlin-weekly-ic-brief", badDisc);
check("altered disclaimer rejected", !v4.ok, JSON.stringify(v4.ok));

// bad doc id
const badDoc = structuredClone(goodWeekly);
badDoc.envelope.docId = "WEEKLY-2026";
const v5 = validateOutput("everlin-weekly-ic-brief", badDoc);
check("bad docId rejected", !v5.ok);

// unfilled role wrong owner
const badOwner = structuredClone(goodWeekly);
badOwner.followUps = [{ text: "x", owner: "Lauren Pereira", unfilledRole: "MSP" } as never];
const v6 = validateOutput("everlin-weekly-ic-brief", badOwner);
check("unfilled role wrong owner rejected", !v6.ok);

// morning brief needs a Question for the IC
const mbNoQ = {
  envelope: { docId: "EVL-DAILY-2026-09-12" },
  asOf: "12 Sep", executiveSummary: "x", questionForIC: "",
  disclaimer: DISCLAIMER,
};
check("morning brief without IC question rejected", !validateOutput("everlin-morning-brief", mbNoQ).ok);
const mbOk = { ...mbNoQ, questionForIC: "Regime change or noise?" };
check("morning brief with IC question passes", validateOutput("everlin-morning-brief", mbOk).ok);

// --- text lint ------------------------------------------------------------
section("text lint");
check("clean text passes", lintText("Jordan Lin approves; Everlin is green.").length === 0);
check("'Evelyn' flagged", lintText("Evelyn Family Office").some((p) => p.includes("Evel")));
check("'never write Evelyn' allowed", lintText("Never write Evelyn; the entity is Everlin.").length === 0);
check("bare 'Jordan' flagged", lintText("Jordan will decide.").some((p) => p.includes("Ambiguous")));

// --- the 10 additional skill schemas -------------------------------------
section("all 12 skills have a working schema");

// investment screener: lean signal passes; an IC verdict as signal is rejected
{
  const good = {
    envelope: { docId: "EVL-INV-SCR-2026-07" }, dealName: "Northbridge Robotics",
    signal: "LEAN POSITIVE", frameworkLabel: "Wood",
    figures: [{ label: "MoS", value: 27, unit: "%", calcKey: "MOS-1A2B3C4D" }],
    disclaimer: DISCLAIMER,
  };
  check("investment-screener lean signal passes", validateOutput("everlin-investment-screener", good).ok,
    JSON.stringify(validateOutput("everlin-investment-screener", good)));
  const bad = { ...good, signal: "PROCEED" as string };
  check("investment-screener rejects an IC verdict", !validateOutput("everlin-investment-screener", bad).ok);
}
// manager diligence: unverified track record + a fee-drag flag
check("manager-diligence passes",
  validateOutput("everlin-manager-diligence", {
    managerName: "Meridian Ascent", fundName: "Fund IV",
    feeDecomposition: [{ label: "all-in", value: 5, unit: "% p.a.", calcKey: "FEE_DECOMP-F0D1FBB3" }],
    feeDragFlag: "5.00% > 2.5% ceiling",
    trackRecord: [{ text: "gross 22% IRR", source: "pitch book", assertion: true }],
    disclaimer: DISCLAIMER,
  }).ok);
// meeting prep
check("meeting-prep passes",
  validateOutput("everlin-meeting-prep", {
    meeting: "Harbour Ridge manager call", attendee: "Clyde McConaghy",
    preparedQuestions: ["full fee decomposition?", "liquidity gates?"], unknowns: ["partner background (missing)"],
    disclaimer: DISCLAIMER,
  }).ok);
// meeting actions: follow-up must be unsent
check("meeting-actions passes (follow-up unsent)",
  validateOutput("everlin-meeting-actions", {
    meeting: "IC sync",
    actions: [{ text: "Answer DDQ", owner: "Clyde McConaghy", deadline: "Wed" }],
    followUpDraft: "Team — actions below.", followUpSent: false,
    disclaimer: DISCLAIMER,
  }).ok);
check("meeting-actions rejects a sent follow-up",
  !validateOutput("everlin-meeting-actions", {
    meeting: "IC sync", actions: [], followUpSent: true, disclaimer: DISCLAIMER,
  } as never).ok);
// vendor review needs a process next step
check("vendor-review passes",
  validateOutput("everlin-vendor-review", {
    vendor: "MSP renewal", governanceFlags: ["no Graph access to SoR (Red)"],
    processNextStep: "route to Nick then Lauren — not an approval", disclaimer: DISCLAIMER,
  }).ok);
// document digest
check("document-digest passes",
  validateOutput("everlin-document-digest", {
    document: "Cayman sub doc", questionsForCounsel: ["side-letter conflicts?"],
    disclaimer: DISCLAIMER,
  }).ok);
// pre-booking gap: draft packet only for genuinely-missing
{
  const good = {
    period: "Aug 2026",
    coverage: [{ ref: "s1", classification: "genuinely-missing" }, { ref: "s2", classification: "ambiguous", routedTo: "Kara Arnott" }],
    draftPacketRefs: ["s1"], disclaimer: DISCLAIMER,
  };
  check("pre-booking-gap passes (packet=missing only)", validateOutput("everlin-pre-booking-gap", good).ok,
    JSON.stringify(validateOutput("everlin-pre-booking-gap", good)));
  const bad = { ...good, draftPacketRefs: ["s1", "s2"] }; // s2 is ambiguous, not missing
  check("pre-booking-gap rejects packet with a non-missing ref", !validateOutput("everlin-pre-booking-gap", bad).ok);
}
// post-write verify: indeterminate => overallPass must be false
{
  const bad = {
    batch: "b1",
    results: [{ ref: "w1", outcome: "indeterminate", evidencePath: "read-back" }],
    overallPass: true, disclaimer: DISCLAIMER,
  };
  check("post-write-verify rejects pass with an indeterminate", !validateOutput("everlin-post-write-verify", bad).ok);
  const good = { ...bad, overallPass: false };
  check("post-write-verify passes when indeterminate => fail", validateOutput("everlin-post-write-verify", good).ok);
}
// transfer/duplicate: inter-entity must be escalated
{
  const bad = {
    groups: [{ label: "inter-entity-transfer", refs: ["a", "b"], escalatedTo: null }],
    disclaimer: DISCLAIMER,
  };
  check("transfer-duplicate rejects un-escalated inter-entity", !validateOutput("everlin-transfer-duplicate", bad).ok);
  const good = { groups: [{ label: "inter-entity-transfer", refs: ["a", "b"], escalatedTo: "Nick Johnson / WMS" }], disclaimer: DISCLAIMER };
  check("transfer-duplicate passes when escalated", validateOutput("everlin-transfer-duplicate", good).ok);
}
// reconciliation pack
check("reconciliation-pack passes",
  validateOutput("everlin-reconciliation-pack", {
    account: "Operating AUD",
    grossMovements: [{ label: "gross +", value: 280, unit: "AUD", calcKey: "RECON-AA11BB22" }],
    agedSchedule: [{ item: "unpresented cheque", kind: "timing", ageDays: 5 }],
    signedOff: false, disclaimer: DISCLAIMER,
  }).ok);

// registry completeness: all 12 skills registered
check("12 schemas registered", Object.keys(SCHEMA_BY_SKILL).length === 12, String(Object.keys(SCHEMA_BY_SKILL).length));

// --- summary --------------------------------------------------------------
console.log("\n" + "=".repeat(52));
if (fails.length) { console.log(`FAILED: ${fails.length} — ${JSON.stringify(fails)}`); process.exit(1); }
console.log("ALL CHECKS PASSED");
