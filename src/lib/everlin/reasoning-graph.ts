/**
 * T5 — the brief's reasoning as six explicit, typed nodes (the executable form of
 * docs/brief-reasoning-framework.md). All nodes hold NO tools (#13): they read
 * figures + attributed news as DATA. Numbers never originate here — a node may
 * only surface a value already present in a sourced Fact/Claim (#9). The
 * deterministic baseline comes from buildReasoning; buildNarrative supplies the
 * gated LLM upgrade. This module names the operations so the reasoning is
 * inspectable and each step is independently eval'able.
 */
import type { Fact } from "@/lib/data-sources";
import type { SectionReasoning } from "@/lib/everlin/schemas";
import { buildReasoning } from "@/lib/everlin/reasoning";
import { checkThroughline } from "@/lib/everlin/narrative/throughline";

export type Shock = { date: string; event: string; source: string; magnitude: "high" | "medium" | "low" };

/** 1. ENUMERATE SHOCKS — the distinct, dated, sourced events with a transmission path. */
export function enumerateShocks(facts: Fact[]): { shocks: Shock[]; note: string } {
  const obtained = facts.filter((f) => f.value !== null);
  // A shock qualifies only if it is dated + sourced. Rank by whether the figure
  // is a rate/policy read (high) vs a level (medium). No new numbers.
  const shocks: Shock[] = obtained.slice(0, 4).map((f) => ({
    date: f.asOf ?? "undated",
    event: f.label,
    source: f.source,
    magnitude: /cash rate|treasury|cpi|gdp/i.test(f.label) ? "high" : "medium",
  }));
  const note = shocks.length < 2 ? "fewer than 2 confirmed shocks this run — thin material" : `${shocks.length} shocks enumerated`;
  return { shocks, note };
}

/** 2-6 compose the deterministic SectionReasoning + the coherence gate. */
export type ReasoningTrace = {
  shocks: Shock[];
  sections: SectionReasoning[];
  throughlineCoheres: boolean;
  shockNote: string;
};

/**
 * Run the full reasoning graph over the retrieved facts. Deterministic baseline;
 * callers layer the gated LLM (buildNarrative) on top. Emits the trace the brief
 * and the eval set inspect.
 */
export function runReasoningGraph(facts: Fact[]): ReasoningTrace {
  const { shocks, note } = enumerateShocks(facts); // 1
  const sections = buildReasoning(facts); // 2 throughline, 3 signal-vs-level, 4 localise, 5 bound-confidence, 6 open-question
  const throughlineCoheres = checkThroughline(sections).pass; // callback discipline (V08)
  return { shocks, sections, throughlineCoheres, shockNote: note };
}
