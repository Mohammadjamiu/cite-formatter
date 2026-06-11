/**
 * MLA 9th edition.
 *
 * In-text:   (Smith 12), (Smith and Jones 12), (Smith et al. 12)
 *            Page number is required when available; year is not.
 * Reference: Smith, Jane Q., and John B. Jones. "Title." *Journal*, vol. 12, no. 3, 2020, pp. 34–56.
 *
 * @example In-text output
 *   "(Smith 12)" / "(Smith and Jones 12)" / "(Smith et al. 12)"
 *
 * @example Reference output
 *   "Smith, J. Q. \"A study.\" *Journal*, vol. 12, no. 3, 2020, pp. 34–56."
 */

import type {
  Citation,
  FormatStrategy,
  GroupItem,
  InTextContext,
  ReferenceContext,
} from '../types.js';
import { byFirstSurname, extractSurname, isCommaForm, toSurnameFirst } from '../utils/authors.js';
import { effectiveYear, formatPageRange } from '../utils/placeholders.js';

function mlaAuthorList(citation: Citation): string {
  const authors = citation.authors ?? [];
  if (authors.length === 0) return 'Anonymous';
  if (authors.length === 1) return toSurnameFirst(authors[0] ?? '');

  const first = toSurnameFirst(authors[0] ?? '');
  if (authors.length === 2) {
    const second = (authors[1] ?? '').trim();
    return isCommaForm(second) ? `${first}, and ${second}` : `${first}, and ${second}`;
  }
  // 3+ authors: "Smith, Jane Q., et al."
  return `${first}, et al.`;
}

function mlaSurnames(citation: Citation, ctx: InTextContext): string[] {
  return ctx.surnames.length > 0 ? ctx.surnames : (citation.authors ?? []).map(extractSurname);
}

function mlaAuthorPart(surnames: string[]): string {
  if (surnames.length === 0) return 'Anonymous';
  if (surnames.length === 1) return surnames[0] ?? '';
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`;
  return `${surnames[0]} et al.`;
}

/** Inner of a parenthetical MLA citation, without the surrounding parens. */
function mlaInner(citation: Citation, ctx: InTextContext): string {
  const authorPart = mlaAuthorPart(mlaSurnames(citation, ctx));
  const pageSuffix = ctx.page ? ` ${ctx.page}` : '';
  return `${authorPart}${pageSuffix}`;
}

function mlaInText(citation: Citation, ctx: InTextContext): string {
  // Narrative: the author is named in prose, so only the page (if any)
  // goes in parentheses — e.g. "Smith argues ... (12)".
  if (ctx.narrative) {
    const authorPart = mlaAuthorPart(mlaSurnames(citation, ctx));
    return ctx.page ? `${authorPart} (${ctx.page})` : authorPart;
  }
  return `(${mlaInner(citation, ctx)})`;
}

function mlaGroup(items: GroupItem[]): string {
  const inner = items
    .map((it) => ({
      key: (mlaSurnames(it.citation, it.ctx)[0] ?? '').toLowerCase(),
      text: mlaInner(it.citation, it.ctx),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => entry.text)
    .join('; ');
  return `(${inner})`;
}

function mlaReference(citation: Citation, _ctx: ReferenceContext): string {
  const authors = mlaAuthorList(citation);
  const title = citation.title.trim().replace(/\.$/, '');
  const journal = citation.journal?.trim() ?? '';
  const volume = citation.volume?.trim() ?? '';
  const issue = citation.issue?.trim() ?? '';
  const pages = citation.pages?.trim() ?? '';
  const year = effectiveYear(citation);

  const parts: string[] = [`${authors}. "${title}."`];
  if (journal) {
    let j = ` *${journal}*`;
    if (volume) {
      j += `, vol. ${volume}`;
      if (issue) j += `, no. ${issue}`;
    }
    j += `, ${year}`;
    if (pages) j += `, pp. ${formatPageRange(pages)}`;
    j += '.';
    parts.push(j);
  } else {
    parts.push(` ${year}.`);
  }

  return parts.join('').replace(/\.\./g, '.').replace(/, \./g, '. ');
}

export const mlaStrategy: FormatStrategy = {
  id: 'mla',
  label: 'MLA 9th edition',
  numbered: false,
  sort: byFirstSurname,
  inText: mlaInText,
  groupInText: mlaGroup,
  reference: mlaReference,
};
