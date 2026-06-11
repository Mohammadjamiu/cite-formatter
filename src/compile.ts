// The main entry point. Pure function, no I/O, no globals.
//
// Flow:
//   1. Walk the content, finding every [CITE:id] placeholder.
//   2. Resolve each id against the citation pool.
//   3. For numbered formats, assign / reuse numbers in the numberMap.
//   4. Replace each placeholder with the format-specific in-text citation.
//   5. Build the reference list, sorted as the format dictates.
//   6. Return everything the caller needs.
//
// See CompileOptions (types.ts) for the input shape and CompileResult
// for what comes back. Full worked examples live in the README and
// docs/INTEGRATION.md.
import type {
  Citation,
  CompileOptions,
  CompileResult,
  GroupItem,
  InTextContext,
  ReferenceContext,
} from './types.js';
import { resolveFormat } from './formats/index.js';
import {
  buildCitationMap,
  CITE_GROUP,
  CITE_PLACEHOLDER,
  citationKey,
  effectiveYear,
  parseCiteModifiers,
} from './utils/placeholders.js';
import { getSurnames } from './utils/authors.js';

/** Map a 0-based index to a spreadsheet-style letter suffix: 0→a, 25→z, 26→aa. */
function letterSuffix(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(97 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function compileCitations(options: CompileOptions): CompileResult {
  const {
    content,
    citations,
    format,
    numberMap: inputNumberMap,
    onMissing = 'keep',
    page,
    groupAdjacent = true,
  } = options;

  const strategy = resolveFormat(format);
  const citationMap = buildCitationMap(citations);

  // 1. Discover which ids are referenced and in what order
  const usedOrder: string[] = [];
  const usedSet = new Set<string>();
  const missing: string[] = [];

  for (const match of content.matchAll(CITE_PLACEHOLDER)) {
    const id = match[1];
    if (!id) continue;
    if (citationMap.has(id)) {
      if (!usedSet.has(id)) {
        usedSet.add(id);
        usedOrder.push(id);
      }
    } else if (!missing.includes(id)) {
      missing.push(id);
    }
  }

  if (onMissing === 'throw' && missing.length > 0) {
    throw new Error(
      `Unknown citation ids: ${missing.join(', ')}. ` +
        `Provide them in the citations array or change onMissing.`,
    );
  }

  // 2. Build / extend the number map for numbered formats
  const numberMap: Map<string, number> = inputNumberMap
    ? new Map(inputNumberMap)
    : new Map();
  let nextNumber = numberMap.size + 1;

  for (const id of usedOrder) {
    if (!numberMap.has(id)) {
      numberMap.set(id, nextNumber++);
    }
  }

  // 2b. Disambiguate same-author-same-year citations with letter suffixes
  //     (2020a, 2020b) for formats that opt in (APA, Chicago, Harvard).
  const yearSuffixMap = new Map<string, string>();
  if (strategy.disambiguateYears) {
    const byAuthorYear = new Map<string, string[]>();
    for (const id of usedOrder) {
      const citation = citationMap.get(id);
      if (!citation) continue;
      const surname = (getSurnames(citation)[0] ?? '').toLowerCase();
      const key = `${surname}|${effectiveYear(citation)}`;
      const bucket = byAuthorYear.get(key);
      if (bucket) bucket.push(id);
      else byAuthorYear.set(key, [id]);
    }
    for (const ids of byAuthorYear.values()) {
      if (ids.length < 2) continue;
      const ordered = [...ids].sort((x, y) => {
        const cx = citationMap.get(x);
        const cy = citationMap.get(y);
        const byTitle = (cx?.title ?? '').localeCompare(cy?.title ?? '');
        return byTitle !== 0 ? byTitle : x.localeCompare(y);
      });
      ordered.forEach((id, i) => yearSuffixMap.set(id, letterSuffix(i)));
    }
  }

  // 3. Replace placeholders in the content.
  const makeCtx = (
    id: string,
    citation: Citation,
    mods: { page?: string; narrative?: boolean } = {},
  ): InTextContext => ({
    number: numberMap.get(id),
    surnames: getSurnames(citation),
    page: mods.page ?? page,
    narrative: mods.narrative,
    yearSuffix: yearSuffixMap.get(id),
  });

  const renderSingle = (match: string, id: string, rawMods?: string): string => {
    const citation = citationMap.get(id);
    if (!citation) {
      if (onMissing === 'remove') return '';
      return match;
    }
    return strategy.inText(citation, makeCtx(id, citation, parseCiteModifiers(rawMods)));
  };

  let compiledContent = content;

  // 3a. Group pass: merge runs of adjacent placeholders, e.g.
  //     [CITE:a][CITE:b] → "(Smith, 2020; Jones, 2021)" / "[1, 2]".
  //     Only formats that define `groupInText` participate. A run that
  //     contains an unknown id falls back to per-placeholder rendering so
  //     the `onMissing` behaviour is preserved exactly.
  if (groupAdjacent && strategy.groupInText) {
    compiledContent = compiledContent.replace(CITE_GROUP, (run) => {
      const matches = Array.from(run.matchAll(CITE_PLACEHOLDER));
      if (matches.some((m) => !citationMap.get(m[1] as string))) {
        return run.replace(CITE_PLACEHOLDER, renderSingle);
      }
      const items: GroupItem[] = matches.map((m) => {
        const id = m[1] as string;
        const citation = citationMap.get(id) as Citation;
        return { citation, ctx: makeCtx(id, citation, parseCiteModifiers(m[2])) };
      });
      return strategy.groupInText!(items);
    });
  }

  // 3b. Replace any remaining standalone placeholders.
  compiledContent = compiledContent.replace(CITE_PLACEHOLDER, renderSingle);

  // 4. Build the reference list
  const usedCitations: Citation[] = [];
  for (const id of usedOrder) {
    const citation = citationMap.get(id);
    if (citation) usedCitations.push(citation);
  }

  // 5. Sort: numbered formats keep insertion order; named formats use strategy.sort
  if (!strategy.numbered && strategy.sort) {
    usedCitations.sort(strategy.sort);
  }

  const references: string[] = usedCitations.map((c) => {
    const refCtx: ReferenceContext = {};
    const key = c.id ?? citationKey(c, 0);
    if (strategy.numbered) {
      refCtx.number = numberMap.get(key);
    }
    if (strategy.disambiguateYears) {
      refCtx.yearSuffix = yearSuffixMap.get(key);
    }
    return strategy.reference(c, refCtx);
  });

  return {
    content: compiledContent,
    references,
    numberMap: strategy.numbered ? numberMap : new Map(),
    usedIds: usedSet,
    missingIds: missing,
  };
}
