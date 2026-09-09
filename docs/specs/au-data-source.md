# Spec — Australian market-data source (E2 retrieval, AU)

**Status:** DRAFT — awaiting approval
**Date:** 2026-09-08
**Depends on:** `docs/research/au-data-sources.md` (live-verified 2026-09-08)

## Problem
`lib/data-sources.ts` only retrieves US data (SEC EDGAR + US Treasury). Everlin is AU-focused.
Agent says "not obtained" for every AU figure — including the RBA cash rate, which is the
**#1 most-cited AU number in the golden morning briefs** (e.g. "RBA cash rate: 4.35%, held
11/08, unanimous"). That is the biggest coverage gap.

## Scope decision (driven by research + the anti-hallucination contract)
Research found exactly two **ship-safe** AU sources (free, no key, CC BY 4.0, live-verified):
1. **RBA Table F1** — daily cash rate target. THE anchor figure.
2. **ABS Data API** — macro (CPI verified; GDP dataflow needs one lookup).

Everything else is a **legal landmine** (ASX-own = licensed; Yahoo = ToS-restricted + auth-gated;
CoreLogic/REA = contract + anti-scrape litigation). There is **no free ASX fundamentals API**
(no Australian EDGAR).

**Therefore this increment ships:**
- ✅ IN: RBA cash-rate tool (`getAuCashRate`)
- ✅ IN: ABS CPI tool (`getAbsSeries` for `ABS/CPI`)
- ✅ IN: ABS GDP tool (`ANA_AGG`) — verification confirmed it's live + cheap
- ❌ OUT: ASX equity prices / fundamentals — **no ship-safe source.** Agent must keep marking
  these `not obtained`. Faking coverage via Yahoo/scraping would violate the E2 contract AND
  ship a legal landmine. The golden brief itself marks unobtainable figures "NOT OBTAINED
  THIS RUN" — we honour that.

## Design (mirror existing EDGAR/Treasury pattern exactly)
- New fns in `src/lib/data-sources.ts`, each returns a `Fact` (or `value:null` + `note`). Never estimate.
- Wire as `tool()` entries in `src/app/api/chat/route.ts` (`getAuCashRate`, `getAbsSeries`).
- Update `EVERLIN_SYSTEM`: add the AU tools to the tool list; keep "US tools won't have ASX
  companies" but now say RBA cash rate + ABS macro ARE retrievable.
- `next: { revalidate }` caching like the others (cash rate daily → 3600s is fine).

### RBA F1 parsing (CORRECTED by adversarial verification 2026-09-10 — was wrong in v1)
- URL: `https://www.rba.gov.au/statistics/tables/csv/f1-data.csv`
- **11 metadata lines, NOT ~8**: L1 title; L2–L6 Title/Description/Frequency/Type/Units;
  L7–L8 two BLANK separators; L9 Source; L10 Publication date; L11 Series ID; data starts L12.
- Read the **L11 Series ID row** and map `FIRMMCRTD` → its column **by ID, not assumed position**.
- **Take the LAST NON-EMPTY `FIRMMCRTD` value** — the newest date row routinely publishes a
  blank cash rate (appends Total Return Index first). Naive last-row → returns null. (verified:
  09-Sep row blank, 08-Sep = 4.35).
- **LICENCE (corrected): NOT CC BY 4.0.** RBA carves the Cash Rate + "Cash Rate Materials"
  (F1 incl.) into bespoke Section 4 of https://www.rba.gov.au/copyright/ — free for commercial
  use WITH attribution + a mandatory **no-endorsement** disclaimer; bans "improper commercial
  exploitation." Output must emit `source: "Source: RBA 2026"` + a no-endorsement note. Do NOT
  print "CC BY 4.0" for this series.
- Return `value` as % p.a., `asOf` = row date. Surface BOTH decision date (11 Aug) and effective
  date (12 Aug) if cheaply available to avoid date ambiguity.

### ABS parsing (CORRECTED — CPI + GDP both verified live)
- Base: `https://data.api.abs.gov.au/rest/data/{dataflow}/{key}`, header `Accept: application/vnd.sdmx.data+csv`.
- **CPI** verified live: `ABS/CPI`, CPI 2.0.0, 2025-Q2 index 98.43.
- **GDP** now verified: dataflow `ANA_AGG` (National Accounts Key Aggregates), GDP growth
  2025-Q2 = 0.4%, 757 live rows. Ship as a 3rd tool.
- **ABS IS genuinely CC BY 4.0** (verified via ABS copyright page) — attribute "ABS". Do NOT
  inherit RBA's Section-4 terms onto ABS, or vice versa.
- ABS API is **beta** → defensive fetch: retries, timeout, detect 404/HTML-error bodies,
  version-tolerant SDMX parsing (ABS bumps dataflow versions). Assume rate-limiting exists.

### Env note (both tools)
This environment presents an alt-timeline RBA rate history vs training. Tool MUST pin to
RBA/ABS **primary endpoints** and never to search-snippet / AI-summary narratives.

## Acceptance criteria (verify by REAL live calls — not mocks)
1. `getAuCashRate()` live call returns a `Fact` with `value` ≈ 4.35 (the current target), a real
   `asOf` date, `source`/`sourceUrl` pointing at RBA F1. Proven by an actual fetch, output pasted.
2. Parser correctly skips metadata rows AND ignores a trailing blank daily row (returns last
   non-empty `FIRMMCRTD`). Show the pulled row.
3. `getAbsSeries('CPI')` live call returns a real sourced CPI `Fact` (or a clean `not obtained`
   note if the dataflow shifts — never a fabricated number).
4. On failure (HTTP error / blank / missing series) each tool returns `value:null` + a `note`
   saying not-obtained — **never** a guessed figure.
5. Agent, asked "what's the RBA cash rate?", calls the tool and cites
   `[Reserve Bank of Australia — Table F1]`. ASX-stock questions still say not-obtained.
6. `pnpm typecheck` + `pnpm lint` clean. No secret added. No new dependency (native fetch + tiny CSV parse).

## Out of scope / follow-ups
- ASX equities (needs paid vendor) — separate ticket, explicitly not solved here.
- ABS GDP — ships once the dataflow ID is confirmed live (fast follow within this tool).
- Property (CoreLogic Home Value Index) — landmine; do not attempt.
