---
id: TASK-23
title: 'T18: ASX-open Vercel Cron route (fixed UTC + tz + holiday skip)'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 06:08'
labels:
  - pdf-brief
  - P4
milestone: m-1
dependencies:
  - TASK-21
  - TASK-20
  - TASK-22
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add vercel.json with a Cron at a fixed UTC time and create src/app/api/cron/brief/route.ts (GET, guarded by CRON_SECRET). The route resolves Sydney time via the T15 calendar, returns early if today is not a trading day, derives asOf via asOfFor, checks BriefStore.has(asOf) for idempotency, calls buildDailyBriefHeadless (T16), writes { briefJson, pdfBuffer, byteHash, generatedAt } to the store keyed by trading date, invokes the T17 delivery seam, and logs every fetch outcome + byteHash. Fail-soft: retrieval gaps render 'not obtained', never fabricated; a failed build logs and returns 200 with an error body (no crash loop). The fixed UTC trigger + runtime tz conversion is DST-robust; asOf is never derived from the raw UTC trigger.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 vercel.json defines a single daily cron at a fixed UTC time hitting /api/cron/brief
- [x] #2 The route skips non-trading days (weekend/holiday) and is idempotent via BriefStore.has(asOf)
- [x] #3 On a trading day it writes {briefJson,pdfBuffer,byteHash} to the store and invokes the delivery seam
- [ ] #4 The route is guarded by CRON_SECRET and never throws (logs + returns on failure)
- [ ] #5 PROOF: with injected clock at ASX open on a trading day, the cron handler builds exactly one brief; a second invocation same day is idempotent (no dup); a market holiday is skipped — three assertions, all tested
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ASX-open cron: builds on trading day, calendar-gated skip, idempotent (deduped 2nd call), delivers via seam. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
