/**
 * Research API (feature branch) — runs the deep-research orchestrator over the
 * brief's licensed gaps and returns, per target, the found figure + its
 * provenance + whether it can enter a CLIENT brief. This route READS + PROPOSES
 * only; it never writes a brief. The client-clean boundary is reported, not
 * bypassed: a figure that is internal-only is shown as such, and the caller must
 * still use an authorised override to include it anywhere client-facing.
 *
 * GET /api/everlin/research?asOf=YYYY-MM-DD
 */
import { NextResponse } from "next/server";
import { researchTarget, CapEnforcer, type ResearchTarget } from "@/lib/everlin/research/orchestrator";
import { classifyProvenance } from "@/lib/everlin/verification/provenance";

export const runtime = "nodejs";
export const maxDuration = 60;

// The licensed gaps the brief marks not-obtained, with a FRED series id (internal
// pipe) and a news query. FRED ids are real series used as internal proxies.
const TARGETS: ResearchTarget[] = [
  { label: "S&P/ASX 200 index", newsQuery: "asx 200 close", fredSeriesId: undefined },
  { label: "S&P 500", newsQuery: "s&p 500 close", fredSeriesId: "SP500" },
  { label: "VIX", newsQuery: "vix close", fredSeriesId: "VIXCLS" },
  { label: "Gold (LBMA)", newsQuery: "gold price close", fredSeriesId: undefined },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const asOf = url.searchParams.get("asOf") ?? "";
  const allowInternal = url.searchParams.get("allowInternal") === "1";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return NextResponse.json({ error: "asOf=YYYY-MM-DD required" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const caps = new CapEnforcer(Date.now());

  const results = [];
  for (const target of TARGETS) {
    const c = await researchTarget(target, { allowInternal, nowIso, caps });
    const prov = c.source ? classifyProvenance({ label: c.label, source: c.source }).provenance : "unverified";
    results.push({
      label: c.label,
      value: c.value,
      tier: c.tier,
      crossVerified: c.crossVerified,
      provenance: prov,
      // The reported client-eligibility: only client-clean + a value may ship
      // client-facing WITHOUT an override.
      clientEligible: prov === "client-clean" && c.value !== null,
      source: c.source,
      asOf: c.asOf,
      trace: c.trace,
    });
    if (caps.breached) break;
  }

  return NextResponse.json({
    asOf,
    allowInternal,
    capBreached: caps.breached,
    results,
    note: "Figures marked internal-only are licensed IP and are BLOCKED from a client brief without an authorised override (owner in {Ansh, Jordan Lin}).",
  });
}
