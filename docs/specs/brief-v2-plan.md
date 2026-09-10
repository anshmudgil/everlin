# Implementation Plan — Brief v2: pagination, canvas, charts, diagrams, narrative engine

Second pass, grounded in `docs/brief-pattern-deconstruction.md` (4 real editions)
and two confirmed live bugs. Scope: fix the slide-out + 1-page render, add in-PDF
charts + standalone system diagrams, and build the template-plus-gated-LLM
narrative engine so the agent delivers contextual prose while the determinism
gate holds.

## Confirmed bugs (diagnosed live)
- **1-page PDF** — `brief-document.tsx` renders one `<Page wrap>`; content is too
  compressed to overflow, so it never reaches the golden's 3 pages. Live check:
  `/api/everlin/brief-pdf?asOf=2026-09-07` returns a 1-page PDF.
- **Canvas shows no PDF** — the canvas renders a `BriefArtifact {title,ref,body}`
  (streamed HTML text), never the PDF. There is no PDF-in-canvas wiring at all.

## Locked decisions (user)
- Diagrams: **both** — in-PDF charts (golden's %-change bar + sparklines, native
  react-pdf SVG, deterministic) AND standalone system diagrams (mermaid CLI, already installed).
- Narrative: **template + gated LLM slots** — fixed structure/figures/vernacular;
  constrained temp-0 LLM for THE ONE THING / INTERPRETATION / headline / ONE
  QUESTION; validated by vernacular + fidelity + no-fabrication gate.

## Architecture decisions
- **Charts stay in native react-pdf `<Svg>`** (Svg/Path/Rect/Line/Polyline all
  present). No victory/DOM chart lib — those break determinism and fight react-pdf.
  A pure function `(figures) => <Svg>` is byte-stable.
- **Pagination via explicit `break`** — three logical `<Page>`s (or `break` marks)
  mapping to the golden: P1 masthead+glance+chart+table, P2 THE ONE THING+WORLD+
  AUSTRALIA, P3 TAIWAN+PORTFOLIO+TODAY'S FACT+ONE QUESTION+SOURCES.
- **Canvas embeds the PDF** via `<iframe>`/`<object>` pointed at the brief-pdf
  route (same-origin, sandboxed), alongside the existing HTML artifact as a toggle.
- **Narrative engine is a gated node** — LLM writes only the analytical slots into
  a `SectionReasoning`-shaped object; the vernacular lint + fidelity harness gate
  it; on gate failure it falls back to the deterministic T11 prose (always ships).
- **Determinism unchanged** — figures, structure, chart geometry, vernacular are
  all deterministic. Only the analytical prose varies, and the byte-hash harness
  covers the FIXED frame; a separate narrative-similarity check covers the prose.

## Tickets (ordered)

### Phase 1 — fix the two bugs (ship first, no new surface)
- **V01** Paginate the PDF into 3 golden-mapped pages (`break`/multi-Page). AC: rendered PDF has 3 pages; harness still deterministic; each golden section on its golden page.
- **V02** Wire the PDF into the canvas slide-out (embed brief-pdf route via sandboxed iframe; toggle with the existing HTML artifact). AC: sending a brief opens the canvas AND shows the actual PDF; canvas toggle still works; localStorage pref intact.

### Phase 2 — charts (in-PDF, deterministic)
- **V03** Native-SVG `%CHANGE`/levels bar chart component (matches golden), byte-stable. AC: chart renders in the PDF; two renders byte-identical; colours = tokens.
- **V04** Per-instrument sparkline/trend row (where a short series exists; else omit, never fabricate). AC: sparkline renders from a sourced mini-series; absent series → no chart, not a flat line.

### Phase 3 — narrative engine (template + gated LLM slots)
- **V05** Vernacular lint (`vernacular.ts`): asserts register (AU spelling, `[source]` on claims, no hype/emoji), flags banned words. AC: passes the 4 golden texts, fails a hype-laden fake.
- **V06** Narrative slot schema + prompt: LLM fills headline clauses, THE ONE THING throughline, per-section INTERPRETATION, ONE QUESTION, temp 0, into a typed object. AC: output is schema-valid; carries only sourced facts + labelled interpretation.
- **V07** Narrative gate + fallback: run V05 lint + fidelity + no-fabrication on the LLM output; on any failure fall back to deterministic T11 prose. AC: a gate failure never blocks a brief; a passing brief carries LLM prose; both paths render.
- **V08** Throughline check: THE ONE THING frame keyword appears in ≥1 later section. AC: the check passes the golden editions, fails a brief whose sections don't cohere.

### Phase 4 — standalone system diagrams (showcase)
- **V09** Mermaid diagram set (pipeline flow, data-source lineage, agent reasoning DAG) rendered to SVG/PNG via mmdc into docs/. AC: `mmdc` renders each without error; committed as assets + referenced in docs.

### Phase 5 — gates
- **V10** Extend the golden harness: 3-page assertion, chart-present assertion, vernacular lint over rendered text. AC: `/api/everlin/harness` still 200 with the new checks.
- **V11** Final /qa + code review + /devex over the v2 surface. AC: all green, findings fixed.

## Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM prose drifts from voice | Med | vernacular lint + throughline check gate it; deterministic fallback always ships |
| Pagination breaks byte-determinism | Med | `break` is static; harness asserts byte-identity after the change |
| Canvas iframe CSP/sandbox issues | Low | same-origin, sandboxed; PDF served with inline disposition |
| LLM slot fabricates a number | High | no-fabrication gate unchanged; interpretation schema forbids un-sourced numbers |

## Open questions
- Which model for the narrative slots? (qwen-flash today; a Claude tier reads closer to the golden voice — cost/quality call, same decoupling as before.)
- Sparkline data: is a short prior-close series available from the current tools, or is that a new retrieval? (If not available, V04 omits rather than fabricates.)
