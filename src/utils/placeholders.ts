/**
 * Internal utilities shared across format modules.
 *
 * These are not exported from the public API — but `CITE_PLACEHOLDER`
 * is documented here for anyone who wants to write their own scanner
 * (e.g. to count citations before generation).
 */

import type { Citation } from '../types.js';

/**
 * The placeholder pattern: `[CITE:id]` with optional `|`-delimited
 * modifiers. The id may contain alphanumerics, dots, dashes, underscores,
 * and colons (the colon supports namespaced ids like
 * `[CITE:arxiv:2401.01234]`).
 *
 * Modifiers come after the id, each introduced by `|`:
 *   - `[CITE:id|narrative]` — narrative (subject-position) form, e.g. `Smith (2020)`
 *   - `[CITE:id|p=42]`      — page number, e.g. `(Smith, 2020, p. 42)`
 *   - `[CITE:id|narrative|p=42]` — combined
 *
 * Capture group 1 is the id; capture group 2 is the raw modifier string
 * (e.g. `|narrative|p=42`, or `''` when there are none). Parse group 2
 * with {@link parseCiteModifiers}.
 *
 * @example Match in a string
 * ```ts
 * for (const m of 'A [CITE:smith2020] and B [CITE:jones2021|p=7].'.matchAll(CITE_PLACEHOLDER)) {
 *   console.log(m[1]); // 'smith2020', 'jones2021'
 * }
 * ```
 */
export const CITE_PLACEHOLDER = /\[CITE:([A-Za-z0-9._:-]+)((?:\|[^\]]+)*)\]/g;

/** Modifiers parsed from a `[CITE:id|...]` placeholder. */
export interface CiteModifiers {
  /** Page number(s) for the in-text citation, e.g. "42" or "12-15". */
  page?: string;
  /** Whether the citation should render in narrative (subject) position. */
  narrative?: boolean;
}

/**
 * Parse the raw modifier string captured by {@link CITE_PLACEHOLDER}
 * (group 2) into structured options.
 *
 * Recognised modifiers (case-insensitive, surrounding whitespace ignored):
 *   - `narrative` (or `n`) → `{ narrative: true }`
 *   - `p=42`, `page=42`, `pp=12-15`, `p:42`, `p 42` → `{ page: '42' }`
 *
 * Unrecognised modifiers are ignored.
 *
 * @example
 * ```ts
 * parseCiteModifiers('|narrative|p=42'); // → { narrative: true, page: '42' }
 * parseCiteModifiers('');                // → {}
 * ```
 */
export function parseCiteModifiers(raw: string | undefined): CiteModifiers {
  const mods: CiteModifiers = {};
  if (!raw) return mods;
  for (const partRaw of raw.split('|')) {
    const part = partRaw.trim();
    if (!part) continue;
    if (/^(narrative|n)$/i.test(part)) {
      mods.narrative = true;
      continue;
    }
    const pageMatch = part.match(/^(?:pp|page|p)\s*[=.:]?\s*(.+)$/i);
    if (pageMatch && pageMatch[1]) {
      mods.page = pageMatch[1].trim();
    }
  }
  return mods;
}

/**
 * Matches a *run* of two or more adjacent `[CITE:id]` placeholders that
 * belong together — separated only by spaces/tabs and an optional single
 * `;` or `,`. Used to render grouped in-text citations such as
 * `(Smith, 2020; Jones, 2021)` or `[1, 2]`.
 *
 * Placeholders separated by words (e.g. `[CITE:a] and [CITE:b]`) or a
 * line break are deliberately *not* matched, so they stay as separate
 * citations.
 *
 * @example
 * ```ts
 * '[CITE:a][CITE:b]'.match(CITE_GROUP);   // → matches the whole run
 * '[CITE:a]; [CITE:b]'.match(CITE_GROUP); // → matches the whole run
 * '[CITE:a] and [CITE:b]'.match(CITE_GROUP); // → null (not adjacent)
 * ```
 */
export const CITE_GROUP =
  /\[CITE:[A-Za-z0-9._:-]+(?:\|[^\]]+)*\](?:[ \t]*[;,]?[ \t]*\[CITE:[A-Za-z0-9._:-]+(?:\|[^\]]+)*\])+/g;

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

/**
 * Format a set of citation numbers as a compact, sorted list, collapsing
 * three-or-more consecutive numbers into an en-dash range. Used by the
 * numbered formats (IEEE, Vancouver) to render grouped citations.
 *
 * The numbers are de-duplicated and sorted ascending. Runs of length 1–2
 * are listed individually; runs of length ≥3 become `start–end`.
 *
 * @example
 * ```ts
 * formatNumberRanges([5, 6]);          // → '5, 6'
 * formatNumberRanges([1, 2, 3]);       // → '1–3'
 * formatNumberRanges([1, 2, 3, 5, 6]); // → '1–3, 5, 6'
 * ```
 */
export function formatNumberRanges(numbers: number[]): string {
  const sorted = Array.from(new Set(numbers)).sort((a, b) => a - b);
  const tokens: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === (sorted[j] ?? 0) + 1) j++;
    const runLength = j - i + 1;
    if (runLength >= 3) {
      tokens.push(`${sorted[i]}–${sorted[j]}`);
    } else {
      for (let k = i; k <= j; k++) tokens.push(String(sorted[k]));
    }
    i = j + 1;
  }
  return tokens.join(', ');
}

/** Capitalise the first character of a string (sentence-case helper). */
export function sentenceCase(s: string): string {
  if (!s) return s;
  return (s[0] ?? '').toUpperCase() + s.slice(1);
}
