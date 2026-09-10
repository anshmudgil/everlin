---
id: TASK-29
title: 'T22: Final code review of the brief feature'
status: To Do
assignee: []
created_date: '2026-09-10 05:30'
updated_date: '2026-09-10 05:30'
labels:
  - pdf-brief
  - P5
  - gate
  - review
milestone: m-1
dependencies:
  - TASK-28
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run a code review (/review or code-review skill) over the full diff of the PDF-brief feature: determinism enforcement, provenance/no-fabrication invariants, ToS guards on the news layer, cron idempotency, streaming correctness, module seams/testability. Correctness bugs + reuse/simplification. Gate after build + before ship.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Review covers the whole feature diff; every High/Med finding triaged (fixed or logged with rationale)
- [ ] #2 Determinism + no-fabrication + ToS-guard invariants explicitly checked and confirmed in the review
- [ ] #3 No unresolved correctness finding remains at close
<!-- AC:END -->
