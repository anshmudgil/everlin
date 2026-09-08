// Everlin E2 — retrieval + source attribution (anti-hallucination core).
// Every returned figure is a Fact carrying its source. The agent may only state
// a figure it got from one of these tools; anything else it must mark "not obtained".
// Sources here are FREE + PUBLIC (no keys, no ToS risk): SEC EDGAR, US Treasury fiscal data.

export type Fact = {
  label: string;
  value: string | number | null; // null => not obtained
  unit?: string;
  source: string; // human-readable provenance, e.g. "SEC EDGAR 10-K FY2024"
  sourceUrl: string;
  asOf?: string;
  note?: string;
};

const UA = "Everlin Family Office research agent (contact: ops@everlin.example)"; // SEC requires a UA

// --- SEC EDGAR: ticker -> CIK, then company financial "concept" (us-gaap) ---
// Fully public. https://www.sec.gov/edgar/sec-api-documentation

let tickerMap: Record<string, { cik_str: number; ticker: string; title: string }> | null = null;

async function resolveCik(ticker: string): Promise<{ cik: string; title: string } | null> {
  if (!tickerMap) {
    const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": UA },
      // cache a day — the map rarely changes
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
    tickerMap = raw;
  }
  const t = ticker.trim().toUpperCase().replace(/\.(AX|US)$/i, "");
  const hit = Object.values(tickerMap).find((r) => r.ticker.toUpperCase() === t);
  if (!hit) return null;
  return { cik: String(hit.cik_str).padStart(10, "0"), title: hit.title };
}

// Pull the most recent annual (FY, USD) value of a us-gaap concept for a company.
export async function edgarConcept(
  ticker: string,
  concept: string,
): Promise<Fact> {
  const base = { label: `${concept} (${ticker.toUpperCase()})`, source: "SEC EDGAR", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar" };
  const resolved = await resolveCik(ticker);
  if (!resolved) {
    return { ...base, value: null, note: `Ticker ${ticker} not found in SEC EDGAR (US-listed only; ASX tickers are not covered here).` };
  }
  const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${resolved.cik}/us-gaap/${concept}.json`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 3600 } });
  if (!res.ok) {
    return { ...base, value: null, sourceUrl: url, note: `Concept ${concept} not reported by ${resolved.title}, or unavailable (HTTP ${res.status}). Not obtained — not estimated.` };
  }
  const data = (await res.json()) as {
    units?: Record<string, { end: string; val: number; fy: number; fp: string; form: string }[]>;
  };
  const usd = data.units?.USD ?? [];
  // most recent annual 10-K figure
  const annual = usd.filter((r) => r.form === "10-K").sort((a, b) => (a.end < b.end ? 1 : -1))[0];
  if (!annual) {
    return { ...base, value: null, sourceUrl: url, note: `No annual (10-K) USD value for ${concept}. Not obtained.` };
  }
  return {
    label: `${resolved.title} — ${concept}`,
    value: annual.val,
    unit: "USD",
    source: `SEC EDGAR 10-K FY${annual.fy}`,
    sourceUrl: url,
    asOf: annual.end,
  };
}

// --- US Treasury daily par yield (public fiscal-data API, no key) ---
export async function treasuryYield(): Promise<Fact> {
  // Endpoint lives under v2, not v1 (v1 returns 404). Verified live 2026-09-08.
  const url =
    "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=1";
  const base = { label: "US Treasury avg interest rate", source: "US Treasury (fiscaldata.treasury.gov)", sourceUrl: url };
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { ...base, value: null, note: `HTTP ${res.status}. Not obtained.` };
    const j = (await res.json()) as { data?: { avg_interest_rate_amt: string; record_date: string; security_desc: string }[] };
    const row = j.data?.[0];
    if (!row) return { ...base, value: null, note: "No rows. Not obtained." };
    return {
      label: `US Treasury avg interest rate — ${row.security_desc}`,
      value: Number(row.avg_interest_rate_amt),
      unit: "% p.a.",
      source: "US Treasury fiscal data",
      sourceUrl: url,
      asOf: row.record_date,
    };
  } catch (e) {
    return { ...base, value: null, note: `Fetch failed (${(e as Error).message}). Not obtained.` };
  }
}
