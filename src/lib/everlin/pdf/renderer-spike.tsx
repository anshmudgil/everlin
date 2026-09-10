/**
 * T04 renderer gate — proof that @react-pdf/renderer produces a real PDF on this
 * repo's React 19 / Next 16 runtime. Kept as an executable record of the gate.
 *
 * VERDICT (2026-09-10): react-pdf 4.9.0 renders a valid `%PDF-` buffer on
 * React 19.2.8. react-pdf WON over pdfkit and headless-Chromium (Playwright):
 * it is a deterministic React component tree with embeddable subsetted fonts and
 * controllable PDF metadata, where headless-Chromium is non-deterministic across
 * Chromium/OS versions.
 *
 * HARNESS NOTE: `tsx` / esbuild's ESM path resolver chokes on react-pdf's export
 * map (ERR_PACKAGE_PATH_NOT_EXPORTED). The library is fine — the Next bundler
 * resolves it, and plain `node` CommonJS `require()` resolves it. Headless test
 * harnesses (T13) must render via a resolution mode that works (Next route, or
 * node require), NOT a bare `tsx file.tsx`.
 */
import React from "react";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";

export async function renderSpike(): Promise<Buffer> {
  const Doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4" },
      React.createElement(
        View,
        null,
        React.createElement(Text, null, "EVERLIN spike — react-pdf on React 19"),
      ),
    ),
  );
  return renderToBuffer(Doc as React.ReactElement);
}

/** Returns true iff the spike renders a valid PDF (first 5 bytes are %PDF-). */
export async function spikePasses(): Promise<boolean> {
  const buf = await renderSpike();
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}
