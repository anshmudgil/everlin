/**
 * T00a — News-attribution layer.
 *
 * The golden brief's ATTRIBUTED NEWS block cites named outlets (CNBC, Reuters,
 * Bloomberg, Focus Taiwan, FXStreet, ...) for narrative claims. This layer
 * produces those attributions in the ship-safe shape: a short headline
 * (<= MAX_HEADLINE chars, the redistributable slice) + the outlet + a url. It
 * NEVER returns licensed index/quote levels and NEVER stores long excerpts — a
 * hard truncation guard enforces that. Attributed items become sourced Claims
 * (schemas.ts Claim requires a source), so a news-derived claim always carries
 * its outlet and passes validateOutput.
 *
 * There is no free, ToS-clean news *data* API to wire against for a commercial
 * product (see docs/research/full-brief-data-sources.md). So retrieval takes
 * structured inputs (a future connector, or editor-supplied items) and enforces
 * the contract; it does not scrape. With no inputs it returns [] — the honest
 * empty, matching the brief's "not obtained" discipline, never a fabricated
 * headline.
 */

export const MAX_HEADLINE = 200;

/** A raw attributed news item before the contract is enforced. */
export type RawNewsItem = {
  headline: string;
  outlet: string;
  url: string;
  retrievedAt?: string;
};

/** A contract-valid attributed item. Headline is guaranteed <= MAX_HEADLINE. */
export type AttributedItem = {
  headline: string;
  outlet: string;
  url: string;
  retrievedAt: string;
};

/** Convert an attributed item into a sourced Claim (text + outlet source). */
export type NewsClaim = { text: string; source: string; assertion: boolean };

function truncate(s: string): string {
  const t = s.trim();
  return t.length <= MAX_HEADLINE ? t : t.slice(0, MAX_HEADLINE - 1).trimEnd() + "…";
}

const URL_RE = /^https?:\/\/.+/i;

/**
 * Enforce the attribution contract on raw items:
 *  - headline truncated to MAX_HEADLINE (the redistributable slice),
 *  - outlet + url required and non-empty (no unattributed item survives),
 *  - retrievedAt defaulted from the caller-supplied value (no clock here so the
 *    function stays deterministic; callers stamp time).
 * Items missing an outlet or a valid url are dropped, not guessed.
 */
export function enforceAttribution(items: RawNewsItem[], nowIso: string): AttributedItem[] {
  const out: AttributedItem[] = [];
  for (const it of items) {
    const outlet = (it.outlet ?? "").trim();
    const url = (it.url ?? "").trim();
    const headline = (it.headline ?? "").trim();
    if (!outlet || !URL_RE.test(url) || !headline) continue; // no attribution ⇒ drop
    out.push({ headline: truncate(headline), outlet, url, retrievedAt: it.retrievedAt ?? nowIso });
  }
  return out;
}

/** Turn attributed items into sourced Claims for a brief section. */
export function toClaims(items: AttributedItem[]): NewsClaim[] {
  return items.map((it) => ({ text: it.headline, source: it.outlet, assertion: false }));
}

/**
 * Retrieve attributed news for a query. No ToS-clean free feed exists, so this
 * takes structured items (from a future connector or editor input) and returns
 * the contract-valid subset. With no items, returns [] — never a fabricated
 * headline. `nowIso` is injected so the function is deterministic/testable.
 */
export async function retrieveAttributedNews(
  query: string,
  opts: { items?: RawNewsItem[]; nowIso: string },
): Promise<AttributedItem[]> {
  void query; // reserved for a real connector; unused in the stub path
  return enforceAttribution(opts.items ?? [], opts.nowIso);
}
