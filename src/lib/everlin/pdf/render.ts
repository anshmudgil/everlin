/**
 * T08 — PDF render orchestrator with fixed metadata + byte-hash.
 *
 * The single entry that turns a validated MorningBrief into PDF bytes. It pins
 * everything that would otherwise make the output non-deterministic:
 *  - fonts registered (Helvetica base, no network) before render,
 *  - metadata set on the Document (title/author/producer) — no timestamps,
 *  - creationDate forced to a FIXED epoch so the PDF's /CreationDate is stable.
 *
 * Same MorningBrief in ⇒ identical bytes out ⇒ identical SHA-256. The hash is the
 * determinism proof (T13 asserts two renders of one fixture hash-match).
 */
import React from "react";
import crypto from "node:crypto";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { MorningBrief } from "@/lib/everlin/schemas";
import { BriefDocument } from "@/lib/everlin/pdf/brief-document";
import { ensureFontsRegistered } from "@/lib/everlin/pdf/fonts";

export type RenderedBrief = {
  pdf: Buffer;
  byteHash: string; // SHA-256 hex of pdf
  bytes: number;
};

// A fixed epoch so the PDF /CreationDate never varies by wall clock. The Everlin
// masthead date lives in the rendered content, not this metadata field.
const FIXED_PDF_DATE = "D:20000101000000Z";

/**
 * Normalise the two fields react-pdf makes non-deterministic per render:
 *  - /CreationDate (a wall-clock timestamp), pinned to FIXED_PDF_DATE,
 *  - /ID [<hex> <hex>] (a random doc id), replaced by a content-derived id so it
 *    is stable for identical content but still unique across different briefs.
 * Everything else react-pdf emits is already deterministic (verified: only these
 * 64 trailer bytes differed between two renders of one brief).
 */
const ID_RE = /\/ID \[<[a-f0-9]+> <[a-f0-9]+>\]/g;
const ID_PLACEHOLDER = "/ID [<0> <0>]";

function normalizePdf(raw: Buffer): Buffer {
  let text = raw.toString("latin1");
  // 1. Pin the wall-clock creation date.
  text = text.replace(/\(D:\d{14}Z?\)/g, `(${FIXED_PDF_DATE})`);
  // 2. Neutralise the random /ID BEFORE hashing so the hash input is stable,
  //    then derive the id from that neutralised content and stamp it in. Hashing
  //    the id-bearing buffer would be circular (the id feeds its own hash).
  const neutral = text.replace(ID_RE, ID_PLACEHOLDER);
  const id = crypto.createHash("md5").update(Buffer.from(neutral, "latin1")).digest("hex"); // 16 bytes
  text = neutral.replace(ID_PLACEHOLDER, `/ID [<${id}> <${id}>]`);
  return Buffer.from(text, "latin1");
}

/**
 * Render a MorningBrief to deterministic PDF bytes + its SHA-256.
 * react-pdf's own output is deterministic EXCEPT /CreationDate and /ID, which
 * normalizePdf pins — so the same MorningBrief in yields identical bytes out.
 */
export async function renderBriefPdf(brief: MorningBrief): Promise<RenderedBrief> {
  ensureFontsRegistered();
  // BriefDocument returns a <Document>; TS can't see through the FC wrapper, so
  // assert the element type react-pdf expects. Runtime is verified (live render).
  const el = React.createElement(BriefDocument, { brief }) as React.ReactElement<DocumentProps>;
  const rendered = await renderToBuffer(el);
  const pdf = normalizePdf(rendered);
  const byteHash = crypto.createHash("sha256").update(pdf).digest("hex");
  return { pdf, byteHash, bytes: pdf.length };
}
