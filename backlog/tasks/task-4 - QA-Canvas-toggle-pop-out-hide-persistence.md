---
id: TASK-4
title: 'QA: Canvas toggle (pop-out / hide + persistence)'
status: To Do
assignee: []
created_date: '2026-09-10 04:08'
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
- [ ] #1 Canvas hidden by default (grid 2-col)
- [ ] #2 Header toggle (title "Show/Hide brief canvas") flips grid 3-col <-> 2-col
- [ ] #3 Preference persists to localStorage['everlin.canvasOpen']
<!-- AC:END -->
