import { describe, expect, it } from 'vitest';
import { compileCitations, mergeAdjacentCitations, ieeeStrategy, type Citation } from '../src/index.js';

const a: Citation = {
  id: 'a',
  authors: ['Balogun, M.'],
  year: 2026,
  title: 'LLMs in software development',
};

const b: Citation = {
  id: 'b',
  authors: ['Fu, L.'],
  year: 2023,
  title: 'AI code security',
};

const c: Citation = {
  id: 'c',
  authors: ['Krasniqi, A.', 'Bejtullahu, B.'],
  year: 2018,
  title: 'Web app security',
};

const d: Citation = {
  id: 'd',
  authors: ['Irvan, I.'],
  year: 2024,
  title: 'Cyber threats',
};

const e: Citation = {
  id: 'e',
  authors: ['Rijanandi, R.'],
  year: 2024,
  title: 'OWASP standards',
};

describe('mergeAdjacentCitations — IEEE', () => {
  it('merges two adjacent citations with comma and ascending order', () => {
    expect(mergeAdjacentCitations('text [5][4] end', ieeeStrategy)).toBe('text [4, 5] end');
  });

  it('deduplicates repeated numbers', () => {
    expect(mergeAdjacentCitations('text [1][1] end', ieeeStrategy)).toBe('text [1] end');
  });

  it('compresses three consecutive refs into an en-dash range', () => {
    expect(mergeAdjacentCitations('see [1][2][3] here', ieeeStrategy)).toBe('see [1]–[3] here');
  });

  it('handles non-consecutive clusters', () => {
    expect(mergeAdjacentCitations('see [1][3][4] here', ieeeStrategy)).toBe('see [1, 3, 4] here');
  });
});

describe('compileCitations — adjacent citation grouping (default on)', () => {
  it('merges adjacent APA citations with semicolons', () => {
    const r = compileCitations({
      content:
        'However, this reliance introduces risks [CITE:a][CITE:b]. Complexity requires rigor [CITE:c][CITE:d].',
      citations: [a, b, c, d],
      format: 'apa',
    });
    expect(r.content).toContain('(Balogun, 2026; Fu, 2023)');
    expect(r.content).toContain('(Irvan, 2024; Krasniqi & Bejtullahu, 2018)');
  });

  it('merges adjacent IEEE citations', () => {
    const r = compileCitations({
      content:
        'LLMs advance code generation [CITE:a]. Risks appear [CITE:a][CITE:b]. OWASP guides mitigation [CITE:e][CITE:d].',
      citations: [a, b, c, d, e],
      format: 'ieee',
    });
    expect(r.content).toContain('generation [1].');
    expect(r.content).toContain('Risks appear [1, 2].');
    expect(r.content).toContain('mitigation [3, 4].');
  });

  it('merges adjacent Vancouver citations', () => {
    const r = compileCitations({
      content: 'Risks [CITE:a][CITE:b] are noted.',
      citations: [a, b],
      format: 'vancouver',
    });
    expect(r.content).toBe('Risks (1, 2) are noted.');
  });

  it('merges adjacent Harvard citations', () => {
    const r = compileCitations({
      content: 'Risks [CITE:c][CITE:d] are noted.',
      citations: [c, d],
      format: 'harvard',
    });
    expect(r.content).toBe('Risks (Irvan, 2024; Krasniqi and Bejtullahu, 2018) are noted.');
  });

  it('does not merge citations separated by other text', () => {
    const r = compileCitations({
      content: 'First [CITE:a]. Later [CITE:b].',
      citations: [a, b],
      format: 'apa',
    });
    expect(r.content).toBe('First (Balogun, 2026). Later (Fu, 2023).');
  });

  it('skips merging when groupAdjacent is false', () => {
    const r = compileCitations({
      content: 'Risks [CITE:a][CITE:b] noted.',
      citations: [a, b],
      format: 'ieee',
      groupAdjacent: false,
    });
    expect(r.content).toBe('Risks [1][2] noted.');
  });
});
