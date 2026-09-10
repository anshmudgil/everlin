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
import { buildDailyBrief } from "@/lib/everlin/brief-graph";
import { renderBriefPdf } from "@/lib/everlin/pdf/render";
import { MorningBrief } from "@/lib/everlin/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const asOf = url.searchParams.get("asOf") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return NextResponse.json({ error: "asOf=YYYY-MM-DD required" }, { status: 400 });
  }

  const built = await buildDailyBrief(asOf);
  if (!built.ok || !built.brief) {
    return NextResponse.json({ error: "brief build failed", details: built.errors }, { status: 422 });
  }

  // Re-validate through the schema so the renderer gets a typed MorningBrief.
  const parsed = MorningBrief.safeParse(built.brief);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "brief failed schema", details: parsed.error.issues.slice(0, 3) },
      { status: 422 },
    );
  }

  const { pdf, byteHash, bytes } = await renderBriefPdf(parsed.data);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="everlin-brief-${asOf}.pdf"`,
      "X-Brief-Byte-Hash": byteHash,
      "X-Brief-Bytes": String(bytes),
    },
  });
}
