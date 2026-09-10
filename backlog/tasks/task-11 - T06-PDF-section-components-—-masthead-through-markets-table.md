---
id: TASK-11
title: 'T06: PDF section components — masthead through markets table'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 06:00'
labels:
  - pdf-brief
  - P1
milestone: m-1
dependencies:
  - TASK-9
  - TASK-7
  - TASK-8
  - TASK-10
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the first half of the golden's section components as pure, props-in react-pdf (or pdfkit-adapter per T04) components under src/lib/everlin/brief/sections/: Masthead (green band + 'EVERLIN MORNING BRIEF' + italic gold 'Enduring Legacy.'), Subline (date | close-covering | 'IC distribution — do not forward'), RetrievalProvenance paragraph (AEST window, confirmed vs backfilled, ~ convention, unitless note), HeadlineStack (em-dash clauses), MarketsAtAGlance (the 10 instruments with level + signed %change and ~ prefixes), PercentChangeBarChart (fixed -5%..+5% scale, signed bars via primitives), MarketsTable (green header band, EQUITIES rows, THURSDAY BACKFILLED sub-band, FX rows labelled 'derived', inline [Source; Source] brackets), and Footer (verbatim boilerplate, 'N of 3'). All import tokens from T02, fonts from T03, and take data only — no Date.now, no Math.random, no branching except data-presence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each section renders from props with no non-deterministic calls (no Date/random) — greppable
- [x] #2 MarketsAtAGlance renders exactly the 10 golden instruments in golden order preserving ~ prefixes
- [ ] #3 MarketsTable renders the green header, EQUITIES, THURSDAY BACKFILLED band, and FX 'derived' rows with inline [Source] brackets
- [ ] #4 Footer renders the verbatim T02 boilerplate on the page
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PDF components render live: masthead/glance/chart/markets-table with golden design + [source] brackets. Verified via real PDF.
<!-- SECTION:FINAL_SUMMARY:END -->
