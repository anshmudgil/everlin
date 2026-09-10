/**
 * Validation gate: run a structured output through its skill schema + the
 * cross-cutting Everlin text lint (Evelyn ban, ambiguous-Jordan hazard).
 *
 * `validateOutput` returns a discriminated result rather than throwing, so an
 * API route can surface violations to the caller (HITL) instead of 500-ing.
 */
import { z } from "zod";
import { SCHEMA_BY_SKILL, type SkillWithSchema } from "./schemas";

export type ValidationResult =
  | { ok: true; data: unknown; lint: string[] }
  | { ok: false; errors: string[]; lint: string[] };

const EVELYN = /\bevel[yi]n\b/gi;
const JORDAN_BARE = /Jordan\b(?!\s+(?:Lin|Hickey))/g;

/** Free-text contract lint. Returns a list of problems (empty = clean). */
export function lintText(text: string): string[] {
  const problems: string[] = [];
  for (const m of text.matchAll(EVELYN)) {
    const ctx = text.slice(Math.max(0, m.index - 40), m.index + 20).toLowerCase();
    if (!/never|do not|don't|artifact|not write/.test(ctx))
      problems.push(`Banned token '${m[0]}' at pos ${m.index} (entity is 'Everlin')`);
  }
  for (const m of text.matchAll(JORDAN_BARE)) {
    const near = text.slice(m.index, m.index + 30).trim();
    problems.push(`Ambiguous 'Jordan' (no surname) near: '${near}' — disambiguate Lin vs Hickey`);
  }
  return problems;
}

export function isSkillWithSchema(skillId: string): skillId is SkillWithSchema {
  return skillId in SCHEMA_BY_SKILL;
}

/**
 * Validate a structured output for a skill.
 * @param skillId  must be a skill that has a schema
 * @param obj      the candidate output object
 * @param renderedText  optional prose to run the text lint over
 */
export function validateOutput(
  skillId: string,
  obj: unknown,
  renderedText?: string,
): ValidationResult {
  const lint = renderedText ? lintText(renderedText) : [];
  if (!isSkillWithSchema(skillId)) {
    return { ok: false, errors: [`No schema registered for skill '${skillId}'`], lint };
  }
  const schema = SCHEMA_BY_SKILL[skillId] as z.ZodTypeAny;
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => {
      const path = i.path.length ? `${i.path.join(".")}: ` : "";
      return `${path}${i.message}`;
    });
    return { ok: false, errors, lint };
  }
  // Schema passed; a failing lint is still a hard fail (text-level contract).
  if (lint.length) return { ok: false, errors: [`text lint: ${lint.join("; ")}`], lint };
  return { ok: true, data: parsed.data, lint };
}
