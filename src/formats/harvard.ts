/**
 * Harvard (Cite Them Right 12th edition) — common in UK / Australian universities.
 *
 * In-text:   (Smith, 2020), (Smith and Jones, 2020), (Smith et al., 2020)
 * Reference: Smith, J.Q. and Jones, J.B. (2020) 'Title of paper', *Journal*, 12(3), pp. 34-56.
 *            doi: 10.1234/abc.
 *
 * - Year in parentheses
 * - Article title in single quotes
 * - Up to 3 authors in reference list; "et al." after 3
 *
 * @example In-text output
 *   "(Smith, 2020)" / "(Smith and Jones, 2020)" / "(Smith et al., 2020)"
 *
 * @example Reference output
 *   "Smith, J. Q. and Jones, J. B. (2020) 'A study', *Journal*, 12(3), pp. 34–56. doi: 10.1234/abc."
 */

import type { Citation, FormatStrategy, InTextContext, ReferenceContext } from '../types.js';
import { byFirstSurname, extractSurname, isCommaForm, toInitialsFirst, toSurnameFirst } from '../utils/authors.js';
import { doiUrl, effectiveYear, formatPageRange } from '../utils/placeholders.js';

function harvardAuthorList(citation: Citation): string {
  const authors = citation.authors ?? [];
  if (authors.length === 0) return 'Anonymous';
  if (authors.length > 3) {
    const first = isCommaForm(authors[0] ?? '') ? (authors[0] ?? '').trim() : toInitialsFirst(authors[0] ?? '');
    return `${first} et al.`;
  }

  return authors
    .map((a, i) => (i === 0 ? toSurnameFirst(a) : isCommaForm(a) ? a.trim() : toInitialsFirst(a)))
    .join(authors.length === 2 ? ' and ' : ', ');
}

function harvardInText(citation: Citation, ctx: InTextContext): string {
  const year = effectiveYear(citation);
  const pageSuffix = ctx.page ? `, p. ${ctx.page}` : '';
  const surnames = ctx.surnames.length > 0 ? ctx.surnames : citation.authors.map(extractSurname);

  if (surnames.length === 0) return `(Anonymous, ${year})`;

  let authorPart: string;
  if (ctx.narrative) {
    if (surnames.length === 1) {
      authorPart = surnames[0] ?? '';
    } else if (surnames.length === 2) {
      authorPart = `${surnames[0]} and ${surnames[1]}`;
    } else {
      authorPart = `${surnames[0]} et al.`;
    }
    return `${authorPart} (${year})`;
  }

  if (surnames.length === 1) {
    authorPart = surnames[0] ?? '';
  } else if (surnames.length === 2) {
    authorPart = `${surnames[0]} and ${surnames[1]}`;
  } else {
    authorPart = `${surnames[0]} et al.`;
  }
  return `(${authorPart}, ${year}${pageSuffix})`;
}

function harvardReference(citation: Citation, _ctx: ReferenceContext): string {
  const year = effectiveYear(citation);
  const authors = harvardAuthorList(citation);
  const title = citation.title.trim().replace(/\.$/, '');
  const journal = citation.journal?.trim() ?? '';
  const volume = citation.volume?.trim() ?? '';
  const issue = citation.issue?.trim() ?? '';
  const pages = citation.pages?.trim() ?? '';
  const doi = citation.doi?.trim() ?? '';

  let journalPart = '';
  if (journal) {
    journalPart = ` *${journal}*`;
    if (volume) {
      journalPart += `, ${volume}`;
      if (issue) journalPart += `(${issue})`;
    }
    if (pages) journalPart += `, pp. ${formatPageRange(pages)}`;
  }
  journalPart += '.';

  const doiPart = doi ? ` doi: ${doiUrl(doi).replace('https://doi.org/', '')}.` : '';

  return `${authors} (${year}) '${title}',${journalPart}${doiPart}`;
}

export const harvardStrategy: FormatStrategy = {
  id: 'harvard',
  label: 'Harvard (Cite Them Right 12th)',
  numbered: false,
  sort: byFirstSurname,
  inText: harvardInText,
  reference: harvardReference,
};
