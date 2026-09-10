---
id: TASK-46
title: 'T8: Assemble folds candidates through the gates'
status: Done
assignee: []
created_date: '2026-09-10 07:35'
updated_date: '2026-09-10 07:42'
labels:
  - deep-research
milestone: m-3
dependencies: []
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update assemble node to map an approved FigureCandidate into MorningBrief.figures ONLY after classify-provenance + client-clean-gate. Staging array owned by spine; ResearchOrchestrator output is input, not a writer. Keep byte-stable render unchanged for the deterministic path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 a client-clean confirmed candidate fills a former gap
- [x] #2 an internal-tos-risk candidate stays missing unless override
- [x] #3 deterministic-only run byte-hash unchanged vs today
- [ ] #4 trace records per-figure source+provenance+tier
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
fold-candidates: client-clean fills gap, internal stays missing on client band, byte-stable default. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
