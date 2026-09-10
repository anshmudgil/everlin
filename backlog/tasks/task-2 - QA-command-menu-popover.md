---
id: TASK-2
title: 'QA: /-command menu popover'
status: Done
assignee: []
created_date: '2026-09-10 04:07'
updated_date: '2026-09-10 04:11'
labels:
  - qa
  - ui
milestone: m-0
dependencies: []
references:
  - docs/QA-HANDOFF.md
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Typing / at start of empty input opens command popover (/brief, /weekly, /macro). Reference: docs/QA-HANDOFF.md flow 2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Typing "/" in empty input opens the command popover
- [x] #2 Popover is visible (POPOVER-VISIBLE:true)
- [x] #3 Popover lists /brief, /weekly, /macro
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Typing '/' opens command popover (POPOVER-VISIBLE:true); /brief, /weekly, /macro all listed. Verified via $B.
<!-- SECTION:FINAL_SUMMARY:END -->
