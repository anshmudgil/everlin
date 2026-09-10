---
id: TASK-12
title: 'T07: PDF section components — reasoning, macro, portfolio, sources'
status: To Do
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 05:13'
labels:
  - pdf-brief
  - P1
milestone: m-1
dependencies:
  - TASK-11
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the second half of the golden's section components under src/lib/everlin/brief/sections/: RetrievalFailures (what was/wasn't confirmed, ~ markers, source conflicts), TheOneThing (THE FACTS. paragraph + THE INTERPRETATION. paragraph, driven by a SectionReasoning entry), WorldMacro (bold key-figure line: Fed funds target/hike odds/next FOMC, then Rates/Middle East/Corporate/Asia paragraphs), Australia (bold RBA cash rate/next decision/AUD rates line + body + INTERPRETATION.), Taiwan (body), PortfolioWatch (per-holding paragraphs for the fixed set Gold/SpaceX/TSMC/Crypto), TodaysFact (one paragraph), OneQuestionForIC (boxed), and Sources (PRIMARY / ATTRIBUTED NEWS / NOT OBTAINED THIS RUN itemised). All pure, props-in, importing T02 tokens and consuming SectionReasoning (T05) for FACTS/INTERPRETATION slots.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TheOneThing renders both a FACTS. and an INTERPRETATION. paragraph sourced from a SectionReasoning prop
- [ ] #2 WorldMacro and Australia each render their bold key-figure line plus body paragraphs
- [ ] #3 PortfolioWatch renders the fixed four holdings and Sources renders all three itemised subsections
- [ ] #4 OneQuestionForIC renders a visibly boxed question; no Date/random calls anywhere
<!-- AC:END -->
