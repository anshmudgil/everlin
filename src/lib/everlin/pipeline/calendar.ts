/**
 * T15 — DST-aware Sydney trading-day calendar with an injectable clock.
 *
 * The cron fires "at ASX open". That requires knowing, in Australia/Sydney time
 * (which shifts AEST<->AEDT), whether today is a trading day and which prior
 * trading day the brief covers. All time reads go through an injected Clock so
 * tests are deterministic (freeze the clock on a known weekend/holiday/DST date).
 *
 * We use Intl (the tz database) for the Sydney conversion rather than a fixed
 * offset — that is what makes it DST-correct without a date library.
 */

export interface Clock {
  now(): Date;
}

export const SystemClock: Clock = { now: () => new Date() };

/** A clock frozen at a fixed instant — for tests. */
export function fixedClock(iso: string): Clock {
  const t = new Date(iso);
  return { now: () => new Date(t.getTime()) };
}

// ASX non-trading public holidays (national + NSW), YYYY-MM-DD in Sydney time.
// Extend per year; this covers the dates a 2026 brief cron needs.
export const ASX_HOLIDAYS_2026 = new Set<string>([
  "2026-01-01", // New Year's Day
  "2026-01-26", // Australia Day
  "2026-04-03", // Good Friday
  "2026-04-06", // Easter Monday
  "2026-04-25", // Anzac Day (observed varies; ASX closes)
  "2026-06-08", // King's Birthday (NSW)
  "2026-12-25", // Christmas
  "2026-12-28", // Boxing Day (observed)
]);

/** The calendar date (YYYY-MM-DD) in Australia/Sydney for a given instant. */
export function sydneyDateString(clock: Clock = SystemClock): string {
  // en-CA gives YYYY-MM-DD; timeZone does the DST-correct conversion.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(clock.now());
}

/** Day of week (0=Sun..6=Sat) in Sydney for a YYYY-MM-DD date string. */
function sydneyWeekday(dateStr: string): number {
  // Interpret the date at noon UTC to avoid tz edge flips, then read Sydney DOW.
  const d = new Date(`${dateStr}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Sydney",
    weekday: "short",
  }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

export function isWeekend(dateStr: string): boolean {
  const wd = sydneyWeekday(dateStr);
  return wd === 0 || wd === 6;
}

export function isHoliday(dateStr: string): boolean {
  return ASX_HOLIDAYS_2026.has(dateStr);
}

/** A trading day = a Sydney weekday that is not an ASX holiday. */
export function isTradingDay(dateStr: string): boolean {
  return !isWeekend(dateStr) && !isHoliday(dateStr);
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** The most recent trading day strictly before `dateStr` (skips weekends+holidays). */
export function priorTradingDay(dateStr: string): string {
  let d = addDays(dateStr, -1);
  let guard = 0;
  while (!isTradingDay(d) && guard < 14) {
    d = addDays(d, -1);
    guard++;
  }
  return d;
}

/**
 * The as-of date a brief generated "now" should cover: today's Sydney date if it
 * is a trading day, otherwise the prior trading day. This is what the cron passes
 * to the pipeline.
 */
export function asOfFor(clock: Clock = SystemClock): string {
  const today = sydneyDateString(clock);
  return isTradingDay(today) ? today : priorTradingDay(today);
}
