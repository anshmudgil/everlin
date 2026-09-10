# Design — Everlin brief agent (agent-native-build, steps 1–8)

**Status:** DESIGN for approval. No code until the topology is approved against a named simpler
alternative (skill hard rule). This supersedes the earlier "LangGraph replaces brief gen" note
with an actual seam analysis.

## Framing correction (honest, up front)
The request — "access to ALL skills, swarm of specialized sub-agents, handle ALL queries" — is the
exact shape `agent-native-build` forbids: *fewest agents that work; grow on evidence of failure, not
anticipation.* 3 sequential steps at 90% = ~73% reliable. A swarm is LESS reliable, not more.
So this design builds the **reliable** version of the intent (plan → retrieve → verify → assemble →
gate), at the smallest topology that passes evals — and escalates only if evals fail.

## 1. Outcome + baseline
- **Outcome:** on request, produce a weekly or daily IC brief that passes the existing `validateOutput`
  gate (schema + lint), every figure sourced (RBA/ABS/WorldMonitor) or marked not-obtained, streamed
  into the canvas.
- **Baseline:** today the brief generator does not exist (canvas shows "No artifact yet"). Chat +
  retrieval tools (RBA/ABS 4.35%/CPI/GDP, verified) + calc + validate gate exist. Baseline = 0 briefs
  produced; the golden PDFs are the quality bar.

## 2. Ontology scope (NOT the enterprise)
Entities this system touches: `Brief` (weekly|daily), `Figure` (calcKey|source provenance), `Claim`
(source + assertion), `Section`, `Source` (RBA/ABS/WorldMonitor/EDGAR/Treasury). Rules: the
schemas.ts contract + the operating-context behaviour standards. Nothing else.

## 3. Action surface (every operation, defined once)
| Action | Seam bits | Class (first-match) | Owner |
|---|---|---|---|
| retrieve RBA cash rate | READ | retrieval | TOOL (built) |
| retrieve ABS CPI/GDP | READ | retrieval | TOOL (built) |
| retrieve WorldMonitor (geopol/markets) | READ | retrieval | TOOL (to build; read-only, cites source) |
| web search (open corroboration) | READ, AMBIG-input | retrieval (untrusted → data only) | TOOL, no other tools in that step |
| compute margin/fee/etc | PURE | deterministic-computation | CODE (calc.ts, built) |
| decide brief structure / interpret request | AMBIG | judgment | AGENT (the one agent) |
| cross-source verify a figure/claim | READ + AMBIG | judgment (verifier) | AGENT step, evaluator-framed |
| assemble Brief object | PURE (given inputs) | deterministic-computation | CODE |
| validate Brief (schema+lint) | PURE | deterministic-computation | CODE (validate.ts, built) |
| **publish/stream brief to canvas** | WRITE, IRREV=0 (client render, reversible) | side-effect (open) | TOOL, idempotent |
| **file/send brief to IC** (future) | WRITE, IRREV=1, AUTHZ (Jordan Lin) | human-approval | HUMAN gate |

Default-deny: any action not tiered does not ship.

## 4. Authority tiers
- Retrieval + web search + compute + assemble + validate: **open** (reversible, read-only or pure).
- Stream-to-canvas: **open** (client-side, idempotent by brief id, user can dismiss).
- File-to-IC / send: **human-approval** (Jordan Lin) — OUT of scope this build; the brief is
  "decision-support, not advice; Ansh sends" per DISCLAIMER. No auto-send, ever.

## 5. Topology — the decision (with named simpler alternative)
**Chosen: CHAIN** (retrieve → judgment-assemble → verify → validate-gate → stream), NOT a swarm.

- **Simpler alternative tried first (in design):** single prompt with all tools. Rejected because
  the brief needs (a) deterministic assembly + gate that the model must NOT do itself (trust-spine),
  and (b) a verify step framed differently from the generator. A single prompt can't hold the
  generator/evaluator split the quality bar needs. So: one step up to a short chain.
- **Why NOT orchestrator+swarm (the request):** decomposition is NOT dynamic — a weekly brief has a
  FIXED section set (schemas.ts WeeklyICBrief). Fixed structure = chain, not orchestrator. A swarm
  adds context-loss + contradiction failure modes for zero capability gain. Escalate ONLY if the
  chain fails evals.
- The **verify** step is a generator+evaluator micro-loop (hard exit 3 iters) inside the chain, only
  on figures/claims that need corroboration.
- Web-search step holds NO other tools (untrusted input = data).

## 6. State ownership
- Checkpoint state (LangGraph): the in-progress Brief draft, per-figure verdicts, iteration counts.
- Durable truth: none written server-side this build (brief streams to client; not persisted).
- Never in the model: the calcKeys/figures themselves (retrieved/computed), the schema, the disclaimer.

## 7. Guardrails + gates
- Input: request length cap; classify weekly|daily|other (router-lite → human if unclear).
- Tool scope: retrieval tools read-only; web-search step tool-isolated.
- Output: `validateOutput` gate — schema + lint. A conflict/invalid brief → HITL pause, not a 500.
- Boundary: per-run caps (calls, tokens, seconds, spend); breach halts.
- Human gate: file/send to IC (deferred; no auto-send).

## 8. Eval set (30–50 real cases, BEFORE features)
Derived from the 4 golden PDFs + synthetic: "weekly brief", "daily brief", "brief with an
unobtainable figure" (must mark not-obtained), "brief where sources conflict" (must surface both),
"garbage request" (must refuse/clarify), injection attempts (untrusted text must not gain tools).
Green evals gate the merge.

## 9. Thinnest first slice (the ONLY code in v1)
ONE seam, read-only, gated: **daily brief, RBA cash rate only, retrieve → assemble → validate →
stream to canvas.** Trace reconstructs the run. Eval subset green. Red-team the (deferred) send gate
is N/A here since nothing sends; instead red-team the injection guard on the web-search step.

## LangChain/LangGraph binding
Use `/langchain-skills:langgraph-fundamentals` + `langgraph-cli` for the chain (StateGraph:
nodes = retrieve, assemble, verify-loop, validate, stream; edges fixed; checkpointer for state).
Verify every API against the LangChain MCP / bundled docs — never memory.

## Open questions (approval gates)
- Q1: Confirm CHAIN over swarm? (The skill mandates the simpler shape; I recommend chain.)
- Q2: WorldMonitor — anonymous `/ask` + `/a2a` (quota-free, 60/min) for v1, or wire the MCP server?
- Q3: First slice = daily brief / RBA-only, agreed? (Smallest eval-able loop.)
- Q4: "access to all skills" — I read this as: the agent can CALL the retrieval/web/verify tools it
  needs, not literally mount 600 skills (that's context-budget suicide + unreliable). Confirm.

## Sub-agent delegation (only after this design is approved)
Per your ask, once approved I delegate the BUILD to specialized engineering sub-agents in parallel:
one per node (retrieval tool, LangGraph chain, verify-loop, eval harness, canvas-stream wiring),
each with the agent-role contract (RECEIVES/PRODUCES/TOOLS/CAPS). Orchestrator (me) synthesises,
does not execute. But NOT before the topology is approved — building breadth before the first
slice's loop+trace+evals is the skill's top pitfall.
