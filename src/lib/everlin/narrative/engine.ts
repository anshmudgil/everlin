/**
 * V06 + V07 — the narrative engine: template + gated LLM slots.
 *
 * The deterministic builder (reasoning.ts buildReasoning) supplies the sourced
 * FACTS and a rule-based interpretation for every section — that ALWAYS ships and
 * is byte-stable. This engine tries to REPLACE the interpretation prose (and only
 * the prose) with a richer, in-voice LLM reading, then GATES it:
 *   - vernacular lint (V05) — is it in the house register?
 *   - no-fabrication — does the interpretation introduce an un-sourced number?
 * On any gate failure, or any model error, it falls back to the deterministic
 * prose. The FACTS (sourced Claims) and the section set are never LLM-touched, so
 * determinism of the frame + figures is untouched; only the analytical sentence
 * varies, and only when it passes the gate.
 */
import { z } from "zod";
import { generateObject } from "ai";
import type { Fact } from "@/lib/data-sources";
import type { SectionReasoning } from "@/lib/everlin/schemas";
import { buildReasoning } from "@/lib/everlin/reasoning";
import { lintVernacular } from "@/lib/everlin/narrative/vernacular";

// The model for the narrative slots. Must support structured output
// (generateObject) — qwen3.7-flash on the gateway does NOT (verified: returns
// "Only image file parts are supported"), so the narrative engine requires a
// capable model. Claude Sonnet handles the IC-brief voice and structured output;
// determinism does not depend on the choice (temp 0, output gated + fallback).
const NARRATIVE_MODEL = "anthropic/claude-sonnet-4-6";

const InterpretationSchema = z.object({
  interpretations: z.array(
    z.object({
      section: z.string(),
      interpretation: z.string(),
    }),
  ),
});

/** Does interpretation prose smuggle in a number not present in its facts? */
function introducesUnsourcedNumber(interpretation: string, facts: { text: string }[]): boolean {
  const nums = interpretation.match(/\d[\d,.]*/g) ?? [];
  if (nums.length === 0) return false;
  const factBlob = facts.map((f) => f.text).join(" ");
  // Every number in the interpretation must also appear in a sourced fact.
  return nums.some((n) => !factBlob.includes(n));
}

export type NarrativeResult = {
  sections: SectionReasoning[];
  usedLlm: boolean;
  gateFindings: string[];
};

/**
 * Build reasoning sections, upgrading the interpretation prose via the gated LLM
 * where it passes. Deterministic facts + fallback prose always present.
 */
export async function buildNarrative(
  facts: Fact[],
  opts: { allowLlm?: boolean } = {},
): Promise<NarrativeResult> {
  // Deterministic baseline — this is the guaranteed-shippable output.
  const base = buildReasoning(facts);
  if (!opts.allowLlm) {
    return { sections: base, usedLlm: false, gateFindings: [] };
  }

  const gateFindings: string[] = [];
  let llmInterps: { section: string; interpretation: string }[] = [];
  try {
    const prompt =
      `You are the Everlin investment analyst. For each section below, write ONE ` +
      `interpretation sentence in the house voice: analytical, no hype, British/AU spelling, ` +
      `states a position and bounds its confidence. Use ONLY the facts given — introduce NO new ` +
      `number. Sections and their sourced facts:\n` +
      base
        .map((s) => `- ${s.section}: ${s.facts.map((f) => f.text).join("; ")}`)
        .join("\n");
    const { object } = await generateObject({
      model: NARRATIVE_MODEL,
      schema: InterpretationSchema,
      temperature: 0,
      prompt,
    });
    llmInterps = object.interpretations;
  } catch (e) {
    gateFindings.push(`llm error: ${(e as Error).message}`);
    return { sections: base, usedLlm: false, gateFindings };
  }

  // Gate each LLM interpretation; keep it only if it passes, else keep the
  // deterministic one for that section.
  const byId = new Map(llmInterps.map((i) => [i.section, i.interpretation]));
  let anyUsed = false;
  const sections = base.map((s) => {
    const llm = byId.get(s.section);
    if (!llm) return s;
    const lint = lintVernacular(llm);
    const fabricates = introducesUnsourcedNumber(llm, s.facts);
    if (!lint.pass) {
      gateFindings.push(`${s.section}: vernacular ${lint.findings.join(",")}`);
      return s;
    }
    if (fabricates) {
      gateFindings.push(`${s.section}: interpretation introduced an un-sourced number`);
      return s;
    }
    anyUsed = true;
    return { ...s, interpretation: llm };
  });

  return { sections, usedLlm: anyUsed, gateFindings };
}
