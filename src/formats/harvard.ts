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

import type {
  Citation,
  FormatStrategy,
  GroupItem,
  InTextContext,
  ReferenceContext,
} from '../types.js';
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

function harvardSurnames(citation: Citation, ctx: InTextContext): string[] {
  return ctx.surnames.length > 0 ? ctx.surnames : citation.authors.map(extractSurname);
}

function harvardAuthorPart(surnames: string[]): string {
  if (surnames.length === 0) return 'Anonymous';
  if (surnames.length === 1) return surnames[0] ?? '';
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`;
  return `${surnames[0]} et al.`;
}

/** Inner of a parenthetical Harvard citation, without the surrounding parens. */
function harvardParentheticalInner(citation: Citation, ctx: InTextContext): string {
  const year = `${effectiveYear(citation)}${ctx.yearSuffix ?? ''}`;
  const pageSuffix = ctx.page ? `, p. ${ctx.page}` : '';
  return `${harvardAuthorPart(harvardSurnames(citation, ctx))}, ${year}${pageSuffix}`;
}

function harvardInText(citation: Citation, ctx: InTextContext): string {
  const year = `${effectiveYear(citation)}${ctx.yearSuffix ?? ''}`;
  const surnames = harvardSurnames(citation, ctx);

  if (ctx.narrative) {
    return `${harvardAuthorPart(surnames)} (${year})`;
  }
  return `(${harvardParentheticalInner(citation, ctx)})`;
}

function harvardGroup(items: GroupItem[]): string {
  const inner = items
    .map((it) => ({
      key: (harvardSurnames(it.citation, it.ctx)[0] ?? '').toLowerCase(),
      text: harvardParentheticalInner(it.citation, it.ctx),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => entry.text)
    .join('; ');
  return `(${inner})`;
}

function harvardReference(citation: Citation, ctx: ReferenceContext): string {
  const year = `${effectiveYear(citation)}${ctx.yearSuffix ?? ''}`;
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
  disambiguateYears: true,
  sort: byFirstSurname,
  inText: harvardInText,
  groupInText: harvardGroup,
  reference: harvardReference,
};
