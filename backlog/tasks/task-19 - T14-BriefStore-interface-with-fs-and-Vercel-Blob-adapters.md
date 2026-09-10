---
id: TASK-19
title: 'T14: BriefStore interface with fs and Vercel Blob adapters'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 06:03'
labels:
  - pdf-brief
  - P3
milestone: m-1
dependencies: []
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/everlin/brief/store.ts defining the BriefStore interface { put(date, {briefJson, pdfBuffer, byteHash, generatedAt}); get(date); has(date) } keyed by trading date, plus two adapters: FsBriefStore (writes under os.tmpdir()/everlin-briefs for dev) and BlobBriefStore (Vercel Blob for prod, selected by env). Export a getBriefStore() factory that picks the adapter by environment. This is the idempotency + audit substrate the cron (T18) and the future delivery seam both read; no database. Keep it interface-first so the prod backend swaps without touching cron logic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 store.ts exports a BriefStore interface and FsBriefStore + BlobBriefStore adapters
- [x] #2 getBriefStore() returns the fs adapter by default and the Blob adapter when the Blob env is present
- [x] #3 put then get round-trips the byteHash and pdfBuffer via the fs adapter
- [x] #4 has(date) returns true only after a put for that date (idempotency substrate)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
BriefStore fs+Blob adapters, verified put/get/has round-trip live.
<!-- SECTION:FINAL_SUMMARY:END -->
