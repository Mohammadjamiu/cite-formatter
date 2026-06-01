// Convert a list of citations to a BibTeX string.
//
// Each citation becomes an @article (if it has a journal field),
// @book (if it has a publisher but no journal), or @misc.
// The BibTeX key is constructed as <surname><year><firstTitleWord>,
// lowercased and stripped of non-alphanumerics. All special
// characters are escaped. This is intentionally basic -- the goal
// is "good enough to feed into pandoc / JabRef / Zotero", not a
// full implementation of BibTeX's edge cases.
import type { Citation } from './types.js';
import { effectiveYear } from './utils/placeholders.js';
import { extractSurname } from './utils/authors.js';

function inferType(citation: Citation): 'article' | 'book' | 'misc' {
  if (citation.journal && citation.journal.trim().length > 0) return 'article';
  if (citation.publisher && citation.publisher.trim().length > 0) return 'book';
  return 'misc';
}

function toBibtexKey(citation: Citation, fallbackIndex: number): string {
  const firstAuthor = citation.authors?.[0] ?? '';
  const surname = extractSurname(firstAuthor) || 'anon';
  const year = effectiveYear(citation);
  const firstTitleWord = (citation.title ?? '').split(/\s+/)[0] ?? '';
  const raw = `${surname}${year}${firstTitleWord}`.toLowerCase();
  const clean = raw.replace(/[^a-z0-9]+/g, '');
  return clean || `ref${fallbackIndex}`;
}

function bibtexEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/[{}]/g, '\\$&')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function joinAuthors(citation: Citation): string {
  return (citation.authors ?? []).join(' and ');
}

export function toBibtex(citations: Citation[]): string {
  return citations
    .map((c, i) => {
      const type = inferType(c);
      const key = toBibtexKey(c, i);
      const fields: Array<[string, string | undefined]> = [
        ['author', joinAuthors(c) || undefined],
        ['title', c.title || undefined],
        ['year', String(effectiveYear(c))],
        ['journal', type === 'article' ? c.journal : undefined],
        ['booktitle', type !== 'article' ? c.journal : undefined],
        ['volume', c.volume],
        ['number', c.issue],
        ['pages', c.pages],
        ['publisher', c.publisher],
        ['doi', c.doi],
        ['url', c.url],
      ];

      const body = fields
        .filter((f): f is [string, string] => Boolean(f[1]))
        .map(([k, v]) => `  ${k} = {${bibtexEscape(v)}}`)
        .join(',\n');

      return `@${type}{${key},\n${body}\n}`;
    })
    .join('\n\n');
}
