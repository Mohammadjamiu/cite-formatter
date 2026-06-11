/**
 * APA 7th edition.
 *
 * In-text:
 *   - 1 author:        (Smith, 2020)
 *   - 2 authors:       (Smith & Jones, 2020)
 *   - 3+ authors:      (Smith et al., 2020)   ← APA 7 changed this from "et al." at 6+
 *   - narrative form:  Smith (2020) / Smith and Jones (2020) / Smith et al. (2020)
 *   - with page:       (Smith, 2020, p. 12)
 *
 * Reference list:
 *   - Alphabetical by first-author surname
 *   - "Author, A. A., Author, B. B., & Author, C. C." (use & before last)
 *   - 21+ authors: list first 19, then ellipsis, then last author
 *   - Sentence case for article titles, title case for journal names
 *   - Italics rendered as `*...*` (markdown); strip them or convert
 *     downstream if you need LaTeX or HTML
 *
 * @example In-text output
 *   "(Smith, 2020)" / "(Smith & Jones, 2020)" / "(Smith et al., 2020)"
 *
 * @example Reference output
 *   "Smith, J. Q. (2020). A study of things. *Journal of Studies*, *12*(3), 34–56. https://doi.org/10.1234/abc"
 */

import type {
  Citation,
  FormatStrategy,
  GroupItem,
  InTextContext,
  ReferenceContext,
} from '../types.js';
import { byFirstSurname, extractSurname, isCommaForm, toInitialsFirst } from '../utils/authors.js';
import { doiUrl, effectiveYear, formatPageRange } from '../utils/placeholders.js';

function apaAuthorList(citation: Citation, max: number = 20): string {
  const authors = citation.authors ?? [];
  if (authors.length === 0) return 'Anonymous';

  const formatted = authors.map((a) => {
    if (isCommaForm(a)) return a.trim();
    return toInitialsFirst(a);
  });

  if (formatted.length <= max) {
    if (formatted.length === 1) return formatted[0] ?? '';
    if (formatted.length === 2) return formatted.join(', & ');
    return formatted.slice(0, -1).join(', ') + ', & ' + (formatted[formatted.length - 1] ?? '');
  }
  // 21+ authors: first 19, ellipsis, last
  return (
    formatted.slice(0, 19).join(', ') +
    ', ... ' +
    (formatted[formatted.length - 1] ?? '')
  );
}

function apaSurnames(citation: Citation, ctx: InTextContext): string[] {
  return ctx.surnames.length > 0 ? ctx.surnames : citation.authors.map(extractSurname);
}

/** Inner of a parenthetical APA citation, without the surrounding parens. */
function apaParentheticalInner(citation: Citation, ctx: InTextContext): string {
  const year = `${effectiveYear(citation)}${ctx.yearSuffix ?? ''}`;
  const pageSuffix = ctx.page ? `, p. ${ctx.page}` : '';
  const surnames = apaSurnames(citation, ctx);

  let authorPart: string;
  if (surnames.length === 0) {
    authorPart = 'Anonymous';
  } else if (surnames.length === 1) {
    authorPart = surnames[0] ?? '';
  } else if (surnames.length === 2) {
    authorPart = `${surnames[0]} & ${surnames[1]}`;
  } else {
    authorPart = `${surnames[0]} et al.`;
  }
  return `${authorPart}, ${year}${pageSuffix}`;
}

function apaInText(citation: Citation, ctx: InTextContext): string {
  const year = `${effectiveYear(citation)}${ctx.yearSuffix ?? ''}`;
  const surnames = apaSurnames(citation, ctx);

  if (ctx.narrative) {
    let authorPart: string;
    if (surnames.length <= 1) {
      authorPart = surnames[0] ?? 'Anonymous';
    } else if (surnames.length === 2) {
      authorPart = `${surnames[0]} and ${surnames[1]}`;
    } else {
      authorPart = `${surnames[0]} et al.`;
    }
    return `${authorPart} (${year})`;
  }

  return `(${apaParentheticalInner(citation, ctx)})`;
}

/** Multiple sources in one parenthetical, alphabetised by first surname and `;`-joined. */
function apaGroup(items: GroupItem[]): string {
  const inner = items
    .map((it) => ({
      key: (apaSurnames(it.citation, it.ctx)[0] ?? '').toLowerCase(),
      text: apaParentheticalInner(it.citation, it.ctx),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => entry.text)
    .join('; ');
  return `(${inner})`;
}

function apaReference(citation: Citation, ctx: ReferenceContext): string {
  const year = `${effectiveYear(citation)}${ctx.yearSuffix ?? ''}`;
  const authors = apaAuthorList(citation);
  const journal = citation.journal?.trim() ?? '';
  const volume = citation.volume?.trim() ?? '';
  const issue = citation.issue?.trim() ?? '';
  const pages = citation.pages?.trim() ?? '';
  const doi = citation.doi?.trim() ?? '';
  const url = citation.url?.trim() ?? '';

  let journalPart = '';
  if (journal) {
    journalPart = ` *${journal}*`;
    if (volume) {
      journalPart += `, *${volume}*`;
      if (issue) journalPart += `(${issue})`;
    }
    if (pages) journalPart += `, ${formatPageRange(pages)}`;
    journalPart += '.';
  }

  const title = citation.title.trim().replace(/\.$/, '');

  const link = doi ? doiUrl(doi) : url;
  const linkPart = link ? ` ${link}` : '';

  return `${authors} (${year}). ${title}.${journalPart}${linkPart}`;
}

export const apaStrategy: FormatStrategy = {
  id: 'apa',
  label: 'APA 7th edition',
  numbered: false,
  disambiguateYears: true,
  sort: byFirstSurname,
  inText: apaInText,
  groupInText: apaGroup,
  reference: apaReference,
};
