/**
 * T8 — fold research candidates into brief figures through the gates.
 *
 * The ResearchOrchestrator (T7) proposes FigureCandidate[]; this is where they
 * become (or don't become) MorningBrief figures — AFTER classifyProvenance (T1)
 * and subject to the ClientCleanGate (T3, applied downstream in headless). The
 * spine owns this staging step; the orchestrator is an input, never a writer.
 *
 * A candidate replaces a matching not-obtained (missing) figure ONLY when it is
 * shippable at its provenance for the requested band:
 *   - client-clean + canShip     -> fills the gap for any band.
 *   - internal-tos-risk + canShip -> fills the gap ONLY on the internal band;
 *     on the client band it stays missing (the ClientCleanGate then also blocks
 *     it, defence in depth).
 *   - unverified / !canShip       -> never fills; the gap stays not-obtained.
 */
import type { MorningBrief } from "@/lib/everlin/schemas";
import type { FigureCandidate } from "@/lib/everlin/research/orchestrator";

type Figure = MorningBrief["figures"][number];

function candidateToFigure(c: FigureCandidate): Figure {
  return {
    label: c.label,
    value: c.value,
    unit: "",
    calcKey: null,
    source: c.source || null,
    sourceUrl: null,
    asOf: c.asOf,
    missing: c.value === null,
    note: `research: ${c.tier}, provenance=${c.provenance}${c.crossVerified ? ", cross-verified" : ""}`,
  };
}

/**
 * Fold candidates into figures. Returns the merged figure list (candidates only
 * replace a currently-missing figure of the same label) plus which labels were
 * filled. Deterministic: no candidate => figures unchanged (byte-hash stable).
 */
export function foldCandidates(
  figures: Figure[],
  candidates: FigureCandidate[],
  band: "client" | "internal",
): { figures: Figure[]; filled: string[] } {
  const filled: string[] = [];
  const byLabel = new Map(candidates.map((c) => [c.label, c]));

  const merged = figures.map((f) => {
    if (!f.missing) return f; // never overwrite an obtained figure
    const c = byLabel.get(f.label);
    if (!c || c.value === null || !c.canShip) return f;
    // client band: only client-clean candidates may fill here; internal risk is
    // held back (the ClientCleanGate is the hard second line, this is the first).
    if (band === "client" && c.provenance !== "client-clean") return f;
    filled.push(f.label);
    return candidateToFigure(c);
  });

  return { figures: merged, filled };
}
