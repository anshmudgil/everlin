---
id: TASK-4
title: 'QA: Canvas toggle (pop-out / hide + persistence)'
status: Done
assignee: []
created_date: '2026-09-10 04:08'
updated_date: '2026-09-10 04:14'
labels:
  - qa
  - ui
  - canvas
milestone: m-0
dependencies: []
references:
  - docs/QA-HANDOFF.md
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Canvas hidden by default (2-col). Opens on brief stream OR header panel-toggle. Verify open<->close via header toggle; grid flips 3-col<->2-col; pref persists to localStorage. Reference: docs/QA-HANDOFF.md flow 4.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canvas hidden by default (grid 2-col)
- [x] #2 Header toggle (title "Show/Hide brief canvas") flips grid 3-col <-> 2-col
- [x] #3 Preference persists to localStorage['everlin.canvasOpen']
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Canvas toggle verified via $B header button 'Show/Hide brief canvas'. Fresh load with localStorage=0 renders 2-col (hidden default honored); real click flips 2->3 tracks and back; localStorage['everlin.canvasOpen'] persists 0<->1. Note: programmatic JS .click() desyncs React state within a session (test artifact) but hard-reload proves persistence is correct.
<!-- SECTION:FINAL_SUMMARY:END -->
