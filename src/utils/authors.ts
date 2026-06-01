/**
 * Author-name helpers. Pure functions; no I/O.
 *
 * We don't try to be clever. We assume the first author is in
 * "Last, F. M." form OR in "First M. Last" form; the rest are
 * whatever the source gave us. The output of `formatAuthorList` is
 * the canonical rendering for a given style.
 *
 * These are exported because if you're building a custom format
 * (see {@link FormatStrategy}) you'll want consistent author handling.
 */

import type { Citation } from '../types.js';

/**
 * Try to extract the surname from a name string.
 *
 * Handles comma-form ("Smith, J. Q."), natural form ("Jane Q. Smith"),
 * single names ("Smith"), and surname particles ("van Gogh", "von Neumann").
 *
 * @example
 * ```ts
 * extractSurname('Smith, J. Q.');     // → 'Smith'
 * extractSurname('Jane Q. Smith');    // → 'Smith'
 * extractSurname('Smith');            // → 'Smith'
 * extractSurname('Vincent van Gogh'); // → 'van Gogh'
 * extractSurname('');                 // → ''
 * ```
 */
export function extractSurname(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  // Comma-form: "Smith, J." or "Smith, Jane Q."
  if (trimmed.includes(',')) {
    const [surname] = trimmed.split(',');
    return (surname ?? '').trim();
  }
  // Space-form: "Jane M. Smith" / "J. Q. Smith" / "Smith"
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1] ?? '';
  // Particles: "de", "van", "von", "der", "den" — these are part of the surname, not the given name.
  // We look for a particle in either of the last two positions.
  const particles = new Set(['de', 'van', 'von', 'der', 'den', 'del', 'la', 'le', 'da', 'di', 'al']);
  if (parts.length >= 2) {
    const tail = parts.slice(-2).map((p) => p.toLowerCase().replace(/\.$/, ''));
    if (tail.some((p) => particles.has(p))) {
      return parts.slice(-2).map((p) => p.replace(/\.$/, '')).join(' ');
    }
  }
  return last.replace(/\.$/, '');
}

/**
 * True if the name looks like "Last, F." (comma-form).
 *
 * @example
 * ```ts
 * isCommaForm('Smith, J.');     // → true
 * isCommaForm('Jane Smith');    // → false
 * ```
 */
export function isCommaForm(name: string): boolean {
  return /,/.test(name);
}

/**
 * Convert "Jane Q. Smith" → "Smith, J. Q."; pass through comma-form unchanged.
 *
 * @example
 * ```ts
 * toSurnameFirst('Jane Q. Smith'); // → 'Smith, J. Q.'
 * toSurnameFirst('Smith, J. Q.');  // → 'Smith, J. Q.' (passthrough)
 * toSurnameFirst('Smith');         // → 'Smith'
 * ```
 */
export function toSurnameFirst(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (isCommaForm(trimmed)) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed;
  const surname = parts[parts.length - 1] ?? '';
  const initials = parts
    .slice(0, -1)
    .map((p) => {
      // Already an initial? "J." → "J."
      if (/^[A-Z]\.$/.test(p)) return p;
      // "Jane" → "J."
      return `${(p[0] ?? '').toUpperCase()}.`;
    })
    .join(' ');
  return `${surname}, ${initials}`.trim();
}

/**
 * Convert "Jane Q. Smith" → "J. Q. Smith" (initials with surname last).
 * Pass-through comma-form converts "Smith, J. Q." → "J. Q. Smith".
 *
 * @example
 * ```ts
 * toInitialsFirst('Jane Q. Smith'); // → 'J. Q. Smith'
 * toInitialsFirst('Smith, J. Q.');  // → 'J. Q. Smith'
 * ```
 */
export function toInitialsFirst(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (isCommaForm(trimmed)) {
    const [surname, rest = ''] = trimmed.split(',').map((p) => p.trim());
    const initials = rest
      .split(/\s+/)
      .map((p) => (p ? `${(p[0] ?? '').toUpperCase()}.` : ''))
      .filter(Boolean)
      .join(' ');
    return initials ? `${initials} ${surname}` : surname ?? '';
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed;
  const surname = parts[parts.length - 1] ?? '';
  const initials = parts
    .slice(0, -1)
    .map((p) => `${(p[0] ?? '').toUpperCase()}.`)
    .join(' ');
  return `${initials} ${surname}`.trim();
}

/**
 * Get all surnames from a citation, used for sorting + in-text rendering.
 *
 * @example
 * ```ts
 * getSurnames({ authors: ['Smith, J.', 'Jones, A.'], ... }); // → ['Smith', 'Jones']
 * ```
 */
export function getSurnames(citation: Citation): string[] {
  if (!citation.authors || citation.authors.length === 0) return [];
  return citation.authors.map(extractSurname).filter(Boolean);
}

/**
 * Comparator for sorting citations alphabetically by first-author surname.
 * Use as the `sort` field on a custom {@link FormatStrategy} if you want
 * alphabetical reference lists.
 *
 * @example
 * ```ts
 * const sorted = [a, b, c].sort(byFirstSurname);
 * ```
 */
export function byFirstSurname(a: Citation, b: Citation): number {
  const aSurnames = getSurnames(a);
  const bSurnames = getSurnames(b);
  const aName = aSurnames[0] ?? '';
  const bName = bSurnames[0] ?? '';
  return aName.localeCompare(bName);
}
