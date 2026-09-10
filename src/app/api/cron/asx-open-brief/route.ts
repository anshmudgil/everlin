/**
 * T18 — ASX-open cron route.
 *
 * Vercel Cron fires this on a fixed UTC schedule (crons are UTC-only). We pick a
 * UTC time that lands at ~ASX open in BOTH AEST and AEDT and then gate on the
 * Sydney trading calendar (T15) inside the handler: if today (Sydney) is not a
 * trading day, skip. Otherwise build the brief for the correct as-of date
 * (today, or the prior trading day if run off-session) via the headless pipeline
 * (T16), which is idempotent by date, then hand the stored PDF to the delivery
 * seam (T17 — Noop for now; real channels are out of scope).
 *
 * Scheduling note: ASX opens 10:00 Sydney. That is 00:00 UTC in AEST (UTC+10)
 * and 23:00 UTC (prev day) in AEDT (UTC+11). A single UTC cron can't hit 10:00
 * Sydney year-round, so we fire at 23:30 UTC daily and let the calendar gate +
 * asOfFor resolve the correct Sydney trading day. See vercel.json.
 */
import { NextResponse } from "next/server";
import { asOfFor, isTradingDay, sydneyDateString, SystemClock } from "@/lib/everlin/pipeline/calendar";
import { buildDailyBriefHeadless } from "@/lib/everlin/pipeline/headless";
import { getBriefStore } from "@/lib/everlin/pipeline/store";
import { getDeliveryAdapter } from "@/lib/everlin/delivery/adapter";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run() {
  const clock = SystemClock;
  const sydToday = sydneyDateString(clock);

  // Gate: skip weekends + ASX holidays.
  if (!isTradingDay(sydToday)) {
    return { skipped: true, reason: "not an ASX trading day", sydneyDate: sydToday };
  }

  const asOf = asOfFor(clock); // today if trading, else prior trading day
  const store = getBriefStore();
  const built = await buildDailyBriefHeadless(asOf, { store, nowIso: new Date().toISOString() });
  if (!built.ok) {
    return { skipped: false, ok: false, asOf, errors: built.errors };
  }

  // Durable idempotency: the store's has(date) already gated the build. If this
  // run deduped, the brief for this date was produced on a prior invocation, so
  // do NOT deliver again — that is what prevents a cron retry from double-sending
  // once a real channel replaces Noop. Use the PDF from the build result
  // directly (not store.get, which is a network round-trip in prod).
  if (built.deduped) {
    return { skipped: false, ok: true, asOf, byteHash: built.byteHash, deduped: true, delivery: { ok: true, channel: "noop", deduped: true } };
  }
  const delivery = await getDeliveryAdapter("noop").deliver({
    docId: `EVL-DAILY-${asOf}`,
    date: asOf,
    pdf: built.pdf,
    byteHash: built.byteHash,
    subject: `Everlin Morning Brief ${asOf}`,
  });

  return { skipped: false, ok: true, asOf, byteHash: built.byteHash, deduped: false, delivery };
}

/** Vercel Cron issues GET. Also allow POST for manual trigger. */
export async function GET() {
  return NextResponse.json(await run());
}
export async function POST() {
  return NextResponse.json(await run());
}
