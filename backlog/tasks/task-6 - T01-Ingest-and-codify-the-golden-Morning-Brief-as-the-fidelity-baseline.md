---
id: TASK-6
title: 'T01: Ingest and codify the golden Morning Brief as the fidelity baseline'
status: Done
assignee: []
created_date: '2026-09-10 05:12'
updated_date: '2026-09-10 05:45'
labels:
  - pdf-brief
  - P0
milestone: m-1
dependencies: []
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Commit the client's 3-page golden Morning Brief PDF at tests/fixtures/golden/golden-morning-brief.pdf, compute and record its SHA-256 in tests/fixtures/golden/golden.sha256, and author tests/fixtures/golden/golden-checklist.ts — a typed, exhaustive extraction of the golden's structure: section order (masthead, subline, retrieval-provenance, headline stack, MARKETS AT A GLANCE, %-change bar chart, MARKETS table with EQUITIES/THURSDAY BACKFILLED/FX-derived bands, RETRIEVAL FAILURES & SOURCE CONFLICTS, THE ONE THING FACTS/INTERPRETATION, WORLD & MACRO, AUSTRALIA, TAIWAN, PORTFOLIO WATCH, TODAY'S FACT, ONE QUESTION FOR THE IC, SOURCES PRIMARY/ATTRIBUTED/NOT OBTAINED, footer), the exact 10-instrument list (ASX200, S&P500, NASDAQ, TAIEX, AUD/USD, USD/TWD, BRENT, GOLD, VIX, BITCOIN), the verbatim footer string ('Internal — Investment Committee only... N of 3'), the exact color/RGB design tokens sampled from the PDF, and the vernacular phrase inventory ('triple-confirmed', 'not obtained this run', 'derived from the RBA's own table', '~' convention, '[Source; Source]'). If the client PDF is not yet available, commit a placeholder README documenting the blocker and stop — do not guess the target. This ticket defines what every downstream ticket is measured against.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 tests/fixtures/golden/golden-morning-brief.pdf exists and its SHA-256 matches tests/fixtures/golden/golden.sha256
- [x] #2 golden-checklist.ts exports an ordered array of the golden's section identifiers plus the exact 10-instrument list and verbatim footer string
- [x] #3 golden-checklist.ts exports a vernacular phrase array and an RGB design-token object sampled from the golden
- [x] #4 A blocker note is committed if the real golden PDF is unavailable, rather than a fabricated target
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Golden PDF fixture + SHA-256 (matches, verified live) + golden-checklist.ts (16 sections, 10 instruments, footer, vernacular, RGB tokens, conventions) all transcribed verbatim from the reference. Module loads + exports verified via tsx.
<!-- SECTION:FINAL_SUMMARY:END -->
