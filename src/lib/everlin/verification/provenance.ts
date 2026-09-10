/**
 * T1 — ProvenanceClassifier. The thinnest slice of the deep-research system and
 * the precondition every downstream gate depends on.
 *
 * PURE, read-only, network-free, LLM-free: given a Fact's source/label, it
 * classifies where that figure may go:
 *   - client-clean     — free, official, commercially-usable, non-licensed
 *                        (RBA / ABS / ECB / EIA / US Treasury). May enter a
 *                        client-distributed brief.
 *   - internal-tos-risk — carries licensed IP or a ToS-restricted pipe (FRED,
 *                        Yahoo, keyless crypto, or any licensed-index label).
 *                        Internal view only; the ClientCleanGate (T3) blocks it
 *                        from client distribution without an explicit override.
 *   - unverified       — no source. Default-deny (#8): stays not-obtained.
 *
 * The trust-spine boundary lives here. A licensed label forces internal-tos-risk
 * even when the source string looks official — a scraped ASX 200 dressed up as
 * "RBA" must not pass as client-clean.
 */

export type Provenance = "client-clean" | "internal-tos-risk" | "unverified";

/**
 * Labels whose CONTENT is licensed index / benchmark IP (verified in
 * docs/research/full-brief-data-sources.md). Any figure with one of these labels
 * is internal-tos-risk regardless of how it was sourced. Shared with headless's
 * LICENSED_GAPS so the "not obtained" set and the classifier never diverge.
 */
export const LICENSED_INDEX_LABELS = [
  "S&P/ASX 200 index",
  "S&P 500 / Nasdaq / Dow",
  "S&P 500",
  "Nasdaq",
  "Dow",
  "Dow Jones",
  "TAIEX",
  "FTSE 100",
  "Nikkei",
  "Hang Seng",
  "VIX",
  "Gold (LBMA)",
] as const;

// Source substrings that are free, official, and commercially clean.
const CLIENT_CLEAN_SOURCES = [
  "rba", // Reserve Bank of Australia
  "australian bureau of statistics",
  "abs",
  "european central bank",
  "ecb",
  "u.s. energy information administration",
  "eia",
  "us treasury",
  "treasury fiscal",
  "sec edgar",
];

// Source substrings that are a ToS-restricted / licensed-content pipe. These can
// be used INTERNALLY but never redistributed in a client brief.
const INTERNAL_RISK_SOURCES = [
  "fred", // St. Louis Fed pipe — content is third-party index IP
  "yahoo",
  "coingecko",
  "coinbase",
  "investing.com",
  "trading economics",
  "tradingeconomics",
  "marketscreener",
  "aggregat", // any "aggregated" provenance
  "scrape",
];

export type ProvenanceResult = { provenance: Provenance; rationale: string };

function labelIsLicensed(label: string): boolean {
  const l = label.toLowerCase();
  return LICENSED_INDEX_LABELS.some((x) => l.includes(x.toLowerCase()));
}

/**
 * Classify a figure's provenance from its source + label alone. Pure.
 */
export function classifyProvenance(fact: {
  source: string;
  sourceUrl?: string | null;
  label: string;
}): ProvenanceResult {
  const source = (fact.source ?? "").trim();
  const hay = `${source} ${fact.sourceUrl ?? ""}`.toLowerCase();

  // 1. No source at all => default-deny.
  if (!source) {
    return { provenance: "unverified", rationale: "empty source — default-deny (#8): stays not obtained" };
  }

  // 2. A licensed-index label forces internal-tos-risk even if the source looks
  //    official. This catches a scraped level dressed up with a clean source.
  if (labelIsLicensed(fact.label)) {
    return {
      provenance: "internal-tos-risk",
      rationale: `label '${fact.label}' is licensed index/benchmark IP — internal-only regardless of source`,
    };
  }

  // 3. A ToS-restricted / licensed pipe => internal-tos-risk.
  const riskHit = INTERNAL_RISK_SOURCES.find((s) => hay.includes(s));
  if (riskHit) {
    return {
      provenance: "internal-tos-risk",
      rationale: `source matches ToS-restricted pipe '${riskHit}' — internal-only, not client-redistributable`,
    };
  }

  // 4. A free/official/clean source with a non-licensed label => client-clean.
  const cleanHit = CLIENT_CLEAN_SOURCES.find((s) => hay.includes(s));
  if (cleanHit) {
    return {
      provenance: "client-clean",
      rationale: `official free source '${cleanHit}', non-licensed label — client-distributable`,
    };
  }

  // 5. Unknown source => default-deny (fail closed).
  return { provenance: "unverified", rationale: `source '${source}' not on the clean or known-risk list — default-deny` };
}
