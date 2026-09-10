/**
 * T06 + T07 — the deterministic PDF component tree for the Everlin Morning Brief.
 *
 * The immutable half of the template: a fixed react-pdf React tree. All variation
 * flows in through the `brief` prop (a validated MorningBrief). The model writes
 * NO layout and NO numbers — figures come from brief.figures (each already
 * carrying provenance), narrative from brief.sections (FACTS/INTERPRETATION).
 * Colours/sizes come only from tokens.ts (pinned to the golden). Sections render
 * in the golden's order (golden-checklist GOLDEN_SECTIONS).
 *
 * Determinism note: no Date.now(), no Math.random(), no layout that depends on
 * measured content — same brief in, same tree out. Byte-stability of the final
 * PDF is enforced by the orchestrator (T08), which pins metadata.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MorningBrief } from "@/lib/everlin/schemas";
import { COLORS, FONT_SIZES, SPACE, PAGE } from "@/lib/everlin/pdf/tokens";
import { BODY_FONT, BODY_FONT_BOLD, BODY_FONT_OBLIQUE } from "@/lib/everlin/pdf/fonts";
import { GOLDEN_FOOTER, GOLDEN_INSTRUMENTS } from "@/lib/everlin/golden-checklist";

const s = StyleSheet.create({
  page: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZES.body,
    color: COLORS.ink,
    backgroundColor: COLORS.paper,
    paddingTop: SPACE.page,
    paddingBottom: SPACE.page + 10,
    paddingHorizontal: SPACE.page,
  },
  masthead: {
    backgroundColor: COLORS.brandGreen,
    color: COLORS.bandText,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: SPACE.section,
  },
  mastheadTitle: { fontFamily: BODY_FONT_BOLD, fontSize: FONT_SIZES.masthead, color: COLORS.bandText },
  mastheadTag: { fontFamily: BODY_FONT_OBLIQUE, fontSize: FONT_SIZES.h2, color: COLORS.accentGold },
  coverage: { fontSize: FONT_SIZES.small, color: COLORS.muted, marginBottom: SPACE.section },
  band: {
    backgroundColor: COLORS.brandGreen,
    color: COLORS.bandText,
    fontFamily: BODY_FONT_BOLD,
    fontSize: FONT_SIZES.sectionBand,
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginTop: SPACE.section,
    marginBottom: SPACE.row,
  },
  h2: { fontFamily: BODY_FONT_BOLD, fontSize: FONT_SIZES.h2, marginTop: SPACE.section, marginBottom: SPACE.row },
  para: { fontSize: FONT_SIZES.body, marginBottom: SPACE.row, lineHeight: 1.35 },
  factsLabel: { fontFamily: BODY_FONT_BOLD, fontSize: FONT_SIZES.body },
  glanceRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.row },
  glanceCell: { width: "20%", paddingVertical: 2, paddingRight: 4 },
  glanceInstr: { fontFamily: BODY_FONT_BOLD, fontSize: FONT_SIZES.small },
  glanceVal: { fontSize: FONT_SIZES.small },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline, paddingVertical: 2 },
  colInstr: { width: "22%", fontFamily: BODY_FONT_BOLD, fontSize: FONT_SIZES.small },
  colLevel: { width: "18%", fontSize: FONT_SIZES.small, textAlign: "right", paddingRight: 6 },
  colChange: { width: "18%", fontSize: FONT_SIZES.small, textAlign: "right", paddingRight: 6 },
  colNote: { width: "42%", fontSize: FONT_SIZES.micro, color: COLORS.muted },
  barTrack: { flexDirection: "row", alignItems: "center", marginBottom: 1 },
  barLabel: { width: "22%", fontSize: FONT_SIZES.micro },
  bar: { height: 4 },
  barVal: { fontSize: FONT_SIZES.micro, marginLeft: 3 },
  boxed: { borderWidth: 0.75, borderColor: COLORS.brandGreen, padding: 6, marginTop: SPACE.row },
  footer: {
    position: "absolute",
    bottom: 16,
    left: SPACE.page,
    right: SPACE.page,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: FONT_SIZES.footer,
    color: COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.hairline,
    paddingTop: 3,
  },
});

const fmt = (v: number | null, unit: string, missing: boolean) =>
  missing || v === null ? "not obtained" : `${v}${unit ? ` ${unit}` : ""}`;

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text>{GOLDEN_FOOTER}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function Masthead() {
  return (
    <View style={s.masthead} fixed>
      <Text style={s.mastheadTitle}>EVERLIN MORNING BRIEF</Text>
      <Text style={s.mastheadTag}>Enduring Legacy.</Text>
    </View>
  );
}

function Band({ children }: { children: React.ReactNode }) {
  return <Text style={s.band}>{children}</Text>;
}

function MarketsAtAGlance({ brief }: { brief: MorningBrief }) {
  // Show the golden's fixed 10-instrument list; pull a matching figure if present.
  const byLabel = (name: string) =>
    brief.figures.find((f) => f.label.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
  return (
    <>
      <Band>MARKETS AT A GLANCE</Band>
      <View style={s.glanceRow}>
        {GOLDEN_INSTRUMENTS.map((instr) => {
          const f = byLabel(instr);
          return (
            <View key={instr} style={s.glanceCell}>
              <Text style={s.glanceInstr}>{instr}</Text>
              <Text style={s.glanceVal}>{f ? fmt(f.value, f.unit, f.missing) : "not obtained"}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

/**
 * Obtained levels bar. The schema carries no change/delta series, so this shows
 * LATEST LEVELS (magnitude bars), NOT day-over-day % change — labelling it
 * "% CHANGE" would present sourced levels as changes, which is misleading in an
 * IC brief. When a prior-close series is added, swap in real deltas + relabel.
 */
function LatestLevelsChart({ brief }: { brief: MorningBrief }) {
  const rows = brief.figures.filter((f) => !f.missing && typeof f.value === "number").slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value ?? 0)));
  return (
    <>
      <Band>OBTAINED LEVELS</Band>
      {rows.map((r) => {
        const v = r.value ?? 0;
        const w = `${Math.min(60, (Math.abs(v) / max) * 60)}%`;
        return (
          <View key={r.label} style={s.barTrack}>
            <Text style={s.barLabel}>{r.label}</Text>
            <View style={[s.bar, { width: w, backgroundColor: COLORS.brandGreen }]} />
            <Text style={s.barVal}>{`${v}${r.unit ? ` ${r.unit}` : ""}`}</Text>
          </View>
        );
      })}
    </>
  );
}

function MarketsTable({ brief }: { brief: MorningBrief }) {
  return (
    <>
      <Band>MARKETS</Band>
      {brief.figures.map((f) => (
        <View key={f.label} style={s.tableRow}>
          <Text style={s.colInstr}>{f.label}</Text>
          <Text style={s.colLevel}>{fmt(f.value, f.unit, f.missing)}</Text>
          <Text style={s.colChange}>{f.asOf ?? ""}</Text>
          <Text style={s.colNote}>
            {f.note}
            {f.source ? ` [${f.source}]` : ""}
          </Text>
        </View>
      ))}
    </>
  );
}

/** Render a reasoned section (FACTS/INTERPRETATION) by golden section id. */
function ReasonedSection({ brief, section, title }: { brief: MorningBrief; section: string; title: string }) {
  const r = brief.sections.find((x) => x.section === section);
  if (!r) return null;
  return (
    <>
      <Band>{title}</Band>
      {r.facts.length > 0 && (
        <Text style={s.para}>
          <Text style={s.factsLabel}>THE FACTS. </Text>
          {r.facts.map((f) => `${f.text} [${f.source}].`).join(" ")}
        </Text>
      )}
      {r.interpretation.trim() && (
        <Text style={s.para}>
          <Text style={s.factsLabel}>THE INTERPRETATION. </Text>
          {r.interpretation}
        </Text>
      )}
    </>
  );
}

export function BriefDocument({ brief }: { brief: MorningBrief }) {
  const cover = brief.figures.filter((f) => !f.missing).length;
  return (
    <Document
      title={`Everlin Morning Brief ${brief.asOf}`}
      author="Everlin Family Office"
      subject="IC Morning Brief"
      creator="Everlin brief engine"
      producer="Everlin brief engine"
      // Pin the creation date at the SOURCE (epoch 0) so no wall-clock enters the
      // PDF — determinism no longer depends on the normalizer's date regex. The
      // normalizer stays as a second line of defence for the random /ID.
      creationDate={new Date(0)}
    >
      {/* PAGE 1 — masthead, coverage, markets-at-a-glance, chart, markets table. */}
      <Page size={PAGE.size} style={s.page} wrap>
        <Masthead />
        <Text style={s.coverage}>
          {brief.asOf} | IC distribution — do not forward | {cover} of {brief.figures.length} figures obtained
        </Text>
        <Text style={s.para}>{brief.executiveSummary}</Text>
        <MarketsAtAGlance brief={brief} />
        <LatestLevelsChart brief={brief} />
        <MarketsTable brief={brief} />
        <Footer />
      </Page>

      {/* PAGE 2 — the analytical core: THE ONE THING, WORLD & MACRO, AUSTRALIA. */}
      <Page size={PAGE.size} style={s.page} wrap>
        <Masthead />
        <ReasonedSection brief={brief} section="the-one-thing" title="THE ONE THING" />
        <ReasonedSection brief={brief} section="world-and-macro" title="WORLD & MACRO" />
        <ReasonedSection brief={brief} section="australia" title="AUSTRALIA" />
        <Footer />
      </Page>

      {/* PAGE 3 — regional + portfolio + the IC question. */}
      <Page size={PAGE.size} style={s.page} wrap>
        <Masthead />
        <ReasonedSection brief={brief} section="taiwan" title="TAIWAN" />
        <ReasonedSection brief={brief} section="portfolio-watch" title="PORTFOLIO WATCH" />
        <Band>ONE QUESTION FOR THE IC</Band>
        <View style={s.boxed}>
          <Text>{brief.questionForIC}</Text>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}
