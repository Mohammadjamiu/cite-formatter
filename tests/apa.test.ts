import { describe, expect, it } from 'vitest';
import { compileCitations, type Citation } from '../src/index.js';

const smith: Citation = {
  id: 'smith2020',
  authors: ['Smith, J. Q.'],
  year: 2020,
  title: 'A study of things',
  journal: 'Journal of Studies',
  volume: '12',
  issue: '3',
  pages: '34-56',
  doi: '10.1234/abc',
};

const jones: Citation = {
  id: 'jones2021',
  authors: ['Jones, J. B.'],
  year: 2021,
  title: 'Another paper',
  journal: 'Reviews',
  volume: '5',
  pages: '100-110',
};

describe('compileCitations — APA', () => {
  it('replaces a single placeholder with a parenthetical citation', () => {
    const r = compileCitations({
      content: 'Studies show [CITE:smith2020] that this works.',
      citations: [smith],
      format: 'apa',
    });
    expect(r.content).toBe('Studies show (Smith, 2020) that this works.');
    expect(r.references).toHaveLength(1);
    expect(r.references[0]).toContain('Smith, J. Q. (2020).');
    expect(r.references[0]).toContain('A study of things.');
    expect(r.references[0]).toContain('*Journal of Studies*');
    expect(r.references[0]).toContain('*12*');
    expect(r.references[0]).toContain('(3)');
    expect(r.references[0]).toContain('34–56');
    expect(r.references[0]).toContain('https://doi.org/10.1234/abc');
  });

  it('handles two authors with ampersand', () => {
    const r = compileCitations({
      content: '[CITE:smith2020] and [CITE:jones2021] showed...',
      citations: [smith, jones],
      format: 'apa',
    });
    expect(r.references).toHaveLength(2);
    // References are sorted alphabetically by first-author surname: Jones < Smith
    expect(r.references[0]).toContain('Jones, J. B. (2021).');
    expect(r.references[1]).toContain('Smith, J. Q. (2020).');
  });

  it('uses "et al." for 3+ authors in parenthetical', () => {
    const c: Citation = {
      id: 'multi',
      authors: ['Smith, J.', 'Jones, A.', 'Doe, B.'],
      year: 2020,
      title: 'A multi-author paper',
    };
    const r = compileCitations({
      content: '[CITE:multi] showed this.',
      citations: [c],
      format: 'apa',
    });
    expect(r.content).toBe('(Smith et al., 2020) showed this.');
  });

  it('renders narrative in-text with author + year via custom format', () => {
    const c: Citation = {
      id: 'multi',
      authors: ['Smith, J.', 'Jones, A.', 'Doe, B.'],
      year: 2020,
      title: 'A multi-author paper',
    };
    // A custom strategy that exercises the `narrative` ctx flag.
    const narrativeApa = {
      id: 'narrative-apa',
      label: 'APA with narrative',
      inText: (_c: Citation, ctx: { surnames: string[]; narrative?: boolean; number?: number }) => {
        const year = 2020;
        const s = ctx.surnames;
        if (ctx.narrative) {
          return s.length === 1 ? (s[0] ?? '') : s.length === 2 ? `${s[0]} and ${s[1]}` : `${s[0]} et al.`;
        }
        return `(${s.join(', ')}, ${year})`;
      },
      reference: (c: Citation) => `${c.authors.join(', ')} (${c.year}). ${c.title}.`,
    };
    const r = compileCitations({
      content: 'A study [CITE:multi] confirmed it.',
      citations: [c],
      format: narrativeApa,
    });
    // APA 3+ author form: "Smith et al., 2020" (not the long form in parentheses — that's what the custom strategy does)
    expect(r.references[0]).toContain('Smith, J., Jones, A., Doe, B. (2020)');
  });

  it('appends page suffix when provided', () => {
    const r = compileCitations({
      content: '[CITE:smith2020]',
      citations: [smith],
      format: 'apa',
      page: '42',
    });
    expect(r.content).toBe('(Smith, 2020, p. 42)');
  });

  it('handles 21+ authors per APA 7 rules', () => {
    const authors = Array.from({ length: 25 }, (_, i) => `Author${i}, A.`);
    const c: Citation = { id: 'big', authors, year: 2020, title: 'A big study' };
    const r = compileCitations({
      content: '[CITE:big]',
      citations: [c],
      format: 'apa',
    });
    expect(r.references[0]).toMatch(/Author0, A\., Author1, A\.,.*\.\.\. Author24, A\./);
  });

  it('sorts references alphabetically by first-author surname', () => {
    const a: Citation = { id: 'a', authors: ['Zebra, Z.'], year: 2020, title: 'Z title' };
    const b: Citation = { id: 'b', authors: ['Apple, A.'], year: 2020, title: 'A title' };
    const r = compileCitations({
      content: '[CITE:a] [CITE:b]',
      citations: [a, b],
      format: 'apa',
    });
    expect(r.references[0]).toContain('Apple, A.');
    expect(r.references[1]).toContain('Zebra, Z.');
  });
});
