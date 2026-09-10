---
id: TASK-45
title: 'T7: ResearchOrchestrator (propose-only) + CapEnforcer'
status: Done
assignee: []
created_date: '2026-09-10 07:35'
updated_date: '2026-09-10 07:40'
labels:
  - deep-research
milestone: m-3
dependencies: []
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add research/orchestrator.ts: single propose-only agent that, for a LICENSED_GAP target, runs source-discovery -> retrieval (trusted APIs incl. FRED-if-allowInternal) -> UntrustedRead -> CrossVerify -> classifyProvenance, returning FigureCandidate[] with trace. Commits nothing. CapEnforcer enforces 20 calls / 100k tokens / $0.50 / 120s, sync pre-call, halts on breach.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ASX200 allowInternal=true => candidate provenance internal-tos-risk, dated-read, crossVerified false, NOT auto-committed
- [x] #2 allowInternal=false => FRED rejected, news-only path unverified
- [x] #3 cap breach halts with partial results
- [x] #4 orchestrator never writes MorningBrief.figures
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ResearchOrchestrator propose-only + CapEnforcer + live FRED. Verified live: FRED internal path, news cross-verify (9005.9 confirmed), allowInternal gate, cap breach halt. Commits nothing.
<!-- SECTION:FINAL_SUMMARY:END -->
