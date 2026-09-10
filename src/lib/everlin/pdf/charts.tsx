/**
 * V03/V04 — deterministic in-PDF charts, drawn with react-pdf's native SVG
 * primitives (Svg/Rect/Line/Text/Polyline). No DOM chart library: geometry is a
 * pure function of the input, so the same figures render the same bytes. Matches
 * the golden's horizontal "% CHANGE / levels" bar and a per-instrument sparkline.
 */
import React from "react";
import { Svg, Rect, Line, Text as SvgText, Polyline } from "@react-pdf/renderer";
import type { MorningBrief } from "@/lib/everlin/schemas";
import { COLORS } from "@/lib/everlin/pdf/tokens";

/**
 * Horizontal bar chart of obtained figure LEVELS (the golden's markets-at-a-
 * glance chart). Bars scaled to the max magnitude; a zero baseline; label +
 * value per row. Deterministic: fixed width, integer-rounded coordinates.
 */
export function LevelsBarChart({ brief }: { brief: MorningBrief }) {
  const rows = brief.figures.filter((f) => !f.missing && typeof f.value === "number").slice(0, 10);
  const W = 520;
  const rowH = 12;
  const H = Math.max(rowH, rows.length * rowH) + 4;
  const labelW = 180;
  const barMaxW = W - labelW - 60;
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value ?? 0)));

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* zero baseline */}
      <Line x1={labelW} y1={0} x2={labelW} y2={H} strokeWidth={0.5} stroke={COLORS.hairline} />
      {rows.map((r, i) => {
        const v = r.value ?? 0;
        const barW = Math.round((Math.abs(v) / max) * barMaxW);
        const y = i * rowH + 2;
        return (
          <React.Fragment key={r.label}>
            <SvgText x={0} y={y + 7} style={{ fontSize: 5.5, fill: COLORS.ink }}>
              {r.label.slice(0, 34)}
            </SvgText>
            <Rect x={labelW} y={y} width={barW} height={rowH - 4} fill={COLORS.brandGreen} />
            <SvgText x={labelW + barW + 3} y={y + 7} style={{ fontSize: 5.5, fill: COLORS.muted }}>
              {`${v}${r.unit ? ` ${r.unit}` : ""}`}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/**
 * V04 — sparkline for a short numeric series. Renders ONLY when given a real
 * series (>= 2 points); with no series it renders nothing (never a fabricated
 * flat line). The series must be sourced upstream — this is pure geometry.
 */
export function Sparkline({ series, width = 60, height = 14 }: { series: number[]; width?: number; height?: number }) {
  if (!series || series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const stepX = width / (series.length - 1);
  const pts = series
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = Math.round(height - ((v - min) / span) * height);
      return `${x},${y}`;
    })
    .join(" ");
  const up = series[series.length - 1] >= series[0];
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline points={pts} fill="none" stroke={up ? COLORS.up : COLORS.down} strokeWidth={1} />
    </Svg>
  );
}
