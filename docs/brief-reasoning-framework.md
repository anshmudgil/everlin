# How the Everlin brief actually reasons — the information-reasoning framework

A literal, step-by-step reverse-engineering of the reasoning WORKFLOW behind the
four golden editions (27/07, 30/07, 18/08, 07/09 2026). The pattern doc
(`brief-pattern-deconstruction.md`) captured the *structure*; this captures the
*reasoning* — the sequence of operations that turns a pile of figures + news
into an IC-grade read. Each step is stated as: **input → operation → output**,
so it becomes an executable graph (see `everlin-deep-research-design.md`).

## The core claim

The brief is not "figures + commentary". It is a **reasoning pipeline** that
each morning runs the same six operations over the day's information. The voice
is downstream of the reasoning: get the six operations right and the voice
follows; get them wrong and no prose fixes it.

## The six operations (worked against the 30/07 edition)

### 1. ENUMERATE THE SHOCKS
- **Input:** the day's confirmed figures + attributed news items.
- **Operation:** extract the DISTINCT, DATED events that moved markets. Not every
  data point — the ones with causal weight. Count them explicitly.
- **30/07 output:** exactly four — (a) AU Q2 CPI undershoot (3.8% vs 4.0%),
  (b) Iran ballistic-missile attack + US/Saudi retaliation, (c) the Fed's 9-3
  split hold, (d) the M7.1 Kumamoto quake hitting TSMC's JASM fab.
- **The tell:** the brief literally writes "the fourth distinct shock … inside
  48 hours." Enumeration is explicit, not implied.
- **Reasoning rule:** a shock qualifies if it is (i) dated, (ii) sourced, and
  (iii) has a transmission path to a market the IC holds. A big number with no
  transmission path is a figure, not a shock.

### 2. FIND THE THROUGHLINE
- **Input:** the enumerated shocks.
- **Operation:** find the SINGLE frame that connects them — or, if they are
  genuinely unrelated, name *that* as the frame.
- **30/07 output:** "four distinct, UNRELATED shocks landing inside 48 hours" —
  the un-relatedness IS the throughline (the market has too much to price at
  once). Contrast 27/07, where the throughline was a single idea: "the
  de-escalation cycle compresses the range in which rate paths can be forecast."
- **Reasoning rule:** prefer one connecting frame; only fall back to "unrelated"
  when no honest frame connects them. The throughline is the thesis every later
  section must serve or explicitly qualify.

### 3. SEPARATE SIGNAL FROM LEVEL
- **Input:** the throughline + the figures.
- **Operation:** for each moving figure, ask whether the *change* or the *level*
  is the durable signal. The recurring Everlin move: **the change usually
  matters more than the value.**
- **30/07 output:** "A hold with three dissents and rising long yields is the
  market's least favourite combination" — the *composition of the vote* and the
  *direction of yields*, not the unchanged funds rate, are the signal. 07/09:
  "treat this volatility in the odds themselves, not just the odds' current
  level, as the more durable signal."
- **Reasoning rule:** a level that is unchanged but arrived via a contested path
  is a signal about the path, not the level. State which you are reading.

### 4. LOCALISE TO EVERLIN
- **Input:** the throughline + the signal reads.
- **Operation:** translate the macro into a decision the Committee actually
  faces — cash/duration allocation, FY27 property-development funding costs,
  hedge assumptions. Never leave the read at "the market did X."
- **30/07 output:** the ASX rally "reflects purely domestic drivers and predates
  the full weight of Wednesday's US session; Thursday's open is the first local
  test." 27/07: "how much of the Committee's funding-cost assumptions for FY27
  property development commitments should be revisited before the RBA's own
  11/08 decision?"
- **Reasoning rule:** every throughline lands on a portfolio consequence. If it
  can't, it doesn't belong in the brief.

### 5. BOUND THE CONFIDENCE
- **Input:** every figure + claim used above.
- **Operation:** partition into CONFIRMED (cross-checked close), DATED READ
  (a morning quote, not a confirmed close — marked `~`), and NOT OBTAINED
  (explicitly absent, never estimated). The brief brags about this partition.
- **30/07 output:** "TAIEX and TSMC's Friday figures are a dated morning read,
  not a confirmed close"; the Sources block itemises "FTSE 100, iron ore,
  Newcastle coal, XRP … were not obtained and are not stated."
- **Reasoning rule (the trust-spine):** a number is stated only if sourced;
  otherwise it is marked, never guessed. Confidence is a first-class output, not
  a footnote.

### 6. END ON AN OPEN DECISION
- **Input:** the throughline + the localised consequence.
- **Operation:** reframe the whole brief as ONE open question the IC must decide
  now versus wait — genuinely open, not rhetorical.
- **30/07 output:** "With four distinct, unrelated shocks landing inside 48
  hours, does today's ASX rally reflect durable domestic strength, or is it one
  Wall Street session away from being fully retraced?"
- **Reasoning rule:** the question restates the throughline as a decision under
  uncertainty. It must be answerable both ways by a reasonable IC member.

## How the operations compose (the dependency)

```
figures + attributed news
        │
        ▼
[1] enumerate shocks ──▶ [2] find throughline ──▶ [3] signal vs level
                                    │                     │
                                    ▼                     ▼
                              [4] localise to Everlin ◀───┘
                                    │
                                    ▼
                              [5] bound confidence (runs over ALL of 1-4)
                                    │
                                    ▼
                              [6] open IC decision (restates 2 as a choice)
```

Steps 1-4 are the analytical chain. Step 5 is a cross-cutting gate (the
trust-spine) that annotates every figure the chain touched. Step 6 closes the
loop back to the throughline.

## What is JUDGMENT (agent) vs MECHANICAL (code)

| Operation | Class | Owner |
|-----------|-------|-------|
| 1 enumerate shocks | AMBIG (which events have causal weight) | agent, from figures+news (data, no tools) |
| 2 find throughline | AMBIG (the connecting frame) | agent (gated: throughline check V08) |
| 3 signal vs level | AMBIG, but rule-guided (change-vs-value) | agent, proposes; code asserts no new number |
| 4 localise to Everlin | AMBIG (portfolio consequence) | agent |
| 5 bound confidence | PURE (partition by provenance) | CODE — the trust-spine gate |
| 6 open IC question | AMBIG (the decision framing) | agent |

Step 5 is the only fully-deterministic operation, and it is the one that must
never be delegated to the model (#9): provenance is a property of the retrieval,
not a judgment. Steps 1-4 and 6 are judgment the agent makes over sourced data,
each gated so it cannot introduce an unsourced number.

## Where the "missing sources" fail today

Operation 1 (enumerate shocks) is starved: with index levels not-obtained, the
brief can't say "the ASX rallied to a five-month high" as a *shock* — it has the
RBA rate but not the market's reaction to it. The deep-research agent's job is to
feed operation 1 more *sourced* shocks (attributed-news levels, cross-verified),
so the reasoning has material to work with — without ever letting an unsourced or
ToS-tainted figure past operation 5's gate into a client brief.
