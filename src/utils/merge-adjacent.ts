/**
 * Merge consecutive in-text citations produced when multiple [CITE:id]
 * placeholders sit adjacent in the source text.
 *
 * APA / Harvard / Chicago: (A, 2020)(B, 2021) → (A, 2020; B, 2021)
 * IEEE:                   [1][2]             → [1, 2] / [1]–[3]
 * Vancouver:              (1)(2)             → (1, 2) / (1–3)
 */

import type { FormatStrategy } from '../types.js';

function parseNumbers(raw: string): number[] {
  return raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
}

/** Format a sorted, deduplicated list of reference numbers for IEEE in-text style. */
function formatIeeeNumbers(nums: number[]): string {
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  if (unique.length === 0) return '';
  if (unique.length === 1) return `[${unique[0]}]`;
  if (unique.length === 2) return `[${unique[0]}, ${unique[1]}]`;

  const allConsecutive = unique.every((n, i) => i === 0 || n === unique[i - 1]! + 1);
  if (allConsecutive) {
    return `[${unique[0]}]–[${unique[unique.length - 1]}]`;
  }

  const parts: string[] = [];
  let i = 0;
  while (i < unique.length) {
    let j = i;
    while (j + 1 < unique.length && unique[j + 1] === unique[j]! + 1) j++;
    const runLen = j - i + 1;
    if (runLen >= 3) {
      parts.push(`${unique[i]}–${unique[j]}`);
    } else if (runLen === 2) {
      parts.push(`${unique[i]}, ${unique[j]}`);
    } else {
      parts.push(String(unique[i]));
    }
    i = j + 1;
  }
  return `[${parts.join(', ')}]`;
}

/** Vancouver uses parentheses instead of square brackets. */
function formatVancouverNumbers(nums: number[]): string {
  const inner = formatIeeeNumbers(nums).slice(1, -1); // strip outer [ ]
  return `(${inner})`;
}

function preserveTrailingWhitespace(match: string, replacement: string): string {
  const trimmed = match.trimEnd();
  const trailing = match.slice(trimmed.length);
  return replacement + trailing;
}

function mergeBracketRuns(text: string): string {
  // Require 2+ adjacent tokens. Allow optional commas or whitespace between them.
  const runRe = /(?:\[(\d+(?:,\s*\d+)*)\][\s,;]*){2,}/g;
  return text.replace(runRe, (match) => {
    const nums: number[] = [];
    for (const m of match.matchAll(/\[(\d+(?:,\s*\d+)*)\]/g)) {
      nums.push(...parseNumbers(m[1] ?? ''));
    }
    return preserveTrailingWhitespace(match, formatIeeeNumbers(nums));
  });
}

function mergeParenthesisNumberRuns(text: string): string {
  const runRe = /(?:\((\d+(?:,\s*\d+)*)\)[\s,;]*){2,}/g;
  return text.replace(runRe, (match) => {
    const nums: number[] = [];
    for (const m of match.matchAll(/\((\d+(?:,\s*\d+)*)\)/g)) {
      nums.push(...parseNumbers(m[1] ?? ''));
    }
    return preserveTrailingWhitespace(match, formatVancouverNumbers(nums));
  });
}

/**
 * Merge adjacent parenthetical author–date citations. Requires a 4-digit
 * year inside each group so unrelated parentheses are not touched.
 */
function mergeAuthorDateRuns(text: string): string {
  const citationGroup = String.raw`\([^()]*\d{4}[^()]*\)`;
  const runRe = new RegExp(`(?:${citationGroup}[\\s,;]*){2,}`, 'g');
  return text.replace(runRe, (match) => {
    const groupsList = [...match.matchAll(new RegExp(citationGroup, 'g'))].map((m) => m[0]);
    const inner = [...new Set(groupsList.map((g: string) => g.slice(1, -1).trim()))].join('; ');
    return preserveTrailingWhitespace(match, `(${inner})`);
  });
}

/**
 * Collapse adjacent in-text citations into the combined form required by
 * the active format strategy.
 */
export function mergeAdjacentCitations(text: string, format: FormatStrategy): string {
  if (format.id === 'ieee' || (format.numbered && format.id !== 'vancouver')) {
    return mergeBracketRuns(text);
  }
  if (format.id === 'vancouver') {
    return mergeParenthesisNumberRuns(text);
  }
  // APA, Chicago, Harvard, and other author–date parenthetical styles.
  if (!format.numbered) {
    return mergeAuthorDateRuns(text);
  }
  return text;
}
