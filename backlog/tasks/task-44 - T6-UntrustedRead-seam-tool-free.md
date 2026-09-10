---
id: TASK-44
title: 'T6: UntrustedRead seam (tool-free)'
status: Done
assignee: []
created_date: '2026-09-10 07:35'
updated_date: '2026-09-10 07:37'
labels:
  - deep-research
milestone: m-3
dependencies: []
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add research/untrusted-read.ts: readUntrustedText(rawText, target) proposes {claim, figure?}; a post-check via numericValues() rejects any figure not literally in rawText (fabricated=true). Holds NO tools; text is data only (#13). Reuses news-sources MAX_HEADLINE truncation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 fabricated number rejected, figure stays not-obtained
- [x] #2 headline > 200 chars truncated
- [x] #3 no tool access from this node
- [x] #4 returns a sourced Claim only when outlet+url present
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
UntrustedRead tool-free: rejects fabricated figures, requires attribution, truncates. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
