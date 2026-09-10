---
id: TASK-37
title: 'V07: Narrative gate + deterministic fallback'
status: Done
assignee: []
created_date: '2026-09-10 06:55'
updated_date: '2026-09-10 07:08'
labels:
  - brief-v2
  - narrative
  - gate
milestone: m-2
dependencies: []
ordinal: 37000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Gate runs vernacular+fidelity+no-fabrication on LLM output
- [x] #2 A gate failure falls back to deterministic T11 prose (never blocks a brief)
- [x] #3 A passing brief renders LLM prose; both paths render
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Gate+fallback: vernacular+no-fabrication per slot, falls back to deterministic on failure (proven: qwen error fell back cleanly; Sonnet passes). Default deterministic. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
