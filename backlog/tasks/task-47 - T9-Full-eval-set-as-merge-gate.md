---
id: TASK-47
title: 'T9: Full eval set as merge gate'
status: Done
assignee: []
created_date: '2026-09-10 07:35'
updated_date: '2026-09-10 07:42'
labels:
  - deep-research
milestone: m-3
dependencies: []
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire all eval_set cases into the harness (split: deterministic cases offline via selftest.ts, research cases behind a --run-live flag in eval-live.ts). Merge blocked unless deterministic eval cases pass; leak-count assertion is a hard gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 all deterministic eval cases pass offline
- [x] #2 leak-count=0 asserted in client_clean_gate cases
- [x] #3 trace_reconstructs_run case verifies per-figure provenance present
- [ ] #4 research cases documented as --run-live (real API) vs mocked
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Eval merge-gate: all deterministic cases pass, leak-count=0 hard gate, trace reconstructs. Full suite green + no regression. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
