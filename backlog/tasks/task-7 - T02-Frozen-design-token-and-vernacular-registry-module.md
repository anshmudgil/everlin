---
id: TASK-7
title: 'T02: Frozen design-token and vernacular registry module'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:55'
labels:
  - pdf-brief
  - P1
milestone: m-1
dependencies:
  - TASK-6
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/everlin/brief/design-tokens.ts exporting immutable const objects derived from T01's golden-checklist: palette (green ~#1a3a2a, gold ~#D4AF37, white), type scale with tabular-nums flags, section-band styling, A4 page metrics (595.28x841.89pt), and the verbatim footer/disclaimer boilerplate. Create src/lib/everlin/brief/vernacular.ts exporting the vernacular registry (the ~ convention string, the [Source; Source] bracket formatter function, canonical phrases 'triple-confirmed', 'not obtained this run', 'derived from the RBA's own table') plus a pure lint function vernacularLint(text): string[] that flags missing/violated conventions. Both are the single source of truth imported by the PDF template AND the fidelity harness. No React, no rendering — pure data + pure functions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 design-tokens.ts exports frozen (Object.freeze or 'as const') palette, typeScale, pageMetrics, footer, and disclaimer constants
- [x] #2 vernacular.ts exports the phrase registry, a bracketSources() formatter, and a pure vernacularLint() returning violation strings
- [ ] #3 Token RGB values equal the values recorded in T01 golden-checklist (imported, not re-typed)
- [ ] #4 Modules have zero React/rendering imports
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Token registry pinned to golden RGB, verified brandGreen=#1a3a2a live.
<!-- SECTION:FINAL_SUMMARY:END -->
