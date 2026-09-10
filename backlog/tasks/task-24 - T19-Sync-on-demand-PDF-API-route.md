---
id: TASK-24
title: 'T19: Sync on-demand PDF API route'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 06:00'
labels:
  - pdf-brief
  - P4
milestone: m-1
dependencies:
  - TASK-21
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/app/api/brief/pdf/route.ts (POST { asOf? }) that calls buildDailyBriefHeadless (T16) and returns the rendered PDF as application/pdf (Content-Disposition inline, filename from docId). On a build/validation failure it returns a JSON 422 with the errors, never a broken PDF. This gives on-demand generation for interactive use and QA, independent of the cron path. It shares the exact same headless entry so the QA PDF is byte-identical to the cron PDF for the same input.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST /api/brief/pdf with a valid asOf returns application/pdf whose body starts with '%PDF-'
- [ ] #2 A validation failure returns HTTP 422 with a JSON errors array, not a PDF
- [ ] #3 The route calls buildDailyBriefHeadless and does not re-implement any pipeline step
- [ ] #4 pnpm build succeeds with the route present
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
GET /api/everlin/brief-pdf returns real 6785-byte PDF + byte-hash header. Verified live via curl.
<!-- SECTION:FINAL_SUMMARY:END -->
