# Understanding `cite-formatter`

> A walkthrough for the package maintainer. Read this top-to-bottom
> and you should be able to answer any question a contributor, an
> npm reviewer, or a confused user throws at you.
>
> For how to *use* the package in your own code, see
> [`INTEGRATION.md`](./INTEGRATION.md). For format-specific rules,
> see [`FORMATS.md`](./FORMATS.md).

---

## Table of contents

1. [The problem this package solves](#the-problem-this-package-solves)
2. [The mental model in one paragraph](#the-mental-model-in-one-paragraph)
3. [The end-to-end flow](#the-end-to-end-flow)
4. [Repository tour](#repository-tour)
5. [Architecture decisions and tradeoffs](#architecture-decisions-and-tradeoffs)
6. [What was extracted from where](#what-was-extracted-from-where)
7. [Extending the package](#extending-the-package)
8. [FAQ](#faq)
9. [What this package is *not*](#what-this-package-is-not)

---

## The problem this package solves

LLMs (GPT, Claude, Gemini, Llama, Mistral, etc.) are **bad** at
producing correctly-formatted citations from memory. Concretely, when
you ask one to write a paragraph and "include APA citations", it will:

- Hallucinate authors that don't exist
- Get the year wrong (or invent a future year)
- Mangle the journal name
- Misformat the reference (e.g. `(Smith et al., 2020, J. Studies, pp 12-34)`)
- Forget to include the reference at all
- Include the reference but without an in-text citation

This is true even of the best models, because the training data
contains many citation styles (APA, IEEE, Chicago, MLA, Vancouver,
Harvard, Nature, Vancouver, AMA, ...) and the model has to pick
*one* consistently — which it cannot, because the format isn't in
its working memory at the moment of generation.

There are three common workarounds in production:

1. **"Just use BibTeX in the prompt"** — pass the model a BibTeX
   file and ask it to emit `\cite{key}`. This works, but BibTeX is
   heavy (the model often mangles fields, escapes, types) and ties
   you to LaTeX.

2. **"Generate the citation in the prompt"** — pass the model a
   structured list and ask it to write `(Author, Year)`. Fragile:
   the model will reformat or paraphrase.

3. **"Use a placeholder, post-process later"** — tell the model to
   emit `[CITE:smith2020]` and have a deterministic function expand
   each placeholder to the right format. **This is what
   `cite-formatter` does.**

The third approach is the one that survives in production. It works
because:

- The placeholder `[CITE:smith2020]` is a simple, structured token.
  LLMs are *excellent* at this — they'll emit it consistently if
  you give them a list of valid ids.
- The expansion is **deterministic** — given the same citation +
  format, you get the same string. No model involved.
- The expansion is **versionable** — if you change APA rules or
  fix a bug in your output, the change applies retroactively to
  every cached LLM output.

---

## The mental model in one paragraph

You (the app developer) own a list of citations that you've
collected by some trusted means (your own research pipeline, a
database, a user's Zotero library, etc.). You give the LLM that
list and ask it to emit `[CITE:id]` placeholders in its output.
After the LLM responds, you run the text through
`cite-formatter`, which replaces each placeholder with the
correct in-text citation for the format the user wants, and
emits a formatted reference list. The library has no knowledge
of LLMs — it doesn't care how the `[CITE:id]` tokens got there.

---

## The end-to-end flow

This is what happens in a real integration. It uses the FYP
generator as a worked example, but the same flow applies to any
app — essay generator, RAG chat, blog writer, research
assistant, citation manager, etc.

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. USER REQUEST                                                      │
│    "Write me a 1000-word essay on climate change impacts in Lagos"   │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. YOUR APP — CITATION COLLECTION                                   │
│    You need real citations. Some options:                            │
│      a) Your own research pipeline (Crossref + OpenAlex + arXiv)     │
│      b) A database (Postgres, Mongo, your cache)                     │
│      c) The user's own library (Zotero, Paperpile, etc.)             │
│      d) A paid API (Semantic Scholar, CORE, etc.)                   │
│                                                                      │
│    This produces:                                                    │
│      citations: Citation[] = [                                       │
│        { id: 'smith2020',  authors: [...], year: 2020, ... },        │
│        { id: 'jones2021',  authors: [...], year: 2021, ... },        │
│        { id: 'brown2022',  authors: [...], year: 2022, ... },        │
│        ...                                                           │
│      ]                                                               │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. YOUR APP — LLM CALL                                              │
│    System: "You are an essayist. For every claim that needs         │
│    support, emit a [CITE:id] placeholder using an id from the        │
│    list below. Do not invent ids. Do not write full citations."      │
│                                                                      │
│    User:  <the topic>                                                │
│    Context: <outline, chapter title, etc.>                           │
│    Citations: <the list from step 2, formatted as compact text>     │
│                                                                      │
│    LLM Response:                                                     │
│    "Climate change is reshaping Lagos [CITE:smith2020]. Recent        │
│     studies [CITE:jones2021] confirm this trend. See also            │
│     [CITE:brown2022] for a global comparison."                       │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. YOUR APP — POST-PROCESSING                                       │
│    Run the LLM output + the citation list through cite-formatter.    │
│                                                                      │
│    const { content, references } = compileCitations({                │
│      content: llmOutput,                                             │
│      citations,                                                      │
│      format: 'apa',  // or 'ieee', 'chicago', etc.                  │
│    });                                                               │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 5. YOUR APP — DISPLAY                                               │
│    content:    "Climate change is reshaping Lagos (Smith, 2020).     │
│                 Recent studies (Jones, 2021) confirm this trend.    │
│                 See also (Brown, 2022) for a global comparison."    │
│    references: ["Brown, A. (2022). ...",                              │
│                 "Jones, B. (2021). ...",                             │
│                 "Smith, J. (2020). ..."]                             │
│                                                                      │
│    Render however you want — markdown, React, Vue, HTML, PDF.        │
└──────────────────────────────────────────────────────────────────────┘
```

That's the entire concept. Everything else in the package is
implementation detail.

---

## Repository tour

A walk through every file and what it does. After this, you should
be able to navigate the codebase cold.

```
cite-formatter/
├── src/
│   ├── index.ts                  public API barrel — what users import
│   ├── compile.ts                THE main function. Walks the content,
│   │                             resolves ids, replaces placeholders,
│   │                             builds the reference list.
│   ├── types.ts                  Citation, FormatStrategy, CompileOptions,
│   │                             CompileResult, InTextContext,
│   │                             ReferenceContext. The shape of the API.
│   ├── registry.ts               re-exports from formats/index.js so
│   │                             `import { registerFormat }` works.
│   ├── bibtex.ts                 toBibtex() — converts a Citation[] to
│   │                             a BibTeX string. Side feature.
│   ├── formats/
│   │   ├── index.ts              Built-in format registry. Holds the
│   │   │                         Map<id, FormatStrategy>, exports
│   │   │                         resolveFormat() (internal) and the
│   │   │                         public registerFormat/unregisterFormat/
│   │   │                         getFormat/listFormats.
│   │   ├── apa.ts                APA 7th edition strategy.
│   │   ├── ieee.ts               IEEE strategy (numbered).
│   │   ├── chicago.ts            Chicago Author-Date 17th strategy.
│   │   ├── mla.ts                MLA 9th strategy.
│   │   ├── vancouver.ts          ICMJE Vancouver strategy (numbered).
│   │   └── harvard.ts            Harvard (Cite Them Right 12th) strategy.
│   └── utils/
│       ├── authors.ts            Pure functions for parsing author
│       │                         names. Used by the format strategies
│       │                         to build in-text citations and to
│       │                         sort the reference list. Exported
│       │                         so custom format authors can use them.
│       └── placeholders.ts       The [CITE:id] regex, citation key
│                                 resolution, DOI URL building, page
│                                 range normalisation. Also has
│                                 CITE_PLACEHOLDER exported for users
│                                 who want to count citations pre-flight.
├── tests/
│   ├── apa.test.ts               APA-specific assertions.
│   ├── ieee.test.ts              IEEE + the multi-chapter continuity test
│   │                             (the headline feature).
│   ├── chicago-mla-vancouver-harvard.test.ts  Other formats.
│   ├── edge-cases.test.ts        onMissing modes, custom registration,
│   │                             passing a FormatStrategy object directly.
│   ├── bibtex.test.ts            BibTeX export.
│   └── authors.test.ts           Author-name utilities.
├── bin/
│   └── cli.js                    The `cite-formatter` CLI. Read from a
│                                 .md file, read a citations.json, write
│                                 the compiled output. Supports
│                                 --number-map for multi-chapter IEEE.
├── examples/                     Runnable Node.js examples, one per
│                                 pattern (basic, multi-chapter,
│                                 custom-format, bibtex).
├── docs/
│   ├── UNDERSTANDING.md          This file.
│   ├── INTEGRATION.md            How to use the package in a real app.
│   └── FORMATS.md                Per-format reference.
├── dist/                         Build output (ESM + CJS + .d.ts).
│                                 Generated by `npm run build`.
├── package.json                  The npm manifest. The `exports` field
│                                 is critical — it controls what
│                                 `import { ... } from 'cite-formatter'`
│                                 resolves to.
├── tsup.config.ts                Build config. Three entries (index,
│                                 formats/index, bibtex), both ESM and
│                                 CJS, with .d.ts generation.
├── tsconfig.json                 TypeScript config. Strict mode is on;
│                                 `noUncheckedIndexedAccess` is on (this
│                                 is why we have a lot of `?? ''` and
│                                 `?? 0` fallbacks).
├── vitest.config.ts              Test runner config. Picks up *.test.ts
│                                 in tests/.
├── README.md                     Top-level docs. Links to the docs/
│                                 folder for deeper material.
├── CHANGELOG.md                  Release notes.
└── LICENSE                       MIT.
```

---

## Architecture decisions and tradeoffs

These are the choices that make this package what it is. If you
ever need to change one, understand the consequences first.

### 1. The `[CITE:id]` placeholder pattern (not BibTeX, not structured JSON)

**Decision:** `compileCitations` reads `[CITE:id]` regex match
groups from the input content. It does not support `\cite{key}` or
`<<cite:key>>` or `{{cite:key}}` etc.

**Why:**
- LLMs reliably emit `[CITE:id]`. They reliably mess up `\cite{key}`.
  Brackets are common in markdown; curly braces are not.
- It's easy to explain to a user.
- It's easy to strip from content if you want the original text
  back: just delete the regex match.

**Tradeoff:** if you want to embed citations in inline code
fences, the regex will not match inside backticks. This is by
design — your model should not be citing inside code anyway.

**Where to change it:** `src/utils/placeholders.ts`,
`CITE_PLACEHOLDER`.

### 2. Numbered formats carry state across calls

**Decision:** the `numberMap` parameter to `compileCitations`
carries number assignments from one call to the next. If you
compile a chapter in two halves (e.g. for streaming output), you
hand the `numberMap` from the first half into the second.

**Why:** IEEE requires continuous numbering across the entire
document, not per-section. The original FYP generator had a
months-long bug where `[4]` in chapter 2 referred to a different
paper than `[4]` in chapter 1 — because the number map reset on
every call. Fixing it required plumbing state.

**Tradeoff:** callers have to remember to pass the numberMap. If
they forget, numbering restarts. There's no way to enforce this
in the type system without making the API annoying (every
`compileCitations` call would have to take a numberMap).

**Where to change it:** `src/compile.ts`, lines around
`const numberMap = inputNumberMap ? new Map(inputNumberMap) : new Map();`.

### 3. Six built-in formats, not "all of them"

**Decision:** APA 7, IEEE, Chicago Author-Date, MLA 9, Vancouver,
Harvard. No AMA, no Nature, no ACS, no Australian Harvard, no
Bluebook.

**Why:** these six cover >95% of academic writing globally. Adding
more creates combinatorial maintenance burden (every bug fix has
to be applied to N formats). If you need a less-common style,
the right answer is `registerFormat()` to add it, not to bloat
the core.

**Tradeoff:** users in specific fields (medicine often wants AMA,
law wants Bluebook, chemistry wants ACS) will need to register
their own. This is acceptable because the registration API is
intentionally small and well-documented.

**Where to add a new built-in:** create a new file in
`src/formats/`, define the strategy, export it from
`src/formats/index.ts`, add to `builtInFormats`, add a test file
in `tests/`. That's it.

### 4. Pure functions, no I/O, no globals

**Decision:** `compileCitations` is synchronous, takes everything
it needs as arguments, and returns everything it produces. The
registry is a module-level `Map` but is pre-seeded from the
built-ins on first import. There is no `fs`, no `fetch`, no
`process` access anywhere in `src/`.

**Why:** testability, predictability, edge-runtime compatibility
(Deno, Bun, Cloudflare Workers, browser). Users can call
`compileCitations` from a server, a worker, a CLI, or a
client-side React component without changes.

**Tradeoff:** if you want to add a feature like "load citations
from a URL", that has to live in *your* code, not in this
package. The package is the formatter, not the fetcher.

### 5. The format strategy interface (`FormatStrategy`)

**Decision:** every format is a value of the same shape:
`{ id, label, inText, reference, sort?, numbered? }`. There is
no class hierarchy, no registration decorator, no plugin system.

**Why:** it makes the format author's job trivial. A complete
custom format is 10–20 lines of TypeScript. There's nothing to
import beyond `FormatStrategy` and `Citation` from the package
itself.

**Tradeoff:** if you want a format that depends on external state
(e.g. reading from a database of "approved citation styles per
university"), you'd have to capture that state in a closure when
you build the strategy object. That works but is unusual.

**Where to read it:** `src/types.ts`, the `FormatStrategy`
interface.

### 6. No CLI flags for advanced behaviour

**Decision:** the CLI supports `--format`, `--output`, `--bibtex`,
`--on-missing`, `--number-map`, `--write-number-map`. Nothing
else. No "config file", no "presets", no "templates".

**Why:** the CLI is a thin wrapper over the library. Anything
the CLI can do, the library can do — usually with more
flexibility. If a user needs a complex pipeline (read from
multiple sources, filter, transform, write to multiple outputs),
they should write a Node script that imports the library
directly. That's what `examples/` are for.

**Where to extend it:** `bin/cli.js`, the `main()` function and
`parseArgs()`.

### 7. Tests are behaviour-driven, not implementation-driven

**Decision:** every test asserts on the *output string*, not on
internal state or function calls. There are no mocks.

**Why:** the package's contract is the output. If you refactor
the internals and the tests still pass, you haven't broken
anything. If the tests pass but the output is wrong, the tests
are wrong.

**Tradeoff:** some failure modes (e.g. "this format sorts
correctly even with weird unicode") are hard to assert. The
current tests cover the common cases. If a user reports a
regression on a specific citation, the fix is a new test that
fails on the old code and passes on the new.

---

## What was extracted from where

This package was extracted from a larger project
(`nigerian_fyp_generator`). The original file was
`lib/citations/compiler.ts` — about 150 lines that did APA and
IEEE. Here is what changed during extraction and why.

| Original | Now | Why |
|----------|-----|-----|
| Only APA + IEEE | + 4 more formats | Coverage. The original only needed APA and IEEE for Nigerian university reports; the package is for everyone. |
| In-text + reference as a single function | Split into `inText` and `reference` per format | Each format's in-text rules differ from its reference rules. Splitting lets you write a custom format that overrides one but not the other. |
| `preBuiltNumberMap` parameter | Renamed to `numberMap` | `preBuiltNumberMap` is the name from inside the FYP generator. As a public API, `numberMap` is clearer. |
| Authors not normalised on import | `toSurnameFirst`, `toInitialsFirst`, `extractSurname` utilities | The original assumed the input was always in `"Smith, J."` form. Real-world data has both forms; the utilities handle both. |
| DOI not rendered as a link | DOI rendered as `https://doi.org/...` | Most style guides now require the clickable link form. |
| `et al.` at 6+ in APA | `et al.` at 3+ in APA | APA 7 (2019) changed this rule. The original used the APA 6 rule. |
| 7+ authors truncated | 21+ authors use the explicit 19 + ellipsis + last rule | APA 7 introduced a specific truncation rule for ≥21 authors. |
| `onMissing` not configurable | `onMissing: 'keep' \| 'remove' \| 'throw'` | The original would silently emit `[CITE:unknown]` for any missing id. Users need to be able to opt into a strict mode. |
| No `page` suffix | `page` option on `compileCitations` | The original had no way to inject page numbers like `(Smith, 2020, p. 12)`. The format strategies now support it. |
| No `registerFormat` | `registerFormat`, `unregisterFormat`, `getFormat`, `listFormats` | The original had no extensibility story. Now you can add a custom house style. |
| No tests | 45 vitest tests, all passing | The original was tested by running the production app. Not great. |
| `md` to single file `compiler.ts` | Split into `formats/{apa,ieee,…}.ts` | Each format is now self-contained, ~50–100 lines, easy to read and modify. |
| No CLI | `bin/cli.js` | The CLI is a useful distribution channel — people who don't use Node can still get value. |
| TS source, no build step | Built ESM + CJS + `.d.ts` via tsup | npm consumers want both formats; tsup produces both with one config. |
| No `BibTeX` export | `toBibtex()` | The original generated Word documents, not BibTeX. A standalone BibTeX export was an easy add. |

The architecture intent: the original code is now a thin
*user* of this package. The FYP generator's `compiler.ts` was
deleted and replaced with `import { compileCitations } from
'cite-formatter'`. If you maintain that project, the migration
is a one-line import change.

---

## Extending the package

### Add a new built-in format

1. Create `src/formats/your-format.ts`. Export a `FormatStrategy`.
2. Add the export to `src/formats/index.ts` and to `builtInFormats`.
3. Add a test file `tests/your-format.test.ts`.
4. Update `docs/FORMATS.md` with the rules.

### Add a new citation field

1. Add the field to `Citation` in `src/types.ts`.
2. Update the format strategies to use it (only the ones that
   support it — others can ignore it).
3. If the field is required for some formats, document it on the
   format's strategy.
4. Update `docs/INTEGRATION.md` to mention the new field.

### Add a CLI flag

1. Update `parseArgs()` in `bin/cli.js` to recognise the flag.
2. Update the `main()` body to use it.
3. Update `printHelp()` to document it.

### Add a new export path

1. Add the new entry to `tsup.config.ts`'s `entry` object.
2. Add the new path to the `exports` field in `package.json`.
3. Add a re-export in `src/index.ts` if users should get it by
   default.

---

## FAQ

### Why don't I just use BibTeX in the prompt?

You can, but the model will mangle the escaping, the entry types,
and the keys. Post-processing is harder because BibTeX has many
edge cases. The `[CITE:id]` pattern is intentionally dumber so
the model can produce it reliably and you can process it
reliably.

### Why don't I just use the LLM to format citations?

You can, but it will be inconsistent. Even GPT-4 will mix APA
and IEEE in the same essay. The model is sampling from a
distribution of styles, not a deterministic function. This
package *is* a deterministic function.

### Why not just generate BibTeX from the model's structured output?

That works! Some teams do exactly this. They have the LLM
output JSON like `{"citations": [{"id": "x", "in_text": "(X, 2020)", "ref": "..."}]}`,
then post-process. That's a valid pattern, but it requires the
model to be very good at structured output. The placeholder
pattern is more forgiving.

### What if the LLM invents an id?

It happens. The default behaviour is to leave the placeholder
in the output (you can spot it visually). Set `onMissing: 'throw'`
in development to catch this immediately, or `onMissing: 'remove'`
in production if you want a cleaner output.

### What if the LLM uses the wrong id format, like `[CITE: Smith 2020]`?

The regex requires `[CITE:id]` with no spaces. If the model emits
`[CITE: Smith 2020]`, the placeholder won't match, and the text
will pass through unchanged. The fix is in the prompt: tell the
model that ids are lowercase, no spaces, alphanumerics only.

### How do I render the output as HTML instead of markdown?

The format strategies render italics as `*...*` (markdown). To
convert:

```ts
function mdToHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
```

Or, better, change the format strategies to use `<em>` directly.
This is a one-line change per format. The package author chose
markdown because it's the most common interchange format.

### Does this work in the browser?

Yes. `compileCitations` is pure, no I/O. You can ship it in a
client-side bundle and call it from React, Vue, Svelte, etc.

### Does this work in Deno / Bun?

Yes. The package ships ESM and CJS. The package has no Node-
specific APIs (no `fs`, no `path`).

### What's the bundle size?

About 22 KB minified (ESM), most of which is the format
strategies. If you only need one format, you can import it
directly: `import { ieeeStrategy } from 'cite-formatter/formats'`.

### Why isn't there a default export?

Named exports are easier to tree-shake. A bundler will drop every
format you don't import.

### Can I use this with non-Latin scripts?

Yes, with caveats. The author utilities use a simple heuristic
for the particle check (`de`, `van`, `von`, …) which only
handles Latin-script names. For Arabic or CJK author names, the
particle check is a no-op, which is the correct behaviour. The
page-range formatter uses en-dash `–`, which renders correctly in
all scripts.

### What about pre-prints vs published versions?

The `Citation` type doesn't model this. If you need to, you can
add fields to your own extension of the type:

```ts
type RichCitation = Citation & {
  published?: Citation;
  preprintId?: string;
};
```

Or use the `url` field to point to the version you want
referenced.

---

## What this package is *not*

It's important to be clear about scope, both for users and for
contributors.

- **It's not a citation fetcher.** It doesn't search Crossref,
  OpenAlex, or arXiv. Use a different package (or the FYP
  generator's `lib/citations/` module) for that.

- **It's not a citation parser.** It doesn't read BibTeX, RIS,
  or EndNote files. If you have a `.bib` file, parse it with
  `bibtex-parse-js` or similar, then pass the result to
  `compileCitations` as a `Citation[]`.

- **It's not a citation validator.** It doesn't check that the
  DOI resolves, that the page range is plausible, or that the
  author names are real.

- **It's not a writing tool.** It doesn't help you write the
  essay. It only formats the citations the LLM (or you) emit.

- **It's not a layout engine.** It produces text, not DOCX or
  PDF. For Word output, use the FYP generator's `lib/export/docx.ts`
  which consumes `compileCitations` output.

If a user asks you "can this package do X?", check the list
above. If X is not on the list, the answer is "this package can
format whatever you give it, but you need a different tool to
produce the input."
