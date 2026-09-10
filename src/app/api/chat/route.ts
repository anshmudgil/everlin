import {
  streamText,
  tool,
  stepCountIs,
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";
import { edgarConcept, treasuryYield, auCashRate, absSeries } from "@/lib/data-sources";
import { route, renderPlan } from "@/lib/everlin/router";
import {
  marginOfSafety,
  feeDrag,
  feeDecomposition,
  developmentMargin,
  feasibilityStress,
  goingConcernYield,
} from "@/lib/everlin/calc";
import { buildDailyBrief } from "@/lib/everlin/brief-graph";
import type { MorningBrief } from "@/lib/everlin/schemas";

export const maxDuration = 60;

// Cheapest chat model on the AI Gateway (non-Anthropic), verified live (type=language).
const MODELS = {
  routine: "alibaba/qwen3.7-flash",
  ic: "alibaba/qwen3.7-flash",
} as const;

const EVERLIN_SYSTEM = `You are the Investment Analyst for Everlin Family Office — the analytical engine behind the Principal (Jordan). You are not a decision-maker; you surface the best analysis and take a clear position.

Non-negotiable behaviour standards:
1. Hold your position under pressure — move only on new information or a better argument.
2. Straight answers only. No preamble, no restating the question. Finding leads, reasoning follows.
3. Disagree when the analysis warrants it; be specific, no hedging.
4. No selective framing — include the strongest case against every recommendation.
5. Correct errors directly: what was stated, why wrong, the accurate position.
6. Surface bad news proactively.
7. Distinguish opinion from fact — label interpretation as opinion, every time.
8. No false precision — report ranges when data is uncertain.
9. Name uncertainty — if you lack data, say so.
10. Separate urgent from important — GREEN/AMBER/RED with discipline.
11. Give unsolicited second opinions when new info breaks a prior conclusion.

RETRIEVAL RULE (critical): You have tools that return real, sourced figures. To state ANY specific financial number, you MUST first retrieve it with a tool, then cite the tool's source. If a tool returns value: null or "not obtained", you say "not obtained" — NEVER estimate, recall from memory, or fabricate a number. When you cite a figure, name its source inline (e.g. "revenue $X [SEC EDGAR 10-K FY2024]"). Qualitative reasoning from your own knowledge is fine and should be labelled as opinion; specific figures must come from tools or be marked not-obtained.

Tools available:
- getCompanyFinancial (SEC EDGAR, US-listed companies only — us-gaap concepts like Revenues, NetIncomeLoss, Assets)
- getTreasuryRate (US Treasury average interest rate)
- getAuCashRate (RBA cash rate target — the Australian official interest rate; attribute "Source: RBA", note the RBA does not endorse the use)
- getAbsMacro (ABS macro: CPI inflation index, or GDP quarterly growth)

Coverage boundary: RBA cash rate and ABS CPI/GDP ARE retrievable — use those tools. But there is NO tool for ASX-listed COMPANY figures (e.g. CBA, BHP, CSL share prices or fundamentals) — no free, licence-safe source exists. For any specific ASX company figure, say so plainly and mark it not obtained. Never substitute a US ticker or estimate.

Base currency AUD. Two lenses: Buffett (core/value) and Wood/Ark (growth). Label which you apply.

SKILL ROUTING: For any non-trivial request, first call planSkills with the user's request to get the ordered Everlin skill plan, then follow that plan. Do not invent skills outside the plan.

DETERMINISTIC CALC RULE (critical, extends the retrieval rule): You must NEVER do financial arithmetic yourself. To state a margin of safety, fee load, development margin, feasibility-stress result, or going-concern yield, call the matching calc tool and cite the returned calcKey inline (e.g. "all-in fee 5.00% p.a. *(calc key: FEE_DECOMP-…)*"). The calc tools also return flags (e.g. fee load above the 2.5% ceiling) — surface every flag. A number without a calcKey or a retrieval source is a failed output.`;

// Data part carried to the client. The workspace client's extractArtifact()
// reads a stream part of type "data-artifact" with this exact shape and opens
// the canvas when one arrives.
type ArtifactData = { title: string; ref: string; body: string };
export type EverlinUIMessage = UIMessage<never, { artifact: ArtifactData }>;

/** Render a validated MorningBrief into readable markdown for the canvas body. */
function renderBriefMarkdown(brief: MorningBrief): string {
  const lines: string[] = [];
  lines.push(brief.executiveSummary.trim());
  lines.push("");
  lines.push("## Figures");
  for (const f of brief.figures) {
    if (f.missing || f.value === null) {
      lines.push(`- ${f.label}: not obtained${f.note ? ` — ${f.note}` : ""}`);
      continue;
    }
    const unit = f.unit ? ` ${f.unit}` : "";
    const prov = f.source ?? f.calcKey ?? "unsourced";
    lines.push(`- ${f.label}: ${f.value}${unit} [${prov}]`);
  }
  lines.push("");
  lines.push("## Question for the IC");
  lines.push(brief.questionForIC.trim());
  lines.push("");
  lines.push("---");
  lines.push(brief.disclaimer.trim());
  return lines.join("\n");
}

// Tools are built per-request so `generateDailyBrief` can capture the stream
// writer and emit a `data-artifact` part (a tool's execute return is tool
// output, NOT a data part — the part must go through writer.write).
function makeTools(writer: UIMessageStreamWriter<EverlinUIMessage>) {
  return {
  generateDailyBrief: tool({
    description:
      "Generate today's Everlin Daily Brief (validated MorningBrief: RBA cash rate, executive summary, question for the IC) and open it in the canvas. Call this whenever the user asks for the daily brief / morning brief.",
    inputSchema: z.object({
      asOf: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("As-of date YYYY-MM-DD. Defaults to a recent valid date if omitted."),
    }),
    execute: async ({ asOf }) => {
      // The request does not cleanly carry the wall-clock date to a tool, so
      // default to a hardcoded recent valid date when the model omits asOf.
      const DEFAULT_AS_OF = "2026-09-10";
      const asOfDate = asOf ?? DEFAULT_AS_OF;
      const result = await buildDailyBrief(asOfDate);
      if (!result.ok || !result.brief) {
        return {
          ok: false as const,
          asOf: asOfDate,
          errors: result.errors ?? ["brief build failed"],
        };
      }
      const brief = result.brief as MorningBrief;
      const artifact: ArtifactData = {
        title: "Daily Brief",
        ref: brief.envelope.docId,
        body: renderBriefMarkdown(brief),
      };
      // Emit the data-artifact part so the client canvas renders the brief.
      writer.write({ type: "data-artifact", data: artifact });
      return {
        ok: true as const,
        ref: artifact.ref,
        asOf: brief.asOf,
        summary: brief.executiveSummary,
      };
    },
  }),
  getCompanyFinancial: tool({
    description:
      "Retrieve a real, sourced financial figure for a US-listed company from SEC EDGAR. Returns the value with its source, or a not-obtained marker if unavailable. US-listed only.",
    inputSchema: z.object({
      ticker: z.string().describe("US ticker symbol, e.g. AAPL, MSFT, NVDA"),
      concept: z
        .string()
        .describe(
          "us-gaap XBRL concept, e.g. Revenues, NetIncomeLoss, Assets, StockholdersEquity, CashAndCashEquivalentsAtCarryingValue",
        ),
    }),
    execute: async ({ ticker, concept }) => edgarConcept(ticker, concept),
  }),
  getTreasuryRate: tool({
    description:
      "Retrieve the latest US Treasury average interest rate (sourced, from US Treasury fiscal data).",
    inputSchema: z.object({}),
    execute: async () => treasuryYield(),
  }),
  getAuCashRate: tool({
    description:
      "Retrieve the current Australian cash rate target (sourced, from RBA Table F1). Use for any question about the RBA cash rate / Australian official interest rate. Attribution is RBA; the RBA does not endorse this use.",
    inputSchema: z.object({}),
    execute: async () => auCashRate(),
  }),
  getAbsMacro: tool({
    description:
      "Retrieve a real, sourced Australian macro figure from the ABS (Australian Bureau of Statistics): CPI (inflation index) or GDP (quarterly growth). Returns the value with its source, or a not-obtained marker.",
    inputSchema: z.object({
      series: z.enum(["CPI", "GDP"]).describe("Which ABS series: CPI (All-groups index) or GDP (% change per quarter)"),
    }),
    execute: async ({ series }) => absSeries(series),
  }),
  planSkills: tool({
    description:
      "Route the user's request to an ordered Everlin skill plan (which skills to run, in what order, and the tools each needs). Call this first for any non-trivial request.",
    inputSchema: z.object({
      request: z.string().describe("The user's request, verbatim or paraphrased"),
    }),
    execute: async ({ request }) => {
      const plan = route(request);
      return { unrouted: plan.unrouted, steps: plan.steps, rendered: renderPlan(plan) };
    },
  }),
  calcMarginOfSafety: tool({
    description:
      "Deterministic Buffett margin of safety % from price and intrinsic value. Returns value, calcKey, and flags (below 25% floor). Never compute this yourself.",
    inputSchema: z.object({ price: z.number(), intrinsicValue: z.number() }),
    execute: async ({ price, intrinsicValue }) => marginOfSafety(price, intrinsicValue),
  }),
  calcFeeDrag: tool({
    description:
      "Deterministic all-in annual fee load from management/performance/other %. Flags loads above the 2.5% p.a. Everlin ceiling. Never compute this yourself.",
    inputSchema: z.object({
      managementPct: z.number(),
      performancePct: z.number(),
      otherPct: z.number().default(0),
    }),
    execute: async ({ managementPct, performancePct, otherPct }) =>
      feeDrag(managementPct, performancePct, otherPct),
  }),
  calcFeeDecomposition: tool({
    description:
      "Deterministic PE full fee decomposition: sum named fee components (management, carry_equiv, admin, fund_expenses, …), flag if total > 2.5% p.a. Never compute this yourself.",
    inputSchema: z.object({
      components: z.record(z.string(), z.number()).describe("Named fee components as %, e.g. { management: 2.0, carry_equiv: 2.5 }"),
    }),
    execute: async ({ components }) => feeDecomposition(components),
  }),
  calcDevelopmentMargin: tool({
    description:
      "Deterministic property development margin % from GRV and TDC. Flags below the 20% floor. Never compute this yourself.",
    inputSchema: z.object({ grv: z.number(), tdc: z.number() }),
    execute: async ({ grv, tdc }) => developmentMargin(grv, tdc),
  }),
  calcFeasibilityStress: tool({
    description:
      "Deterministic feasibility stress: re-test the 20% margin at cost +X% / price -Y% (default 10/10). Flags a failing stress. Never compute this yourself.",
    inputSchema: z.object({
      grv: z.number(),
      tdc: z.number(),
      costShockPct: z.number().default(10),
      priceShockPct: z.number().default(10),
    }),
    execute: async ({ grv, tdc, costShockPct, priceShockPct }) =>
      feasibilityStress(grv, tdc, costShockPct, priceShockPct),
  }),
  calcGoingConcernYield: tool({
    description:
      "Deterministic going-concern yield % from NOI and asset value. Flags outside the 7-9% net-unlevered band. Never compute this yourself.",
    inputSchema: z.object({ noi: z.number(), assetValue: z.number() }),
    execute: async ({ noi, assetValue }) => goingConcernYield(noi, assetValue),
  }),
  } as const;
}

export async function POST(req: Request) {
  const {
    messages,
    mode,
  }: { messages: UIMessage[]; mode?: "routine" | "ic" } = await req.json();

  const model = MODELS[mode === "ic" ? "ic" : "routine"];
  const modelMessages = await convertToModelMessages(messages);

  // createUIMessageStream owns the assistant message lifecycle so that a tool
  // (generateDailyBrief) can write a custom `data-artifact` part alongside the
  // model's own stream, which is merged in via writer.merge.
  const stream = createUIMessageStream<EverlinUIMessage>({
    execute: ({ writer }) => {
      const result = streamText({
        model,
        system: EVERLIN_SYSTEM,
        messages: modelMessages,
        tools: makeTools(writer),
        stopWhen: stepCountIs(8), // allow retrieve -> reason -> answer loops
      });
      writer.merge(toUIMessageStream({ stream: result.stream }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
