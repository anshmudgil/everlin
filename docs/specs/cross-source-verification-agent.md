# Spec — Runtime cross-source verification (v2, against the real contract)

**Status:** DRAFT for approval. Supersedes v1 (v1 was written before the calc/router/validate
layer landed).
**Decisions locked (2026-09-10):** deterministic route pass · tabular + narrative · "confirmed
against the source's own multiple surfaces" is an acceptable tier for official statistics.

## What changed since v1 (why this rewrite)
The repo now has (uncommitted, not mine — do not clobber): `src/lib/everlin/{calc,schemas,validate,router}.ts`
and an `api/everlin/` route. That layer already encodes provenance + a validation gate:
- **`schemas.ts`** — a number is a `Figure` that MUST carry a `calcKey` or be `missing:true`.
  A factual statement is a `Claim` with a required `source` + an `assertion` flag
  (`assertion:true` = unverified promoter claim). Outputs pass a per-skill Zod gate.
- **`calc.ts`** — computed numbers get a content-addressed `calcKey` (SHA of inputs).
  **Computed figures are already deterministically verifiable — calcKey IS their proof.**
- **`validate.ts`** — `validateOutput()` returns a discriminated `{ok:true|false, errors, lint}`
  result "so an API route can surface violations to the caller (HITL)". This is the gate shape
  cross-source verification must PLUG INTO, not duplicate.

**Consequence:** cross-source verification is only needed for the provenance types code can't
already prove:
- **Retrieved `Figure`s** (e.g. my RBA 4.35%, ABS CPI) — real, but "is this the right current
  value?" is a retrieval question, not a math question.
- **`Claim`s** (narrative, e.g. "August payrolls beat consensus") — `assertion` must be set
  honestly; verification decides confirmed vs assertion.
Computed figures (calcKey) are OUT — already proven.

## ⚠ Pre-existing gap this surfaced (flag, don't silently fix)
`Figure` requires a `calcKey`. My retrieved Facts (cash rate, CPI) have `source`/`sourceUrl`
but **no calcKey** → a retrieved figure currently can't pass `Figure` validation unless marked
`missing`. Either (a) `Figure` needs a `source`-based provenance branch (retrieved ≠ computed),
or (b) retrieved values must be marked `missing` with the value in `note` (ugly). This spec
assumes we add a **retrieved-provenance branch to `Figure`** (a `source`+`asOf` alt to `calcKey`).
Needs your ok — it edits someone else's uncommitted schema. **Open question Q0.**

## Architecture (locked: deterministic route pass)
After the analyst drafts a structured output, before the gate passes it:
1. For each `Figure` with retrieved provenance → **re-fetch from an alternate surface**, compare
   within tolerance, stamp a `confirmation` tier.
2. For each `Claim` → run the **narrative corroboration sub-agent** (web search, N independent
   sources); set `assertion=false` + fill `source` if corroborated, else keep `assertion=true`.
3. Fold results into the SAME `ValidationResult` shape (`validate.ts`) → a `conflict` tier is a
   hard fail that routes to HITL, exactly like a lint failure does today.

### Confirmation tiers (extend, don't reinvent)
- `triple` / `confirmed` / `single-source` / `conflict` / `not-obtained`.
- For official stats: "confirmed against the source's own multiple surfaces" (RBA CSV +
  media-release + decisions page) counts as `confirmed`, **labelled honestly** — not "3
  independent origins". (Your locked call.)

### Independent-surface fetchers (tabular)
- Cash rate: RBA F1 CSV (primary, already built) vs RBA media-release page vs RBA decisions
  index. All RBA-origin → tier caps at `confirmed`, never `triple`.
- CPI/GDP: ABS primary vs ABS release page.
- FX (future): RBA F11.1 vs an independent central-bank cross-rate → can reach `triple`.

### Narrative corroboration (sub-agent, the bigger half)
- A deep-research sub-agent per `Claim`: search N sources, return {corroborated:bool, sources[]}.
- Cost/latency real → run only on `Claim`s in the final draft, in parallel, under `maxDuration`.
- Never invents a corroborating source; absence ⇒ `assertion:true` stays.

## Hard requirements (enterprise bar)
- **Evals** (`eval-engineering`): fixture outputs with known-correct figures, known conflicts,
  and known-unverifiable claims. Measure conflict-detector precision/recall. No ship without it.
  There is already a `selftest.ts` — extend it, don't fork.
- **HITL**: `conflict` tier pauses before a brief is filed/rendered (a brief goes to the IC —
  outward-facing). Reuse the `validateOutput` → caller-surfaced path.
- **No fabrication**: verifier never invents a corroborating value/source.
- **Latency/cost**: a brief cites ~20-40 figures + claims; quantify the added fetch/search cost
  vs the qwen-flash baseline BEFORE claiming it's shippable.
- **Don't duplicate** `lintText` or the schema gate — compose with them.

## Acceptance criteria (verify by real runs)
1. Retrieved figure with 2 agreeing RBA surfaces → tier `confirmed`, both cited, honest label. Live.
2. Figure where surfaces disagree beyond tolerance → `conflict`, BOTH values surfaced, HITL pause.
3. Retrieved figure only the primary has → `single-source`, no false `confirmed`.
4. A `Claim` corroborated by ≥2 independent web sources → `assertion:false` + sources; an
   uncorroborated claim stays `assertion:true`. Live sub-agent run.
5. Eval set (extends `selftest.ts`): conflict detector ≥ agreed precision/recall.
6. Every path folds into `ValidationResult`; a conflict is a hard fail → HITL, no 500.
7. typecheck + lint clean; no new dep unless justified; no secret.

## Open questions for approval
- **Q0 (blocking):** May I add a retrieved-provenance branch to `Figure` in `schemas.ts`
  (source+asOf as an alternative to calcKey)? It edits uncommitted not-mine code. Without it,
  retrieved facts can't cleanly pass the gate. Alternative: coordinate with whoever owns that
  file first.
- **Q1:** Build order — tabular figure-verification first (small, deterministic, reuses my
  fetchers), narrative sub-agent second (big)? Or both at once?
- **Q2:** Tolerance per figure type (cash rate exact; CPI index ±0.0; FX ±small bps)?
- **Q3:** The calc/router layer is uncommitted and mid-flight. Do I build ON it (risking churn
  under me again) or wait for it to be committed first?

## Dependency
Blocked-by: the retrieved-figure tools (DONE, committed `c9ba0a1`) + a stable calc/schemas layer
(currently uncommitted — see Q3).
