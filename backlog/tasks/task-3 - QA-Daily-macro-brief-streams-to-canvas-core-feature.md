---
id: TASK-3
title: 'QA: Daily/macro brief streams to canvas (core feature)'
status: To Do
assignee: []
created_date: '2026-09-10 04:08'
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
- [ ] #1 Canvas auto-opens: div.grid gridTemplateColumns has 3 tracks
- [ ] #2 RBA cash rate 4.35, AUD/USD 0.7232, ABS CPI 102.31, US Treasury 3.788 present
- [ ] #3 ASX 200 / S&P500 / VIX / Gold show "not obtained" (CORRECT — licensed IP, not a bug)
- [ ] #4 No fabricated licensed figures (fabrication would be the defect)
<!-- AC:END -->
