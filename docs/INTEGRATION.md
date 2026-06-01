# Integrating `cite-formatter` into your app

> The practical guide. Assumes you've read the
> [README](../README.md) and the
> [conceptual walkthrough](./UNDERSTANDING.md).
> For format-specific rules (when does APA use `et al.`?),
> see [`FORMATS.md`](./FORMATS.md).

---

## Table of contents

1. [The 5-line integration](#the-5-line-integration)
2. [The full picture: 3 pieces you need](#the-full-picture-3-pieces-you-need)
3. [Pattern A — Essay generator with research pipeline](#pattern-a--essay-generator-with-research-pipeline)
4. [Pattern B — RAG chat that cites sources](#pattern-b--rag-chat-that-cites-sources)
5. [Pattern C — Multi-chapter document with continuous IEEE numbering](#pattern-c--multi-chapter-document-with-continuous-ieee-numbering)
6. [Pattern D — Custom house style](#pattern-d--custom-house-style)
7. [Pattern E — Build your own citation fetcher](#pattern-e--build-your-own-citation-fetcher)
8. [Prompt templates that work](#prompt-templates-that-work)
9. [Error handling](#error-handling)
10. [Performance tips](#performance-tips)
11. [The CLI in a build pipeline](#the-cli-in-a-build-pipeline)

---

## The 5-line integration

If you already have a string of content and a list of citations:

```ts
import { compileCitations } from 'cite-formatter';

const { content, references } = compileCitations({
  content: 'Studies show [CITE:smith2020] this works.',
  citations: [
    { id: 'smith2020', authors: ['Smith, J.'], year: 2020, title: 'A study' },
  ],
  format: 'apa',
});
```

That's it. `content` has the placeholder replaced, `references`
has the formatted bibliography.

---

## The full picture: 3 pieces you need

`cite-formatter` is the **third** piece. You'll likely need all three.

```
┌──────────────────────────────────────────────────────────┐
│  Piece 1: A citation fetcher (you build this)            │
│  Crossref, OpenAlex, your DB, your user's library, etc.  │
│  Produces: Citation[]                                    │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Piece 2: An LLM call (you build this)                   │
│  Sends the citations to the LLM, gets back text with     │
│  [CITE:id] placeholders.                                │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Piece 3: cite-formatter (this package)                  │
│  compileCitations() expands placeholders + builds the    │
│  reference list.                                         │
└──────────────────────────────────────────────────────────┘
```

The package only does piece 3. The first two are your
responsibility. This is intentional — they're tightly coupled
to your app's domain (what data sources do you have? what
LLM do you use? what's the UI?).

---

## Pattern A — Essay generator with research pipeline

This is the canonical use case. See also
`examples/multi-chapter.ts`.

```ts
import { compileCitations } from 'cite-formatter';
import { generateEssay, searchPapers } from './your-app';

// 1. User request
const topic = 'Climate change impacts in Lagos';

// 2. Fetch real citations (this is YOUR code — not in this package)
const citations = await searchPapers(topic, { limit: 15 });
// citations: [{ id: 'smith2020', authors: [...], year: 2020, ... }, ...]

// 3. Tell the LLM what to do
const prompt = `
You are writing a 1000-word essay on: ${topic}

You have access to these citations (use [CITE:id] placeholders):

${citations.map(c => `[CITE:${c.id}] ${c.authors[0]} (${c.year}) — ${c.title}`).join('\n')}

RULES:
- Use [CITE:id] wherever a claim needs support. Use only the ids above.
- Do not invent new ids.
- Do not write full citations like "(Smith, 2020)" — use the placeholder.
- Output the essay as plain markdown.
`.trim();

// 4. Call the LLM
const llmOutput = await generateEssay(prompt);
// llmOutput: "Climate change is reshaping Lagos [CITE:smith2020]. ..."

// 5. Expand the placeholders
const { content, references } = compileCitations({
  content: llmOutput,
  citations,
  format: 'apa', // or let the user pick
});

// 6. Display
return { essay: content, bibliography: references };
```

The key insight: step 3 puts the citation list *in the prompt*,
tells the model to use `[CITE:id]` placeholders, and forbids full
citations. This is the prompt engineering that makes everything
work.

---

## Pattern B — RAG chat that cites sources

For a chatbot that answers questions from a corpus and cites its
sources:

```ts
import { compileCitations } from 'cite-formatter';
import { search, chat } from './your-app';

async function answerWithCitations(question: string) {
  // 1. Find relevant chunks in your vector DB
  const chunks = await search(question, { topK: 5 });

  // 2. Build a citation per chunk. The id is stable per chunk.
  const citations = chunks.map((chunk, i) => ({
    id: `chunk${i}`,
    authors: [chunk.sourceAuthor],
    year: chunk.year,
    title: chunk.sourceTitle,
    journal: chunk.journal,
    doi: chunk.doi,
  }));

  // 3. Call the LLM with the chunks + citation instructions
  const prompt = `Answer this question using only the chunks below.
For every claim, emit a [CITE:chunkN] placeholder.

Question: ${question}

Chunks:
${chunks.map((c, i) => `[chunk${i}] ${c.text}`).join('\n\n')}`;

  const llmOutput = await chat(prompt);

  // 4. Format. The references list will only contain the chunks
  //    the LLM actually cited (because compileCitations tracks
  //    usedIds).
  const { content, references, usedIds } = compileCitations({
    content: llmOutput,
    citations,
    format: 'ieee',
  });

  return { answer: content, sources: references, usedChunkIds: usedIds };
}
```

`usedIds` is useful here — it tells you which chunks the model
actually cited, so you can highlight them in the UI.

---

## Pattern C — Multi-chapter document with continuous IEEE numbering

This is the headline feature. See also `examples/multi-chapter.ts`
and the CLI flag `--number-map`.

```ts
import { compileCitations, type Citation } from 'cite-formatter';

const citations: Citation[] = [/* ... */];

// Chapter 1
const ch1 = compileCitations({
  content: 'A [CITE:a] and B [CITE:b] are foundational.',
  citations,
  format: 'ieee',
});
// ch1.content: 'A [1] and B [2] are foundational.'
// ch1.numberMap: Map { a => 1, b => 2 }

// Chapter 2 — pick up the numbering
const ch2 = compileCitations({
  content: 'We revisit A [CITE:a] and add C [CITE:c].',
  citations,
  format: 'ieee',
  numberMap: ch1.numberMap, // ← the key line
});
// ch2.content: 'We revisit A [1] and add C [3].'
// ch2.numberMap: Map { a => 1, b => 2, c => 3 }

// Chapter 3 — and so on
const ch3 = compileCitations({
  content: 'A again [CITE:a], D [CITE:d], B [CITE:b].',
  citations,
  format: 'ieee',
  numberMap: ch2.numberMap,
});
// ch3.content: 'A again [1], D [4], B [2].'
```

The references list for each chapter only contains the citations
*actually used in that chapter*, in IEEE order:

```ts
ch1.references; // ['[1] Smith, J., ...', '[2] Jones, A., ...']
ch2.references; // ['[1] Smith, J., ...', '[3] Doe, R., ...']
ch3.references; // ['[1] Smith, J., ...', '[4] Lee, X., ...', '[2] Jones, A., ...']
```

To build a single document-wide bibliography, concatenate the
references lists and deduplicate by number.

---

## Pattern D — Custom house style

```ts
import { compileCitations, registerFormat, type FormatStrategy } from 'cite-formatter';

const unilagEngineering: FormatStrategy = {
  id: 'unilag-engineering',
  label: 'UNILAG Faculty of Engineering',
  inText: (c) => `[Ref. ${c.authors[0]?.split(',')[0] ?? '?'} ${c.year}]`,
  reference: (c) => `${c.authors.join('; ')} (${c.year}). "${c.title}."`,
};

registerFormat(unilagEngineering);

// Now use it like a built-in
compileCitations({
  content: 'See [CITE:smith2020].',
  citations: [smith2020],
  format: 'unilag-engineering',
});
```

The `id` becomes the format key. You can register as many as you
want. Built-ins cannot be overridden; call
`unregisterFormat('your-id')` first if you need to redefine one
of your own.

To see what's registered: `listFormats()`.

---

## Pattern E — Build your own citation fetcher

This is **not** part of this package. But here's a sketch so you
know what to build.

```ts
// lib/research.ts (your code, not in this package)
import type { Citation } from 'cite-formatter';

export async function searchPapers(query: string, opts: { limit?: number } = {}): Promise<Citation[]> {
  const limit = opts.limit ?? 15;
  const res = await fetch(
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${limit}`,
  );
  const data = await res.json();

  return data.results
    .filter((w: any) => w.doi && w.title && w.publication_year)
    .map((w: any): Citation => ({
      id: w.id || w.doi, // OpenAlex ids are stable
      authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean),
      year: w.publication_year,
      title: w.title ?? w.display_name,
      journal: w.primary_location?.source?.display_name,
      volume: w.biblio?.volume,
      issue: w.biblio?.issue,
      pages: w.biblio?.first_page && w.biblio?.last_page
        ? `${w.biblio.first_page}-${w.biblio.last_page}`
        : undefined,
      doi: w.doi?.replace(/^https?:\/\/(dx\.)?doi\.org\//, ''),
    }));
}
```

This is a starting point. Production code needs:

- DOI normalisation
- Author name normalisation (OpenAlex sometimes gives "Smith, J." and sometimes "J. Smith")
- Abstract backfilling (OpenAlex has abstracts; Crossref often doesn't)
- Crossref + arXiv fallbacks
- Rate-limit handling (Crossref's polite pool needs `mailto=` in the URL)
- Deduplication (same paper in two sources)

The FYP generator's `lib/citations/` has a production implementation
of all of this. You're welcome to copy it.

---

## Prompt templates that work

The single biggest variable in your integration is the prompt you
send the LLM. Here are the templates that have proven to work.

### Minimal (works for most LLMs)

```
You are an expert academic writer.

Write a paragraph about: <topic>

For every claim that needs support, emit a [CITE:id] placeholder
where `id` is from this list. Do not invent new ids. Do not write
full citations.

Citations:
<list of `[CITE:id] Author (Year) Title` lines>
```

### Stricter (for less reliable models)

```
You are an expert academic writer.

Write a paragraph about: <topic>

CRITICAL RULES:
1. Use [CITE:id] for every citation. The id must be lowercase
   alphanumeric, no spaces, exactly as listed below.
2. Use ONLY ids from the list below. Do not invent new ones.
3. Do not write full citations like "(Smith, 2020)" or "[1]".
   The placeholders will be expanded later.
4. If a claim has no matching citation, do not cite it.
5. Place the [CITE:id] immediately after the claim, before the
   period.

Available citations:
<list>
```

### Multi-chapter (IEEE with continuous numbering)

If you're generating chapters sequentially and the LLM has no
context of the previous chapter, you have two options:

1. **Pre-number the citations yourself.** Don't pass the
   citation list to the LLM. Instead, give the LLM the bib
   entries numbered: `[1] Smith, J. (2020) — "A study"`, `[2] Jones, A. (2021) — "..."`. Tell the LLM: "Use `[1]`, `[2]`, etc. directly. Do not use [CITE:id] placeholders." Then post-process to swap `[N]` for the right IEEE reference. (You'll need a small custom format for this.)

2. **Single mega-prompt.** Stuff all chapters into one LLM call
   so the model has full context. This works for short
   documents (~3 chapters) but degrades for long ones.

3. **Accept per-chapter restart.** Some style guides (none of the
   big six, but some house styles) actually allow IEEE-style
   numbering to restart per chapter. If your use case is fine
   with that, just don't pass `numberMap` between calls.

---

## Error handling

The package returns diagnostics instead of throwing for most
errors. Use them.

```ts
const { content, references, missingIds, usedIds } = compileCitations({
  content: llmOutput,
  citations,
  format: 'apa',
  onMissing: 'keep', // default
});

if (missingIds.length > 0) {
  console.warn(`LLM cited ${missingIds.length} unknown id(s):`, missingIds);
  // In production, you might:
  // - log to your error tracking
  // - retry the LLM call with stricter instructions
  // - show a banner in the UI
}
```

Three modes:

| Mode | Behaviour on missing id |
|------|------------------------|
| `'keep'` (default) | Leaves the placeholder in the output. You can spot it visually. |
| `'remove'` | Silently strips the placeholder. Clean output, but you lose signal. |
| `'throw'` | Throws an Error with the list of missing ids. Use in dev/CI. |

Recommendation: `'keep'` in production (you can warn), `'throw'`
in dev, `'remove'` if you really want a clean output and don't
care about the model's mistakes.

---

## Performance tips

The package is pure synchronous code. On a 2021 M1 Pro it processes:

- 10,000 placeholder replacements: ~3 ms
- 1,000 citations × 5 placeholder replacement each: ~25 ms

It's not your bottleneck. But if you do find it slow:

- **Reduce `citations` to only the ones the LLM was given.**
  If you have 10,000 citations in your database but only 15
  made it into the prompt, trim the array to those 15 before
  calling `compileCitations`. The function iterates the
  citation array once.
- **Reuse `citationMap`.** If you're calling `compileCitations`
  many times with the same citations array, build the map once
  and pass it in. (This requires a small refactor — not yet
  exposed in the public API. Open an issue if you need it.)
- **Sort your citations alphabetically before passing them.**
  APA, MLA, Chicago, Harvard all sort by first surname. The
  built-in `sort` comparator handles this in `O(n log n)`. If
  your citations are pre-sorted (e.g. from a database query
  that already orders by surname), the sort is a no-op.
- **Don't use `registerFormat` in a hot loop.** Format
  registration mutates a global Map. Do it once at startup.

---

## The CLI in a build pipeline

The CLI is for teams that don't want to write Node code. Common
integrations:

### Static site generator (Hugo, Jekyll, Eleventy)

```bash
# Pre-process every markdown file in content/
for f in content/**/*.md; do
  cite-formatter "$f" citations.json --format apa --output "${f%.md}.compiled.md"
done
```

### Pandoc pipeline

```bash
pandoc --citeproc --bibliography refs.bib paper.md -o paper.pdf
```

If you've already got a BibTeX file, use `toBibtex` via the CLI's
`--bibtex` mode to generate it from your citation list:

```bash
cite-formatter input.md citations.json --bibtex > refs.bib
pandoc --citeproc --bibliography refs.bib paper.md -o paper.pdf
```

### Multi-chapter book build

```bash
# Chapter 1 — write the initial number map
cite-formatter ch1.md refs.json -f ieee --write-number-map ch1-map.json -o ch1-out.md

# Chapter 2 — read the map, continue numbering
cite-formatter ch2.md refs.json -f ieee --number-map ch1-map.json -o ch2-out.md

# Chapter 3 — read ch2's map (ch2-map.json is also written if you want), continue
cite-formatter ch3.md refs.json -f ieee --number-map ch2-map.json -o ch3-out.md

# Concatenate the compiled outputs
cat ch1-out.md ch2-out.md ch3-out.md > book-compiled.md
```

### Watch mode (e.g. with `entr`)

```bash
ls content/*.md | entr -d cite-formatter /_ input.md citations.json --format ieee -o output.md
```

Or use `nodemon` on a small wrapper script if you want
filtering/logging.

---

## When not to use this package

- You need a full citation *manager* (store, deduplicate, sync
  with Zotero, export to Word, etc.). This is a formatter, not a
  manager.
- You need the LLM to *also* produce the citations (not just
  placeholders). Don't do this — models are bad at it. Use the
  pattern in [Pattern A](#pattern-a--essay-generator-with-research-pipeline).
- You need real-time citation insertion as the user types. This
  is a synchronous batch transform, not an editor. You could
  call it on every keystroke (it's fast enough), but the
  experience would be better with a debounce or an explicit
  "Format" button.
- You need to support 50+ citation styles. Register the common
  ones as custom formats and accept the maintenance burden.
