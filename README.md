# cite-formatter

[![npm version](https://img.shields.io/npm/v/cite-formatter.svg)](https://www.npmjs.com/package/cite-formatter)
[![npm downloads](https://img.shields.io/npm/dm/cite-formatter.svg)](https://www.npmjs.com/package/cite-formatter)
[![CI](https://github.com/Mohammadjamiu/cite-formatter/actions/workflows/ci.yml/badge.svg)](https://github.com/Mohammadjamiu/cite-formatter/actions)
[![License: MIT](https://img.shields.io/npm/l/cite-formatter.svg)](https://github.com/Mohammadjamiu/cite-formatter/blob/main/LICENSE)

> Compile `[CITE:id]` placeholders to APA, IEEE, Chicago, MLA, Vancouver, or Harvard. Continuous numbering across chapters. Zero dependencies.

```ts
import { compileCitations } from 'cite-formatter';

const { content, references } = compileCitations({
  content: 'Studies show [CITE:smith2020] that this works.',
  citations: [
    { id: 'smith2020', authors: ['Smith, J. Q.'], year: 2020, title: 'A study', journal: 'Journal of Studies' },
  ],
  format: 'apa',
});
// content:    'Studies show (Smith, 2020) that this works.'
// references: ['Smith, J. Q. (2020). A study. *Journal of Studies*. https://doi.org/...']
```

## What is this for?

If you're building an AI writing tool (essay generator, RAG chat,
research assistant, citation manager), your model needs to cite
sources. But LLMs **hallucinate** when asked to produce a full
APA reference from scratch — they invent authors, misremember
years, and mangle journal names.

The fix: **separate citation generation from citation
formatting.** You collect the citations yourself (from a research
pipeline, a database, a user's library). You give the LLM a list
of valid ids and ask it to emit `[CITE:id]` placeholders. After
the LLM responds, you run the text through `cite-formatter` to
expand each placeholder into the right format.

LLMs reliably emit `[CITE:smith2020]`. They reliably fail at
`(Smith, J. Q. & Jones, A. B., 2020, J. Studies, 12(3), pp. 34-56)`.
Offload the formatting to a deterministic function.

## How it fits into your app

```
You collect citations  →  LLM emits [CITE:id]  →  cite-formatter expands
        ↑                                                    ↓
        └────────────── your research pipeline ─────────────┘
                            (not this package)
```

`cite-formatter` is the third box. The first two are your
responsibility.

## Why

If you're building an AI writing tool — essay generator, RAG chat, research assistant, academic slide deck — your model needs to emit citations. Most teams end up with one of three bad options:

1. **Plain `(Author, Year)` strings** in the prompt — fragile, inconsistent across chapters, breaks IEEE numbering
2. **BibTeX in the prompt** — heavy, easy for the model to mangle
3. **Post-processing the LLM output** with a fragile regex

`cite-formatter` is the third approach, done right: your model emits lightweight `[CITE:id]` placeholders, you pass a small `Citation[]` pool, and the library does the rest. The killer feature is **continuous IEEE numbering across multiple calls** — chapter 2 picks up numbering from chapter 1 without a single if-statement on your end.

## Features

- **6 built-in formats**: APA 7, IEEE, Chicago (Author-Date), MLA 9, Vancouver, Harvard
- **Adjacent citation merging** — `[CITE:a][CITE:b]` becomes `(A, 2020; B, 2021)` or `[1, 2]` automatically (v0.2.0+)
- **Continuous numbering** for IEEE / Vancouver across chapters or sections via `numberMap`
- **Grouped citations** — adjacent placeholders merge into one citation: `(Smith, 2020; Jones, 2021)`, `[1, 2]`, `[1–3]`
- **Placeholder modifiers** — `[CITE:id|p=42]` for pages, `[CITE:id|narrative]` for `Smith (2020)` subject form
- **Year disambiguation** — same author + year becomes `(Smith, 2020a)` / `(Smith, 2020b)` in APA/Chicago/Harvard
- **Custom format registration** — add your own house style at runtime
- **BibTeX export** — feed into pandoc / JabRef / Zotero
- **Page-suffix support** — per-citation `[CITE:id|p=42]` or a global `page` option
- **Missing-id diagnostics** — choose `keep`, `remove`, or `throw`
- **Deterministic output** — same input + same options = same output
- **Zero runtime dependencies** — pure TypeScript, no axios / no lodash / no nothing
- **Dual ESM + CJS** ships with full TypeScript types

## Install

```bash
npm install cite-formatter
```

## Documentation

| Document | What it covers |
|----------|----------------|
| [`docs/UNDERSTANDING.md`](./docs/UNDERSTANDING.md) | The maintainer's mental model. The full end-to-end flow, every file in the repo, design decisions, what was extracted from where. **Start here if you want to understand the project as a whole.** |
| [`docs/INTEGRATION.md`](./docs/INTEGRATION.md) | How to use the package in a real app. Five integration patterns (essay generator, RAG chat, multi-chapter, custom house style, citation fetcher), prompt templates, error handling, performance tips. |
| [`docs/FORMATS.md`](./docs/FORMATS.md) | Per-format reference. APA 7, IEEE, Chicago, MLA 9, Vancouver, Harvard — what each format requires, what the package handles, what it doesn't. |

## Quick start

### APA

```ts
import { compileCitations } from 'cite-formatter';

const r = compileCitations({
  content: 'It has been shown [CITE:smith2020] that Y, and this is widely accepted [CITE:jones2021].',
  citations: [
    { id: 'smith2020', authors: ['Smith, J. Q.'], year: 2020, title: 'A study', journal: 'Journal of X' },
    { id: 'jones2021', authors: ['Jones, A.', 'Brown, B.'], year: 2021, title: 'A meta-review', journal: 'Annual Reviews' },
  ],
  format: 'apa',
});
// r.content    === 'It has been shown (Smith, 2020) that Y, and this is widely accepted (Jones & Brown, 2021).'
// r.references === ['Jones, A., & Brown, B. (2021). A meta-review. *Annual Reviews*.', 'Smith, J. Q. (2020). A study. *Journal of X*.']
```

### Adjacent citations (multiple sources, same sentence)

Tell the model to chain placeholders — one id per bracket:

```ts
const r = compileCitations({
  content: 'Risks are documented [CITE:smith2020][CITE:jones2021].',
  citations: [smith, jones],
  format: 'apa',
});
// r.content === 'Risks are documented (Smith, 2020; Jones, 2021).'

const ieee = compileCitations({
  content: 'See also [CITE:b][CITE:a][CITE:c].', // order in text may vary
  citations: [a, b, c],
  format: 'ieee',
});
// ieee.content === 'See also [1]–[3].'   // sorted, consecutive → en-dash range
```

Merging runs automatically after compile (`groupAdjacent: true` by default). Disable with `groupAdjacent: false` if you need raw per-placeholder output. You can also call `mergeAdjacentCitations()` directly on already-compiled text.

### IEEE with continuous numbering across chapters

```ts
// Chapter 1
const ch1 = compileCitations({ content: 'A [CITE:a] and B [CITE:b].', citations, format: 'ieee' });
// ch1.content === 'A [1] and B [2].'
// ch1.references[0] === '[1] Smith, J., "A paper," ..., 2020.'
// ch1.references[1] === '[2] Jones, A., "B paper," ..., 2021.'

// Chapter 2 — picks up at [3]
const ch2 = compileCitations({
  content: 'We revisit A [CITE:a] and add C [CITE:c].',
  citations,
  format: 'ieee',
  numberMap: ch1.numberMap,
});
// ch2.content === 'We revisit A [1] and add C [3].'
// ch2.references[0] === '[1] Smith, J., "A paper," ..., 2020.'  // re-numbered, not new
// ch2.references[1] === '[3] Doe, R., "C paper," ..., 2019.'
```

### Chicago / MLA / Vancouver / Harvard

```ts
compileCitations({ content, citations, format: 'chicago' }); // (Smith 2020) ... "Title." *Journal* 5 (2): 12–20.
compileCitations({ content, citations, format: 'mla' });      // (Smith 15) ... "Title." *Journal*, vol. 5, 2020, pp. 12–20.
compileCitations({ content, citations, format: 'vancouver' });// (1) ... Title. Journal. 2020;5(2):12–20.
compileCitations({ content, citations, format: 'harvard' });  // (Smith, 2020) ... 'Title', *Journal*, 5(2), pp. 12–20.
```

### Page numbers

```ts
compileCitations({
  content: '...as Smith argued [CITE:smith2020].',
  citations,
  format: 'apa',
  page: '42',
});
// "...as Smith argued (Smith, 2020, p. 42)."
```

### Custom format

```ts
import { compileCitations, registerFormat, type FormatStrategy } from 'cite-formatter';

const house: FormatStrategy = {
  id: 'my-uni',
  label: 'My University House Style',
  inText: (c) => `[${c.authors[0]?.split(',')[0] ?? '?'} ${c.year}]`,
  reference: (c) => `${c.authors.join('; ')} (${c.year}). ${c.title}.`,
};

registerFormat(house);

compileCitations({ content, citations, format: 'my-uni' });
```

### Missing-id handling

```ts
compileCitations({ content: 'Hello [CITE:missing]', citations: [], format: 'apa' });
// → { content: 'Hello [CITE:missing]', missingIds: ['missing'], ... }

compileCitations({ content: 'Hello [CITE:missing]', citations: [], format: 'apa', onMissing: 'remove' });
// → { content: 'Hello ', missingIds: ['missing'], ... }

compileCitations({ content: 'Hello [CITE:missing]', citations: [], format: 'apa', onMissing: 'throw' });
// → throws Error: Unknown citation ids: missing.
```

### BibTeX export

```ts
import { toBibtex } from 'cite-formatter';

console.log(toBibtex(citations));
// @article{smithj2020a,
//   author = {Smith, J. Q.},
//   title = {A study},
//   year = {2020},
//   journal = {Journal of Studies},
//   ...
// }
```

## CLI

```bash
npx cite-formatter paper.md citations.json --format ieee --output paper.out.md
npx cite-formatter paper.md citations.json --bibtex > refs.bib
npx cite-formatter chapter2.md citations.json --format ieee --number-map ch1-map.json --write-number-map ch2-map.json
```

`citations.json` is an array of `Citation` objects (same shape as the TypeScript type).

## API

### `compileCitations(options) → CompileResult`

```ts
interface CompileOptions {
  content: string;              // markdown/text with [CITE:id] placeholders
  citations: Citation[];        // the citation pool
  format: FormatId | FormatStrategy;
  numberMap?: Map<string, number>; // from a previous call (for continuous IEEE numbering)
  onMissing?: 'keep' | 'remove' | 'throw';  // default: 'keep'
  page?: string;                // optional page suffix
  groupAdjacent?: boolean;      // merge [CITE:a][CITE:b] groups; default: true
}

interface CompileResult {
  content: string;              // input with placeholders replaced
  references: string[];         // formatted reference list
  numberMap: Map<string, number>; // empty for non-numbered formats
  usedIds: Set<string>;         // ids that were actually cited
  missingIds: string[];         // ids referenced but not provided
}
```

Also exported: **`mergeAdjacentCitations(text, format)`** — standalone post-processor if you compile in multiple passes and still need grouping.

### `Citation`

```ts
interface Citation {
  id?: string;        // stable key the model emits; falls back to title
  authors: string[];  // "Smith, J. Q." or "Jane Q. Smith"
  year: number;
  title: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
}
```

### Format-specific rules

| Format | In-text style | Reference list order | Author handling |
|--------|---------------|----------------------|-----------------|
| APA 7 | `(Smith, 2020)` / `(Smith et al., 2020)` | Alphabetical by first surname | 1: surname / 2: & / 3+: et al. in text; full in refs; 21+ truncated to 19 + last |
| IEEE | `[1]`, `[2]`, `[1, 2]` | Numbered by first appearance | First author surname-first; "et al." after 6 |
| Chicago (Author-Date) | `(Smith 2020)` | Alphabetical | First author surname-first; "and" between; year after author |
| MLA 9 | `(Smith 15)` | Alphabetical | First author surname-first; "et al." for 3+; "vol., no., year, pp." |
| Vancouver | `(1)`, `(1, 2)` | Numbered by first appearance | All initials; "et al." after 6; NLM punctuation |
| Harvard | `(Smith, 2020)` | Alphabetical | Surname-first; "et al." after 3; single-quoted titles |

## Why this exists

If you're building an AI writing tool, your model needs to cite
sources. But LLMs **hallucinate** when asked to produce a full
APA reference from scratch — they invent authors, misremember
years, mangle journal names. Even when you ask for `(Author, Year)`
in the prompt, the output is uneven across calls. Numbered
formats like IEEE and Vancouver are especially fragile: chapter
2's `[1]` is almost never the same paper as chapter 1's `[1]`.

`cite-formatter` is built around a separation that works:

1. **You** collect citations (from a research pipeline, a
   database, or a user's library).
2. The **LLM** emits `[CITE:id]` placeholders. Models are very
   good at this — it's a simple token to copy from the prompt.
3. **`compileCitations()`** expands each placeholder
   deterministically. No LLM is involved at this step. The
   output is reproducible.

The killer feature is **continuous numbering across multiple
calls**. You thread a `numberMap` between chapters, and `[4]`
in chapter 2 refers to the same paper as `[4]` in chapter 1.
No state machine on your end.

If you find other edge cases, open an issue.

## Benchmarks

The library is pure synchronous code. On a 2021 M1 Pro, `compileCitations` processes:

- 10,000 placeholder replacements: ~3 ms
- 1,000 citations × 5 placeholder replacement each: ~25 ms

No async, no I/O, no allocation hot path. It will not become your bottleneck.

## License

MIT
