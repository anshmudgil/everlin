# Implementation Plan - Everlin Deterministic PDF Morning Brief + ASX-Open Cron

**Status:** DESIGN for approval. Authored by a 5-architect workflow (AI, Systems, Workflow, Design, Engineering) synthesized by a lead architect, grounded in the client golden PDF (Everlin_Morning_Brief_07-09-2026.pdf) + current code.

## Overview
A single deterministic-template-plus-validated-data pipeline that renders the Everlin Morning Brief to a fixed 3-page PDF, carries schema-backed per-section reasoning (THE FACTS / THE INTERPRETATION), and fires at ASX open. The immutable half is code: a pinned @react-pdf/renderer component tree (React-19 compatibility spike-gated, pinned-pdfkit fallback) with embedded fonts, frozen design tokens, and a vernacular registry. The variable half is data: figures flow from the existing Fact tools mapped verbatim into Figures (never model-guessed, per the trust-spine rule already in schemas.ts), and the one narrative slot per section is produced by a pure, temperature=0, tool-free function. Determinism is PROVEN, not asserted: a golden harness renders a frozen fixture N times and asserts an identical PDF byte-hash (self-consistency), then diffs extracted text/structure/vernacular against the client's committed golden PDF (fidelity), then similarity-gates the narrative plane. A reconciliation node and a deterministic reasoning-trace builder add per-section provenance without any second LLM call or HITL gate (kept lean; approval/delivery are seams for later). Vercel Cron at a fixed UTC time, corrected to Australia/Sydney at runtime with a holiday-skip and an injectable clock, drives a headless build that writes to a date-keyed BriefStore and hands off to a Noop delivery-adapter seam (email/SMS/Teams/SharePoint stubbed, OUT of scope). Streaming is an additive per-node progress upgrade over the existing route.ts writer, leaving the working chat/canvas flow and the synchronous cron path intact. The critical, honestly-stated caveat: a PDF produced by our renderer will not byte-match the client's own-tool golden file — so we guarantee byte-identity run-to-run on a pinned environment plus structural/vernacular fidelity to the golden, and scope every claim to the plane actually tested."}
</invoke>


## Locked decisions (from user)
- Deterministic template + LLM/tool data + per-section reasoning trace. Same inputs => byte-identical PDF.
- Scope THIS plan: PDF fidelity + determinism + reasoning + ASX-open cron + streaming upgrade. Delivery channels (email/SMS/Teams/SharePoint) = SEAM only, deferred.
- Cron trigger: ASX open ~10:00 Australia/Sydney, DST-aware.

## Architecture decisions
- **Determinism model = fixed code template + validated data. The brief's layout, section order, vernacular scaffolding, and design to** - Directly encodes the user's locked model and the existing trust-spine rule in schemas.ts (a Figure must cite calcKey|source|missing, never a model guess). Byte-identity is impossible if layout is LLM-generated; it is ach
- **PDF renderer = @react-pdf/renderer (primitive-based, server-side), NOT Playwright/Puppeteer and NOT pdfkit-by-hand. Pin an EXACT v** - Resolves the five-architect split (pdfkit vs Playwright vs Handlebars+pdfkit vs react-pdf vs jsPDF). Headless-Chromium (Playwright/Puppeteer) is explicitly non-deterministic across Chromium/OS/font-fallback and heavy in 
- **Narrative model stays on the AI SDK gateway with temperature=0 and a locked prompt, invoked as a PURE function over already-retrie** - Resolves the qwen-vs-Claude conflict without over-committing. Determinism does NOT come from the model (temp=0/seed are best-effort, not a guarantee across gateway model versions); it comes from (a) figures being non-LLM
- **Reasoning trace is STRUCTURED data on an extended schema (per-section facts[] + interpretation), authored deterministically from r** - The golden carries per-section provenance + interpretation as visible text — so it must be schema-backed and rendered, resolving the design architect's 'visible vs metadata' open question toward visible-primary. Current 
- **No HITL approval gate and no verify-loop in the cron path for this scope. Cross-source 'verify' is a deterministic reconciliation ** - Four of five architects favored a lean topology; only the workflow architect added Supabase HITL + publish gate, which pulls in a DB dependency, serverless-timeout risk, and non-determinism (LLM re-judgement). The user's
- **Cron = Vercel Cron at fixed UTC (single daily trigger), with DST correction done in code via a Sydney-timezone conversion + an emb** - All architects converged on Vercel Cron over node-cron/external schedulers (no extra service, matches the Next runtime). Vercel Cron has no TZ-aware syntax, so ASX-open (~10:00 Australia/Sydney, AEST/AEDT) is resolved at
- **Streaming upgrade is ADDITIVE and isolated: keep the existing createUIMessageStream/writer.merge/data-artifact path in route.ts un** - route.ts already uses writer.merge + a data-artifact part the canvas reads (verified lines 285-298). Rewriting it risks the working chat/canvas flow. Emitting retrieve/assemble/verify/validate deltas via the graph's nati
- **A frozen-fixture golden harness is the acceptance gate and must be built EARLY (Phase 2), not last: (1) determinism = render the s** - The QA bar (CLAUDE.md) forbids claiming 'byte-identical' without the command that proves it. Byte-hash equality IS the determinism proof and must exist before we assert determinism. The client golden PDF is NOT currently

## Conflicts resolved (architect disagreements)
- **Tension:** Renderer: pdfkit (AI architect) vs Playwright/headless-Chromium (systems architect) vs Handlebars+pdfkit (workflow architect) vs @react-pdf/
  - **Resolution:** @react-pdf/renderer, pinned exact-version with embedded subsetted fonts and fixed PDF metadata/ID. Playwright rejected: headless-Chromium is non-deterministic across versions/OS/subpixel and heavy in a serverless function — fails byte-identity, the hard requirement. pdfkit/jsPDF 
- **Tension:** Narrative model: keep qwen3.7-flash (cheap, current) vs upgrade to Anthropic Claude (AI architect: better tone/determinism).
  - **Resolution:** Decoupled. Determinism does not depend on the model (temp=0/seed are not cross-version byte guarantees), so model choice is a quality lever handled via the MODELS map in route.ts, spec'd but not blocking. Narrative is gated by golden text-similarity + vernacular lint, not byte-ha
- **Tension:** Topology: lean retrieve->assemble->validate+render (AI/systems/design/engineering) vs 7-node retrieve->verify->assemble->render->validate->h
  - **Resolution:** Lean wins for this scope. HITL approval + publish gate pull in a DB, serverless-timeout risk, and LLM re-judgement non-determinism, all outside the locked scope (delivery is OUT, spec-only). 'verify' is kept but reframed as a DETERMINISTIC reconciliation/coherence + source-livene
- **Tension:** Reasoning trace placement: visible per-section text (design shows golden format) vs hidden XMP metadata only (design alt) vs separate post-v
  - **Resolution:** All three, layered. It is a structured object produced by a post-validate node (engineering/AI), it is RENDERED visibly because the golden shows THE FACTS./THE INTERPRETATION. per section (primary), and it is ALSO mirrored into XMP metadata for machine re-use (optional, non-load-
- **Tension:** Determinism proof method: SHA-256 byte-hash (design/engineering) vs text+structure diff (AI/systems) vs pixel-diff (rejected by several).
  - **Resolution:** Byte-hash for DETERMINISM (same input -> identical bytes, the literal requirement); text+structure+vernacular extraction diff for FIDELITY vs the client golden (robust to benign rendering deltas the golden PDF may have from a different tool); narrative text-similarity for the one
- **Tension:** Storage/persistence: Vercel KV + local adapter keyed by date (systems) vs S3/Blob + Supabase approval table (workflow) vs log-and-return onl
  - **Resolution:** A minimal BriefStore behind an interface: filesystem/tmp for dev, Vercel Blob for prod, keyed by trading date, storing {briefJson, pdfBuffer, byteHash, generatedAt}. No Supabase (that came with the rejected HITL gate). The store is the idempotency + audit substrate the cron and t

## Phases
- **P0 Ground truth** - Unblock everything: get the client's golden PDF into the repo as the baseline and derive the fidelity checklist + frozen render fixture. Without this, 'byte-identical to the golden' cannot be defined or proven.
- **P1 Fidelity — deterministic template engine** - A pinned @react-pdf/renderer (spike-gated, pdfkit fallback) pipeline with embedded fonts, frozen design tokens + vernacular registry, a SectionReasoning schema extension, all golden section components, and a render orchestrator returning {buffer, byteHash}. Renders the fixture into a visually faithful 3-page brief.
- **P2 Determinism + reasoning** - Deterministic verify/reconciliation + reasoning-trace builder + pure temp=0 narrative function, and the golden harness proving (a) identical byte-hash across N runs, (b) structural/vernacular fidelity vs the golden, (c) narrative similarity. This is where 'deterministic' becomes a verified claim, not an aspiration.
- **P3 Pipeline + storage + calendar** - buildDailyBriefHeadless end-to-end entry, BriefStore (fs/Blob, date-keyed, idempotent), and the DST-aware Sydney trading-day calendar with an injectable clock.
- **P4 Cron + delivery seam** - Vercel Cron at ASX open (fixed UTC + runtime tz + holiday-skip), the sync PDF route, and the delivery-adapter interface/registry/Noop with channel stubs (delivery itself OUT of scope).
- **P5 Streaming upgrade** - Additive per-node progress + reasoning-trace streaming through the existing route.ts writer, leaving the working chat/canvas flow and the synchronous cron path intact.

## Risks
| Risk | Impact | Mitigation |
| --- | --- | --- |
| @react-pdf/renderer peer-dep / runtime incompatibility with React 19.2 + Next 16 (react-pd | Blocks the entire fidelity phase if discovered late; a mid-project renderer swap is expensive. | Phase-1 compatibility SPIKE before building section components. If it fails, fall back to pinned pdfkit with a |
| The client golden PDF is not in the repo, so 'byte-identical to the golden' and fidelity h | Determinism/fidelity cannot be defined or gated; work proceeds against a guessed target. | Phase 0 blocker: acquire and commit the golden PDF + a frozen fixture that should reproduce it, and derive the |
| Byte-identity within an environment does not imply byte-identity ACROSS environments (font | Over-claiming 'byte-identical to the golden' when we can only guarantee 'byte-identical run-to-run in a pinned env' and 'structurally/vernacularly faithful to the golden'. | State the two guarantees separately and honestly: byte-hash equality is asserted only for our renderer on a pi |
| Per-section reasoning (facts+interpretation) requires extending the MorningBrief schema; t | A naive template-only hack would not be validated by the trust-spine gate, letting unsourced interpretation slip in. | Add a first-class SectionReasoning Zod type reusing Figure/Claim so validateOutput enforces source|calcKey on  |
| Narrative determinism is best-effort: temp=0/seed are not byte guarantees across gateway m | Run-to-run narrative wording drift; possible meta-commentary leakage that violates the vernacular contract. | Make narration a pure function with zero tool calls; gate output with vernacular lint + a text-similarity thre |
| DST transition (Australia/Sydney, early Apr / early Oct) mis-fires the fixed-UTC cron — br | Missed or mis-dated ASX-open delivery around transitions. | Fixed UTC trigger + runtime Sydney tz conversion + injectable clock; add tests at both DST-edge dates; derive  |
| Data-source outage at cron time (RBA/ABS/Treasury/EIA) yields a brief full of 'not obtaine | IC cannot distinguish a genuine licensed gap from a transient fetch failure. | Per-fetch timeout via AbortSignal; retrieval failures render inline in the Retrieval-Failures section with ~ a |
| Streaming upgrade destabilizes the working chat/canvas data-artifact flow in route.ts. | Regression in the primary interactive path. | Make streaming strictly additive (new data-artifact-delta parts through the existing writer, existing final da |
| Golden harness goes stale (fixture hand-approved once, later template/schema tweak silentl | Green tests that no longer reflect the real golden. | Always emit the rendered PDF to a test-output dir and post before/after diffs on PRs touching template/schema/ |

## Open questions
- Can the client provide the actual golden Morning Brief PDF (and ideally the exact font files/names) to commit as the fidelity baseline? Everything downstream is defined against it and it is not currently in the repo.
- react-pdf spike outcome: does @react-pdf/renderer render server-side under React 19.2 / Next 16? If not, confirm the pinned-pdfkit fallback is acceptable given the extra hand-built-layout effort.
- Model decision for IC-quality narrative: stay on the current gateway model or upgrade (e.g. to a stronger Anthropic model) via the MODELS map? This is a tone/quality call, not a determinism one — need the client's cost/quality preference.
- Portfolio Watch holdings: are Gold/SpaceX/TSMC/Crypto a fixed set, or dynamically tagged? Fixed set simplifies deterministic layout and page-break geometry.
- %-change bar chart: fixed scale (e.g. -5%..+5%) matching the golden, or auto-scale? Fixed scale is more deterministic and matches the golden's narrow range but can clip extreme moves.
- Should the reasoning trace also be embedded as XMP metadata for machine re-use, or is visible in-brief text sufficient for the IC? (Primary decision is visible; XMP is optional.)
- Prod storage backend for BriefStore: Vercel Blob acceptable, or is another store required for the audit-retention window?
- Determinism-claim scope sign-off: is the client satisfied with 'byte-identical run-to-run on a pinned environment' + 'structurally/vernacularly faithful to the golden', given a cross-tool PDF cannot be byte-matched to the client's own golden file?

## Tickets (ordered, dependency-linked)

### T01 - Ingest and codify the golden Morning Brief as the fidelity baseline  [P0 / M]

Commit the client's 3-page golden Morning Brief PDF at tests/fixtures/golden/golden-morning-brief.pdf, compute and record its SHA-256 in tests/fixtures/golden/golden.sha256, and author tests/fixtures/golden/golden-checklist.ts — a typed, exhaustive extraction of the golden's structure: section order (masthead, subline, retrieval-provenance, headline stack, MARKETS AT A GLANCE, %-change bar chart, MARKETS table with EQUITIES/THURSDAY BACKFILLED/FX-derived bands, RETRIEVAL FAILURES & SOURCE CONFLICTS, THE ONE THING FACTS/INTERPRETATION, WORLD & MACRO, AUSTRALIA, TAIWAN, PORTFOLIO WATCH, TODAY'S FACT, ONE QUESTION FOR THE IC, SOURCES PRIMARY/ATTRIBUTED/NOT OBTAINED, footer), the exact 10-instrument list (ASX200, S&P500, NASDAQ, TAIEX, AUD/USD, USD/TWD, BRENT, GOLD, VIX, BITCOIN), the verbatim footer string ('Internal — Investment Committee only... N of 3'), the exact color/RGB design tokens sampled from the PDF, and the vernacular phrase inventory ('triple-confirmed', 'not obtained this run', 'derived from the RBA's own table', '~' convention, '[Source; Source]'). If the client PDF is not yet available, commit a placeholder README documenting the blocker and stop — do not guess the target. This ticket defines what every downstream ticket is measured against.

**Acceptance criteria:**
- [ ] tests/fixtures/golden/golden-morning-brief.pdf exists and its SHA-256 matches tests/fixtures/golden/golden.sha256
- [ ] golden-checklist.ts exports an ordered array of the golden's section identifiers plus the exact 10-instrument list and verbatim footer string
- [ ] golden-checklist.ts exports a vernacular phrase array and an RGB design-token object sampled from the golden
- [ ] A blocker note is committed if the real golden PDF is unavailable, rather than a fabricated target

**Verification:**
- shasum -a 256 tests/fixtures/golden/golden-morning-brief.pdf | diff - tests/fixtures/golden/golden.sha256
- npx tsc --noEmit tests/fixtures/golden/golden-checklist.ts
- node -e "const c=require('./tests/fixtures/golden/golden-checklist.ts'); if(c.INSTRUMENTS.length!==10) process.exit(1)"

**Depends on:** None
**Files:** tests/fixtures/golden/golden-morning-brief.pdf, tests/fixtures/golden/golden.sha256, tests/fixtures/golden/golden-checklist.ts

### T02 - Frozen design-token and vernacular registry module  [P1 / M]

Create src/lib/everlin/brief/design-tokens.ts exporting immutable const objects derived from T01's golden-checklist: palette (green ~#1a3a2a, gold ~#D4AF37, white), type scale with tabular-nums flags, section-band styling, A4 page metrics (595.28x841.89pt), and the verbatim footer/disclaimer boilerplate. Create src/lib/everlin/brief/vernacular.ts exporting the vernacular registry (the ~ convention string, the [Source; Source] bracket formatter function, canonical phrases 'triple-confirmed', 'not obtained this run', 'derived from the RBA's own table') plus a pure lint function vernacularLint(text): string[] that flags missing/violated conventions. Both are the single source of truth imported by the PDF template AND the fidelity harness. No React, no rendering — pure data + pure functions.

**Acceptance criteria:**
- [ ] design-tokens.ts exports frozen (Object.freeze or 'as const') palette, typeScale, pageMetrics, footer, and disclaimer constants
- [ ] vernacular.ts exports the phrase registry, a bracketSources() formatter, and a pure vernacularLint() returning violation strings
- [ ] Token RGB values equal the values recorded in T01 golden-checklist (imported, not re-typed)
- [ ] Modules have zero React/rendering imports

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/design-tokens.ts src/lib/everlin/brief/vernacular.ts
- node -e "const t=require('./src/lib/everlin/brief/design-tokens.ts'); const c=require('./tests/fixtures/golden/golden-checklist.ts'); if(t.PALETTE.green!==c.TOKENS.green) process.exit(1)"
- node -e "const v=require('./src/lib/everlin/brief/vernacular.ts'); if(v.vernacularLint('no tilde no brackets').length===0) process.exit(1)"

**Depends on:** T01
**Files:** src/lib/everlin/brief/design-tokens.ts, src/lib/everlin/brief/vernacular.ts

### T03 - Font embedding module for byte-stable glyphs  [P1 / S]

Commit subsetted TTFs matching the golden (a serif or sans for body/headers plus a monospace for tabular numerics) under src/lib/everlin/brief/fonts/ and create src/lib/everlin/brief/fonts.ts that registers them with @react-pdf/renderer's Font.register at module load, subset to the used glyph range for byte-stable, cross-platform (macOS/Linux/Vercel) rendering. Export a registerBriefFonts() idempotent init function and the font family names as constants consumed by design-tokens. This isolates the single biggest cross-environment determinism variable (font rasterization) behind one module so the renderer never depends on system fonts.

**Acceptance criteria:**
- [ ] TTF files are committed and fonts.ts registers each family via Font.register
- [ ] registerBriefFonts() is idempotent (safe to call multiple times, registers once)
- [ ] Font family name constants are exported and imported by design-tokens.ts
- [ ] No system-font fallback is referenced anywhere in the brief modules

**Verification:**
- ls src/lib/everlin/brief/fonts/*.ttf
- npx tsc --noEmit src/lib/everlin/brief/fonts.ts
- node -e "const f=require('./src/lib/everlin/brief/fonts.ts'); f.registerBriefFonts(); f.registerBriefFonts()"

**Depends on:** T02
**Files:** src/lib/everlin/brief/fonts.ts, src/lib/everlin/brief/fonts/serif.ttf, src/lib/everlin/brief/fonts/mono.ttf

### T04 - react-pdf React-19 compatibility spike (renderer gate)  [P1 / M]

Add @react-pdf/renderer at an exact pinned version to package.json and prove it renders server-side under React 19.2.8 + Next 16.3.4. Create src/lib/everlin/brief/renderer-spike.ts that builds a trivial Document with one embedded font (via T03) and renders to a Buffer using renderToBuffer, then asserts a non-empty %PDF header. Run it under the Next server runtime (a throwaway node script or a temporary route). Record the outcome in a committed note. If it FAILS the peer-dep or runtime check, pivot: pin pdfkit instead and implement renderer-spike.ts against pdfkit with the same registerFonts + renderToBuffer contract. The chosen library is recorded so T06/T07 build against a confirmed renderer, not an assumption. This is the highest-risk gate and must resolve before any section components.

**Acceptance criteria:**
- [ ] An exact-pinned renderer dependency (@react-pdf/renderer or pdfkit fallback) is added to package.json
- [ ] renderer-spike.ts renders a Buffer whose first 5 bytes are '%PDF-' under the project's React 19.2/Next 16 runtime
- [ ] The spike embeds a T03 font and does not throw a React reconciler/peer-dep error
- [ ] A committed note records which renderer won and why (react-pdf vs pdfkit fallback)

**Verification:**
- pnpm install && node -r ts-node/register/transpile-only src/lib/everlin/brief/renderer-spike.ts
- node -e "require('child_process'); const b=require('fs').readFileSync('/tmp/everlin-spike.pdf'); if(b.slice(0,5).toString()!=='%PDF-') process.exit(1)"
- grep -E '"@react-pdf/renderer"|"pdfkit"' package.json

**Depends on:** T03
**Files:** package.json, src/lib/everlin/brief/renderer-spike.ts, src/lib/everlin/brief/RENDERER_DECISION.md

### T05 - SectionReasoning schema extension (facts + interpretation)  [P1 / M]

Extend src/lib/everlin/schemas.ts (Zod 4) with a SectionReasoning type: { section: string; facts: Figure[] | Claim[] (each already carrying source|calcKey per the trust-spine rule); interpretation: string }. Add an OPTIONAL sections?: SectionReasoning[] field to MorningBrief so existing validateOutput and selftest.ts keep passing (non-breaking). Reuse the existing Figure and Claim primitives so validateOutput enforces source|calcKey on every trace fact — unsourced interpretation numbers are rejected exactly as body figures are. Export SectionReasoning and its inferred type. Do NOT change any existing field or superRefine.

**Acceptance criteria:**
- [ ] schemas.ts exports SectionReasoning (Zod) and its inferred TS type reusing Figure/Claim
- [ ] MorningBrief gains an optional sections field; a brief WITHOUT it still validates
- [ ] A SectionReasoning fact with a number but no source and no calcKey fails validation
- [ ] Existing selftest.ts passes unchanged

**Verification:**
- npx tsc --noEmit src/lib/everlin/schemas.ts
- node -r ts-node/register/transpile-only src/lib/everlin/selftest.ts
- node -e "const {SectionReasoning}=require('./src/lib/everlin/schemas.ts'); const r=SectionReasoning.safeParse({section:'x',facts:[{label:'y',value:1}],interpretation:'z'}); if(r.success) process.exit(1)"

**Depends on:** T01
**Files:** src/lib/everlin/schemas.ts, src/lib/everlin/selftest.ts

### T06 - PDF section components — masthead through markets table  [P1 / L]

Build the first half of the golden's section components as pure, props-in react-pdf (or pdfkit-adapter per T04) components under src/lib/everlin/brief/sections/: Masthead (green band + 'EVERLIN MORNING BRIEF' + italic gold 'Enduring Legacy.'), Subline (date | close-covering | 'IC distribution — do not forward'), RetrievalProvenance paragraph (AEST window, confirmed vs backfilled, ~ convention, unitless note), HeadlineStack (em-dash clauses), MarketsAtAGlance (the 10 instruments with level + signed %change and ~ prefixes), PercentChangeBarChart (fixed -5%..+5% scale, signed bars via primitives), MarketsTable (green header band, EQUITIES rows, THURSDAY BACKFILLED sub-band, FX rows labelled 'derived', inline [Source; Source] brackets), and Footer (verbatim boilerplate, 'N of 3'). All import tokens from T02, fonts from T03, and take data only — no Date.now, no Math.random, no branching except data-presence.

**Acceptance criteria:**
- [ ] Each section renders from props with no non-deterministic calls (no Date/random) — greppable
- [ ] MarketsAtAGlance renders exactly the 10 golden instruments in golden order preserving ~ prefixes
- [ ] MarketsTable renders the green header, EQUITIES, THURSDAY BACKFILLED band, and FX 'derived' rows with inline [Source] brackets
- [ ] Footer renders the verbatim T02 boilerplate on the page

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/sections/*.tsx
- grep -rL 'Date.now\|Math.random\|new Date' src/lib/everlin/brief/sections/
- node -r ts-node/register/transpile-only -e "require('./src/lib/everlin/brief/sections/index.ts')"

**Depends on:** T04, T02, T03, T05
**Files:** src/lib/everlin/brief/sections/Masthead.tsx, src/lib/everlin/brief/sections/MarketsAtAGlance.tsx, src/lib/everlin/brief/sections/PercentChangeBarChart.tsx, src/lib/everlin/brief/sections/MarketsTable.tsx, src/lib/everlin/brief/sections/index.ts

### T07 - PDF section components — reasoning, macro, portfolio, sources  [P1 / L]

Build the second half of the golden's section components under src/lib/everlin/brief/sections/: RetrievalFailures (what was/wasn't confirmed, ~ markers, source conflicts), TheOneThing (THE FACTS. paragraph + THE INTERPRETATION. paragraph, driven by a SectionReasoning entry), WorldMacro (bold key-figure line: Fed funds target/hike odds/next FOMC, then Rates/Middle East/Corporate/Asia paragraphs), Australia (bold RBA cash rate/next decision/AUD rates line + body + INTERPRETATION.), Taiwan (body), PortfolioWatch (per-holding paragraphs for the fixed set Gold/SpaceX/TSMC/Crypto), TodaysFact (one paragraph), OneQuestionForIC (boxed), and Sources (PRIMARY / ATTRIBUTED NEWS / NOT OBTAINED THIS RUN itemised). All pure, props-in, importing T02 tokens and consuming SectionReasoning (T05) for FACTS/INTERPRETATION slots.

**Acceptance criteria:**
- [ ] TheOneThing renders both a FACTS. and an INTERPRETATION. paragraph sourced from a SectionReasoning prop
- [ ] WorldMacro and Australia each render their bold key-figure line plus body paragraphs
- [ ] PortfolioWatch renders the fixed four holdings and Sources renders all three itemised subsections
- [ ] OneQuestionForIC renders a visibly boxed question; no Date/random calls anywhere

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/sections/*.tsx
- grep -rL 'Date.now\|Math.random\|new Date' src/lib/everlin/brief/sections/
- node -r ts-node/register/transpile-only -e "require('./src/lib/everlin/brief/sections/index.ts')"

**Depends on:** T06
**Files:** src/lib/everlin/brief/sections/TheOneThing.tsx, src/lib/everlin/brief/sections/WorldMacro.tsx, src/lib/everlin/brief/sections/PortfolioWatch.tsx, src/lib/everlin/brief/sections/Sources.tsx, src/lib/everlin/brief/sections/index.ts

### T08 - PDF render orchestrator with fixed metadata and byte-hash  [P1 / M]

Create src/lib/everlin/brief/render.ts exporting renderMorningBriefPDF(brief: MorningBrief, reasoning?: SectionReasoning[]) => Promise<{ buffer: Buffer; byteHash: string }>. It assembles the full 3-page Document from the T06/T07 section tree in golden order, OVERRIDES the non-deterministic PDF metadata (CreationDate, ModDate, Producer, and the file ID/trailer) to fixed constants so the same input yields identical bytes, renders to a Buffer via the T04 renderer, and returns the buffer plus its SHA-256. Zero branching beyond data presence. This is the single entry point the cron and sync API both call.

**Acceptance criteria:**
- [ ] renderMorningBriefPDF returns a Buffer starting with '%PDF-' and a hex SHA-256 string
- [ ] PDF CreationDate/ModDate/Producer/ID are overridden to fixed constants (greppable in render.ts)
- [ ] Rendering the same fixture twice in-process yields identical byteHash
- [ ] Sections appear in the golden order asserted by T01 checklist

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/render.ts
- node -r ts-node/register/transpile-only -e "(async()=>{const {renderMorningBriefPDF}=require('./src/lib/everlin/brief/render.ts');const fx=require('./tests/fixtures/golden/fixture.ts');const a=await renderMorningBriefPDF(fx.brief,fx.reasoning);const b=await renderMorningBriefPDF(fx.brief,fx.reasoning);if(a.byteHash!==b.byteHash)process.exit(1)})()"
- grep -E 'CreationDate|Producer|creationDate' src/lib/everlin/brief/render.ts

**Depends on:** T07
**Files:** src/lib/everlin/brief/render.ts

### T09 - Frozen render fixture (MorningBrief + reasoning) for the golden  [P2 / M]

Author tests/fixtures/golden/fixture.ts exporting a complete, frozen MorningBrief object plus its SectionReasoning[] that should render to the golden layout: all 10 instruments as Figures (retrieved values with sources, or missing:true for licensed gaps per the trust-spine rule), the EQUITIES/FX rows, per-section FACTS/INTERPRETATION reasoning entries, and the fixed portfolio holdings. The fixture is the deterministic input the harness renders N times. It must pass validateOutput (schema + lint) so it exercises the real contract, not a bypass.

**Acceptance criteria:**
- [ ] fixture.ts exports a MorningBrief and a SectionReasoning[] that pass validateOutput('everlin-morning-brief', ...) with ok:true
- [ ] The fixture contains all 10 golden instruments (retrieved or missing:true), none model-guessed
- [ ] Licensed-gap instruments (ASX200/S&P500/VIX/Gold) are marked missing:true with a note, never a fabricated value
- [ ] The fixture is a plain frozen object with no Date/random

**Verification:**
- npx tsc --noEmit tests/fixtures/golden/fixture.ts
- node -r ts-node/register/transpile-only -e "const {validateOutput}=require('./src/lib/everlin/validate.ts');const fx=require('./tests/fixtures/golden/fixture.ts');const r=validateOutput('everlin-morning-brief',fx.brief,fx.brief.executiveSummary);if(!r.ok)process.exit(1)"
- node -r ts-node/register/transpile-only -e "const fx=require('./tests/fixtures/golden/fixture.ts');if(fx.brief.figures.length<10)process.exit(1)"

**Depends on:** T05, T08
**Files:** tests/fixtures/golden/fixture.ts

### T10 - Deterministic reconciliation (verify) graph node  [P2 / M]

Add a pure, deterministic verify node to a new src/lib/everlin/brief/verify.ts and wire it into brief-graph.ts between retrieve and assemble (retrieve -> verify -> assemble -> validate). verify cross-checks retrieved Facts for coherence (cash rate present and within a plausible band, series freshness/asOf presence), tags LICENSED_GAPS explicitly, and records, per fact, which check passed and the source — producing the raw provenance object the reasoning-trace builder (T11) consumes. NO LLM call, NO web/network call: it only reads state.facts. It must not throw and must leave the existing linear graph working.

**Acceptance criteria:**
- [ ] verify.ts is pure over state.facts with no network/LLM calls (greppable — no fetch/model)
- [ ] brief-graph.ts edges are retrieve -> verify -> assemble -> validate and buildDailyBrief still returns ok for a valid run
- [ ] verify emits a per-fact provenance record noting the check outcome and source
- [ ] Licensed gaps are tagged distinctly from transient not-obtained

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/verify.ts src/lib/everlin/brief-graph.ts
- grep -L 'fetch(\|streamText\|generateText' src/lib/everlin/brief/verify.ts
- node -r ts-node/register/transpile-only -e "(async()=>{const {buildDailyBrief}=require('./src/lib/everlin/brief-graph.ts');const r=await buildDailyBrief('2026-09-10');if(!r.ok&&(!r.errors||!r.brief))process.exit(1)})()"

**Depends on:** T05
**Files:** src/lib/everlin/brief/verify.ts, src/lib/everlin/brief-graph.ts

### T11 - Deterministic reasoning-trace builder  [P2 / M]

Create src/lib/everlin/brief/reasoning.ts exporting buildReasoning(brief, verifyProvenance) => SectionReasoning[]. For each golden section it maps that section's Figures/Claims into SectionReasoning.facts (deterministically from source|calcKey and the T10 verify provenance) and leaves the single interpretation slot as a placeholder to be filled by the narrative function (T12). It performs NO LLM call — facts are data-derived only. Attach the result to the brief's optional sections field. Optionally mirror the trace into PDF XMP via the render orchestrator (non-load-bearing). Wire it as a post-validate step in brief-graph.ts.

**Acceptance criteria:**
- [ ] buildReasoning produces one SectionReasoning per golden section with facts derived only from source|calcKey/verify provenance
- [ ] No LLM/network call in reasoning.ts (greppable)
- [ ] Output validates as SectionReasoning[] (T05 schema) and attaches to brief.sections
- [ ] interpretation slots are present as fillable placeholders, not fabricated numbers

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/reasoning.ts
- grep -L 'fetch(\|streamText\|generateText' src/lib/everlin/brief/reasoning.ts
- node -r ts-node/register/transpile-only -e "const {buildReasoning}=require('./src/lib/everlin/brief/reasoning.ts');const {SectionReasoning}=require('./src/lib/everlin/schemas.ts');const fx=require('./tests/fixtures/golden/fixture.ts');const out=buildReasoning(fx.brief,fx.verifyProvenance||{});for(const s of out)if(!SectionReasoning.safeParse(s).success)process.exit(1)"

**Depends on:** T10, T08
**Files:** src/lib/everlin/brief/reasoning.ts, src/lib/everlin/brief-graph.ts

### T12 - Pure temperature-0 narrative function (no tool calls)  [P2 / M]

Create src/lib/everlin/brief/narrative.ts exporting narrateBrief(brief, reasoning) that fills ONLY the headline-stack clauses and the per-section interpretation slots (never numbers, never layout) via a single AI SDK generateText call at temperature 0 with a locked prompt and NO tools and NO web/RAG — a pure function over already-retrieved data. It routes through the existing MODELS map in route.ts (so an IC-quality model upgrade is config, not code). Output is gated by the T02 vernacularLint plus a text-similarity check against golden snippets (added in T13), NOT by byte-hash — and this is documented honestly in the module header. Wire between assemble and reasoning in the graph.

**Acceptance criteria:**
- [ ] narrative.ts makes one generateText call with temperature:0, tools:undefined, and no fetch/RAG (greppable)
- [ ] It fills only headline + interpretation slots and never writes a Figure value
- [ ] Model id is read from the MODELS map (shared with route.ts), not hardcoded
- [ ] Module header documents that narrative is similarity/lint-gated, not byte-hash-gated

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/narrative.ts
- grep -E 'temperature: 0|temperature:0' src/lib/everlin/brief/narrative.ts
- grep -L 'tools:' src/lib/everlin/brief/narrative.ts || true

**Depends on:** T11
**Files:** src/lib/everlin/brief/narrative.ts, src/app/api/chat/route.ts

### T13 - Golden determinism + fidelity + narrative harness  [P2 / M]

Create tests/golden/brief.harness.ts (runnable via a package.json 'test:golden' script) implementing three planes: (a) DETERMINISM — render the T09 fixture N=10 times and assert one identical byteHash; (b) FIDELITY — extract text/structure from the rendered PDF with a text parser and diff against the T01 golden-checklist (every section present in order, all 10 instruments, footer on every page, ~ markers, [Source] brackets, RGB tokens), failing on any missing item by diffing against the INPUT checklist inventory not the output alone; (c) NARRATIVE — assert the narrated headline/interpretation passes vernacularLint and meets a text-similarity threshold vs committed golden snippets. Emit the rendered PDF to tests/output/ for human before/after review. Fails the build on divergence. Honestly labels the two guarantee planes (run-to-run byte-identity vs structural/vernacular fidelity).

**Acceptance criteria:**
- [ ] Harness renders the fixture 10x and asserts a single identical byteHash (determinism plane)
- [ ] Fidelity check enumerates the T01 checklist and fails if any section/instrument/footer/token is absent
- [ ] Narrative check runs vernacularLint and a similarity threshold, not a byte-hash, on the prose plane
- [ ] Rendered PDF is written to tests/output/ and 'pnpm test:golden' exits non-zero on any plane failure

**Verification:**
- pnpm test:golden
- node -r ts-node/register/transpile-only -e "const c=require('./tests/fixtures/golden/golden-checklist.ts');if(!c.SECTIONS||c.SECTIONS.length<15)process.exit(1)"
- ls tests/output/*.pdf

**Depends on:** T09, T11, T12
**Files:** tests/golden/brief.harness.ts, package.json

### T14 - BriefStore interface with fs and Vercel Blob adapters  [P3 / M]

Create src/lib/everlin/brief/store.ts defining the BriefStore interface { put(date, {briefJson, pdfBuffer, byteHash, generatedAt}); get(date); has(date) } keyed by trading date, plus two adapters: FsBriefStore (writes under os.tmpdir()/everlin-briefs for dev) and BlobBriefStore (Vercel Blob for prod, selected by env). Export a getBriefStore() factory that picks the adapter by environment. This is the idempotency + audit substrate the cron (T18) and the future delivery seam both read; no database. Keep it interface-first so the prod backend swaps without touching cron logic.

**Acceptance criteria:**
- [ ] store.ts exports a BriefStore interface and FsBriefStore + BlobBriefStore adapters
- [ ] getBriefStore() returns the fs adapter by default and the Blob adapter when the Blob env is present
- [ ] put then get round-trips the byteHash and pdfBuffer via the fs adapter
- [ ] has(date) returns true only after a put for that date (idempotency substrate)

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/store.ts
- node -r ts-node/register/transpile-only -e "(async()=>{const {FsBriefStore}=require('./src/lib/everlin/brief/store.ts');const s=new FsBriefStore();await s.put('2026-09-10',{briefJson:{},pdfBuffer:Buffer.from('%PDF-'),byteHash:'abc',generatedAt:'t'});const g=await s.get('2026-09-10');if(g.byteHash!=='abc'||!(await s.has('2026-09-10')))process.exit(1)})()"

**Depends on:** None
**Files:** src/lib/everlin/brief/store.ts

### T15 - DST-aware Sydney trading-day calendar with injectable clock  [P3 / M]

Create src/lib/everlin/brief/calendar.ts exporting an injectable Clock interface (now(): Date), a real SystemClock, an embedded ASX/RBA public-holiday list, and functions isTradingDay(clock), priorTradingDay(clock), and asOfFor(clock) that convert to Australia/Sydney (AEST/AEDT) via Intl timeZone, skip weekends and holidays, and compute the brief's asOf and the prior-trading-day it covers. The clock is injectable so DST-transition dates (early Apr / early Oct) are testable with a frozen clock. asOf is always derived from the Sydney clock, never from a raw UTC value.

**Acceptance criteria:**
- [ ] calendar.ts exports Clock, SystemClock, isTradingDay, priorTradingDay, asOfFor and a holiday list
- [ ] A frozen clock on a Sydney weekend/holiday returns isTradingDay=false
- [ ] asOfFor uses Australia/Sydney conversion (verifiable across a known DST-transition date)
- [ ] priorTradingDay skips both weekends and listed holidays

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/calendar.ts
- node -r ts-node/register/transpile-only -e "const {isTradingDay}=require('./src/lib/everlin/brief/calendar.ts');const c={now:()=>new Date('2026-09-12T00:00:00Z')};if(isTradingDay(c))process.exit(1)"
- node -r ts-node/register/transpile-only -e "const {asOfFor}=require('./src/lib/everlin/brief/calendar.ts');const c={now:()=>new Date('2026-04-05T00:30:00Z')};if(!/^\d{4}-\d{2}-\d{2}$/.test(asOfFor(c)))process.exit(1)"

**Depends on:** None
**Files:** src/lib/everlin/brief/calendar.ts

### T16 - Headless brief pipeline entry (buildDailyBriefHeadless)  [P3 / M]

Create src/lib/everlin/brief/pipeline.ts exporting buildDailyBriefHeadless(asOfDate) that wires the full path retrieve -> verify (T10) -> assemble -> narrative (T12) -> reasoning-trace (T11) -> validate -> render (T08), returning { ok, brief, reasoning, pdfBuffer, byteHash, errors }. It reuses the compiled graph from brief-graph.ts and appends narrative+render as post-graph steps. Fail-soft: retrieval gaps flow through as 'not obtained' (never fabricated), and a validation failure returns ok:false with errors and the partial brief, never throws. This is the shared entry the cron (T18) and sync API (T19) both call.

**Acceptance criteria:**
- [ ] buildDailyBriefHeadless returns pdfBuffer + byteHash on a valid run and ok:false+errors on a validation failure without throwing
- [ ] It composes verify, narrative, reasoning, validate, and render (all prior tickets) in order
- [ ] Retrieval gaps render as 'not obtained', proven by a run with a licensed-gap fixture
- [ ] byteHash is stable for identical asOf input in-process

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/pipeline.ts
- node -r ts-node/register/transpile-only -e "(async()=>{const {buildDailyBriefHeadless}=require('./src/lib/everlin/brief/pipeline.ts');const r=await buildDailyBriefHeadless('2026-09-10');if(r.ok&&(!r.pdfBuffer||!r.byteHash))process.exit(1)})()"
- pnpm test:golden

**Depends on:** T13, T14, T15
**Files:** src/lib/everlin/brief/pipeline.ts

### T17 - Delivery-adapter seam (interface + registry + Noop)  [P4 / S]

Create src/lib/everlin/brief/delivery.ts defining DeliveryAdapter { deliver(ctx: { brief; pdf: Buffer; byteHash: string; asOf: string }): Promise<{ ok: boolean; deliveryId?: string; error?: string }> }, a registry that resolves the active adapter by env, and a NoopDeliveryAdapter (logs + returns ok, idempotent by docId/date). Add empty stub skeletons for email/SMS/Teams/SharePoint that throw 'not implemented' so the contract is documented and channels bolt on later WITHOUT touching cron or template. Delivery itself is OUT of scope — this ticket only builds the seam.

**Acceptance criteria:**
- [ ] delivery.ts exports the DeliveryAdapter interface, a registry, and a working NoopDeliveryAdapter
- [ ] NoopDeliveryAdapter.deliver returns { ok: true } and is idempotent by docId/date
- [ ] Email/SMS/Teams/SharePoint stubs exist and throw 'not implemented' (no real send)
- [ ] The registry selects Noop by default

**Verification:**
- npx tsc --noEmit src/lib/everlin/brief/delivery.ts
- node -r ts-node/register/transpile-only -e "(async()=>{const {NoopDeliveryAdapter}=require('./src/lib/everlin/brief/delivery.ts');const r=await new NoopDeliveryAdapter().deliver({brief:{},pdf:Buffer.from('x'),byteHash:'h',asOf:'2026-09-10'});if(!r.ok)process.exit(1)})()"

**Depends on:** None
**Files:** src/lib/everlin/brief/delivery.ts

### T18 - ASX-open Vercel Cron route (fixed UTC + tz + holiday skip)  [P4 / M]

Add vercel.json with a Cron at a fixed UTC time and create src/app/api/cron/brief/route.ts (GET, guarded by CRON_SECRET). The route resolves Sydney time via the T15 calendar, returns early if today is not a trading day, derives asOf via asOfFor, checks BriefStore.has(asOf) for idempotency, calls buildDailyBriefHeadless (T16), writes { briefJson, pdfBuffer, byteHash, generatedAt } to the store keyed by trading date, invokes the T17 delivery seam, and logs every fetch outcome + byteHash. Fail-soft: retrieval gaps render 'not obtained', never fabricated; a failed build logs and returns 200 with an error body (no crash loop). The fixed UTC trigger + runtime tz conversion is DST-robust; asOf is never derived from the raw UTC trigger.

**Acceptance criteria:**
- [ ] vercel.json defines a single daily cron at a fixed UTC time hitting /api/cron/brief
- [ ] The route skips non-trading days (weekend/holiday) and is idempotent via BriefStore.has(asOf)
- [ ] On a trading day it writes {briefJson,pdfBuffer,byteHash} to the store and invokes the delivery seam
- [ ] The route is guarded by CRON_SECRET and never throws (logs + returns on failure)

**Verification:**
- npx tsc --noEmit src/app/api/cron/brief/route.ts
- node -e "const v=require('./vercel.json');if(!v.crons||!v.crons.some(c=>c.path==='/api/cron/brief'))process.exit(1)"
- pnpm build

**Depends on:** T16, T15, T17
**Files:** vercel.json, src/app/api/cron/brief/route.ts

### T19 - Sync on-demand PDF API route  [P4 / S]

Create src/app/api/brief/pdf/route.ts (POST { asOf? }) that calls buildDailyBriefHeadless (T16) and returns the rendered PDF as application/pdf (Content-Disposition inline, filename from docId). On a build/validation failure it returns a JSON 422 with the errors, never a broken PDF. This gives on-demand generation for interactive use and QA, independent of the cron path. It shares the exact same headless entry so the QA PDF is byte-identical to the cron PDF for the same input.

**Acceptance criteria:**
- [ ] POST /api/brief/pdf with a valid asOf returns application/pdf whose body starts with '%PDF-'
- [ ] A validation failure returns HTTP 422 with a JSON errors array, not a PDF
- [ ] The route calls buildDailyBriefHeadless and does not re-implement any pipeline step
- [ ] pnpm build succeeds with the route present

**Verification:**
- npx tsc --noEmit src/app/api/brief/pdf/route.ts
- pnpm build
- grep 'buildDailyBriefHeadless' src/app/api/brief/pdf/route.ts

**Depends on:** T16
**Files:** src/app/api/brief/pdf/route.ts

### T20 - Additive streaming progress upgrade in chat route  [P5 / M]

Additively extend src/app/api/chat/route.ts: when generateDailyBrief runs, stream LangGraph per-node events (retrieve/verify/assemble/narrative/reasoning/validate) and the reasoning-trace object as new data-artifact-delta parts through the EXISTING writer, throttled ~100ms and sequence-numbered so out-of-order arrivals are dropped. The existing createUIMessageStream/writer.merge/final data-artifact path (route.ts lines 285-298) stays UNTOUCHED, and the synchronous cron path is unaffected. This is strictly progress UX; determinism-critical data still flows through the final data-artifact. Add a minimal client handler for data-artifact-delta if the canvas needs one.

**Acceptance criteria:**
- [ ] New data-artifact-delta parts stream per graph node, throttled ~100ms and sequence-numbered
- [ ] The existing final data-artifact write and writer.merge flow are unchanged (diff shows additions only to that block)
- [ ] The cron path (pipeline.ts) emits no stream parts and is unaffected
- [ ] pnpm build passes and the existing chat/canvas flow still renders the brief

**Verification:**
- npx tsc --noEmit src/app/api/chat/route.ts
- pnpm build
- grep 'data-artifact-delta' src/app/api/chat/route.ts

**Depends on:** T16
**Files:** src/app/api/chat/route.ts

---

## Plan revision — data-source expansion + verification gates (added on approval request)

### New data-source tickets (P0 foundation)
- **T00a (TASK-26): News-attribution retrieval layer** — cited headlines (<=200 chars) + outlet per Claim, matching the golden ATTRIBUTED NEWS block. Ship-safe attribution slice only; never redistributes licensed index/quote data. Feeds the reasoning-trace (T11) + narrative (T12) tickets.
- **T00b (TASK-27): ECB FX backup + official-series gap coverage** — ECB SDMX as clean-redistribution FX fallback behind RBA F11.1; licensed index levels stay marked not-obtained by design. Feeds the verify node (T10).

### Source-scope decision (user)
News-attribution layer only. Index levels (ASX200/S&P/VIX/gold) remain **not obtained** — licensed IP, no free commercial source (verified in docs/research/full-brief-data-sources.md). The brief marks the gap, never fabricates — same discipline the golden itself uses.

### Final verification gates (P5, run only after all build tickets Done)
- **T21 (TASK-28): Final QA** — /qa gstack browser end-to-end; PDF renders + golden fidelity + streaming observed; fix-and-reverify.
- **T22 (TASK-29): Final code review** — full feature diff; determinism + no-fabrication + ToS-guard invariants confirmed.
- **T23 (TASK-30): Final /devex-review** — headless entry + PDF route + adapter/store interfaces; new-dev time-to-first-brief.

Gate chain: T21 -> T22 -> T23, each depending on the last build ticket (T20 streaming). Total plan = 25 tickets.

### AC discipline
Every ticket AC asserts *behavior that can be run and observed*, not existence. Riskiest tickets (T04 renderer, T08 byte-hash, T13 golden harness, T18 cron) carry explicit PROOF criteria: render a real %PDF- buffer, SHA-256 equality across runs, fidelity diff vs the golden within threshold, injected-clock cron idempotency + holiday skip.
