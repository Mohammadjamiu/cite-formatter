import { describe, expect, it } from 'vitest';
import { compileCitations, type Citation } from '../src/index.js';

const smith: Citation = {
  id: 'smith',
  authors: ['Smith, J.'],
  year: 2020,
  title: 'A study',
  journal: 'Journal',
};
const jones: Citation = {
  id: 'jones',
  authors: ['Jones, A.', 'Doe, B.'],
  year: 2021,
  title: 'Another study',
  journal: 'Reviews',
};

const pool = [smith, jones];

describe('per-citation page modifier', () => {
  it('APA: [CITE:id|p=42] adds page to that citation only', () => {
    const r = compileCitations({
      content: 'See [CITE:smith|p=42] and [CITE:jones].',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('See (Smith, 2020, p. 42) and (Jones & Doe, 2021).');
  });

  it('per-citation page overrides the global page option', () => {
    const r = compileCitations({
      content: '[CITE:smith|p=7]',
      citations: pool,
      format: 'apa',
      page: '99',
    });
    expect(r.content).toBe('(Smith, 2020, p. 7)');
  });

  it('MLA: page modifier drives the in-text number', () => {
    const r = compileCitations({
      content: '[CITE:smith|p=12]',
      citations: pool,
      format: 'mla',
    });
    expect(r.content).toBe('(Smith 12)');
  });

  it('accepts page=, pp=, and p: spellings', () => {
    const r = compileCitations({
      content: 'a [CITE:smith|page=5], b [CITE:smith|pp=8-9], c [CITE:smith|p:3]',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('a (Smith, 2020, p. 5), b (Smith, 2020, p. 8-9), c (Smith, 2020, p. 3)');
  });

  it('carries per-citation pages into a group', () => {
    const r = compileCitations({
      content: '[CITE:smith|p=1][CITE:jones|p=2]',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('(Jones & Doe, 2021, p. 2; Smith, 2020, p. 1)');
  });
});

describe('narrative modifier', () => {
  it('APA narrative: Smith (2020)', () => {
    const r = compileCitations({
      content: 'As [CITE:smith|narrative] argues, ...',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('As Smith (2020) argues, ...');
  });

  it('APA narrative with two authors uses "and"', () => {
    const r = compileCitations({
      content: '[CITE:jones|narrative]',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('Jones and Doe (2021)');
  });

  it('Chicago narrative: Smith (2020)', () => {
    const r = compileCitations({
      content: '[CITE:smith|narrative]',
      citations: pool,
      format: 'chicago',
    });
    expect(r.content).toBe('Smith (2020)');
  });

  it('Harvard narrative: Smith (2020)', () => {
    const r = compileCitations({
      content: '[CITE:smith|n]',
      citations: pool,
      format: 'harvard',
    });
    expect(r.content).toBe('Smith (2020)');
  });

  it('MLA narrative names the author, page in parens', () => {
    const r = compileCitations({
      content: 'As [CITE:smith|narrative|p=12] notes.',
      citations: pool,
      format: 'mla',
    });
    expect(r.content).toBe('As Smith (12) notes.');
  });

  it('MLA narrative without page is just the author', () => {
    const r = compileCitations({
      content: '[CITE:smith|narrative]',
      citations: pool,
      format: 'mla',
    });
    expect(r.content).toBe('Smith');
  });

  it('numbered formats ignore narrative (still [n])', () => {
    const r = compileCitations({
      content: '[CITE:smith|narrative]',
      citations: pool,
      format: 'ieee',
    });
    expect(r.content).toBe('[1]');
  });
});

describe('same-author same-year disambiguation', () => {
  const alpha: Citation = { id: 'alpha', authors: ['Smith, J.'], year: 2020, title: 'Alpha' };
  const beta: Citation = { id: 'beta', authors: ['Smith, J.'], year: 2020, title: 'Beta' };
  const dpool = [alpha, beta];

  it('APA adds a/b suffixes in-text, ordered by title', () => {
    const r = compileCitations({
      content: 'First [CITE:beta] then [CITE:alpha].',
      citations: dpool,
      format: 'apa',
    });
    // Alpha (title) → a, Beta → b, regardless of citation order
    expect(r.content).toBe('First (Smith, 2020b) then (Smith, 2020a).');
  });

  it('APA carries the suffix into the reference list', () => {
    const r = compileCitations({
      content: '[CITE:alpha][CITE:beta]',
      citations: dpool,
      format: 'apa',
    });
    expect(r.references[0]).toContain('(2020a)');
    expect(r.references[1]).toContain('(2020b)');
  });

  it('no suffix when only one of the pair is cited', () => {
    const r = compileCitations({
      content: '[CITE:alpha]',
      citations: dpool,
      format: 'apa',
    });
    expect(r.content).toBe('(Smith, 2020)');
  });

  it('Harvard disambiguates too (separate citations)', () => {
    const r = compileCitations({
      content: '[CITE:alpha] and [CITE:beta]',
      citations: dpool,
      format: 'harvard',
    });
    expect(r.content).toBe('(Smith, 2020a) and (Smith, 2020b)');
  });

  it('Harvard disambiguates inside a group', () => {
    const r = compileCitations({
      content: '[CITE:alpha][CITE:beta]',
      citations: dpool,
      format: 'harvard',
    });
    expect(r.content).toBe('(Smith, 2020a; Smith, 2020b)');
  });

  it('numbered formats do not add suffixes', () => {
    const r = compileCitations({
      content: '[CITE:alpha] and [CITE:beta]',
      citations: dpool,
      format: 'ieee',
    });
    expect(r.content).toBe('[1] and [2]');
  });
});
