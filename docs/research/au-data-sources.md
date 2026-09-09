# Australian data sources for Everlin's anti-hallucination retrieval layer

**Purpose.** Find Australian equivalents of the existing SEC EDGAR / US Treasury tools in
`src/lib/data-sources.ts`. The bar is the same: FREE + PUBLIC + machine-readable HTTP + no
ToS landmines, because Everlin is a **client-facing consulting product**. Every figure the
agent states must come from a tool returning a `Fact{...}`.

**Verification note.** All "verified live" claims below were confirmed by an actual HTTP
request on **2026-09-08** from this environment (curl, following redirects). Where a claim
rests only on a provider's published terms page rather than a live data call, it is labelled
accordingly. Secondary blog write-ups were **not** used as sources for any load-bearing
claim; only provider-owned pages, official API docs, and live endpoint responses are cited.

---

## 1. RBA — cash rate + interest rates  ✅ SHIP-SAFE

**Free/licensed:** Free, public, no key, no rate-limit gate observed.
**Auth:** None.
**Format:** CSV (also XLSX). Plain `text/…` served as `application/octet-stream` with
`content-disposition: attachment`.
**Licence / ToS:** Creative Commons Attribution 4.0 International (**CC BY 4.0**). Commercial
reuse and redistribution permitted with attribution "Source: Reserve Bank of Australia" /
"Source: RBA". Attribution must not imply RBA endorsement.
Source: <https://www.rba.gov.au/copyright/>

**⚠ Cash-rate-specific caveat (read this).** The RBA copyright page carves the **Cash Rate**
and **Financial Data** out of the blanket CC BY 4.0 grant with extra conditions: you must not
misrepresent the data and must not charge customers undisclosed fees for access to material
the RBA publishes free ("improper commercial exploitation"). This is *not* a redistribution
ban — a consulting product that surfaces the figure with correct attribution and does not
resell RBA data as a hidden paywalled feed is within terms. Cite it, attribute it, don't
misrepresent it. (Source: same copyright page.)

**Exact endpoints (all verified live, HTTP 200, 2026-09-08):**

- **Table F1 — daily** (best source for the target):
  `https://www.rba.gov.au/statistics/tables/csv/f1-data.csv`
  - Header rows: Title / Description / Frequency / Type / Units / Source / Publication date / Series ID, then dated rows.
  - Column 1 = **Cash Rate Target on date**, Series ID **`FIRMMCRTD`**, units "Per cent", frequency Daily.
  - Column 2 = **Change in the Cash Rate Target**, Series ID **`FIRMMCCRT`** ("as announced").
  - Verified value: Cash Rate Target = **4.35%** on 03/04/07-Sep-2026 rows (08-Sep row present but blank — daily file publishes with a lag).
- **Table F1.1 — monthly averages** (NOT the discrete target; monthly mean):
  `https://www.rba.gov.au/statistics/tables/csv/f1.1-data.csv`
  - Cash Rate Target monthly average, Series ID **`FIRMMCRT`**. Use F1 (daily) for point-in-time target, not F1.1.
- **Table A2 — monetary policy changes** (also live, HTTP 200):
  `https://www.rba.gov.au/statistics/tables/csv/a2-data.csv`
- Human landing pages:
  <https://www.rba.gov.au/statistics/cash-rate/> and
  <https://www.rba.gov.au/statistics/historical-data.html>

**Implementation note.** These CSVs are **not** SEC-style clean JSON. They carry ~8 header/
metadata rows before data, use `dd/mm/yyyy` or `dd-Mon-yyyy` dates, and the daily file may
have a trailing blank latest row. A parser must skip metadata rows and pick the last
non-empty value for the chosen Series ID. Take the last row where `FIRMMCRTD` is non-empty.

---

## 2. ASX-listed equity data (CBA, BHP, CSL) — MIXED

There is **no free, licensed, no-key, redistribution-safe machine-readable feed for live/EOD
ASX prices or fundamentals** equivalent to SEC EDGAR. Breakdown:

### (a) ASX's own data — ❌ LICENSED, paid
ASX price data (equities delayed 20 min, EOD, historical) is a **commercial licensed product**.
Display to end users and redistribution/API delivery both require a paid licence (MarketSource
distribution licence or written ASX approval). ASX directs all access through direct licensing,
licensed distributors, or service providers — there is no free public API.
Sources (ASX-owned): <https://www.asx.com.au/connectivity-and-data/information-services/price-data>
and the ASX Information Services Schedule of Fees
<https://www.asxonline.com/content/dam/asxonline/public/notices/2020/Sept/asx_information_services_schedule_of_fees_2020.pdf>
**Verdict: LEGAL LANDMINE for a consulting product** (redistribution requires a licence).

### (b) Yahoo Finance `query1.finance.yahoo.com` — ⚠ WORKS TECHNICALLY, ToS UNSAFE
**Verified live (2026-09-08):** the undocumented chart endpoint **does** cover ASX tickers.
`GET https://query1.finance.yahoo.com/v8/finance/chart/CBA.AX?range=1d&interval=1d`
→ HTTP 200, JSON, `currency:"AUD"`, `exchangeName:"ASX"`, `regularMarketPrice:158.69`.
**But:** the `v7/finance/quote?symbols=CBA.AX` endpoint returned **HTTP 401 "Unauthorized —
User is unable to access this feature"** — Yahoo is actively crumb-/auth-gating these
endpoints. These are **undocumented internal endpoints with no public API terms**; their use
falls under Yahoo's general Terms of Service, which restrict programmatic/commercial reuse and
redistribution of Yahoo data (Yahoo licenses the underlying data from exchanges/vendors, so it
cannot sub-license it to you for free). The old official YDN API ToS
(<https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apiforydn/index.html>) prohibits
selling/sharing/deriving income from Yahoo APIs without written permission (§1.7.4) — and it
explicitly notes some Yahoo APIs (it names Analytics and Gemini) are governed by *separate*
terms, i.e. there is no clean, finance-specific public grant to rely on.
**Verdict: LEGAL LANDMINE for a client-facing product.** It works, and hobby/personal use is
common, but there is no licence that makes commercial redistribution defensible, and Yahoo is
actively restricting access (the 401 above). Do not ship this in a consulting deliverable.

### (c) Genuinely free + licensed option — NONE FOUND for prices; PARTIAL for filings
- **SEC EDGAR does NOT cover ASX-only companies.** The existing `edgarConcept` tool already
  handles this correctly (it strips `.AX` and returns `value:null` with a "US-listed only"
  note). CBA, BHP, CSL are ASX-primary; only cross-listed entities with SEC filings (e.g. a
  US ADR/20-F filer) would appear, and none of these three file US GAAP 10-Ks.
- **Commercial vendors** (EODHD, Twelve Data, Alpha Vantage, etc.) resell ASX data under
  their own licences with API keys and paid tiers. These are *licensed* (legally clean if you
  pay and stay within their redistribution terms) but **not free and not no-key** — they fail
  the current bar. Not recommended without a commercial decision to license.
- **Company primary filings** (annual reports / ASX announcements) are published by each
  issuer and by ASX's announcements platform, but there is **no free structured
  (XBRL-style) fundamentals API** comparable to SEC's `companyconcept`. Australia has no
  free EDGAR/XBRL equivalent. Fundamentals would have to come from a paid vendor or manual
  extraction — flagged as a gap, **not guessed**.

**Bottom line for equities:** ship **no automated ASX price/fundamentals tool** under the
current free+no-ToS-risk bar. If the client needs it, the only clean path is a **paid,
licensed vendor** (explicit commercial decision) — not Yahoo, not scraping ASX.

---

## 3. ABS — macro data (GDP, CPI) via the Data API (SDMX)  ✅ SHIP-SAFE

**Free/licensed:** Free, public.
**Auth:** **None.** As of 29 Nov 2024 the ABS Data API (Beta) is freely accessible with no API
key. (Source: ABS Data API user guide, below.)
**Format:** SDMX 2.1. Content-negotiated via `Accept` header — all three verified live
(HTTP 200, 2026-09-08) against the CPI dataflow:
- Default (no header) → **SDMX-ML XML** (`application/vnd.sdmx.genericdata+xml`).
- `Accept: application/vnd.sdmx.data+json` → **SDMX-JSON**.
- `Accept: application/vnd.sdmx.data+csv` → **SDMX-CSV** (flat table; columns
  `DATAFLOW,MEASURE,INDEX,TSEST,REGION,FREQ,TIME_PERIOD,OBS_VALUE,UNIT_MEASURE,...`).
  Recommended for a `Fact` tool — easiest to parse; real CPI obs came back, e.g.
  `ABS:CPI(2.0.0),3,30002,10,50,M,2026-07,1.3,PCT` (i.e. a 2026-07 monthly CPI series value).

**Exact base URL (verified live):** `https://data.api.abs.gov.au/rest/`
- Data calls: `https://data.api.abs.gov.au/rest/data/{dataflowId}?...`
  - CPI: `https://data.api.abs.gov.au/rest/data/CPI?lastNObservations=1` → HTTP 200.
  - GDP lives in the National Accounts dataflow (e.g. `ANA_AGG` / quarterly national accounts);
    resolve the exact dataflow ID via the structure endpoint before hardcoding — I did not
    live-verify the GDP dataflow ID, so **do not assume it; look it up first.**
- **Note:** the older host `api.data.abs.gov.au/data/...` has moved to
  `data.api.abs.gov.au/rest/data/...` (host + `/rest/` path both changed). Use the new one.
- A `GET` on `/rest/dataflow/ABS/CPI` returned HTTP 405 in testing — that path/method combo is
  not the data path; use `/rest/data/{id}` for data and the documented structure endpoints for
  metadata. This did not affect data retrieval.

**Licence / ToS:** All ABS website material is **CC BY 4.0** — commercial reuse and
redistribution permitted with attribution to the ABS. Exclusions: ABS logo, Coat of Arms,
trademarks, microdata, third-party content.
Sources (ABS-owned): user guide
<https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide>
and copyright <https://www.abs.gov.au/website-privacy-copyright-and-disclaimer>.

**Status caveat:** still officially **Beta** — ABS states availability "is not guaranteed" and
"may be subject to change." Fine for a `Fact` tool that already degrades to `value:null` on
non-200, but note the beta status to the client.

**Separate, different thing — ABS Indicator API:** `https://indicator.api.abs.gov.au` is a
*different* product and in testing returned **HTTP 403** on an unauthenticated call — it is
registration/key-gated. Use the **Data API** (key-free), not the Indicator API, for the
no-auth bar.

---

## 4. CoreLogic (now "Cotality") & realestate.com.au (REA Group) — ❌ BOTH LEGAL LANDMINES

### CoreLogic / Cotality — ❌ PAID, LICENSED, CONTRACT-GATED
CoreLogic Australia rebranded to **Cotality** (2025 global rebrand; operates RP Data via RP
Data Pty Ltd). It aggregates land-registry / valuer-general records, listings, auction and
rental data and **sells** that back to banks, brokers, valuers, insurers and agents. Access is
**commercially licensed**: a Backstage-based developer portal with OAuth clients against a
restricted evaluation dataset with quotas; production requires a **contract**; **no published
pricing** (per-deal), and docs are sales-gated. There is **no free public property-data feed.**
Sources (Cotality-owned product pages): <https://www.cotality.com/au/products/rp-data> and
<https://www.cotality.com/au/products/commercial-api>.
(The former `corelogic.com.au/legals/terms-and-conditions` now 301-redirects to the Cotality
domain; the Cotality terms path returned 404 at time of check — I could not read the exact
current T&C clause text, so I am *not* quoting one. The paid/licensed/contract-gated posture
is established from Cotality's own product pages, not guessed.)
**Verdict: LEGAL LANDMINE** — paid + licensed + no free data. Do not use without a contract.

### realestate.com.au / REA Group — ❌ ANTI-SCRAPING ToS + ACTIVE LITIGATION
REA's terms of use prohibit using "any automated device, software, process or means to access,
retrieve, scrape, or index" the platform or its content. REA **actively litigates** data
scraping / copyright infringement (federal-court action against rival Domain over scraped
listings) and deploys Cloudflare Enterprise bot-blocking, rate limits, and JS-gated content.
There is no public data API and no free/licensed reuse path.
Sources: REA's litigation is documented at
<https://www.onlinemarketplaces.com/articles/rea-group-sues-domain-for-data-scraping-and-copyright-infringement/>
and the IP dispute reached the High Court
<https://www.minterellison.com/articles/implied-ip-licences-high-court-rules-in-favour-of-realestate-com-au>.
(REA's own `realestate.com.au/legal-notices/` could not be fetched from this environment —
blocked, consistent with their bot-blocking posture — so the exact clause wording is reported
as summarised, not quoted verbatim.)
**Verdict: LEGAL LANDMINE** — explicit anti-scraping ToS + litigious rights-holder. **Do NOT
scrape.** Do not use in a client-facing product.

---

## RECOMMENDATION TABLE

| Source | Data | Free? | Auth | ToS-safe for consulting product? | Exact endpoint |
|---|---|---|---|---|---|
| **RBA Table F1** | Cash rate target (daily) + change | Yes | None | **YES** — CC BY 4.0, attribute "Source: RBA"; don't misrepresent/paywall | `https://www.rba.gov.au/statistics/tables/csv/f1-data.csv` (Series `FIRMMCRTD`) |
| **RBA Table F1.1** | Money-market rates (monthly avg) | Yes | None | **YES** — CC BY 4.0 | `https://www.rba.gov.au/statistics/tables/csv/f1.1-data.csv` |
| **RBA Table A2** | Monetary policy rate changes | Yes | None | **YES** — CC BY 4.0 | `https://www.rba.gov.au/statistics/tables/csv/a2-data.csv` |
| **ABS Data API (Beta)** | CPI, GDP, macro (SDMX) | Yes | None | **YES** — CC BY 4.0; note "beta" | `https://data.api.abs.gov.au/rest/data/{dataflow}` (CPI verified; resolve GDP dataflow first) |
| **ABS Indicator API** | Headline indicators | Yes | **Key/registration** | CAUTION — key-gated (403 unauth); not no-auth | `https://indicator.api.abs.gov.au` |
| **ASX price data** | ASX equity prices/EOD | No | Licence | **NO** — redistribution needs paid licence | (licensed only; no free API) |
| **Yahoo query1** | ASX quotes e.g. CBA.AX | "Free" | crumb/none | **NO** — undocumented, ToS-restricted, actively gated (401 on quote) | `https://query1.finance.yahoo.com/v8/finance/chart/CBA.AX` (works, but unsafe) |
| **Commercial equity vendors** | ASX prices + fundamentals | No | Key + paid | CAUTION — licensed; clean only if paid & within their terms | (vendor-specific) |
| **CoreLogic / Cotality** | Property data/AVM | No | OAuth + contract | **NO** — paid, contract-gated, no free data | `developer.corelogic.asia` (gated) |
| **realestate.com.au / REA** | Property listings | No | — | **NO** — anti-scraping ToS + litigation | (no public API; do NOT scrape) |

### SHIP-SAFE (build `Fact` tools against these now)
- **RBA statistical tables** (F1 daily cash rate target — `FIRMMCRTD`; F1.1; A2) — CC BY 4.0, no key, CSV, live-verified.
- **ABS Data API (Beta)** — CPI/GDP macro, SDMX (use `Accept: application/vnd.sdmx.data+csv`), CC BY 4.0, no key, live-verified. (Look up the GDP dataflow ID before hardcoding.)

### LEGAL LANDMINES (do NOT build against these in a client-facing product)
- **ASX own data** — paid licence for display/redistribution.
- **Yahoo Finance `query1.*`** — works technically for `CBA.AX` but undocumented, ToS-restricted, and actively auth-gated; not defensible commercially.
- **CoreLogic / Cotality** — paid, licensed, contract-gated; no free data.
- **realestate.com.au / REA Group** — explicit anti-scraping ToS, active litigation, bot-blocking. Do not scrape.

### Honest gaps (not verified / not available — stated, not guessed)
- **No free structured ASX fundamentals** (no Australian EDGAR/XBRL equivalent). Fundamentals for CBA/BHP/CSL would need a paid vendor or manual extraction.
- **ABS GDP dataflow ID** not live-verified here — CPI was; resolve the National Accounts dataflow ID via the ABS structure endpoint before wiring it in.
- **Cotality and REA exact current T&C clause text** could not be fetched (404 / host-blocked); the paid-licensed and anti-scraping verdicts rest on their own product pages and documented litigation, not on verbatim clause quotes.
