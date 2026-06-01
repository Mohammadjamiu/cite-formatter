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
  InTextContext,
  ReferenceContext,
} from './types.js';
import { resolveFormat } from './formats/index.js';
import { buildCitationMap, CITE_PLACEHOLDER, citationKey } from './utils/placeholders.js';
import { getSurnames } from './utils/authors.js';

export function compileCitations(options: CompileOptions): CompileResult {
  const {
    content,
    citations,
    format,
    numberMap: inputNumberMap,
    onMissing = 'keep',
    page,
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

  // 3. Replace placeholders in the content
  const compiledContent = content.replace(CITE_PLACEHOLDER, (match, id: string) => {
    const citation = citationMap.get(id);
    if (!citation) {
      if (onMissing === 'remove') return '';
      return match;
    }
    const ctx: InTextContext = {
      number: numberMap.get(id),
      surnames: getSurnames(citation),
      page,
    };
    return strategy.inText(citation, ctx);
  });

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
    if (strategy.numbered) {
      const key = c.id ?? citationKey(c, 0);
      refCtx.number = numberMap.get(key);
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
