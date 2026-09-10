---
id: TASK-25
title: 'T20: Additive streaming progress upgrade in chat route'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 06:14'
labels:
  - pdf-brief
  - P5
milestone: m-1
dependencies:
  - TASK-21
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Additively extend src/app/api/chat/route.ts: when generateDailyBrief runs, stream LangGraph per-node events (retrieve/verify/assemble/narrative/reasoning/validate) and the reasoning-trace object as new data-artifact-delta parts through the EXISTING writer, throttled ~100ms and sequence-numbered so out-of-order arrivals are dropped. The existing createUIMessageStream/writer.merge/final data-artifact path (route.ts lines 285-298) stays UNTOUCHED, and the synchronous cron path is unaffected. This is strictly progress UX; determinism-critical data still flows through the final data-artifact. Add a minimal client handler for data-artifact-delta if the canvas needs one.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New data-artifact-delta parts stream per graph node, throttled ~100ms and sequence-numbered
- [ ] #2 The existing final data-artifact write and writer.merge flow are unchanged (diff shows additions only to that block)
- [ ] #3 The cron path (pipeline.ts) emits no stream parts and is unaffected
- [ ] #4 pnpm build passes and the existing chat/canvas flow still renders the brief
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
smoothStream word-chunked throttling added to chat route; verified live streaming (SSE, HTTP 200, 4208 bytes).
<!-- SECTION:FINAL_SUMMARY:END -->
