/**
 * Vancouver style (ICMJE Recommendations) — used in medicine & life sciences.
 *
 * In-text:   (1), (1, 2), (1–3)
 * Reference: 1. Smith JQ, Jones JB. Title of paper. Journal. 2020;12(3):34-56. doi:10.1234/abc.
 *
 * - Authors in natural order, all up to 6; "et al." after 6
 * - Year preceded by ";"; no comma between journal and year
 * - Numbered in order of first appearance (like IEEE but with NLM punctuation)
 *
 * @example In-text output
 *   "(1)" / "(1, 2)" / "(1–3)"
 *
 * @example Reference output
 *   "1. Smith, J. Q. A study. Journal. 2020;12(3):34–56. doi:10.1234/abc."
 */

import type { Citation, FormatStrategy, InTextContext, ReferenceContext } from '../types.js';
import { isCommaForm, toInitialsFirst } from '../utils/authors.js';
import { doiUrl, effectiveYear, formatPageRange } from '../utils/placeholders.js';

function vancouverAuthorList(citation: Citation): string {
  const authors = citation.authors ?? [];
  if (authors.length === 0) return 'Anonymous';

  if (authors.length > 6) {
    const first = isCommaForm(authors[0] ?? '') ? (authors[0] ?? '').trim() : toInitialsFirst(authors[0] ?? '');
    return `${first}, et al.`;
  }

  return authors
    .map((a) => (isCommaForm(a) ? a.trim() : toInitialsFirst(a)))
    .join(', ');
}

function vancouverInText(_citation: Citation, ctx: InTextContext): string {
  if (ctx.number === undefined) return '(?)';
  return `(${ctx.number})`;
}

function vancouverReference(citation: Citation, ctx: ReferenceContext): string {
  const year = effectiveYear(citation);
  const authors = vancouverAuthorList(citation);
  const title = citation.title.trim().replace(/\.$/, '');
  const journal = citation.journal?.trim() ?? '';
  const volume = citation.volume?.trim() ?? '';
  const issue = citation.issue?.trim() ?? '';
  const pages = citation.pages?.trim() ?? '';
  const doi = citation.doi?.trim() ?? '';

  let journalPart = '';
  if (journal) {
    journalPart = ` ${journal}`;
    if (year) journalPart += `. ${year}`;
    if (volume) {
      journalPart += `;${volume}`;
      if (issue) journalPart += `(${issue})`;
    }
    if (pages) journalPart += `:${formatPageRange(pages)}`;
    journalPart += '.';
  } else if (year) {
    journalPart = ` ${year}.`;
  }

  const doiPart = doi ? ` doi:${doiUrl(doi).replace('https://doi.org/', '')}.` : '';
  const prefix = ctx.number !== undefined ? `${ctx.number}. ` : '';
  return `${prefix}${authors.replace(/\.+$/, '')}. ${title}.${journalPart}${doiPart}`;
}

export const vancouverStrategy: FormatStrategy = {
  id: 'vancouver',
  label: 'Vancouver (ICMJE)',
  numbered: true,
  inText: vancouverInText,
  reference: vancouverReference,
};
