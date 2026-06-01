import { describe, expect, it } from 'vitest';
import { extractSurname, toSurnameFirst, toInitialsFirst, isCommaForm, getSurnames, byFirstSurname } from '../src/index.js';

describe('extractSurname', () => {
  it('handles "Last, F. M." form', () => {
    expect(extractSurname('Smith, J. Q.')).toBe('Smith');
  });
  it('handles "First M. Last" form', () => {
    expect(extractSurname('Jane Q. Smith')).toBe('Smith');
  });
  it('handles single name', () => {
    expect(extractSurname('Smith')).toBe('Smith');
  });
  it('handles particles (van, de, von)', () => {
    expect(extractSurname('Vincent van Gogh')).toBe('van Gogh');
  });
  it('returns empty for empty input', () => {
    expect(extractSurname('')).toBe('');
  });
});

describe('toSurnameFirst', () => {
  it('converts "Jane Q. Smith" to "Smith, J. Q."', () => {
    expect(toSurnameFirst('Jane Q. Smith')).toBe('Smith, J. Q.');
  });
  it('passes through comma-form', () => {
    expect(toSurnameFirst('Smith, J. Q.')).toBe('Smith, J. Q.');
  });
  it('handles single name', () => {
    expect(toSurnameFirst('Smith')).toBe('Smith');
  });
});

describe('toInitialsFirst', () => {
  it('converts "Jane Q. Smith" to "J. Q. Smith"', () => {
    expect(toInitialsFirst('Jane Q. Smith')).toBe('J. Q. Smith');
  });
  it('converts "Smith, J. Q." to "J. Q. Smith"', () => {
    expect(toInitialsFirst('Smith, J. Q.')).toBe('J. Q. Smith');
  });
});

describe('isCommaForm', () => {
  it('detects comma-form', () => {
    expect(isCommaForm('Smith, J.')).toBe(true);
  });
  it('detects non-comma-form', () => {
    expect(isCommaForm('Jane Smith')).toBe(false);
  });
});

describe('getSurnames', () => {
  it('returns all surnames', () => {
    const c = { id: 'x', authors: ['Smith, J.', 'Jones, A.', 'Doe, B.'], year: 2020, title: 't' };
    expect(getSurnames(c)).toEqual(['Smith', 'Jones', 'Doe']);
  });
  it('handles missing authors', () => {
    const c = { id: 'x', authors: [] as string[], year: 2020, title: 't' };
    expect(getSurnames(c)).toEqual([]);
  });
});

describe('byFirstSurname', () => {
  it('sorts citations alphabetically by first surname', () => {
    const a = { id: 'a', authors: ['Zebra, Z.'], year: 2020, title: 't' };
    const b = { id: 'b', authors: ['Apple, A.'], year: 2020, title: 't' };
    expect([a, b].sort(byFirstSurname)).toEqual([b, a]);
  });
});
