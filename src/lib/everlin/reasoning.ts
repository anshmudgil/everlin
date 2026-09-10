/**
 * T11 — deterministic reasoning-trace builder.
 *
 * The golden's per-section THE FACTS / THE INTERPRETATION structure, produced as
 * structured data from the retrieved facts. This is CODE, not an LLM call: given
 * the same facts it emits the same SectionReasoning, so it never breaks byte
 * determinism. FACTS are sourced Claims lifted straight from the Facts (each
 * carries its provenance); INTERPRETATION is a templated, rule-based reading of
 * those facts (labelled opinion, no new numbers). The narrative model (T12) may
 * later replace the interpretation prose, but the deterministic path stands
 * alone so the pipeline works with zero model dependency.
 */
import type { Fact } from "@/lib/data-sources";
import type { SectionReasoning, Claim } from "@/lib/everlin/schemas";

function factClaim(f: Fact): Claim {
  const val = f.value === null ? "not obtained" : `${f.value}${f.unit ? ` ${f.unit}` : ""}`;
  return {
    text: `${f.label}: ${val}${f.asOf ? ` (as of ${f.asOf})` : ""}`,
    source: f.source,
    assertion: false,
  };
}

/**
 * Build reasoning sections from the retrieved macro facts. Deterministic:
 * partitions facts by domain, emits sourced FACTS + a rule-based INTERPRETATION.
 */
export function buildReasoning(facts: Fact[]): SectionReasoning[] {
  const has = (frag: string) =>
    facts.find((f) => f.label.toLowerCase().includes(frag) && f.value !== null);
  const sections: SectionReasoning[] = [];

  // AUSTRALIA — RBA cash rate + AUD.
  const cash = has("cash rate");
  const aud = has("aud/usd");
  const auFacts = [cash, aud].filter(Boolean) as Fact[];
  if (auFacts.length) {
    sections.push({
      section: "australia",
      facts: auFacts.map(factClaim),
      interpretation:
        cash
          ? `The RBA cash rate stands at ${cash.value}${cash.unit ? ` ${cash.unit}` : ""}. ` +
            `The Committee should read the local market against rate-path risk rather than data strength alone.`
          : "AUD and rate reads are the primary Australian signals this run.",
    });
  }

  // WORLD & MACRO — US Treasury + CPI as the offshore/inflation read.
  const treasury = has("treasury");
  const cpi = has("cpi");
  const macroFacts = [treasury, cpi].filter(Boolean) as Fact[];
  if (macroFacts.length) {
    sections.push({
      section: "world-and-macro",
      facts: macroFacts.map(factClaim),
      interpretation:
        "Offshore rates and the domestic inflation index frame the policy backdrop; " +
        "treat moves in the rate-path narrative, not just its level, as the durable signal.",
    });
  }

  // THE ONE THING — the single most material obtained figure this run.
  const headline = cash ?? treasury ?? aud ?? cpi;
  if (headline) {
    sections.push({
      section: "the-one-thing",
      facts: [factClaim(headline)],
      interpretation:
        `The most material confirmed read this run is ${headline.label}. ` +
        `Every other figure in this brief is either sourced or explicitly marked not obtained — nothing is estimated.`,
    });
  }

  return sections;
}
