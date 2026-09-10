---
id: TASK-28
title: 'T21: Final QA — gstack browser end-to-end'
status: To Do
assignee: []
created_date: '2026-09-10 05:30'
updated_date: '2026-09-10 05:30'
labels:
  - pdf-brief
  - P5
  - gate
  - qa
milestone: m-1
dependencies:
  - TASK-25
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run /qa with the gstack browser against the built feature: trigger a brief generation, verify the PDF renders and matches the golden (byte-hash + fidelity diff), the canvas streams assembly progress, the on-demand PDF route returns a valid PDF, and the cron entry (headless) produces the same output. Fix any bug found, atomic commits, re-verify. This gate runs ONLY after all build tickets (T01-T20 + T00a/b) are Done.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 gstack browser drives a live brief generation; PDF artifact produced and opened
- [ ] #2 Golden fidelity check passes live (byte-hash stable across 2 runs; fidelity diff within threshold)
- [ ] #3 Streaming: canvas shows per-section assembly progress during generation (observed, screenshotted)
- [ ] #4 Any bug found is fixed with an atomic commit and re-verified; final health score >= baseline
<!-- AC:END -->
