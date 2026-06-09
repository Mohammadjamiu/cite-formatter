/**
 * cite-formatter — public entry point.
 *
 * Zero-dependency library for compiling `[CITE:id]` placeholders
 * into APA, IEEE, Chicago, MLA, Vancouver, or Harvard citations
 * with continuous numbering across multiple calls.
 *
 * ## The placeholder pattern
 *
 * If you're building an AI writing tool (essay generator, RAG chat,
 * research assistant), your model needs to cite sources. But models
 * hallucinate when asked to produce a full APA reference from scratch:
 * they invent authors, misremember years, and confuse journals.
 *
 * The fix: **separate citation generation from citation formatting**.
 *
 * 1. You collect the citations yourself (from a research pipeline, a
 *    database, the user's library). They go into a `Citation[]` array.
 * 2. You give the LLM a list of valid ids and tell it to emit `[CITE:id]`
 *    placeholders wherever a citation is needed.
 * 3. The LLM responds with text containing `[CITE:smith2020]`.
 * 4. You pass the text + the citation array to `compileCitations()`.
 * 5. `cite-formatter` replaces each placeholder with the right format.
 *
 * Why this works: LLMs are excellent at following simple structural
 * instructions ("use this id from this list") and terrible at
 * producing formatted bibliographic strings from memory. Offload the
 * formatting to a deterministic function.
 *
 * @example Minimal end-to-end
 * ```ts
 * import { compileCitations } from 'cite-formatter';
 *
 * // 1. You collected this citation ahead of time (research pipeline, db, etc.)
 * const citations = [
 *   {
 *     id: 'smith2020',
 *     authors: ['Smith, J. Q.'],
 *     year: 2020,
 *     title: 'A study of things',
 *     journal: 'Journal of Studies',
 *     volume: '12',
 *     issue: '3',
 *     pages: '34-56',
 *     doi: '10.1234/abc',
 *   },
 * ];
 *
 * // 2. Your LLM was instructed to emit [CITE:id] placeholders.
 * //    It produced this:
 * const llmOutput = 'Studies show [CITE:smith2020] that this works.';
 *
 * // 3. Run it through cite-formatter.
 * const { content, references } = compileCitations({
 *   content: llmOutput,
 *   citations,
 *   format: 'apa',
 * });
 *
 * // content:    'Studies show (Smith, 2020) that this works.'
 * // references: ['Smith, J. Q. (2020). A study of things. *Journal of Studies*, *12*(3), 34–56. https://doi.org/10.1234/abc']
 * ```
 */

export { compileCitations } from './compile.js';
export { mergeAdjacentCitations } from './utils/merge-adjacent.js';
export { toBibtex } from './bibtex.js';
export {
  registerFormat,
  unregisterFormat,
  getFormat,
  listFormats,
} from './registry.js';

export { builtInFormats, resolveFormat } from './formats/index.js';
export {
  apaStrategy,
  ieeeStrategy,
  chicagoStrategy,
  mlaStrategy,
  vancouverStrategy,
  harvardStrategy,
} from './formats/index.js';

export type {
  Citation,
  FormatId,
  FormatStrategy,
  InTextContext,
  ReferenceContext,
  CompileOptions,
  CompileResult,
} from './types.js';

// Author-name utilities — useful if you're building a custom format.
export {
  extractSurname,
  isCommaForm,
  toSurnameFirst,
  toInitialsFirst,
  getSurnames,
  byFirstSurname,
} from './utils/authors.js';
