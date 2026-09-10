---
id: TASK-42
title: 'T4: CrossVerify seam'
status: Done
assignee: []
created_date: '2026-09-10 07:35'
updated_date: '2026-09-10 07:37'
labels:
  - deep-research
milestone: m-3
dependencies: []
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add verification/cross-verify.ts: crossVerify(surfaces:{value,source,asOf}[], factType) => { tier, consensusValue, agreement }. Tolerance table: 0 for cash rate, 1bp rates, 2% index levels, 1 bbl oil. <2 surfaces => dated-read/single-source; conflict => 'conflict' + null value. Pure over already-fetched surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 confirmed within tolerance (AUD/USD RBA+ECB)
- [x] #2 conflict beyond tolerance => value null, canShip false
- [x] #3 single official commodity source => single-source acceptable
- [x] #4 no network in the comparator
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
CrossVerify pure comparator: confirmed/conflict/single-source, tolerance table, no network. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
