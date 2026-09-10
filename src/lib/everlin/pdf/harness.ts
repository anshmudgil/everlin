/**
 * T13 — golden determinism + fidelity harness (logic, runtime-agnostic).
 *
 * Two proofs, per the architecture decision:
 *  - DETERMINISM: render the frozen fixture twice; the two SHA-256 byte-hashes
 *    must be identical (same input => identical bytes).
 *  - FIDELITY: the rendered PDF's extracted text must contain the golden's
 *    structural anchors — the section headings, the footer, the reasoning
 *    markers (THE FACTS/THE INTERPRETATION), and the not-obtained discipline.
 *
 * PDF text is extracted by pulling the visible strings from the react-pdf output
 * (react-pdf writes text as plain PDF text operators, so a light latin1 scan
 * recovers the headings we assert on — enough for a structural check without a
 * heavyweight parser). The harness runs where react-pdf runs (a Node route),
 * not under bare tsx (see T04 note).
 */
import { PDFParse } from "pdf-parse";
import { renderBriefPdf } from "@/lib/everlin/pdf/render";
import { GOLDEN_FIXTURE } from "@/lib/everlin/pdf/golden-fixture";
import { GOLDEN_FOOTER } from "@/lib/everlin/golden-checklist";
import { lintVernacular } from "@/lib/everlin/narrative/vernacular";

export type HarnessReport = {
  deterministic: boolean;
  hashA: string;
  hashB: string;
  fidelity: { anchor: string; present: boolean }[];
  fidelityPass: boolean;
  pages: number;
  pagesPass: boolean; // V10: golden is 3 pages
  chartPresent: boolean; // V10: OBTAINED LEVELS chart band
  vernacularPass: boolean; // V10: rendered text is in-register
  vernacularFindings: string[];
  pass: boolean;
};

/**
 * Recover the visible text layer + page count from the PDF. react-pdf encodes
 * glyphs as hex CID runs (not (text)Tj), so a raw scan can't read them —
 * pdf-parse's PDFParse does the font-CMap reversal and returns real text.
 */
async function extract(pdf: Buffer): Promise<{ text: string; pages: number }> {
  const parser = new PDFParse({ data: new Uint8Array(pdf) });
  const result = await parser.getText();
  return { text: result.text, pages: result.total ?? 0 };
}

export async function runHarness(): Promise<HarnessReport> {
  const a = await renderBriefPdf(GOLDEN_FIXTURE);
  const b = await renderBriefPdf(GOLDEN_FIXTURE);
  const deterministic = a.byteHash === b.byteHash;

  const { text, pages } = await extract(a.pdf);
  const anchors = [
    "EVERLIN MORNING BRIEF",
    "Enduring Legacy.",
    "MARKETS AT A GLANCE",
    "THE ONE THING",
    "AUSTRALIA",
    "THE FACTS.",
    "THE INTERPRETATION.",
    "ONE QUESTION FOR THE IC",
    "not obtained",
    GOLDEN_FOOTER.slice(0, 40),
  ];
  const fidelity = anchors.map((anchor) => ({ anchor, present: text.includes(anchor) }));
  const fidelityPass = fidelity.every((f) => f.present);

  // V10 additions.
  const pagesPass = pages === 3;
  const chartPresent = text.includes("OBTAINED LEVELS");
  const vern = lintVernacular(text);
  const vernacularPass = vern.pass;

  return {
    deterministic,
    hashA: a.byteHash,
    hashB: b.byteHash,
    fidelity,
    fidelityPass,
    pages,
    pagesPass,
    chartPresent,
    vernacularPass,
    vernacularFindings: vern.findings,
    pass: deterministic && fidelityPass && pagesPass && chartPresent && vernacularPass,
  };
}
