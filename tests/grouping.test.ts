import { describe, expect, it } from 'vitest';
import { compileCitations, type Citation } from '../src/index.js';

const smith: Citation = { id: 'smith', authors: ['Smith, J.'], year: 2020, title: 'A' };
const jones: Citation = { id: 'jones', authors: ['Jones, A.'], year: 2021, title: 'B' };
const doe: Citation = { id: 'doe', authors: ['Doe, R.'], year: 2019, title: 'C' };
const fu: Citation = {
  id: 'fu',
  authors: ['Fu, X.', 'Li, Y.', 'Wang, Z.'],
  year: 2023,
  title: 'Survey',
};
const gasmi: Citation = {
  id: 'gasmi',
  authors: ['Gasmi, A.', 'Ben, B.', 'Cherif, C.'],
  year: 2025,
  title: 'Review',
};

const pool = [smith, jones, doe, fu, gasmi];

describe('grouped in-text citations — author-date', () => {
  it('APA merges adjacent placeholders into one parenthetical, alphabetised', () => {
    const r = compileCitations({
      content: 'As shown [CITE:jones][CITE:smith].',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('As shown (Jones, 2021; Smith, 2020).');
  });

  it('APA groups three sources with et al. for 3+ authors', () => {
    const r = compileCitations({
      content: 'Recent work [CITE:fu][CITE:gasmi] confirms this.',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('Recent work (Fu et al., 2023; Gasmi et al., 2025) confirms this.');
  });

  it('APA accepts a semicolon between adjacent placeholders', () => {
    const r = compileCitations({
      content: 'Shown [CITE:smith]; [CITE:jones] here.',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('Shown (Jones, 2021; Smith, 2020) here.');
  });

  it('does NOT group placeholders separated by words', () => {
    const r = compileCitations({
      content: '[CITE:smith] and also [CITE:jones].',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('(Smith, 2020) and also (Jones, 2021).');
  });

  it('Harvard merges with "and"/et al. rules', () => {
    const r = compileCitations({
      content: '[CITE:smith][CITE:fu]',
      citations: pool,
      format: 'harvard',
    });
    expect(r.content).toBe('(Fu et al., 2023; Smith, 2020)');
  });

  it('Chicago merges into one parenthetical', () => {
    const r = compileCitations({
      content: '[CITE:jones][CITE:smith]',
      citations: pool,
      format: 'chicago',
    });
    expect(r.content).toBe('(Jones 2021; Smith 2020)');
  });

  it('MLA merges with a semicolon', () => {
    const r = compileCitations({
      content: '[CITE:jones][CITE:smith]',
      citations: pool,
      format: 'mla',
    });
    expect(r.content).toBe('(Jones; Smith)');
  });
});

describe('grouped in-text citations — numbered', () => {
  it('IEEE combines two numbers in one bracket', () => {
    const r = compileCitations({
      content: 'Work [CITE:fu][CITE:gasmi] shows this.',
      citations: pool,
      format: 'ieee',
    });
    expect(r.content).toBe('Work [1, 2] shows this.');
  });

  it('IEEE collapses 3+ consecutive numbers into a range', () => {
    const r = compileCitations({
      content: '[CITE:smith][CITE:jones][CITE:doe]',
      citations: pool,
      format: 'ieee',
    });
    expect(r.content).toBe('[1–3]');
  });

  it('IEEE sorts numbers ascending inside the group', () => {
    const r = compileCitations({
      content: 'First [CITE:smith] then together [CITE:doe][CITE:smith].',
      citations: pool,
      format: 'ieee',
    });
    // smith=1, doe=2; group sorted ascending
    expect(r.content).toBe('First [1] then together [1, 2].');
  });

  it('Vancouver combines numbers in parentheses', () => {
    const r = compileCitations({
      content: '[CITE:fu][CITE:gasmi]',
      citations: pool,
      format: 'vancouver',
    });
    expect(r.content).toBe('(1, 2)');
  });

  it('Vancouver collapses a consecutive run into a range', () => {
    const r = compileCitations({
      content: '[CITE:smith][CITE:jones][CITE:doe]',
      citations: pool,
      format: 'vancouver',
    });
    expect(r.content).toBe('(1–3)');
  });
});

describe('grouping edge cases', () => {
  it('falls back to per-placeholder when a grouped id is unknown (keep)', () => {
    const r = compileCitations({
      content: '[CITE:smith][CITE:nope]',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('(Smith, 2020)[CITE:nope]');
    expect(r.missingIds).toEqual(['nope']);
  });

  it('a single placeholder is never grouped', () => {
    const r = compileCitations({
      content: '[CITE:smith]',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('(Smith, 2020)');
  });

  it('still builds the reference list for grouped citations', () => {
    const r = compileCitations({
      content: '[CITE:fu][CITE:gasmi]',
      citations: pool,
      format: 'apa',
    });
    expect(r.references).toHaveLength(2);
  });
});
