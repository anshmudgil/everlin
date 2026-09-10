---
id: TASK-10
title: 'T05: SectionReasoning schema extension (facts + interpretation)'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P1
milestone: m-1
dependencies:
  - TASK-6
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend src/lib/everlin/schemas.ts (Zod 4) with a SectionReasoning type: { section: string; facts: Figure[] | Claim[] (each already carrying source|calcKey per the trust-spine rule); interpretation: string }. Add an OPTIONAL sections?: SectionReasoning[] field to MorningBrief so existing validateOutput and selftest.ts keep passing (non-breaking). Reuse the existing Figure and Claim primitives so validateOutput enforces source|calcKey on every trace fact — unsourced interpretation numbers are rejected exactly as body figures are. Export SectionReasoning and its inferred type. Do NOT change any existing field or superRefine.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 schemas.ts exports SectionReasoning (Zod) and its inferred TS type reusing Figure/Claim
- [ ] #2 MorningBrief gains an optional sections field; a brief WITHOUT it still validates
- [ ] #3 A SectionReasoning fact with a number but no source and no calcKey fails validation
- [ ] #4 Existing selftest.ts passes unchanged
<!-- AC:END -->
