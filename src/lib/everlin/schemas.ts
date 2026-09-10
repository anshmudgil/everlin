/**
 * Everlin structured-output contract (Zod 4).
 *
 * The TS port of the Python `agent/schemas`. These schemas are the gate the
 * agent's output must pass before it is filed or rendered. They encode the
 * operating-context invariants as *types*:
 *
 *  - A number in an output is a `Figure` that MUST cite a `calcKey` (a
 *    deterministic-calculator reference) OR be explicitly `missing`. A raw
 *    model-guessed number fails validation — the trust-spine rule.
 *  - Every factual claim is a `Claim` carrying a `source` + `assertion` flag.
 *  - Action items carry a named owner; an unfilled role must route to Jordan Lin.
 *  - A weekly IC brief may not contain an IC-paper verdict (PROCEED/DECLINE/…).
 */
import { z } from "zod";

export const DISCLAIMER =
  "Decision-support material, not advice. No allocation, no approval, no send. " +
  "Ansh sends every client-facing communication.";

export const Band = z.enum(["Black", "Red", "Amber", "Green"]);
export type Band = z.infer<typeof Band>;

export const Escalation = z.enum(["GREEN", "AMBER", "RED"]);
export type Escalation = z.infer<typeof Escalation>;

const CALC_KEY_RE = /^[A-Z0-9][A-Z0-9\-_]{2,63}$/;

/**
 * A number that appears in an output. Every non-missing value needs provenance:
 * EITHER a `calcKey` (computed by a deterministic calculator) OR a `source`
 * (retrieved from a sourced Fact tool, e.g. RBA/ABS/SEC EDGAR). A number with
 * neither is a model guess and is rejected — the trust-spine rule.
 */
export const Figure = z
  .object({
    label: z.string().min(1),
    value: z.number().nullable().default(null),
    unit: z.string().default(""),
    calcKey: z.string().nullable().default(null),
    // Retrieved-provenance branch: a sourced figure cites where it came from
    // instead of a calcKey (it wasn't computed, so it has no reproducible key).
    source: z.string().nullable().default(null),
    sourceUrl: z.string().nullable().default(null),
    asOf: z.string().nullable().default(null),
    missing: z.boolean().default(false),
    note: z.string().default(""),
  })
  .superRefine((f, ctx) => {
    if (f.missing) {
      if (f.value !== null)
        ctx.addIssue({ code: "custom", message: `Figure '${f.label}': marked missing but has a value` });
      return;
    }
    if (f.value === null) {
      ctx.addIssue({ code: "custom", message: `Figure '${f.label}': not missing but value is null — use missing:true for a deliberate gap` });
      return;
    }
    // Provenance: computed (calcKey) XOR retrieved (source). Neither ⇒ a guess.
    if (!f.calcKey && !f.source) {
      ctx.addIssue({ code: "custom", message: `Figure '${f.label}'=${f.value}: no provenance. A number must cite a calcKey (computed) or a source (retrieved), never be model-guessed.` });
      return;
    }
    if (f.calcKey && !CALC_KEY_RE.test(f.calcKey)) {
      ctx.addIssue({ code: "custom", message: `Figure '${f.label}': calcKey '${f.calcKey}' malformed (UPPER-SNAKE/DASH, 3-64 chars)` });
    }
  });
export type Figure = z.infer<typeof Figure>;

/** A factual statement. source required; assertion=true = unverified promoter claim. */
export const Claim = z.object({
  text: z.string().min(1),
  source: z.string().min(1, "Every factual claim must be attributed"),
  assertion: z.boolean().default(false),
});
export type Claim = z.infer<typeof Claim>;

/**
 * T05 — per-section reasoning, the golden's "THE FACTS." / "THE INTERPRETATION."
 * structure made schema-backed. `facts` are sourced Claims (each carries its
 * attribution, enforcing the trust-spine at the section level); `interpretation`
 * is explicitly-labelled opinion generated from those facts — it never states a
 * new number and carries no source of its own because it IS the analysis. The
 * separation is load-bearing: the IC must be able to tell data from opinion, and
 * the fidelity eval checks both halves are present per reasoned section.
 */
export const SectionReasoning = z
  .object({
    // Which golden section this reasoning belongs to (see golden-checklist.ts).
    section: z.string().min(1),
    facts: z.array(Claim).default([]),
    interpretation: z.string().default(""),
  })
  .superRefine((s, ctx) => {
    // An interpretation with no facts under it is an unsourced opinion block.
    if (s.interpretation.trim() && s.facts.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: `SectionReasoning '${s.section}': interpretation present but no sourced facts underneath it`,
      });
    }
  });
export type SectionReasoning = z.infer<typeof SectionReasoning>;

const KNOWN_OWNERS = [
  "Jordan Lin", "Clyde McConaghy", "Jordan Hickey",
  "Nick Johnson", "Nick Johnson / WMS", "Lauren Pereira", "Kara Arnott",
] as const;

/** Action item: named owner + deadline; unfilled role must route to Jordan Lin. */
export const ActionItem = z
  .object({
    text: z.string().min(1),
    owner: z.string().min(1, "ActionItem: no named owner"),
    deadline: z.string().nullable().default(null), // null renders as (missing)
    unfilledRole: z.string().nullable().default(null),
  })
  .superRefine((a, ctx) => {
    if (a.unfilledRole && a.owner !== "Jordan Lin") {
      ctx.addIssue({ code: "custom", message: `ActionItem '${a.text.slice(0, 40)}': unfilled role set but owner is not Jordan Lin` });
    }
  });
export type ActionItem = z.infer<typeof ActionItem>;

/** Weekly-brief decision: NEEDED not MADE. Bans IC-paper verdicts; owner=Jordan Lin. */
const IC_VERDICTS = ["PROCEED", "CONDITIONAL PROCEED", "DEFER", "DECLINE", "WATCH"];
export const DecisionNeeded = z
  .object({
    number: z.number().int(),
    decision: z.string().min(1),
    context: z.string().default(""),
    neededBy: z.string().nullable().default(null),
    owner: z.string().default("Jordan Lin"),
  })
  .superRefine((d, ctx) => {
    if (d.owner !== "Jordan Lin")
      ctx.addIssue({ code: "custom", message: `DecisionNeeded #${d.number}: final authority must be Jordan Lin` });
    const up = d.decision.toUpperCase();
    for (const v of IC_VERDICTS)
      if (up.includes(v))
        ctx.addIssue({ code: "custom", message: `DecisionNeeded #${d.number}: contains IC-paper verdict '${v}'. Weekly brief outputs decisions NEEDED, not MADE.` });
  });
export type DecisionNeeded = z.infer<typeof DecisionNeeded>;

export const CrossDomainSignal = z.object({
  signal: z.string().min(1),
  reaches: z.enum(["Property", "Investment"]),
  why: z.string().default(""),
  ownerToTest: z.string().min(1, "CrossDomainSignal: needs an owner to test"),
});
export type CrossDomainSignal = z.infer<typeof CrossDomainSignal>;

export const Escalated = z.object({
  item: z.string().min(1),
  band: Escalation,
  impact: z.string().default(""),
  nextStep: z.string().default(""),
  owner: z.string().min(1),
});

const DOC_ID = {
  "EVL-DAILY": /^EVL-DAILY-\d{4}-\d{2}-\d{2}$/,
  "EVL-WEEKLY": /^EVL-WEEKLY-\d{4}-\d{2}-\d{2}$/,
  "EVL-INV-SCR": /^EVL-INV-SCR-\d{4}-\d{2,}$/,
  "EVL-PROP-SCR": /^EVL-PROP-SCR-\d{4}-\d{2,}$/,
  "EVL-MPR": /^EVL-MPR-\d{4}-\d{2}$/,
} as const;

export const Envelope = z
  .object({
    docId: z.string(),
    band: Band.default("Red"),
    status: z.string().default("Draft for review — verify all facts before use"),
    classificationLabel: z.string().default("Internal"),
    preparedBy: z.string().nullable().default(null),
  })
  .superRefine((e, ctx) => {
    if (!Object.values(DOC_ID).some((re) => re.test(e.docId)))
      ctx.addIssue({ code: "custom", message: `Envelope: docId '${e.docId}' matches no EVL-* pattern` });
  });

const withDisclaimer = z.string().refine((s) => s.trim() === DISCLAIMER, {
  message: "disclaimer footer altered/absent",
});

export const WeeklyICBrief = z
  .object({
    envelope: Envelope,
    weekOf: z.string(),
    executiveSummary: z.string().min(1, "empty executive summary"),
    decisions: z.array(DecisionNeeded).default([]),
    crossDomain: z.array(CrossDomainSignal).default([]),
    investmentItems: z.array(Claim).default([]),
    propertyItems: z.array(Claim).default([]),
    escalations: z.array(Escalated).default([]),
    figures: z.array(Figure).default([]),
    followUps: z.array(ActionItem).default([]),
    openQuestions: z.array(z.string()).default([]),
    disclaimer: withDisclaimer.default(DISCLAIMER),
  })
  .superRefine((b, ctx) => {
    if (!b.envelope.docId.startsWith("EVL-WEEKLY"))
      ctx.addIssue({ code: "custom", message: "WeeklyICBrief: docId must be EVL-WEEKLY-*" });
  });
export type WeeklyICBrief = z.infer<typeof WeeklyICBrief>;

export const MorningBrief = z
  .object({
    envelope: Envelope,
    asOf: z.string(),
    executiveSummary: z.string().min(1),
    figures: z.array(Figure).default([]),
    claims: z.array(Claim).default([]),
    // T05: per-section reasoning (FACTS/INTERPRETATION), keyed to golden sections.
    // Optional so the existing thin brief keeps validating; the PDF renderer
    // reads these to fill THE ONE THING / AUSTRALIA / etc.
    sections: z.array(SectionReasoning).default([]),
    escalations: z.array(Escalated).default([]),
    questionForIC: z.string().min(1, "a 'Question for the IC' is mandatory (Clyde's format)"),
    disclaimer: withDisclaimer.default(DISCLAIMER),
  })
  .superRefine((b, ctx) => {
    if (!b.envelope.docId.startsWith("EVL-DAILY"))
      ctx.addIssue({ code: "custom", message: "MorningBrief: docId must be EVL-DAILY-*" });
  });
export type MorningBrief = z.infer<typeof MorningBrief>;

// ===========================================================================
// The remaining 10 skill schemas. Each reuses the shared primitives (Figure,
// Claim, ActionItem, Envelope, Escalated) so the same contract — a number cites
// a calcKey or a source, a claim cites a source, the disclaimer is intact —
// holds across every skill. Doc-id prefix is enforced where the cadence fixes one.
// ===========================================================================

/** Screening = LEAN directional signal, never an IC verdict. Doc EVL-INV-SCR. */
export const InvestmentScreen = z
  .object({
    envelope: Envelope,
    dealName: z.string().min(1),
    signal: z.enum(["LEAN POSITIVE", "LEAN NEGATIVE", "NEUTRAL", "INSUFFICIENT DATA"]),
    everlinQuestion: z.string().default(""), // "Why is Everlin the right buyer at this price?"
    edgeTypes: z.array(z.enum(["A", "B", "C", "D", "E", "F"])).default([]),
    frameworkLabel: z.enum(["Buffett", "Wood", "none-assigned"]).default("none-assigned"),
    claims: z.array(Claim).default([]),
    figures: z.array(Figure).default([]),
    adversarialReadiness: z.string().default("(not ready — screening stage)"),
    diligenceQuestions: z.array(z.string()).default([]),
    openQuestions: z.array(z.string()).default([]),
    disclaimer: withDisclaimer.default(DISCLAIMER),
  })
  .superRefine((b, ctx) => {
    if (!b.envelope.docId.startsWith("EVL-INV-SCR"))
      ctx.addIssue({ code: "custom", message: "InvestmentScreen: docId must be EVL-INV-SCR-*" });
    const up = b.signal.toUpperCase();
    for (const v of ["PROCEED", "DECLINE", "DEFER", "WATCH"])
      if (up.includes(v))
        ctx.addIssue({ code: "custom", message: `InvestmentScreen: '${v}' is an IC-paper verdict, not a screening signal` });
  });
export type InvestmentScreen = z.infer<typeof InvestmentScreen>;

/** Manager diligence: fees/liquidity/risk foregrounded; all figures unverified. */
export const ManagerDiligence = z.object({
  managerName: z.string().min(1),
  fundName: z.string().default(""),
  feeDecomposition: z.array(Figure).default([]), // must carry calcKeys
  feeDragFlag: z.string().nullable().default(null),
  liquidityTerms: z.array(Claim).default([]),
  riskDisclosures: z.array(Claim).default([]),
  trackRecord: z.array(Claim).default([]), // assertion=true expected
  omissions: z.array(z.string()).default([]), // what Clyde would rip
  disclaimer: withDisclaimer.default(DISCLAIMER),
});
export type ManagerDiligence = z.infer<typeof ManagerDiligence>;

/** Meeting prep: attendee brief; no fabricated backgrounds (unknown => note). */
export const MeetingPrep = z.object({
  meeting: z.string().min(1),
  attendee: z.string().min(1),
  objective: z.string().default(""),
  openItems: z.array(z.string()).default([]),
  preparedQuestions: z.array(z.string()).default([]),
  unknowns: z.array(z.string()).default([]), // rendered as (missing)
  disclaimer: withDisclaimer.default(DISCLAIMER),
});
export type MeetingPrep = z.infer<typeof MeetingPrep>;

/** Meeting actions: decisions + owned actions + INTERNAL follow-up draft. */
export const MeetingActions = z.object({
  meeting: z.string().min(1),
  decisions: z.array(z.object({ text: z.string().min(1), source: z.string().default("meeting notes") })).default([]),
  actions: z.array(ActionItem).default([]), // owner+deadline enforced
  followUpDraft: z.string().default(""),
  followUpSent: z.literal(false).default(false), // never sent
  openQuestions: z.array(z.string()).default([]),
  disclaimer: withDisclaimer.default(DISCLAIMER),
});
export type MeetingActions = z.infer<typeof MeetingActions>;

/** Vendor review: terms/risks/questions + a PROCESS next step (never approval). */
export const VendorReview = z.object({
  vendor: z.string().min(1),
  terms: z.array(Claim).default([]),
  risks: z.array(z.string()).default([]),
  governanceFlags: z.array(z.string()).default([]), // AU residency, least-priv, no-Graph-to-SoR
  questions: z.array(z.string()).default([]),
  processNextStep: z.string().min(1), // routed to Lauren/Nick, NOT an approval
  disclaimer: withDisclaimer.default(DISCLAIMER),
});
export type VendorReview = z.infer<typeof VendorReview>;

/** Document digest: plain-English + dates + obligations + questions for counsel. */
export const DocumentDigest = z.object({
  document: z.string().min(1),
  plainEnglish: z.array(z.string()).default([]),
  keyDates: z.array(z.string()).default([]),
  obligations: z.array(z.string()).default([]),
  unusualTerms: z.array(z.string()).default([]),
  questionsForCounsel: z.array(z.string()).default([]), // routed to Nick Johnson/WMS
  imClaimsFlagged: z.boolean().default(true),
  disclaimer: withDisclaimer.default(DISCLAIMER),
});
export type DocumentDigest = z.infer<typeof DocumentDigest>;

const CoverageRow = z.object({
  ref: z.string().min(1),
  classification: z.enum([
    "already-booked", "partially-booked", "covered-by-aggregate",
    "pending", "duplicate-representation", "genuinely-missing", "ambiguous",
  ]),
  routedTo: z.string().nullable().default(null), // ambiguous/partial => a person
});

/** Pre-booking gap (HIGH): coverage table; draft packet limited to missing. */
export const PreBookingGap = z
  .object({
    period: z.string().min(1),
    coverage: z.array(CoverageRow).default([]),
    figures: z.array(Figure).default([]), // all matching math via calcKeys
    draftPacketRefs: z.array(z.string()).default([]), // ONLY genuinely-missing refs
    routedToPerson: z.array(z.string()).default([]),
    disclaimer: withDisclaimer.default(DISCLAIMER),
  })
  .superRefine((b, ctx) => {
    // Draft packet must not include anything not classified genuinely-missing.
    const missing = new Set(b.coverage.filter((r) => r.classification === "genuinely-missing").map((r) => r.ref));
    for (const ref of b.draftPacketRefs)
      if (!missing.has(ref))
        ctx.addIssue({ code: "custom", message: `PreBookingGap: draft packet ref '${ref}' is not classified genuinely-missing` });
  });
export type PreBookingGap = z.infer<typeof PreBookingGap>;

const VerifyOutcome = z.enum(["verified", "absent", "altered", "duplicated", "withdrawn", "indeterminate"]);
/** Post-write verify (HIGH): each result classified; indeterminate = FAILURE. */
export const PostWriteVerify = z
  .object({
    batch: z.string().min(1),
    results: z.array(z.object({
      ref: z.string().min(1),
      outcome: VerifyOutcome,
      evidencePath: z.string().min(1, "independent read-back path required"),
    })).default([]),
    overallPass: z.boolean(),
    disclaimer: withDisclaimer.default(DISCLAIMER),
  })
  .superRefine((b, ctx) => {
    const bad = b.results.some((r) => r.outcome !== "verified");
    if (b.overallPass && bad)
      ctx.addIssue({ code: "custom", message: "PostWriteVerify: overallPass=true but a result is not 'verified' — indeterminate/absent/altered is a FAILURE" });
  });
export type PostWriteVerify = z.infer<typeof PostWriteVerify>;

/** Transfer/duplicate (HIGH): group source rows; never removes an accounting leg. */
export const TransferDuplicate = z
  .object({
    groups: z.array(z.object({
      label: z.enum(["internal-transfer", "inter-entity-transfer", "transfer-plus-fee",
        "pending-and-settled", "genuine-external", "unmatched"]),
      refs: z.array(z.string()).min(1),
      escalatedTo: z.string().nullable().default(null), // inter-entity => escalate, never resolve
    })).default([]),
    figures: z.array(Figure).default([]),
    legRemoved: z.literal(false).default(false), // doctrine: never remove a leg
    disclaimer: withDisclaimer.default(DISCLAIMER),
  })
  .superRefine((b, ctx) => {
    for (const g of b.groups)
      if (g.label === "inter-entity-transfer" && !g.escalatedTo)
        ctx.addIssue({ code: "custom", message: "TransferDuplicate: inter-entity movement must be escalated (escalatedTo set), never resolved" });
  });
export type TransferDuplicate = z.infer<typeof TransferDuplicate>;

/** Reconciliation pack (HIGH): evidence for a person; gross before net; no sign-off. */
export const ReconciliationPack = z.object({
  account: z.string().min(1),
  completeness: z.array(Claim).default([]), // tested separately from validity
  validity: z.array(Claim).default([]),
  grossMovements: z.array(Figure).default([]), // stated BEFORE any net
  agedSchedule: z.array(z.object({
    item: z.string().min(1),
    kind: z.enum(["timing", "unexplained"]),
    ageDays: z.number().nullable().default(null),
  })).default([]),
  signedOff: z.literal(false).default(false), // never signs off
  disclaimer: withDisclaimer.default(DISCLAIMER),
});
export type ReconciliationPack = z.infer<typeof ReconciliationPack>;

export const SCHEMA_BY_SKILL = {
  "everlin-weekly-ic-brief": WeeklyICBrief,
  "everlin-morning-brief": MorningBrief,
  "everlin-investment-screener": InvestmentScreen,
  "everlin-manager-diligence": ManagerDiligence,
  "everlin-meeting-prep": MeetingPrep,
  "everlin-meeting-actions": MeetingActions,
  "everlin-vendor-review": VendorReview,
  "everlin-document-digest": DocumentDigest,
  "everlin-pre-booking-gap": PreBookingGap,
  "everlin-post-write-verify": PostWriteVerify,
  "everlin-transfer-duplicate": TransferDuplicate,
  "everlin-reconciliation-pack": ReconciliationPack,
} as const;

export type SkillWithSchema = keyof typeof SCHEMA_BY_SKILL;
