---
id: TASK-9
title: 'T04: react-pdf React-19 compatibility spike (renderer gate)'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:52'
labels:
  - pdf-brief
  - P1
milestone: m-1
dependencies:
  - TASK-8
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add @react-pdf/renderer at an exact pinned version to package.json and prove it renders server-side under React 19.2.8 + Next 16.3.4. Create src/lib/everlin/brief/renderer-spike.ts that builds a trivial Document with one embedded font (via T03) and renders to a Buffer using renderToBuffer, then asserts a non-empty %PDF header. Run it under the Next server runtime (a throwaway node script or a temporary route). Record the outcome in a committed note. If it FAILS the peer-dep or runtime check, pivot: pin pdfkit instead and implement renderer-spike.ts against pdfkit with the same registerFonts + renderToBuffer contract. The chosen library is recorded so T06/T07 build against a confirmed renderer, not an assumption. This is the highest-risk gate and must resolve before any section components.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An exact-pinned renderer dependency (@react-pdf/renderer or pdfkit fallback) is added to package.json
- [x] #2 renderer-spike.ts renders a Buffer whose first 5 bytes are '%PDF-' under the project's React 19.2/Next 16 runtime
- [x] #3 The spike embeds a T03 font and does not throw a React reconciler/peer-dep error
- [x] #4 A committed note records which renderer won and why (react-pdf vs pdfkit fallback)
- [x] #5 PROOF: a throwaway react-pdf document renders to a non-empty PDF buffer under this repo React 19 / Next 16 — command runs and exits 0, or the ticket escalates renderer choice
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Gate PASSED live: react-pdf 4.9.0 renders 1556-byte %PDF- buffer on React 19.2.8. Chose react-pdf over pdfkit/Chromium. Harness caveat (tsx ESM resolver) documented in renderer-spike.tsx.
<!-- SECTION:FINAL_SUMMARY:END -->
