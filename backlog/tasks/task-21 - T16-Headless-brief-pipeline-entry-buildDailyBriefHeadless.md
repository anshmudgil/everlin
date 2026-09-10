---
id: TASK-21
title: 'T16: Headless brief pipeline entry (buildDailyBriefHeadless)'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P3
milestone: m-1
dependencies:
  - TASK-18
  - TASK-19
  - TASK-20
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/everlin/brief/pipeline.ts exporting buildDailyBriefHeadless(asOfDate) that wires the full path retrieve -> verify (T10) -> assemble -> narrative (T12) -> reasoning-trace (T11) -> validate -> render (T08), returning { ok, brief, reasoning, pdfBuffer, byteHash, errors }. It reuses the compiled graph from brief-graph.ts and appends narrative+render as post-graph steps. Fail-soft: retrieval gaps flow through as 'not obtained' (never fabricated), and a validation failure returns ok:false with errors and the partial brief, never throws. This is the shared entry the cron (T18) and sync API (T19) both call.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 buildDailyBriefHeadless returns pdfBuffer + byteHash on a valid run and ok:false+errors on a validation failure without throwing
- [ ] #2 It composes verify, narrative, reasoning, validate, and render (all prior tickets) in order
- [ ] #3 Retrieval gaps render as 'not obtained', proven by a run with a licensed-gap fixture
- [ ] #4 byteHash is stable for identical asOf input in-process
<!-- AC:END -->
