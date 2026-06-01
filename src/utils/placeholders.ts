/**
 * Internal utilities shared across format modules.
 *
 * These are not exported from the public API — but `CITE_PLACEHOLDER`
 * is documented here for anyone who wants to write their own scanner
 * (e.g. to count citations before generation).
 */

import type { Citation } from '../types.js';

/**
 * The placeholder pattern: `[CITE:id]`. The id may contain alphanumerics,
 * dots, dashes, underscores, and colons. The colon is included because
 * some teams use namespaced ids (e.g. `[CITE:arxiv:2401.01234]`).
 *
 * @example Match in a string
 * ```ts
 * for (const m of 'A [CITE:smith2020] and B [CITE:jones2021].'.matchAll(CITE_PLACEHOLDER)) {
 *   console.log(m[1]); // 'smith2020', 'jones2021'
 * }
 * ```
 */
export const CITE_PLACEHOLDER = /\[CITE:([A-Za-z0-9._:\-]+)\]/g;

/**
 * Extract every citation id referenced in `content`, in first-appearance order.
 * Duplicates are de-duplicated.
 *
 * @example
 * ```ts
 * extractUsedIds('A [CITE:a] and B [CITE:b] and A again [CITE:a].');
 * // → ['a', 'b']
 * ```
 */
export function extractUsedIds(content: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(CITE_PLACEHOLDER)) {
    const id = match[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Resolve a citation's lookup key (id || title || index).
 * Used internally to build the citation-id → Citation map.
 */
export function citationKey(citation: Citation, fallbackIndex: number): string {
  if (citation.id) return citation.id;
  if (citation.title) return `__title:${citation.title}`;
  return `__index:${fallbackIndex}`;
}

/**
 * Build a map from id → citation for fast lookups during compilation.
 */
export function buildCitationMap(citations: Citation[]): Map<string, Citation> {
  const map = new Map<string, Citation>();
  citations.forEach((c, i) => {
    map.set(citationKey(c, i), c);
  });
  return map;
}

/** Determine the effective year (current year fallback if missing). */
export function effectiveYear(citation: Citation, fallback: number = new Date().getFullYear()): number {
  return citation.year ?? fallback;
}

/** Format a DOI as a clickable URL, or empty string. */
export function doiUrl(doi: string | undefined): string {
  if (!doi) return '';
  return `https://doi.org/${doi}`;
}

/**
 * Format a page range, normalising "12-34" to "12–34" (en-dash) per most
 * style guides. APA, IEEE, MLA, Chicago, Harvard all use en-dashes for
 * page ranges; Vancouver uses hyphens but renders as en-dash by default
 * for consistency.
 *
 * @example
 * ```ts
 * formatPageRange('12-34'); // → '12–34'
 * ```
 */
export function formatPageRange(pages: string): string {
  return pages.replace(/-/g, '–');
}

/** Capitalise the first character of a string (sentence-case helper). */
export function sentenceCase(s: string): string {
  if (!s) return s;
  return (s[0] ?? '').toUpperCase() + s.slice(1);
}
