# Everlin Morning Brief pipeline — developer guide

The deterministic PDF brief: retrieve sourced figures → build per-section
reasoning → render a byte-stable PDF → store → (cron) deliver. Every number is
sourced or marked "not obtained"; nothing is fabricated.

## Generate a brief right now (one command)

Dev server running (`pnpm dev`), then:

```bash
# Build + render + return the PDF for a date:
curl "http://localhost:3000/api/everlin/brief-pdf?asOf=2026-09-07" -o brief.pdf
open brief.pdf

# Force a rebuild (ignore the stored copy):
curl "http://localhost:3000/api/everlin/brief-pdf?asOf=2026-09-07&force=1" -o brief.pdf
```

The response carries `X-Brief-Byte-Hash` (SHA-256 of the PDF) and
`X-Brief-Deduped` (true if served from an earlier build of that date).

## The three HTTP surfaces

| Route | Method | What |
|-------|--------|------|
| `/api/everlin/brief-pdf?asOf=YYYY-MM-DD[&force=1]` | GET | Build + return the PDF. |
| `/api/everlin/harness` | GET | Determinism + golden-fidelity check. 200 = pass, 422 = fail. |
| `/api/cron/asx-open-brief` | GET/POST | Cron entry: gate on the Sydney trading calendar, build (idempotent), deliver via the Noop seam. |

## The programmatic entry

```ts
import { buildDailyBriefHeadless } from "@/lib/everlin/pipeline/headless";

const r = await buildDailyBriefHeadless("2026-09-07", { nowIso: new Date().toISOString() });
if (r.ok) {
  // r.pdf (Buffer), r.byteHash, r.bytes, r.deduped
}
```

`buildDailyBriefHeadless(asOf, { store?, force?, nowIso })` runs the full flow
and returns the PDF bytes directly. It is idempotent by date (the `BriefStore`'s
`has(date)` gate), so re-running the same date returns the stored brief with
`deduped: true` and does not re-render.

## Determinism (how "identical every run" is guaranteed)

- The PDF template (`src/lib/everlin/pdf/brief-document.tsx`) is a fixed
  `@react-pdf/renderer` tree — all variation flows through the `MorningBrief`
  data prop.
- `creationDate` is pinned to epoch 0 on the `<Document>`, and the render
  orchestrator (`render.ts`) additionally normalises the PDF `/CreationDate` and
  `/ID` so two renders of the same brief are byte-identical.
- Proof, not assertion: `GET /api/everlin/harness` renders the frozen fixture
  twice and asserts identical SHA-256 (determinism) plus the golden structural
  anchors (fidelity). CI should hit this and require 200.

## Data sources + the "not obtained" discipline

Figures come from `src/lib/data-sources.ts` (RBA cash rate + FX, ABS CPI/GDP,
US Treasury, EIA oil) with an ECB FX backup (`auFxRateWithBackup`). Licensed
index levels (ASX 200, S&P 500, VIX, gold) have no free commercial source and
are always rendered "not obtained" — never fabricated. See
`docs/research/full-brief-data-sources.md`.

## Cron schedule

`vercel.json` fires `/api/cron/asx-open-brief` at `30 23 * * *` UTC. The handler
converts to Australia/Sydney (DST-aware), skips weekends and ASX holidays, and
resolves the correct as-of date. Delivery uses the Noop adapter until real
channels (email/SMS/Teams/SharePoint — stubbed) are wired.

## System diagrams

Rendered from `docs/diagrams/*.mmd` via `mmdc` (regenerate: `mmdc -i x.mmd -o x.png -p pptr.json`).

- **Pipeline flow** — `docs/diagrams/pipeline-flow.png`: cron → trading-day gate → retrieve → narrative → assemble → validate → render → store → deliver.
- **Data lineage** — `docs/diagrams/data-lineage.png`: how sources become Figures/Claims, and where licensed IP is marked not-obtained.
- **Reasoning DAG** — `docs/diagrams/reasoning-dag.png`: the 6-step analytical logic (enumerate shocks → throughline → signal-vs-level → localise → bound confidence → open decision).
