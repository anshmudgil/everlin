# Spec — Runtime cross-source verification agent (DRAFT for discussion)

**Status:** DRAFT — not approved, not scheduled. Separate from the RBA/ABS build.
**Motivation:** The golden morning briefs verify by hand — "ASX 200 triple-confirmed via
Investing.com, Trading Economics, MarketScreener"; figures that can't be independently
confirmed are marked "NOT OBTAINED THIS RUN, DESPITE AN EXTENDED SEARCH". This spec makes
that discipline a product capability instead of manual labour.

## Goal
Before any specific figure lands in a brief, cross-check it against ≥2 INDEPENDENT sources.
Emit a confidence tier per figure. Never upgrade a single-source figure to "confirmed".

## The core idea (maps to the golden brief's own vocabulary)
Each figure gets a **confirmation tier**:
- `triple-confirmed` — ≥3 independent sources agree (within tolerance).
- `confirmed` — 2 independent sources agree.
- `single-source` — only the primary tool has it (state the source, don't over-claim).
- `conflict` — sources disagree beyond tolerance → surface BOTH values + both sources.
- `not-obtained` — no source → the existing E2 marker.

## Design options (pick one — this is the main open question)
**Option 1 — verification as a tool the agent calls.**
A `crossCheck(figure, value, sources[])` tool. Agent decides when to invoke. Simple, but the
agent can skip it → weak guarantee. Cheap.

**Option 2 — a verification PASS in the route (deterministic).**
After the analyst drafts, a second stage re-fetches each cited figure from alternate sources
and stamps a tier. Stronger guarantee (can't be skipped), higher latency/cost. This is the
"enterprise gate" shape — enforcement where it can't be routed around.

**Option 3 — a sub-agent (LangGraph/deep-agents) with its own source-fetch tools.**
Most capable (can do open-web search per figure), most expensive + slowest. Overkill for
tabular figures that have deterministic 2nd sources; right for narrative/qualitative claims.

Leaning **Option 2 for tabular figures** (deterministic, gate-shaped) + **Option 1** as an
escape hatch for ad-hoc claims. Option 3 only if we need open-web corroboration.

## Independent-source strategy (must be genuinely independent)
- Cash rate: RBA F1 (primary) vs RBA media-release page vs Trading Economics — but note the
  latter two may DERIVE from RBA, so they're not fully independent. Real independence is hard
  for official statistics. Spec must be honest: "confirmed against RBA's own two surfaces" ≠
  "3 independent origins".
- FX: RBA F11.1 vs a central-bank cross-rate vs a market feed.
- This nuance is WHY it needs its own spec — naive "3 sources" can be 3 mirrors of one origin.

## Hard requirements (enterprise bar — per CLAUDE.md)
- **Evals**: a fixture set of figures with known correct values + known conflicts; measure
  precision/recall of the conflict detector. No shipping without this.
- **HITL**: a `conflict` tier must be able to pause for human review before a brief publishes
  (the "irreversible outward-facing action" gate — a brief goes to the IC).
- **No fabrication**: verifier never invents a corroborating value; absence = single-source.
- **Latency budget**: a brief cites ~20-40 figures; parallel verification must stay under the
  route's maxDuration. Measure before claiming.
- **Cost**: extra fetches per figure. Quantify vs the qwen-flash baseline.

## Acceptance criteria (draft — refine on approval)
1. Given a figure with 2 agreeing independent sources → tier `confirmed`, both cited. Live.
2. Given a figure where sources disagree → tier `conflict`, BOTH values surfaced, HITL pause.
3. Given a figure only the primary tool has → `single-source`, no false "confirmed".
4. Eval set: conflict detector ≥ agreed precision/recall threshold (set on approval).
5. End-to-end: a real brief run stamps every figure with a tier; verify by reading output.

## Open questions for approval
- Q: Option 1 vs 2 vs 3 (or the hybrid)?
- Q: Which figures in scope first — just cash rate + FX (deterministic), or narrative too?
- Q: Is "confirmed against RBA's own multiple surfaces" acceptable, or do you require
  genuinely independent origins (which for official stats may be impossible)?
- Q: Build order — after the RBA/ABS tools land (they're the thing being verified), right?

## Dependency
Blocked-by: RBA + ABS tools must exist first (nothing to verify until figures are retrieved).
