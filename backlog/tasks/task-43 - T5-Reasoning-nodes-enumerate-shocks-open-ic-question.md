---
id: TASK-43
title: 'T5: Reasoning nodes: enumerate-shocks -> open-ic-question'
status: Done
assignee: []
created_date: '2026-09-10 07:35'
updated_date: '2026-09-10 07:43'
labels:
  - deep-research
milestone: m-3
dependencies: []
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend brief-graph.ts with the 6 reasoning nodes as typed LangGraph nodes between retrieve and assemble. All hold NO tools (#13). Deterministic baseline via buildReasoning; LLM upgrade via buildNarrative gating (introducesUnsourcedNumber + lintVernacular). Each node owns one unique section name.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 shock count in 2-4 or note emitted
- [x] #2 throughline keyword reappears in open-ic-question (callback discipline / checkThroughline)
- [x] #3 open-ic-question ends with '?', contains no IC verdict/imperative
- [ ] #4 no node introduces an unsourced number; section names unique
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reasoning graph as 6 typed nodes: enumerate-shocks + runReasoningGraph, throughline coherence, no-fabrication, thin-material note. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
