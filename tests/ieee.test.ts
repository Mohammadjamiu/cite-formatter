import { describe, expect, it } from 'vitest';
import { compileCitations, type Citation } from '../src/index.js';

const a: Citation = {
  id: 'a',
  authors: ['Smith, J.'],
  year: 2020,
  title: 'A paper',
  journal: 'Journal of Things',
  volume: '5',
  issue: '2',
  pages: '10-20',
  doi: '10.1/abc',
};

const b: Citation = {
  id: 'b',
  authors: ['Jones, A.'],
  year: 2021,
  title: 'B paper',
  journal: 'Other Journal',
  volume: '1',
  pages: '1-9',
};

const c: Citation = {
  id: 'c',
  authors: ['Doe, R.'],
  year: 2019,
  title: 'C paper',
};

describe('compileCitations — IEEE (numbering + continuity)', () => {
  it('numbers citations in order of first appearance', () => {
    const r = compileCitations({
      content: 'A [CITE:b] and B [CITE:a] and B again [CITE:b].',
      citations: [a, b],
      format: 'ieee',
    });
    expect(r.content).toBe('A [1] and B [2] and B again [1].');
    expect(r.references).toHaveLength(2);
    expect(r.references[0]).toMatch(/^\[1\]/);
    expect(r.references[0]).toContain('B paper');
    expect(r.references[1]).toMatch(/^\[2\]/);
    expect(r.references[1]).toContain('A paper');
  });

  it('keeps numbering continuous across multiple calls (the headline feature)', () => {
    const ch1 = compileCitations({
      content: 'A [CITE:a] and B [CITE:b].',
      citations: [a, b],
      format: 'ieee',
    });
    expect(ch1.content).toBe('A [1] and B [2].');
    expect(ch1.references[0]).toMatch(/^\[1\]/);
    expect(ch1.references[1]).toMatch(/^\[2\]/);

    const ch2 = compileCitations({
      content: 'We revisit A [CITE:a] and add C [CITE:c].',
      citations: [a, b, c],
      format: 'ieee',
      numberMap: ch1.numberMap,
    });
    expect(ch2.content).toBe('We revisit A [1] and add C [3].');
    expect(ch2.references[0]).toMatch(/^\[1\]/);
    expect(ch2.references[1]).toMatch(/^\[3\]/);
    expect(ch2.references).toHaveLength(2);
  });

  it('uses "et al." after 6 authors', () => {
    const many: Citation = {
      id: 'many',
      authors: [
        'Smith, J.',
        'Jones, A.',
        'Doe, R.',
        'Brown, T.',
        'Green, S.',
        'White, M.',
        'Black, K.',
      ],
      year: 2020,
      title: 'A big collaboration',
    };
    const r = compileCitations({
      content: '[CITE:many]',
      citations: [many],
      format: 'ieee',
    });
    expect(r.references[0]).toContain('Smith, J. et al.');
  });

  it('handles missing fields gracefully', () => {
    const r = compileCitations({
      content: '[CITE:c]',
      citations: [c],
      format: 'ieee',
    });
    expect(r.content).toBe('[1]');
    expect(r.references[0]).toMatch(/^\[1\] Doe, R\., "C paper", 2019\.$/);
  });

  it('returns an empty numberMap for non-numbered formats', () => {
    const r = compileCitations({
      content: '[CITE:a]',
      citations: [a],
      format: 'apa',
    });
    expect(r.numberMap.size).toBe(0);
  });
});
