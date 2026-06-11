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
  /**
   * Combine several adjacent citations into a single in-text group, e.g.
   * `(Smith, 2020; Jones, 2021)` (APA) or `[1, 2]` / `[1]–[3]` (IEEE).
   *
   * Called by {@link compileCitations} when two or more `[CITE:id]`
   * placeholders sit next to each other (separated only by spaces and an
   * optional `;` or `,`). If a format does not define this, the compiler
   * falls back to rendering each placeholder separately via {@link inText}.
   */
  groupInText?: (items: GroupItem[]) => string;
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
  /**
   * Whether this format disambiguates same-author-same-year citations with
   * letter suffixes (`2020a`, `2020b`). When true, {@link compileCitations}
   * computes the suffixes and passes them to {@link inText} and
   * {@link reference} via `ctx.yearSuffix`. Author-date formats (APA,
   * Chicago, Harvard) set this; numbered and author-page formats do not.
   */
  disambiguateYears?: boolean;
}

/** One member of a grouped in-text citation. Passed to {@link FormatStrategy.groupInText}. */
export interface GroupItem {
  /** The resolved citation. */
  citation: Citation;
  /** The same context {@link FormatStrategy.inText} would receive for this citation. */
  ctx: InTextContext;
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
  /**
   * Letter suffix that disambiguates same-author-same-year citations,
   * e.g. `'a'` → `(Smith, 2020a)`. Populated only for formats with
   * `disambiguateYears`. Empty/undefined when no clash exists.
   */
  yearSuffix?: string;
}

/** Context passed to reference-list formatters. */
export interface ReferenceContext {
  /** The 1-based number for this entry (numbered formats only). */
  number?: number;
  /**
   * Letter suffix that disambiguates same-author-same-year citations,
   * e.g. `'a'` → `Smith, J. (2020a). ...`. Populated only for formats with
   * `disambiguateYears`.
   */
  yearSuffix?: string;
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
   * Default page number injected into every in-text citation, e.g.
   * "(Smith, 2020, p. 12)". Honoured by APA, Chicago, Harvard, and MLA
   * (numbered formats ignore it). For per-citation pages, use the
   * `[CITE:id|p=42]` placeholder modifier, which overrides this.
   */
  page?: string;
  /**
   * Merge adjacent in-text citations into one group after compilation.
   * APA: semicolon-separated; IEEE: comma / en-dash ranges; Vancouver: same in parentheses.
   * @default true
   */
  groupAdjacent?: boolean;
}
