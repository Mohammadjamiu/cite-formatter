/**
 * IEEE Editorial Style Manual (numbered references).
 *
 * In-text:   [1], [2], [1, 2], [1]–[3]
 * Reference: [1] A. B. Smith, "Title of paper," *Journal*, vol. X, no. Y, pp. 12–34, Year, doi: 10.x/y.
 *
 * - First author surname-first, rest natural order
 * - "et al." after 6 authors in the reference list
 * - Quoted article titles, journal names in italics (rendered as `*...*` in markdown)
 * - Numbered in order of first appearance
 * - **Continuous numbering across calls** via the `numberMap` option
 *   on {@link compileCitations} — this is the headline feature and
 *   the one that took months to get right in the original codebase.
 *
 * @example In-text output
 *   "A [1] and B [2] and A again [1]."
 *
 * @example Reference output
 *   "[1] Smith, J. Q., \"A study,\" *Journal*, vol. 12, no. 3, pp. 34–56, 2020, doi: 10.1234/abc."
 */

import type { Citation, FormatStrategy, InTextContext, ReferenceContext } from '../types.js';
import { extractSurname, isCommaForm, toInitialsFirst } from '../utils/authors.js';
import { doiUrl, effectiveYear, formatPageRange } from '../utils/placeholders.js';

function ieeeAuthorList(citation: Citation): string {
  const authors = citation.authors ?? [];
  if (authors.length === 0) return 'Anonymous';

  if (authors.length > 6) {
    const first = isCommaForm(authors[0] ?? '') ? (authors[0] ?? '').trim() : toInitialsFirst(authors[0] ?? '');
    return `${first} et al.`;
  }

  return authors
    .map((a, i) => {
      if (i === 0) {
        return isCommaForm(a) ? a.trim() : toInitialsFirst(a);
      }
      // Subsequent authors in natural order
      if (isCommaForm(a)) {
        // Convert "Smith, J." → "J. Smith" for non-first positions
        const [surname, rest = ''] = a.split(',').map((p) => p.trim());
        const initials = rest
          .split(/\s+/)
          .map((p) => (p ? `${(p[0] ?? '').toUpperCase()}.` : ''))
          .filter(Boolean)
          .join(' ');
        return initials ? `${initials} ${surname}` : surname ?? '';
      }
      return toInitialsFirst(a);
    })
    .join(', ');
}

function ieeeInText(_citation: Citation, ctx: InTextContext): string {
  if (ctx.number === undefined) return '[?]';
  return `[${ctx.number}]`;
}

function ieeeReference(citation: Citation, ctx: ReferenceContext): string {
  const year = effectiveYear(citation);
  const authors = ieeeAuthorList(citation);
  const title = citation.title.trim().replace(/\.$/, '').replace(/[":]/g, '');
  const journal = citation.journal?.trim() ?? '';
  const volume = citation.volume?.trim() ?? '';
  const issue = citation.issue?.trim() ?? '';
  const pages = citation.pages?.trim() ?? '';
  const doi = citation.doi?.trim() ?? '';

  let journalPart = '';
  if (journal) {
    journalPart += `, *${journal}*`;
    if (volume) {
      journalPart += `, vol. ${volume}`;
      if (issue) journalPart += `, no. ${issue}`;
    }
    if (pages) journalPart += `, pp. ${formatPageRange(pages)}`;
  }
  journalPart += doi ? `, ${year}` : `, ${year}.`;

  const doiPart = doi ? `, doi: ${doiUrl(doi).replace('https://doi.org/', '')}.` : '';

  const prefix = ctx.number !== undefined ? `[${ctx.number}] ` : '';
  return `${prefix}${authors}, "${title}"${journalPart}${doiPart}`;
}

export const ieeeStrategy: FormatStrategy = {
  id: 'ieee',
  label: 'IEEE',
  numbered: true,
  inText: ieeeInText,
  reference: ieeeReference,
};
