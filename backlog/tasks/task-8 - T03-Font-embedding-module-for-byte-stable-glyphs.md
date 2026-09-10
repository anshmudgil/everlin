---
id: TASK-8
title: 'T03: Font embedding module for byte-stable glyphs'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P1
milestone: m-1
dependencies:
  - TASK-7
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Commit subsetted TTFs matching the golden (a serif or sans for body/headers plus a monospace for tabular numerics) under src/lib/everlin/brief/fonts/ and create src/lib/everlin/brief/fonts.ts that registers them with @react-pdf/renderer's Font.register at module load, subset to the used glyph range for byte-stable, cross-platform (macOS/Linux/Vercel) rendering. Export a registerBriefFonts() idempotent init function and the font family names as constants consumed by design-tokens. This isolates the single biggest cross-environment determinism variable (font rasterization) behind one module so the renderer never depends on system fonts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TTF files are committed and fonts.ts registers each family via Font.register
- [ ] #2 registerBriefFonts() is idempotent (safe to call multiple times, registers once)
- [ ] #3 Font family name constants are exported and imported by design-tokens.ts
- [ ] #4 No system-font fallback is referenced anywhere in the brief modules
<!-- AC:END -->
