---
id: TASK-18
title: 'T13: Golden determinism + fidelity + narrative harness'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P2
milestone: m-1
dependencies:
  - TASK-14
  - TASK-16
  - TASK-17
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create tests/golden/brief.harness.ts (runnable via a package.json 'test:golden' script) implementing three planes: (a) DETERMINISM — render the T09 fixture N=10 times and assert one identical byteHash; (b) FIDELITY — extract text/structure from the rendered PDF with a text parser and diff against the T01 golden-checklist (every section present in order, all 10 instruments, footer on every page, ~ markers, [Source] brackets, RGB tokens), failing on any missing item by diffing against the INPUT checklist inventory not the output alone; (c) NARRATIVE — assert the narrated headline/interpretation passes vernacularLint and meets a text-similarity threshold vs committed golden snippets. Emit the rendered PDF to tests/output/ for human before/after review. Fails the build on divergence. Honestly labels the two guarantee planes (run-to-run byte-identity vs structural/vernacular fidelity).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Harness renders the fixture 10x and asserts a single identical byteHash (determinism plane)
- [ ] #2 Fidelity check enumerates the T01 checklist and fails if any section/instrument/footer/token is absent
- [ ] #3 Narrative check runs vernacularLint and a similarity threshold, not a byte-hash, on the prose plane
- [ ] #4 Rendered PDF is written to tests/output/ and 'pnpm test:golden' exits non-zero on any plane failure
<!-- AC:END -->
