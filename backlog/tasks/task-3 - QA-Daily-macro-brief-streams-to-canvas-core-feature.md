---
id: TASK-3
title: 'QA: Daily/macro brief streams to canvas (core feature)'
status: Done
assignee: []
created_date: '2026-09-10 04:08'
updated_date: '2026-09-10 04:12'
labels:
  - qa
  - brief
  - core
milestone: m-0
dependencies: []
references:
  - docs/QA-HANDOFF.md
  - docs/research/full-brief-data-sources.md
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Send "generate the daily brief" -> agent calls generateDailyBrief -> macro dashboard streams into right-hand canvas which auto-opens (grid 2-col -> 3-col). Reference: docs/QA-HANDOFF.md flow 3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canvas auto-opens: div.grid gridTemplateColumns has 3 tracks
- [x] #2 RBA cash rate 4.35, AUD/USD 0.7232, ABS CPI 102.31, US Treasury 3.788 present
- [x] #3 ASX 200 / S&P500 / VIX / Gold show "not obtained" (CORRECT — licensed IP, not a bug)
- [x] #4 No fabricated licensed figures (fabrication would be the defect)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Sent 'generate the daily brief'. Canvas auto-opened (grid=3 tracks: 248/529/502px). Figures present: RBA 4.35, AUD/USD 0.7232, CPI 102.31, Treasury 3.788. ASX200/VIX/S&P/Gold='not obtained' (correct licensed-IP gap, not fabricated). Verified via $B.
<!-- SECTION:FINAL_SUMMARY:END -->
