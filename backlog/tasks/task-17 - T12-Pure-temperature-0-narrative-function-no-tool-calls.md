---
id: TASK-17
title: 'T12: Pure temperature-0 narrative function (no tool calls)'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P2
milestone: m-1
dependencies:
  - TASK-16
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/everlin/brief/narrative.ts exporting narrateBrief(brief, reasoning) that fills ONLY the headline-stack clauses and the per-section interpretation slots (never numbers, never layout) via a single AI SDK generateText call at temperature 0 with a locked prompt and NO tools and NO web/RAG — a pure function over already-retrieved data. It routes through the existing MODELS map in route.ts (so an IC-quality model upgrade is config, not code). Output is gated by the T02 vernacularLint plus a text-similarity check against golden snippets (added in T13), NOT by byte-hash — and this is documented honestly in the module header. Wire between assemble and reasoning in the graph.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 narrative.ts makes one generateText call with temperature:0, tools:undefined, and no fetch/RAG (greppable)
- [ ] #2 It fills only headline + interpretation slots and never writes a Figure value
- [ ] #3 Model id is read from the MODELS map (shared with route.ts), not hardcoded
- [ ] #4 Module header documents that narrative is similarity/lint-gated, not byte-hash-gated
<!-- AC:END -->
