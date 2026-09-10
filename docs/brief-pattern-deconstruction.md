# Everlin Morning Brief — pattern deconstruction

Derived from four real editions (27/07, 30/07, 18/08 REISSUE2, 07/09 2026). This
is the repeatable contract: the parts that are FIXED (structure, voice rules,
vernacular, logic) versus the parts that VARY (the day's facts + analysis). The
goal is a brief the agent can produce every day that reads like these four —
same skeleton and voice, different content — while the determinism gate still
holds on everything mechanical.

## 1. Fixed macro-structure (section order is invariant across all 4)

1. **Masthead** — "EVERLIN MORNING BRIEF" (green band) + italic gold "Enduring Legacy."
2. **Coverage line** — `<Weekday> DD/MM/YYYY | Covering close <prior trading day> | IC distribution — do not forward`
3. **Retrieval / provenance note** (present in 18/08, 07/09; the "how this was sourced" paragraph) — retrieval window in AEST, what's confirmed vs backfilled, the `~` convention, "Index levels and the VIX are unitless".
4. **Headline** — one line, 2-4 clauses, em-dash separated, each clause a distinct market event. (e.g. "AU CPI Undershoots, ASX Hits 5-Month High — Fed Holds 9-3, Dow's Worst Day Since Apr 2025 — Iran Attacks US Forces — Taiwan Quake".)
5. **Markets-at-a-glance strip** — a fixed instrument set (ASX 200, S&P 500, Nasdaq/DOW, TAIEX, AUD/USD, USD/TWD, Brent, Gold, VIX, Bitcoin), each = level + daily %change, `~` on unconfirmed.
6. **Markets-at-a-glance BAR CHART** — horizontal, "DAILY % CHANGE", one signed bar per instrument, sorted, green=up/red=down. **This is the chart to reproduce.**
7. **Markets table** — grouped EQUITIES / FX / COMMODITIES / CRYPTO / VOLATILITY. Columns: Instrument | Level | Change | Note/source. Every row ends with a `[bracketed source]`. Not-obtained rows say "Not obtained this run".
8. **(sometimes) Retrieval failures & source conflicts** — explicit list of what wasn't confirmed and why.
9. **THE ONE THING** — the marquee analytical section. In later editions split into **THE FACTS.** (sourced) + **THE INTERPRETATION.** (labelled opinion). 2-4 paragraphs. Synthesises the day into ONE throughline.
10. **WORLD & MACRO** — a bold key-figure line (Fed funds target, hike odds, next FOMC) then labelled sub-paragraphs: **Rates** / **Middle East** (or Iran) / **Corporate** / **Asia and world watch**.
11. **AUSTRALIA** — a bold key-figure line (RBA cash rate, next decision, AUD rates) + body + **INTERPRETATION.** paragraph.
12. **TAIWAN** — body paragraph (TAIEX + TSMC + the AI-capex throughline).
13. **PORTFOLIO WATCH** — per-holding paragraphs: **Gold**, **SpaceX**, **TSMC**, **Crypto** (consistent four).
14. **TODAY'S FACT** — one punchy, self-contained factual paragraph (often a striking juxtaposition).
15. **ONE QUESTION FOR THE IC** — boxed. Always a genuine open question, framed as a decision the Committee faces, ending in "?". Often two-part.
16. **SOURCES** — PRIMARY (RBA/ABS/named official) / ATTRIBUTED NEWS (long outlet list) / NOT OBTAINED THIS RUN (explicit, itemised). Ends with `Issued DD/MM/YYYY, HH:MM AEST`.
17. **Footer** (every page) — "Internal — Investment Committee only. Every figure sourced; unobtained figures marked and not estimated. Not financial product advice. Page N".

## 2. The voice (invariant register — this is the hard part to reproduce)

- **Analytical, not descriptive.** Never "X happened." Always "X happened, and here is what it means for positioning." Every section earns its place by carrying a *read*, not just a number.
- **Throughline discipline.** THE ONE THING picks ONE synthesising idea and threads it through the whole brief (the "AI-capex reassessment" thread, the "rate-path whipsaw" thread, the "de-escalation cycle" thread). Later sections explicitly call back to it ("the same dynamic this brief has documented on the Fed side of the Pacific").
- **Hold a position, name the uncertainty.** "The Committee should treat this volatility as the more durable signal." Then: "nothing is yet finalised." Opinion is stated plainly AND its confidence is bounded.
- **Fact/opinion separation is explicit.** THE FACTS. / THE INTERPRETATION. Sourced claim vs labelled read, never blurred.
- **Sourcing is a virtue signalled in prose.** "triple-confirmed", "a dated morning read, not an independently confirmed close", "derived from the RBA's own table", "every directional estimate states its sourcing basis". The brief brags about its own rigour.
- **Register:** British/AU spelling (favour, sceptical, prioritise), long compound sentences balanced by short verdict sentences, no hype, no filler, no emoji. Numbers always with unit + as-of.

## 3. The logic (how the analysis is BUILT — the reasoning framework)

Every edition runs the same reasoning pipeline, which is what makes it repeatable:

1. **Enumerate the day's shocks** (2-4 distinct, dated events). 30/07 literally counts them: "the fourth distinct shock … inside 48 hours".
2. **Find the throughline** — the single frame that connects them (or explicitly names them as *unrelated*, which is itself the frame: "four distinct, unrelated shocks landing inside 48 hours").
3. **Separate signal from level** — "treat this volatility in the odds themselves, not just the odds' current level, as the more durable signal." Recurring move: the *change* matters more than the *value*.
4. **Localise to Everlin** — always land on what it means for the Committee's actual decisions (cash/duration allocation, FY27 funding-cost assumptions, property-development commitments).
5. **Bound the confidence** — state what is confirmed, what is a dated read, what was not obtained.
6. **End on an open decision** — ONE QUESTION reframes the throughline as a choice the IC must make now vs wait.

## 4. What is FIXED vs VARIES (the determinism boundary)

| Layer | Fixed (deterministic gate applies) | Varies (LLM slot, gated) |
|-------|-----------------------------------|--------------------------|
| Section set + order | ✅ all 16 | — |
| Figures + provenance | ✅ every number sourced/calcKey/not-obtained | the values (from live tools) |
| Vernacular markers | ✅ `~`, `[source]`, "not obtained this run", footer | — |
| Instrument list + chart | ✅ fixed 10, chart shape | the bar values |
| Section headings + key-figure line labels | ✅ | the figures in them |
| Headline | shape (N em-dash clauses) | the clauses |
| THE ONE THING facts | ✅ must be sourced Claims | which facts, the throughline prose |
| THE ONE THING / INTERPRETATION prose | voice rules + vernacular lint | the actual analysis |
| ONE QUESTION | shape (open, decision-framed, ends "?") | the question |
| SOURCES | 3-bucket structure | the outlets |

**The narrative engine:** template supplies the skeleton, headings, figures, and vernacular; constrained LLM fills the analytical slots (headline clauses, THE ONE THING throughline, per-section INTERPRETATION, ONE QUESTION) at temperature 0; a **vernacular + fidelity + no-fabrication gate** validates the output before it renders. Determinism holds on the frame and the figures; the prose is contextual but bounded.

## 5. Gate additions this implies

- **Vernacular lint** — assert the output uses the register (British/AU spelling, `[source]` on claims, no hype words, "not obtained" not fabrication) and does NOT use banned words (delve, leverage-as-verb, emoji).
- **Structural fidelity** — all 16 sections present, in order.
- **Throughline check** — THE ONE THING's frame appears (by keyword) in at least one later section (callback discipline).
- **No-fabrication** — unchanged: every number sourced or marked; interpretation carries no un-sourced number.
