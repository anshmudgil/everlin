---
id: TASK-13
title: 'T08: PDF render orchestrator with fixed metadata and byte-hash'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P1
milestone: m-1
dependencies:
  - TASK-12
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/everlin/brief/render.ts exporting renderMorningBriefPDF(brief: MorningBrief, reasoning?: SectionReasoning[]) => Promise<{ buffer: Buffer; byteHash: string }>. It assembles the full 3-page Document from the T06/T07 section tree in golden order, OVERRIDES the non-deterministic PDF metadata (CreationDate, ModDate, Producer, and the file ID/trailer) to fixed constants so the same input yields identical bytes, renders to a Buffer via the T04 renderer, and returns the buffer plus its SHA-256. Zero branching beyond data presence. This is the single entry point the cron and sync API both call.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 renderMorningBriefPDF returns a Buffer starting with '%PDF-' and a hex SHA-256 string
- [ ] #2 PDF CreationDate/ModDate/Producer/ID are overridden to fixed constants (greppable in render.ts)
- [ ] #3 Rendering the same fixture twice in-process yields identical byteHash
- [ ] #4 Sections appear in the golden order asserted by T01 checklist
<!-- AC:END -->
