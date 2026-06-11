import { describe, expect, it } from 'vitest';
import { compileCitations, type Citation } from '../src/index.js';

/**
 * Regression: JS consumers (or DB-sourced data) can pass citations whose
 * `authors` field is missing entirely. The format-level surname fallbacks
 * used to crash with "Cannot read properties of undefined (reading 'map')"
 * inside grouped / narrative rendering paths.
 */
const noAuthors = {
  id: 'na',
  year: 2022,
  title: 'No authors paper',
} as unknown as Citation;

const ok: Citation = {
  id: 'ok',
  authors: ['Okafor, C.'],
  year: 2019,
  title: 'Drip irrigation',
};

const pool = [noAuthors, ok];

describe('citations without an authors field', () => {
  it.each(['apa', 'chicago', 'harvard', 'mla'] as const)(
    '%s renders a grouped citation without crashing',
    (format) => {
      const r = compileCitations({
        content: 'Grouped [CITE:na][CITE:ok].',
        citations: pool,
        format,
      });
      expect(r.content).toContain('(');
      expect(r.references).toHaveLength(2);
    },
  );

  it('APA renders Anonymous for solo and narrative forms', () => {
    const r = compileCitations({
      content: 'Solo [CITE:na]. Narrative [CITE:na|narrative].',
      citations: pool,
      format: 'apa',
    });
    expect(r.content).toBe('Solo (Anonymous, 2022). Narrative Anonymous (2022).');
  });

  it('IEEE numbered formats are unaffected', () => {
    const r = compileCitations({
      content: '[CITE:na][CITE:ok]',
      citations: pool,
      format: 'ieee',
    });
    expect(r.content).toBe('[1, 2]');
  });
});
