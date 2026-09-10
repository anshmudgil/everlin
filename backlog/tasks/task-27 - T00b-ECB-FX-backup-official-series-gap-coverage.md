---
id: TASK-27
title: 'T00b: ECB FX backup + official-series gap coverage'
status: Done
assignee: []
created_date: '2026-09-10 05:29'
updated_date: '2026-09-10 06:05'
labels:
  - pdf-brief
  - P0
  - data-sources
milestone: m-1
dependencies: []
references:
  - docs/research/full-brief-data-sources.md
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add ECB Data Portal SDMX as a clean-redistribution FX backup (AUD/USD derived from EUR legs) behind the existing FX source, and add any remaining ship-safe official series the golden needs (verified in docs/research/full-brief-data-sources.md as SHIP-SAFE). Licensed index levels (ASX200/S&P/VIX/gold) STAY not-obtained by design — the brief marks them, never fabricates. This closes the FX-resilience gap, not the licensed-IP gap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ecbFxRate() live call returns AUD/USD (derived from EUR legs) HTTP 200 with source=ECB
- [x] #2 FX layer falls back RBA F11.1 -> ECB on RBA failure; unit test simulates RBA failure and asserts ECB path
- [x] #3 Licensed index levels still return missing:true (marked not-obtained), NOT a fabricated value; test asserts this
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ECB FX derived live (AUD/USD 0.7225); RBA->ECB fallback works (0.7232 via RBA); licensed levels stay not-obtained. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
