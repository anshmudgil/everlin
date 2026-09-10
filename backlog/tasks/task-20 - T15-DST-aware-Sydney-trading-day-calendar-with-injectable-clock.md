---
id: TASK-20
title: 'T15: DST-aware Sydney trading-day calendar with injectable clock'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P3
milestone: m-1
dependencies: []
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/everlin/brief/calendar.ts exporting an injectable Clock interface (now(): Date), a real SystemClock, an embedded ASX/RBA public-holiday list, and functions isTradingDay(clock), priorTradingDay(clock), and asOfFor(clock) that convert to Australia/Sydney (AEST/AEDT) via Intl timeZone, skip weekends and holidays, and compute the brief's asOf and the prior-trading-day it covers. The clock is injectable so DST-transition dates (early Apr / early Oct) are testable with a frozen clock. asOf is always derived from the Sydney clock, never from a raw UTC value.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 calendar.ts exports Clock, SystemClock, isTradingDay, priorTradingDay, asOfFor and a holiday list
- [ ] #2 A frozen clock on a Sydney weekend/holiday returns isTradingDay=false
- [ ] #3 asOfFor uses Australia/Sydney conversion (verifiable across a known DST-transition date)
- [ ] #4 priorTradingDay skips both weekends and listed holidays
<!-- AC:END -->
