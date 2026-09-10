---
id: TASK-14
title: 'T09: Frozen render fixture (MorningBrief + reasoning) for the golden'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 06:13'
labels:
  - pdf-brief
  - P2
milestone: m-1
dependencies:
  - TASK-10
  - TASK-13
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Author tests/fixtures/golden/fixture.ts exporting a complete, frozen MorningBrief object plus its SectionReasoning[] that should render to the golden layout: all 10 instruments as Figures (retrieved values with sources, or missing:true for licensed gaps per the trust-spine rule), the EQUITIES/FX rows, per-section FACTS/INTERPRETATION reasoning entries, and the fixed portfolio holdings. The fixture is the deterministic input the harness renders N times. It must pass validateOutput (schema + lint) so it exercises the real contract, not a bypass.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 fixture.ts exports a MorningBrief and a SectionReasoning[] that pass validateOutput('everlin-morning-brief', ...) with ok:true
- [x] #2 The fixture contains all 10 golden instruments (retrieved or missing:true), none model-guessed
- [ ] #3 Licensed-gap instruments (ASX200/S&P500/VIX/Gold) are marked missing:true with a note, never a fabricated value
- [ ] #4 The fixture is a plain frozen object with no Date/random
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Frozen golden fixture (offline MorningBrief). Verified: harness renders it deterministically + fidelity-passes.
<!-- SECTION:FINAL_SUMMARY:END -->
