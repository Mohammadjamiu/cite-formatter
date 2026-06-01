import { describe, expect, it } from 'vitest';
import { compileCitations, registerFormat, unregisterFormat, type Citation, type FormatStrategy } from '../src/index.js';

const a: Citation = { id: 'a', authors: ['Smith, J.'], year: 2020, title: 'A paper' };

describe('missing-ids behaviour', () => {
  it('keeps the raw placeholder by default', () => {
    const r = compileCitations({
      content: 'Hello [CITE:unknown] world.',
      citations: [a],
      format: 'apa',
    });
    expect(r.content).toBe('Hello [CITE:unknown] world.');
    expect(r.missingIds).toEqual(['unknown']);
  });

  it('strips the placeholder when onMissing="remove"', () => {
    const r = compileCitations({
      content: 'Hello [CITE:unknown] world.',
      citations: [a],
      format: 'apa',
      onMissing: 'remove',
    });
    expect(r.content).toBe('Hello  world.');
    expect(r.missingIds).toEqual(['unknown']);
  });

  it('throws when onMissing="throw"', () => {
    expect(() =>
      compileCitations({
        content: '[CITE:unknown]',
        citations: [a],
        format: 'apa',
        onMissing: 'throw',
      }),
    ).toThrow(/unknown/);
  });

  it('deduplicates missingIds', () => {
    const r = compileCitations({
      content: '[CITE:x] [CITE:x] [CITE:y]',
      citations: [a],
      format: 'apa',
    });
    expect(r.missingIds).toEqual(['x', 'y']);
  });
});

describe('custom format registration', () => {
  const house: FormatStrategy = {
    id: 'house',
    label: 'House style',
    inText: (c) => `**${c.authors[0] ?? '?'} ${c.year}**`,
    reference: (c) => `${c.authors[0]} -- ${c.title} (${c.year})`,
  };

  it('registers and uses a custom format', () => {
    registerFormat(house);
    try {
      const r = compileCitations({
        content: '[CITE:a]',
        citations: [a],
        format: 'house',
      });
      expect(r.content).toBe('**Smith, J. 2020**');
      expect(r.references[0]).toBe('Smith, J. -- A paper (2020)');
    } finally {
      unregisterFormat('house');
    }
  });

  it('rejects registration of a built-in id', () => {
    expect(() =>
      registerFormat({
        id: 'apa',
        label: 'override',
        inText: () => 'x',
        reference: () => 'x',
      }),
    ).toThrow(/already registered/);
  });

  it('rejects overriding a built-in via unregister', () => {
    expect(() => unregisterFormat('apa')).toThrow(/Cannot unregister built-in/);
  });
});

describe('passing a FormatStrategy object directly', () => {
  it('works without registering', () => {
    const r = compileCitations({
      content: '[CITE:a]',
      citations: [a],
      format: {
        id: 'inline',
        label: 'Inline test',
        inText: (c) => `@@${c.authors[0] ?? '?'}@@`,
        reference: (c) => `${c.authors[0]}: ${c.title}`,
      },
    });
    expect(r.content).toBe('@@Smith, J.@@');
  });
});
