---
id: TASK-26
title: 'T00a: News-attribution retrieval layer (cited headlines per claim)'
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
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a ship-safe news-attribution retrieval tool so narrative claims carry a named source, matching the golden brief ATTRIBUTED NEWS block. Retrieves attributed headlines (<=200 chars, the redistributable slice per WorldMonitor R1-R3 / fair attribution) + the outlet name, attaches source to each Claim. Does NOT redistribute licensed index/quote data (see docs/research/full-brief-data-sources.md). New tool in data layer; wires into the existing Claim schema (Claim already has a source field). Sources: Reuters, CNBC, Bloomberg, Yahoo Finance, Focus Taiwan/CNA, FXStreet, Westpac IQ, etc. as attribution strings, not scraped feeds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A retrieval fn returns {headline<=200 chars, outlet, url, retrievedAt} for a query; live call returns >=1 attributed item or an explicit empty result
- [x] #2 Every returned item carries a non-empty outlet + url; no item without attribution
- [x] #3 Claims built from news carry source=outlet; validateOutput passes (a claim without a source fails the gate)
- [x] #4 ToS guard: tool never stores/returns >200 char excerpts or licensed index levels; unit test asserts truncation
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
News-attribution: truncation <=200, unattributed dropped, claims schema-valid, no-fabrication empty. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
