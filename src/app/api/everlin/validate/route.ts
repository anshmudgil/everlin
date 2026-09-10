/**
 * POST /api/everlin/validate  { "skillId": "everlin-weekly-ic-brief", "output": {...}, "renderedText"?: "..." }
 * Runs the structured output through its skill schema + text lint.
 * 200 { ok:true } if it passes the Everlin contract; 422 { ok:false, errors } otherwise.
 *
 * This is the gate: wire it before an agent output is filed or shown.
 */
import { NextResponse } from "next/server";
import { validateOutput } from "@/lib/everlin/validate";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    skillId?: string;
    output?: unknown;
    renderedText?: string;
  };
  if (!body.skillId) return NextResponse.json({ error: "skillId required" }, { status: 400 });
  const result = validateOutput(body.skillId, body.output, body.renderedText);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
