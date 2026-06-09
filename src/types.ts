/**
 * A single citation, the input shape every format accepts.
 *
 * `id` is the key your AI emits inside `[CITE:id]`. If omitted, the
 * title is used as the key. Authors can be in either display form:
 *   - "Last, F. M." (comma-form) — preferred, no ambiguity
 *   - "First M. Last" (natural form) — converted automatically
 *
 * @example
 * ```ts
 * const c: Citation = {
 *   id: 'smith2020',
 *   authors: ['Smith, J. Q.', 'Jones, A. B.'],
 *   year: 2020,
 *   title: 'A study of things',
 *   journal: 'Journal of Studies',
 *   volume: '12',
 *   issue: '3',
 *   pages: '34-56',
 *   doi: '10.1234/abc',
 * };
 * ```
 */
export interface Citation {
  /** Stable identifier emitted by your model. Optional. */
  id?: string;
  /** Authors in display order. May be raw "Jane Q. Smith" or already "Smith, J.". */
  authors: string[];
  /** Four-digit year. Falls back to current year. */
  year: number;
  /** Title of the work (article, paper, chapter, book). */
  title: string;
  /** Journal or book title. Optional. */
  journal?: string;
  /** Volume number. Optional. */
  volume?: string;
  /** Issue number. Optional. */
  issue?: string;
  /** Page range, e.g. "12-34". Optional. */
  pages?: string;
  /** Publisher (books, theses). Optional. */
  publisher?: string;
  /** DOI without "https://doi.org/" prefix. Optional. */
  doi?: string;
  /** URL. Optional. */
  url?: string;
}

/** Identifier of one of the built-in formats, or any custom name registered via {@link registerFormat}. */
export type FormatId = string;

/** Result of a single compile call. */
export interface CompileResult {
  /** Content with all `[CITE:...]` placeholders replaced (or left intact if unknown). */
  content: string;
  /** Formatted reference list, in the order the format dictates. */
  references: string[];
  /** Map of citation id → assigned number, populated for numbered formats. */
  numberMap: Map<string, number>;
  /** Set of citation ids that were actually used in the content. */
  usedIds: Set<string>;
  /** Ids that were referenced in the content but not provided in `citations`. */
  missingIds: string[];
}

/**
 * A format strategy. Pure functions; no I/O.
 *
 * To use a built-in format, pass its id (`'apa'`, `'ieee'`, …) to
 * {@link compileCitations}. To add your own, call {@link registerFormat}
 * with an instance of this interface, or pass it directly.
 *
 * @example Minimal custom format
 * ```ts
 * const house: FormatStrategy = {
 *   id: 'house',
 *   label: 'House style',
 *   inText: (c) => `(${c.authors[0] ?? '?'} ${c.year})`,
 *   reference: (c) => `${c.authors[0] ?? '?'} -- ${c.title} (${c.year})`,
 * };
 * ```
 */
export interface FormatStrategy {
  /** In-text citation: `(Smith, 2020)` / `[1]` / `(Smith 2020)`. */
  inText: (citation: Citation, ctx: InTextContext) => string;
  /** Full reference entry. `index` is 1-based for numbered formats. */
  reference: (citation: Citation, ctx: ReferenceContext) => string;
  /** Sort comparator for the reference list, or `null` to keep insertion order. */
  sort?: (a: Citation, b: Citation) => number;
  /** Stable id used by {@link registerFormat}. */
  id: FormatId;
  /** Human-readable name, e.g. "APA 7th". */
  label: string;
  /** Whether the in-text citation is a number. */
  numbered?: boolean;
}

/** Context passed to in-text formatters. */
export interface InTextContext {
  /** The 1-based number assigned to this citation (numbered formats only). */
  number?: number;
  /** Cached author surnames (e.g. ["Smith", "Jones"]), already normalised. */
  surnames: string[];
  /** True if this is a narrative citation (subject position) vs parenthetical. */
  narrative?: boolean;
  /** Page number, e.g. "(Smith, 2020, p. 12)". Optional. */
  page?: string;
}

/** Context passed to reference-list formatters. */
export interface ReferenceContext {
  /** The 1-based number for this entry (numbered formats only). */
  number?: number;
}

/**
 * Options for {@link compileCitations}.
 *
 * @example Single chapter
 * ```ts
 * compileCitations({
 *   content: 'Studies show [CITE:smith2020] this works.',
 *   citations: [smith2020],
 *   format: 'apa',
 * });
 * ```
 *
 * @example Multi-chapter IEEE with continuous numbering
 * ```ts
 * const ch1 = compileCitations({ content: ch1md, citations, format: 'ieee' });
 * const ch2 = compileCitations({ content: ch2md, citations, format: 'ieee', numberMap: ch1.numberMap });
 * ```
 */
export interface CompileOptions {
  /** Content with `[CITE:id]` placeholders. */
  content: string;
  /** Citation pool. */
  citations: Citation[];
  /** Format id (built-in or registered) or a custom {@link FormatStrategy}. */
  format: FormatId | FormatStrategy;
  /**
   * Pre-existing number map for numbered formats. Use the `numberMap`
   * returned by a previous call to keep numbering continuous across
   * chapters or sections.
   */
  numberMap?: Map<string, number>;
  /**
   * How to handle `[CITE:id]` placeholders whose id is not in `citations`.
   * - "remove": strip the placeholder silently
   * - "keep":   leave the raw text in place
   * - "throw":  fail with an Error listing the missing ids
   * @default "keep"
   */
  onMissing?: 'remove' | 'keep' | 'throw';
  /**
   * Optional page number to inject into the in-text citation, e.g. "(Smith, 2020, p. 12)".
   * Only certain formats honour this (APA, Chicago, Harvard).
   */
  page?: string;
  /**
   * Merge adjacent in-text citations into one group after compilation.
   * APA: semicolon-separated; IEEE: comma / en-dash ranges; Vancouver: same in parentheses.
   * @default true
   */
  groupAdjacent?: boolean;
}
