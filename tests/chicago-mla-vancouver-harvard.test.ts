import { describe, expect, it } from 'vitest';
import { compileCitations, type Citation } from '../src/index.js';

const a: Citation = {
  id: 'a',
  authors: ['Smith, J. Q.'],
  year: 2020,
  title: 'A study',
  journal: 'Journal',
  volume: '5',
  issue: '2',
  pages: '12-20',
};

describe('Chicago author-date', () => {
  it('renders in-text with year only', () => {
    const r = compileCitations({
      content: '[CITE:a] showed this.',
      citations: [a],
      format: 'chicago',
    });
    expect(r.content).toBe('(Smith 2020) showed this.');
  });

  it('formats reference with year after author', () => {
    const r = compileCitations({
      content: '[CITE:a]',
      citations: [a],
      format: 'chicago',
    });
    expect(r.references[0]).toContain('Smith, J. Q. 2020.');
    expect(r.references[0]).toContain('"A study."');
    expect(r.references[0]).toContain('*Journal* 5 (2): 12–20.');
  });
});

describe('MLA', () => {
  it('uses page number in parenthetical and quotes in reference', () => {
    const r = compileCitations({
      content: '[CITE:a] showed this.',
      citations: [a],
      format: 'mla',
      page: '15',
    });
    expect(r.content).toBe('(Smith 15) showed this.');
    expect(r.references[0]).toContain('Smith, J. Q.');
    expect(r.references[0]).toContain('"A study."');
    expect(r.references[0]).toContain('*Journal*');
  });
});

describe('Vancouver', () => {
  it('renders (1) in-text and NLM-style reference', () => {
    const r = compileCitations({
      content: '[CITE:a] showed this.',
      citations: [a],
      format: 'vancouver',
    });
    expect(r.content).toBe('(1) showed this.');
    expect(r.references[0]).toMatch(/^1\. Smith, J\. Q\./);
    expect(r.references[0]).toContain('Journal. 2020;5(2):12–20.');
  });
});

describe('Harvard', () => {
  it('renders (Smith, 2020) parenthetical', () => {
    const r = compileCitations({
      content: '[CITE:a]',
      citations: [a],
      format: 'harvard',
    });
    expect(r.content).toBe('(Smith, 2020)');
  });

  it('uses single quotes in reference title', () => {
    const r = compileCitations({
      content: '[CITE:a]',
      citations: [a],
      format: 'harvard',
    });
    expect(r.references[0]).toContain("'A study'");
  });
});
