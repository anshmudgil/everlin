/**
 * T13 harness route — runs the golden determinism + fidelity harness in the real
 * Node runtime (where react-pdf works) and returns the report. A CI check hits
 * this and asserts pass:true.
 */
import { NextResponse } from "next/server";
import { runHarness } from "@/lib/everlin/pdf/harness";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const report = await runHarness();
  return NextResponse.json(report, { status: report.pass ? 200 : 422 });
}
