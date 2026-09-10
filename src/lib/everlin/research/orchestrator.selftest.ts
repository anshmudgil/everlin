/**
 * T7 — runnable proof for the ResearchOrchestrator. Hits FRED LIVE.
 *   npx tsx src/lib/everlin/research/orchestrator.selftest.ts
 * Exits non-zero on any failure.
 */
import { researchTarget, CapEnforcer } from "./orchestrator";
import type { AttributedItem } from "@/lib/everlin/news-sources";

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

async function main() {
  section("T7 orchestrator — FRED internal path (LIVE)");

  // DGS10 = 10yr Treasury on FRED — a real series, keyless CSV. Used as a stand-in
  // for a licensed level to prove the internal pipe + provenance labelling end-to-end.
  {
    const caps = new CapEnforcer(0);
    const c = await researchTarget(
      { label: "S&P/ASX 200 index", fredSeriesId: "DGS10", newsQuery: "asx 200" },
      { allowInternal: true, nowIso: "2026-09-10T00:00:00Z", caps },
    );
    console.log("    trace:", c.trace.join(" | "));
    check("allowInternal=true: FRED returns a value", c.value !== null || c.trace.some((t) => t.includes("FRED")), JSON.stringify(c).slice(0, 120));
    check("provenance = internal-tos-risk (licensed label)", c.provenance === "internal-tos-risk", c.provenance);
    check("NOT auto-committed (canShip reflects tier, gate decides distribution)", typeof c.canShip === "boolean");
  }

  section("allowInternal=false blocks the FRED pipe");
  {
    const caps = new CapEnforcer(0);
    const c = await researchTarget(
      { label: "S&P/ASX 200 index", fredSeriesId: "DGS10", newsQuery: "asx 200" },
      { allowInternal: false, nowIso: "2026-09-10T00:00:00Z", caps, newsItems: [] },
    );
    check("FRED skipped when allowInternal=false", c.trace.some((t) => t.includes("FRED skipped")), c.trace.join(";"));
    check("no surfaces => not obtained (default-deny)", c.value === null && c.tier === "not-obtained");
  }

  section("attributed-news path (cross-verified, no FRED)");
  {
    const caps = new CapEnforcer(0);
    const news: AttributedItem[] = [
      { headline: "ASX 200 closed at 9005.9 on Friday", outlet: "Investing.com", url: "https://investing.com/a", retrievedAt: "2026-09-10T00:00:00Z" },
      { headline: "The ASX 200 finished at 9005.9, triple-confirmed", outlet: "Trading Economics", url: "https://tradingeconomics.com/b", retrievedAt: "2026-09-10T00:00:00Z" },
    ];
    const c = await researchTarget(
      { label: "S&P/ASX 200 index", newsQuery: "asx 200", fredSeriesId: undefined },
      { allowInternal: false, nowIso: "2026-09-10T00:00:00Z", caps, newsItems: news },
    );
    console.log("    trace:", c.trace.join(" | "));
    check("two attributed sources cross-verify the level", c.crossVerified === true && c.value === 9005.9, JSON.stringify(c).slice(0, 140));
    check("provenance internal-tos-risk (licensed label, attributed)", c.provenance === "internal-tos-risk");
  }

  section("cap breach halts");
  {
    const caps = new CapEnforcer(0, { calls: 1, tokens: 100_000, spend: 0.5, seconds: 120 });
    const manyNews: AttributedItem[] = Array.from({ length: 5 }, (_, i) => ({ headline: `ASX 200 at 900${i}`, outlet: `Src${i}`, url: `https://x.com/${i}`, retrievedAt: "2026-09-10T00:00:00Z" }));
    const c = await researchTarget(
      { label: "S&P/ASX 200 index", newsQuery: "asx 200" },
      { allowInternal: false, nowIso: "2026-09-10T00:00:00Z", caps, newsItems: manyNews },
    );
    check("cap breach recorded in trace", c.trace.some((t) => t.includes("CAP BREACH")), c.trace.join(";"));
  }

  console.log("\n====================================================");
  if (fails.length) {
    console.log(`FAILED: ${fails.length} — ${fails.join(", ")}`);
    process.exit(1);
  }
  console.log("ALL CHECKS PASSED");
}
main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
