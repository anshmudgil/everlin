/**
 * T7 — ResearchOrchestrator. The deep-research agent that fills the LICENSED_GAPS.
 *
 * PROPOSE-ONLY: for a target figure it runs a chained pipeline —
 *   source-discovery -> retrieval (trusted APIs; FRED only if allowInternal)
 *   -> UntrustedRead (tool-free) -> CrossVerify -> classifyProvenance
 * — and returns FigureCandidate[] with a trace. It COMMITS NOTHING: candidates
 * flow through the ClientCleanGate (T3) at assemble time, so an internal-tos-risk
 * or unverified figure can never reach a client brief on the orchestrator's say.
 *
 * TOPOLOGY (per the design decision): a single chained pipeline, NOT a
 * multi-agent swarm. The steps share one target + accumulate one trace; there is
 * no peer contradiction to resolve, so one agent is the fewest that works.
 *
 * CAPS (#15): per run, 20 calls / 100k tokens / $0.50 / 120s. Breach halts and
 * returns partial candidates — never silently continues.
 */
import { fredSeries, type Fact } from "@/lib/data-sources";
import { retrieveAttributedNews, type AttributedItem } from "@/lib/everlin/news-sources";
import { readUntrustedText } from "@/lib/everlin/research/untrusted-read";
import { crossVerify, type Surface } from "@/lib/everlin/verification/cross-verify";
import { classifyProvenance, type Provenance } from "@/lib/everlin/verification/provenance";

export type FigureCandidate = {
  label: string;
  value: number | null;
  provenance: Provenance;
  tier: string;
  crossVerified: boolean;
  canShip: boolean; // never means "ship to client" — the gate decides that
  source: string;
  asOf: string | null;
  trace: string[];
};

// A missing target and where the internal (FRED) pipe would look for it.
export type ResearchTarget = { label: string; fredSeriesId?: string; newsQuery: string };

export class CapEnforcer {
  private calls = 0;
  private tokens = 0;
  private spend = 0;
  private startMs: number;
  breached: string | null = null;
  constructor(private nowMs: number, private caps = { calls: 20, tokens: 100_000, spend: 0.5, seconds: 120 }) {
    this.startMs = nowMs;
  }
  /** Call BEFORE each unit of work. Returns false (and sets breached) on breach. */
  charge(kind: "call", n = 1, atMs?: number): boolean {
    if (this.breached) return false;
    if (kind === "call") this.calls += n;
    const elapsed = ((atMs ?? this.nowMs) - this.startMs) / 1000;
    if (this.calls > this.caps.calls) this.breached = `calls > ${this.caps.calls}`;
    else if (this.tokens > this.caps.tokens) this.breached = `tokens > ${this.caps.tokens}`;
    else if (this.spend > this.caps.spend) this.breached = `spend > $${this.caps.spend}`;
    else if (elapsed > this.caps.seconds) this.breached = `seconds > ${this.caps.seconds}`;
    return !this.breached;
  }
}

/**
 * Research one target. Returns a candidate (or a not-obtained one) + trace.
 * allowInternal gates the FRED (internal-tos-risk) pipe.
 */
export async function researchTarget(
  target: ResearchTarget,
  opts: { allowInternal: boolean; nowIso: string; caps: CapEnforcer; newsItems?: AttributedItem[] },
): Promise<FigureCandidate> {
  const trace: string[] = [`target=${target.label} allowInternal=${opts.allowInternal}`];
  const surfaces: Surface[] = [];

  // 1. Internal FRED pipe (only if allowed) — labelled internal-tos-risk.
  if (target.fredSeriesId && opts.allowInternal) {
    if (!opts.caps.charge("call")) {
      trace.push(`CAP BREACH: ${opts.caps.breached}`);
      return notObtained(target.label, trace, "cap breach before FRED");
    }
    const f: Fact = await fredSeries(target.fredSeriesId, target.label);
    trace.push(`FRED ${target.fredSeriesId} -> ${f.value ?? "null"}`);
    if (typeof f.value === "number") surfaces.push({ value: f.value, source: f.source, asOf: f.asOf });
  } else if (target.fredSeriesId) {
    trace.push("FRED skipped (allowInternal=false)");
  }

  // 2. Attributed news surfaces (tool-free untrusted read). News items are the
  //    golden's own path for index levels. Each proposed figure must appear
  //    literally in the item text or it is rejected.
  const news = opts.newsItems ?? (await retrieveAttributedNews(target.newsQuery, { nowIso: opts.nowIso, items: [] }));
  for (const item of news) {
    if (!opts.caps.charge("call")) {
      trace.push(`CAP BREACH: ${opts.caps.breached}`);
      break;
    }
    // Extract the candidate figure from the headline, then verify it is literally
    // present via the tool-free reader (#13). Numbers that are part of the target
    // label itself (e.g. the "200" in "ASX 200") are excluded — the level is the
    // figure, not the instrument's name-number.
    const labelNums = new Set(
      (target.label.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((s) => Number(s.replace(/,/g, ""))),
    );
    const nums = (item.headline.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [])
      .map((s) => Number(s.replace(/,/g, "")))
      .filter((n) => Number.isFinite(n) && !labelNums.has(n));
    // The level is the largest remaining number (levels dwarf incidental digits).
    const candidate = nums.length ? Math.max(...nums) : undefined;
    const read = readUntrustedText({ rawText: item.headline, outlet: item.outlet, url: item.url, target: target.label }, candidate);
    trace.push(`news ${item.outlet} -> ${read.fabricated ? "fabricated(rejected)" : read.figure ?? "no-figure"}`);
    if (read.figure !== null) surfaces.push({ value: read.figure, source: item.outlet, asOf: opts.nowIso.slice(0, 10) });
  }

  // 3. Cross-verify the surfaces.
  if (surfaces.length === 0) {
    trace.push("no surfaces -> not obtained (default-deny)");
    return notObtained(target.label, trace, "no surfaces");
  }
  const cv = crossVerify(surfaces, target.label);
  trace.push(`cross-verify: tier=${cv.tier} value=${cv.consensusValue} verified=${cv.crossVerified}`);

  // 4. Classify provenance from the WINNING surface's source.
  const winningSource = surfaces[0].source;
  const prov = classifyProvenance({ label: target.label, source: winningSource }).provenance;
  trace.push(`provenance=${prov}`);

  return {
    label: target.label,
    value: cv.canShip ? cv.consensusValue : null,
    provenance: prov,
    tier: cv.tier,
    crossVerified: cv.crossVerified,
    canShip: cv.canShip,
    source: winningSource,
    asOf: surfaces[0].asOf ?? null,
    trace,
  };
}

function notObtained(label: string, trace: string[], why: string): FigureCandidate {
  return { label, value: null, provenance: "unverified", tier: "not-obtained", crossVerified: false, canShip: false, source: "", asOf: null, trace: [...trace, `NOT OBTAINED: ${why}`] };
}
