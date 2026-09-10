---
id: TASK-1
title: 'QA: Core-agent UI (Phase-1 cleanup)'
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
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify the cleaned-up assistant UI on /t/weekly-08sep. Reference: docs/QA-HANDOFF.md flow 1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Header reads "Assistant" (not "Everlin Analyst")
- [x] #2 Empty state shows "How can I help? / Ask anything, or type / for commands."
- [x] #3 Input placeholder "Message the assistant… (⏎ send)"; paperclip attach button present; no "Challenge a call" hint; no ROUTINE/IC toggle
- [x] #4 Left rail shows "+ New chat"
- [x] #5 body font-family is Inter
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
All 5 ACs verified via $B on /t/weekly-08sep. Header='Assistant', font=Inter, empty-state + placeholder + paperclip correct, 'New chat' present, no ROUTINE/IC toggle, no 'Everlin Analyst'/'Challenge a call'.
<!-- SECTION:FINAL_SUMMARY:END -->
