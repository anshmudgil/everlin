---
id: TASK-28
title: 'T21: Final QA — gstack browser end-to-end'
status: Done
assignee: []
created_date: '2026-09-10 05:30'
updated_date: '2026-09-10 06:15'
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
- [x] #1 gstack browser drives a live brief generation; PDF artifact produced and opened
- [x] #2 Golden fidelity check passes live (byte-hash stable across 2 runs; fidelity diff within threshold)
- [x] #3 Streaming: canvas shows per-section assembly progress during generation (observed, screenshotted)
- [x] #4 Any bug found is fixed with an atomic commit and re-verified; final health score >= baseline
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Full-feature QA green: harness (determ+fidelity) PASS, PDF route 8052b valid, cron ok+delivery, both selftests ALL PASSED (no regression), tsc+eslint clean.
<!-- SECTION:FINAL_SUMMARY:END -->
