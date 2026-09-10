/**
 * POST /api/everlin/route  { "query": "..." }
 * Returns the deterministic Everlin skill plan. Test endpoint for the router.
 */
import { NextResponse } from "next/server";
import { route } from "@/lib/everlin/router";

export async function POST(req: Request) {
  const { query } = (await req.json()) as { query?: string };
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });
  return NextResponse.json(route(query));
}
