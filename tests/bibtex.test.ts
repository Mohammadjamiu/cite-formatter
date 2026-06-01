import { describe, expect, it } from 'vitest';
import { toBibtex, type Citation } from '../src/index.js';

describe('toBibtex', () => {
  it('emits an @article entry for journal citations', () => {
    const c: Citation = {
      id: 'smith2020',
      authors: ['Smith, J. Q.'],
      year: 2020,
      title: 'A study',
      journal: 'Journal of Studies',
      volume: '12',
      issue: '3',
      pages: '34-56',
      doi: '10.1234/abc',
    };
    const out = toBibtex([c]);
    // BibTeX key: surname (Smith) + year (2020) + first title word (A) → smith2020a
    expect(out).toContain('@article{smith2020a,');
    expect(out).toContain('author = {Smith, J. Q.}');
    expect(out).toContain('title = {A study}');
    expect(out).toContain('journal = {Journal of Studies}');
    expect(out).toContain('volume = {12}');
    expect(out).toContain('number = {3}');
    expect(out).toContain('pages = {34-56}');
    expect(out).toContain('doi = {10.1234/abc}');
  });

  it('emits an @book entry when publisher is set without a journal', () => {
    const c: Citation = {
      authors: ['Doe, J.'],
      year: 2018,
      title: 'A book',
      publisher: 'Big Press',
    };
    const out = toBibtex([c]);
    expect(out).toContain('@book{');
    expect(out).toContain('publisher = {Big Press}');
  });

  it('escapes special characters', () => {
    const c: Citation = {
      authors: ['Smith, J.'],
      year: 2020,
      title: 'A & B > C: 50% off',
      journal: 'Journal',
    };
    const out = toBibtex([c]);
    expect(out).toContain('title = {A \\& B > C: 50\\% off}');
  });

  it('handles an empty array', () => {
    expect(toBibtex([])).toBe('');
  });
});
