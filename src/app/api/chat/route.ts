import {
  streamText,
  tool,
  stepCountIs,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import { edgarConcept, treasuryYield } from "@/lib/data-sources";

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

Tools available: getCompanyFinancial (SEC EDGAR, US-listed companies only — us-gaap concepts like Revenues, NetIncomeLoss, Assets), getTreasuryRate (US Treasury). If asked about an ASX/AU company these US tools won't have it — say so plainly and mark those figures not obtained.

Base currency AUD. Two lenses: Buffett (core/value) and Wood/Ark (growth). Label which you apply.`;

const tools = {
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
};

export async function POST(req: Request) {
  const {
    messages,
    mode,
  }: { messages: UIMessage[]; mode?: "routine" | "ic" } = await req.json();

  const model = MODELS[mode === "ic" ? "ic" : "routine"];

  const result = streamText({
    model,
    system: EVERLIN_SYSTEM,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(8), // allow retrieve -> reason -> answer loops
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
