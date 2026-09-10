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

// --- RBA Table F1: Australian cash rate target (public CSV, no key) ---
// Licence note: the Cash Rate + "Cash Rate Materials" (F1 included) are carved OUT of the RBA's
// CC BY 4.0 grant into a bespoke Section 4 (https://www.rba.gov.au/copyright/). Commercial use is
// permitted with attribution to the RBA. We attribute "RBA — Table F1" and do NOT label this
// "CC BY 4.0" (that label belongs to ABS data, not this series).
const RBA_F1_URL = "https://www.rba.gov.au/statistics/tables/csv/f1-data.csv";

export async function auCashRate(): Promise<Fact> {
  const base = {
    label: "RBA cash rate target",
    source: "RBA — Table F1 (Cash Rate Target)",
    sourceUrl: RBA_F1_URL,
  };
  try {
    const res = await fetch(RBA_F1_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return { ...base, value: null, note: `HTTP ${res.status}. Not obtained — not estimated.` };
    const text = await res.text();
    const rows = text.split(/\r?\n/).map((line) => splitCsv(line));

    // Find the "Series ID" metadata row and locate the FIRMMCRTD column by ID (not by position).
    const idRow = rows.find((r) => r[0]?.trim() === "Series ID");
    if (!idRow) return { ...base, value: null, note: "RBA F1 format changed: no 'Series ID' header row. Not obtained." };
    const col = idRow.findIndex((c) => c.trim() === "FIRMMCRTD");
    if (col < 0) return { ...base, value: null, note: "RBA F1 format changed: FIRMMCRTD series not found. Not obtained." };

    // Data rows are those whose first cell parses as a date (dd-Mon-yyyy). Take the LAST NON-EMPTY
    // FIRMMCRTD value — the newest date row routinely publishes a blank cash rate (index appended first).
    const dataRows = rows.filter((r) => /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(r[0]?.trim() ?? ""));
    let lastGood: { date: string; val: string } | null = null;
    for (const r of dataRows) {
      const v = r[col]?.trim();
      if (v) lastGood = { date: r[0].trim(), val: v };
    }
    if (!lastGood) return { ...base, value: null, note: "No non-empty cash-rate value in RBA F1. Not obtained." };

    return {
      label: "RBA cash rate target",
      value: Number(lastGood.val),
      unit: "% p.a.",
      source: "RBA — Table F1 (Cash Rate Target)",
      sourceUrl: RBA_F1_URL,
      asOf: lastGood.date,
    };
  } catch (e) {
    return { ...base, value: null, note: `Fetch failed (${(e as Error).message}). Not obtained.` };
  }
}

// --- RBA Table F11.1: exchange rates (public CSV, no key) ---
// Same format family as F1 (auCashRate): metadata rows, a "Series ID" row, then dated data rows.
// Verified live 2026-09-10: metadata rows are Title/Description/Frequency/Type/Units/(2 blank)/Source/
// Publication date/Series ID; AUD/USD is Series ID "FXRUSD" (first data column). The newest date rows
// can be blank, so we take the LAST NON-EMPTY FXRUSD value, locating the column by ID (not position).
const RBA_F11_URL = "https://www.rba.gov.au/statistics/tables/csv/f11.1-data.csv";

export async function auFxRate(): Promise<Fact> {
  const base = {
    label: "AUD/USD exchange rate",
    source: "RBA — Table F11.1 (Exchange Rates)",
    sourceUrl: RBA_F11_URL,
  };
  try {
    const res = await fetch(RBA_F11_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return { ...base, value: null, note: `HTTP ${res.status}. Not obtained — not estimated.` };
    const text = await res.text();
    const rows = text.split(/\r?\n/).map((line) => splitCsv(line));

    // Find the "Series ID" metadata row and locate the FXRUSD column by ID (not by position).
    const idRow = rows.find((r) => r[0]?.trim() === "Series ID");
    if (!idRow) return { ...base, value: null, note: "RBA F11.1 format changed: no 'Series ID' header row. Not obtained." };
    const col = idRow.findIndex((c) => c.trim() === "FXRUSD");
    if (col < 0) return { ...base, value: null, note: "RBA F11.1 format changed: FXRUSD series not found. Not obtained." };

    // Data rows are those whose first cell parses as a date (dd-Mon-yyyy). Take the LAST NON-EMPTY
    // FXRUSD value — the newest date row may publish a blank rate (e.g. weekends/holidays).
    const dataRows = rows.filter((r) => /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(r[0]?.trim() ?? ""));
    let lastGood: { date: string; val: string } | null = null;
    for (const r of dataRows) {
      const v = r[col]?.trim();
      if (v) lastGood = { date: r[0].trim(), val: v };
    }
    if (!lastGood) return { ...base, value: null, note: "No non-empty AUD/USD value in RBA F11.1. Not obtained." };

    return {
      label: "AUD/USD exchange rate",
      value: Number(lastGood.val),
      unit: "USD per AUD",
      source: "RBA — Table F11.1 (Exchange Rates)",
      sourceUrl: RBA_F11_URL,
      asOf: lastGood.date,
    };
  } catch (e) {
    return { ...base, value: null, note: `Fetch failed (${(e as Error).message}). Not obtained.` };
  }
}

// --- U.S. EIA petroleum spot prices (public domain; requires a FREE API key) ---
// EIA v2 API. Facet codes VERIFIED live 2026-09-10 against
// https://api.eia.gov/v2/petroleum/pri/spt/facet/product/ :
//   Brent = product facet "EPCBRENT" (UK Brent Crude Oil)
//   WTI   = product facet "EPCWTI"   (WTI Crude Oil)
// (These are the v2 product-facet codes; they are NOT the old-API series names RBRTE/RWTC.)
// The key is read from process.env.EIA_API_KEY. If it is missing we return an honest not-obtained
// Fact (value:null) rather than throwing — no key is ever hardcoded.
const EIA_SPOT_BASE = "https://api.eia.gov/v2/petroleum/pri/spt/data/";
const EIA_PRODUCTS: Record<"brent" | "wti", { facet: string; label: string }> = {
  brent: { facet: "EPCBRENT", label: "Brent crude spot" },
  wti: { facet: "EPCWTI", label: "WTI crude spot" },
};

export async function eiaOil(product: "brent" | "wti"): Promise<Fact> {
  const spec = EIA_PRODUCTS[product];
  // Public sourceUrl NEVER contains the key.
  const sourceUrl = `${EIA_SPOT_BASE}?frequency=daily&data[0]=value&facets[product][]=${spec.facet}`;
  const base = { label: spec.label, source: "U.S. EIA (public domain)", sourceUrl };

  const key = process.env.EIA_API_KEY;
  if (!key) {
    return { ...base, value: null, note: "EIA_API_KEY not set — oil price not obtained (set the key to enable)." };
  }

  const url =
    `${EIA_SPOT_BASE}?api_key=${encodeURIComponent(key)}` +
    `&frequency=daily&data[0]=value&facets[product][]=${spec.facet}` +
    `&sort[0][column]=period&sort[0][direction]=desc&length=5`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { ...base, value: null, note: `EIA API HTTP ${res.status}. Not obtained — not estimated.` };
    const j = (await res.json()) as {
      response?: { data?: { period: string; value: number | string | null }[] };
    };
    const data = j.response?.data ?? [];
    // Sorted newest-first; take the newest row that carries a real numeric value.
    let latest: { period: string; val: number } | null = null;
    for (const row of data) {
      if (row.value === null || row.value === undefined || row.value === "") continue;
      const n = Number(row.value);
      if (Number.isNaN(n)) continue;
      latest = { period: row.period, val: n };
      break;
    }
    if (!latest) return { ...base, value: null, note: "No non-empty EIA spot observation. Not obtained." };
    return {
      label: spec.label,
      value: latest.val,
      unit: "USD/bbl",
      source: "U.S. EIA (public domain)",
      sourceUrl,
      asOf: latest.period,
    };
  } catch (e) {
    return { ...base, value: null, note: `Fetch failed (${(e as Error).message}). Not obtained.` };
  }
}

// Minimal CSV field splitter (handles the quoted commas in RBA/ABS descriptions).
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// --- ABS Data API (SDMX, public, no key since 2024-11, genuinely CC BY 4.0) ---
// Base moved to data.api.abs.gov.au/rest. We request CSV for easy parsing. API is officially
// beta → fetch defensively (detect non-CSV error bodies, mark not-obtained on trouble).
const ABS_BASE = "https://data.api.abs.gov.au/rest/data";

// Known dataflows (verified live 2026-09-10):
//   CPI: dataflow "CPI", key 1.10001.10.50.Q  (All groups CPI, index, Australia, quarterly)
//   GDP: dataflow "ANA_AGG" (National Accounts key aggregates)
// Keys verified live 2026-09-10 against the ABS SDMX API.
//   CPI: dataflow "CPI", key 1.10001.10.50.Q  (All groups CPI, index numbers, Australia, quarterly)
//   GDP: dataflow "ANA_AGG", key M2.GPM_PCA.20.AUS.Q  (GDP growth, % change per quarter)
const ABS_SERIES: Record<string, { dataflow: string; key: string; label: string; unit: string }> = {
  CPI: { dataflow: "CPI", key: "1.10001.10.50.Q", label: "ABS CPI (All groups, index, Australia)", unit: "index" },
  GDP: { dataflow: "ANA_AGG", key: "M2.GPM_PCA.20.AUS.Q", label: "ABS GDP (growth, % change per quarter, Australia)", unit: "% q/q" },
};

export async function absSeries(name: keyof typeof ABS_SERIES | string): Promise<Fact> {
  const spec = ABS_SERIES[name as string];
  const base = { label: `ABS ${name}`, source: "Australian Bureau of Statistics (CC BY 4.0)", sourceUrl: ABS_BASE };
  if (!spec) return { ...base, value: null, note: `Unknown ABS series '${name}'. Not obtained.` };
  const url = `${ABS_BASE}/${spec.dataflow}/${spec.key}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.sdmx.data+csv" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { ...base, value: null, sourceUrl: url, note: `ABS API HTTP ${res.status} (beta). Not obtained.` };
    const text = await res.text();
    // Defensive: a CSV response has a header line with commas; an HTML/JSON error body won't parse as our CSV.
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2 || !lines[0].includes(",")) {
      return { ...base, value: null, sourceUrl: url, note: "ABS API returned a non-CSV/error body. Not obtained." };
    }
    const header = splitCsv(lines[0]).map((h) => h.trim());
    const timeIdx = header.findIndex((h) => /^TIME_PERIOD$/i.test(h));
    const valIdx = header.findIndex((h) => /^(OBS_VALUE|value)$/i.test(h));
    if (valIdx < 0 || timeIdx < 0) {
      return { ...base, value: null, sourceUrl: url, note: "ABS CSV missing OBS_VALUE/TIME_PERIOD column. Not obtained." };
    }
    // Rows are NOT reliably time-sorted (CPI returns descending, GDP ascending). Pick the
    // observation with the MAX TIME_PERIOD that has a non-empty value. Note: "0" is a valid
    // value, so test for empty-string, not falsiness.
    let latest: { time: string; val: string } | null = null;
    for (const line of lines.slice(1)) {
      const cells = splitCsv(line);
      const t = cells[timeIdx]?.trim();
      const v = cells[valIdx]?.trim();
      if (!t || v === undefined || v === "") continue;
      if (!latest || t > latest.time) latest = { time: t, val: v }; // ISO-ish "2026-Q2" compares lexicographically
    }
    if (!latest) return { ...base, value: null, sourceUrl: url, note: "No non-empty ABS observation. Not obtained." };
    return {
      label: spec.label,
      value: Number(latest.val),
      unit: spec.unit,
      source: "Australian Bureau of Statistics (CC BY 4.0)",
      sourceUrl: url,
      asOf: latest.time,
    };
  } catch (e) {
    return { ...base, value: null, sourceUrl: url, note: `Fetch failed (${(e as Error).message}). Not obtained.` };
  }
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

// --- ECB Data Portal (SDMX) — official EU FX reference rates (T00b) ---------
// Clean-redistribution FX backup for AUD/USD. ECB publishes vs EUR only, so
// AUD/USD is derived by crossing the two EUR legs (EUR/USD ÷ EUR/AUD... i.e.
// AUD/USD = (EUR/USD) / (EUR/AUD), and ECB gives USD-per-EUR and AUD-per-EUR).
// ToS: free reuse incl. commercial with "Source: European Central Bank".
// Verified live 2026-09-10 in docs/research/full-brief-data-sources.md.
const ECB_BASE = "https://data-api.ecb.europa.eu/service/data/EXR/D";
async function ecbLeg(currency: "USD" | "AUD"): Promise<{ v: number; date: string } | null> {
  const url = `${ECB_BASE}.${currency}.EUR.SP00.A?lastNObservations=1&format=csvdata`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const text = await res.text();
  // csvdata: header row then one data row; TIME_PERIOD + OBS_VALUE columns.
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const header = lines[0].split(",");
  const tIdx = header.indexOf("TIME_PERIOD");
  const vIdx = header.indexOf("OBS_VALUE");
  if (tIdx < 0 || vIdx < 0) return null;
  const cells = lines[1].split(",");
  const v = Number(cells[vIdx]);
  if (!Number.isFinite(v)) return null;
  return { v, date: cells[tIdx] };
}

/**
 * AUD/USD derived from ECB reference rates (USD-per-EUR ÷ AUD-per-EUR).
 * Backup for the RBA F11.1 primary (auFxRate). Honest not-obtained on failure.
 */
export async function ecbFxRate(): Promise<Fact> {
  const base = {
    label: "AUD/USD exchange rate (ECB derived)",
    source: "European Central Bank (SDMX EXR)",
    sourceUrl: `${ECB_BASE}.USD.EUR.SP00.A`,
  };
  try {
    const [usd, aud] = await Promise.all([ecbLeg("USD"), ecbLeg("AUD")]);
    if (!usd || !aud) return { ...base, value: null, note: "ECB EXR leg unavailable. Not obtained." };
    // USD per EUR ÷ AUD per EUR = USD per AUD.
    const audUsd = usd.v / aud.v;
    return {
      label: "AUD/USD exchange rate (ECB derived)",
      value: Number(audUsd.toFixed(4)),
      unit: "USD per AUD",
      source: "European Central Bank (SDMX EXR, derived)",
      sourceUrl: `${ECB_BASE}.USD.EUR.SP00.A`,
      asOf: usd.date,
      note: `Derived: USD/EUR ${usd.v} ÷ AUD/EUR ${aud.v}.`,
    };
  } catch (e) {
    return { ...base, value: null, note: `ECB fetch failed (${(e as Error).message}). Not obtained.` };
  }
}

/**
 * FX with fallback: RBA F11.1 primary, ECB derived backup. Used by the brief so
 * a single RBA outage doesn't blank AUD/USD. Licensed index levels are NOT here
 * — those stay not-obtained by design.
 */
export async function auFxRateWithBackup(): Promise<Fact> {
  const primary = await auFxRate();
  if (primary.value !== null) return primary;
  const backup = await ecbFxRate();
  return backup;
}

// --- FRED keyless CSV (INTERNAL-ONLY retrieval) -----------------------------
// FRED is a free St. Louis Fed *pipe*, but much of its content is third-party
// index IP (S&P DJI, CBOE, Nasdaq). Per docs/research/full-brief-data-sources.md
// it is fine for INTERNAL research, NOT for a client brief. So fredSeries()
// returns a Fact whose source names FRED — the ProvenanceClassifier will label
// it internal-tos-risk, and the ClientCleanGate blocks it from client
// distribution without an override. Used only by the research orchestrator.
const FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv";

export async function fredSeries(seriesId: string, label: string): Promise<Fact> {
  const url = `${FRED_CSV}?id=${encodeURIComponent(seriesId)}`;
  const base = { label, source: `FRED (St. Louis Fed) series ${seriesId}`, sourceUrl: url };
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { ...base, value: null, note: `HTTP ${res.status}. Not obtained.` };
    const text = await res.text();
    const rows = text.trim().split(/\r?\n/).slice(1); // drop header
    // Take the last row with a non-empty numeric value.
    let last: { date: string; val: number } | null = null;
    for (const r of rows) {
      const [date, raw] = r.split(",");
      const v = Number(raw);
      if (raw && Number.isFinite(v)) last = { date, val: v };
    }
    if (!last) return { ...base, value: null, note: "No numeric FRED value. Not obtained." };
    return { label, value: last.val, unit: "", source: `FRED (St. Louis Fed) series ${seriesId}`, sourceUrl: url, asOf: last.date, note: "INTERNAL-ONLY: FRED pipe carries third-party index IP." };
  } catch (e) {
    return { ...base, value: null, note: `FRED fetch failed (${(e as Error).message}). Not obtained.` };
  }
}
