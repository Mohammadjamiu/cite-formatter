/**
 * Chicago Manual of Style — Author-Date (17th edition).
 *
 * In-text:   (Smith 2020), (Smith and Jones 2020, 12), Smith (2020)
 * Reference: Smith, Jane Q., and John B. Jones. 2020. "Title." *Journal* 12 (3): 34–56.
 *
 * - 1-3 authors: list all
 * - 4+ authors in-text: "Smith et al. 2020"
 * - Reference list alphabetical, year immediately after author
 *
 * @example In-text output
 *   "(Smith 2020)" / "(Smith and Jones 2020, p. 12)" / "Smith (2020)"
 *
 * @example Reference output
 *   "Smith, J. Q. 2020. \"A study.\" *Journal* 12 (3): 34–56. https://doi.org/10.1234/abc."
 */

import type { Citation, FormatStrategy, InTextContext, ReferenceContext } from '../types.js';
import { byFirstSurname, extractSurname, isCommaForm, toSurnameFirst } from '../utils/authors.js';
import { effectiveYear, formatPageRange } from '../utils/placeholders.js';

function chicagoFirstAuthorLastFirst(citation: Citation): string {
  const first = citation.authors?.[0];
  if (!first) return '';
  return toSurnameFirst(first);
}

function chicagoRestNatural(citation: Citation): string {
  return (citation.authors ?? [])
    .slice(1)
    .map((a) => (isCommaForm(a) ? a.trim() : a.trim()))
    .join(citation.authors.length === 2 ? ' and ' : ', and ');
}

function chicagoInText(citation: Citation, ctx: InTextContext): string {
  const year = effectiveYear(citation);
  const surnames = ctx.surnames.length > 0 ? ctx.surnames : citation.authors.map(extractSurname);
  const pageSuffix = ctx.page ? `, ${ctx.page}` : '';

  if (surnames.length === 0) return `(Anonymous ${year})`;

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

  if (surnames.length <= 3) {
    authorPart = surnames.length === 1
      ? (surnames[0] ?? '')
      : surnames.length === 2
        ? `${surnames[0]} and ${surnames[1]}`
        : `${surnames[0]}, ${surnames[1]}, and ${surnames[2]}`;
  } else {
    authorPart = `${surnames[0]} et al.`;
  }
  return `(${authorPart} ${year}${pageSuffix})`;
}

function chicagoReference(citation: Citation, _ctx: ReferenceContext): string {
  const year = effectiveYear(citation);
  const first = chicagoFirstAuthorLastFirst(citation);
  const rest = chicagoRestNatural(citation);
  const authors = rest ? `${first}, and ${rest}` : first;

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
      journalPart += ` ${volume}`;
      if (issue) journalPart += ` (${issue})`;
    }
    if (pages) journalPart += `: ${formatPageRange(pages)}`;
    journalPart += '.';
  }

  const doiPart = doi ? ` https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}.` : '';

  return `${authors.replace(/\.$/, '')}. ${year}. "${title}."${journalPart}${doiPart}`;
}

export const chicagoStrategy: FormatStrategy = {
  id: 'chicago',
  label: 'Chicago (Author-Date)',
  numbered: false,
  sort: byFirstSurname,
  inText: chicagoInText,
  reference: chicagoReference,
};
