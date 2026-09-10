/**
 * T19 — Sync on-demand PDF API route.
 *
 * GET /api/everlin/brief-pdf?asOf=YYYY-MM-DD
 * Builds the daily brief for the date and returns the rendered PDF bytes. This
 * is also the real-runtime render path (react-pdf runs server-external here, so
 * it works where a bare `tsx` harness cannot — see T04 note). Deterministic:
 * same asOf + same upstream data => identical bytes (byteHash in the header).
 */
import { NextResponse } from "next/server";
import { buildDailyBriefHeadless } from "@/lib/everlin/pipeline/headless";
import { getBriefStore } from "@/lib/everlin/pipeline/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const asOf = url.searchParams.get("asOf") ?? "";
  const force = url.searchParams.get("force") === "1";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return NextResponse.json({ error: "asOf=YYYY-MM-DD required" }, { status: 400 });
  }

  const store = getBriefStore();
  // Run the full headless pipeline (retrieve -> reason -> assemble -> render -> store).
  // It returns the PDF bytes directly, so we never round-trip through store.get()
  // (which is a network call in prod).
  const result = await buildDailyBriefHeadless(asOf, { store, force, nowIso: new Date().toISOString() });
  if (!result.ok) {
    return NextResponse.json({ error: "brief build failed", details: result.errors }, { status: 422 });
  }

  return new NextResponse(new Uint8Array(result.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="everlin-brief-${asOf}.pdf"`,
      "X-Brief-Byte-Hash": result.byteHash,
      "X-Brief-Bytes": String(result.pdf.length),
      "X-Brief-Deduped": String(result.deduped),
    },
  });
}
