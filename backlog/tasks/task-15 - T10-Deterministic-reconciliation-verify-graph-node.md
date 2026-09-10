---
id: TASK-15
title: 'T10: Deterministic reconciliation (verify) graph node'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P2
milestone: m-1
dependencies:
  - TASK-10
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a pure, deterministic verify node to a new src/lib/everlin/brief/verify.ts and wire it into brief-graph.ts between retrieve and assemble (retrieve -> verify -> assemble -> validate). verify cross-checks retrieved Facts for coherence (cash rate present and within a plausible band, series freshness/asOf presence), tags LICENSED_GAPS explicitly, and records, per fact, which check passed and the source — producing the raw provenance object the reasoning-trace builder (T11) consumes. NO LLM call, NO web/network call: it only reads state.facts. It must not throw and must leave the existing linear graph working.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 verify.ts is pure over state.facts with no network/LLM calls (greppable — no fetch/model)
- [ ] #2 brief-graph.ts edges are retrieve -> verify -> assemble -> validate and buildDailyBrief still returns ok for a valid run
- [ ] #3 verify emits a per-fact provenance record noting the check outcome and source
- [ ] #4 Licensed gaps are tagged distinctly from transient not-obtained
<!-- AC:END -->
