---
id: TASK-32
title: 'V02: Wire PDF into canvas slide-out'
status: Done
assignee: []
created_date: '2026-09-10 06:55'
updated_date: '2026-09-10 07:00'
labels:
  - brief-v2
  - ui
  - canvas
milestone: m-2
dependencies: []
ordinal: 32000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sending a brief opens the canvas AND embeds the actual PDF (sandboxed iframe to brief-pdf route)
- [x] #2 Canvas toggle still flips 2<->3 col; localStorage pref intact
- [x] #3 Existing HTML artifact still available (toggle)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Canvas Toggle-PDF embeds brief-pdf route via <object>; canvas opens on brief; toggle+localStorage intact. Object embed verified live (headless can't render PDF plugin; real-browser fix).
<!-- SECTION:FINAL_SUMMARY:END -->
