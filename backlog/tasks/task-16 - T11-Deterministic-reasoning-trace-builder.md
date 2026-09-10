---
id: TASK-16
title: 'T11: Deterministic reasoning-trace builder'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:30'
labels:
  - pdf-brief
  - P2
milestone: m-1
dependencies:
  - TASK-13
  - TASK-15
  - TASK-26
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/everlin/brief/reasoning.ts exporting buildReasoning(brief, verifyProvenance) => SectionReasoning[]. For each golden section it maps that section's Figures/Claims into SectionReasoning.facts (deterministically from source|calcKey and the T10 verify provenance) and leaves the single interpretation slot as a placeholder to be filled by the narrative function (T12). It performs NO LLM call — facts are data-derived only. Attach the result to the brief's optional sections field. Optionally mirror the trace into PDF XMP via the render orchestrator (non-load-bearing). Wire it as a post-validate step in brief-graph.ts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 buildReasoning produces one SectionReasoning per golden section with facts derived only from source|calcKey/verify provenance
- [ ] #2 No LLM/network call in reasoning.ts (greppable)
- [ ] #3 Output validates as SectionReasoning[] (T05 schema) and attaches to brief.sections
- [ ] #4 interpretation slots are present as fillable placeholders, not fabricated numbers
<!-- AC:END -->
