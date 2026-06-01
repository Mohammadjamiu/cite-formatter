# Format reference

> Detailed per-format rules. Assumes you've read the
> [README](../README.md). For *how* to use the package, see
> [`INTEGRATION.md`](./INTEGRATION.md). For *why* the package
> works the way it does, see [`UNDERSTANDING.md`](./UNDERSTANDING.md).

---

## Contents

- [APA 7th edition](#apa-7th-edition)
- [IEEE](#ieee)
- [Chicago Author-Date 17th](#chicago-author-date-17th)
- [MLA 9th](#mla-9th)
- [Vancouver (ICMJE)](#vancouver-icmje)
- [Harvard (Cite Them Right 12th)](#harvard-cite-them-right-12th)
- [Which format to use](#which-format-to-use)
- [Extending a format](#extending-a-format)

---

## APA 7th edition

**Id:** `'apa'`
**Source:** Publication Manual of the American Psychological
Association, 7th edition (2019/2020).
**Sort order:** Alphabetical by first-author surname.
**Numbered:** No.

### In-text

| Authors | Parenthetical | Narrative |
|---------|---------------|-----------|
| 1       | `(Smith, 2020)` | `Smith (2020)` |
| 2       | `(Smith & Jones, 2020)` | `Smith and Jones (2020)` |
| 3+      | `(Smith et al., 2020)` | `Smith et al. (2020)` |

With page number: `(Smith, 2020, p. 42)`. Pass `page: '42'` in
`CompileOptions`.

**APA 7 changed the et al. rule from 6+ to 3+.** This is one of
the most-violated rules in academic writing; the package gets it
right.

### Reference list

**Authors:**
- 1 author: `Smith, J. Q.`
- 2 authors: `Smith, J. Q., & Jones, A. B.` (ampersand, not "and")
- 3–20 authors: list all, separated by commas, `&` before last
- 21+ authors: first 19, then `…`, then last author. (Per APA 7
  §9.3.)

**Article:** `Author, A. A. (Year). Title. *Journal*, *Volume*(Issue), pages. URL`
- Journal name: italics
- Volume: italics
- Issue: parentheses, not italic
- Pages: en-dash, not hyphen
- DOI: as `https://doi.org/...` link, not bare DOI

**Example output:**
```
Smith, J. Q. (2020). A study of things. *Journal of Studies*, *12*(3), 34–56. https://doi.org/10.1234/abc
```

### Edge cases handled

- ✓ DOI as link (`https://doi.org/...`)
- ✓ Page range normalisation (`34-56` → `34–56`)
- ✓ 21+ author truncation
- ✓ `et al.` at 3+ in-text, full list in reference
- ✓ Title case for journal, sentence case for article title (we
  do not auto-convert; trust the input)

### Not handled (limitations)

- No automatic title-case conversion for the article title. APA
  uses sentence case; if your input is in title case, the output
  will be too. Fix the input.
- No automatic journal abbreviation. If the journal is "Journal
  of the American Medical Association", that's what you'll get.
  Use the `journal` field to pre-abbreviate if needed.
- No handling of preprints vs published versions. Use two
  separate citations if you need to cite both.

---

## IEEE

**Id:** `'ieee'`
**Source:** IEEE Editorial Style Manual (latest revision).
**Sort order:** Order of first appearance.
**Numbered:** Yes.

### In-text

| Position | Output |
|----------|--------|
| Single | `[1]` |
| Multiple, same place | `[1]`, `[1, 2]`, `[1]–[3]` |
| Already cited | Same number as before |

The number is the order in which the citation *first* appears in
the content. Re-citing the same source reuses the number.

### Reference list

**Authors:**
- 1–6 authors: list all
- 7+ authors: first author followed by `et al.`
- First author: surname-first (`Smith, J. Q.`)
- Subsequent authors: natural order (`A. B. Jones`)

**Article:** `[1] A. B. Smith, "Title of paper," *Journal*, vol. X, no. Y, pp. 12–34, Year, doi: 10.x/y.`
- Article title: in quotes
- Journal name: italics
- `vol.` and `no.` literal, lowercase
- `pp.` literal, lowercase
- En-dash in page range
- DOI without the `https://doi.org/` prefix

**Example output:**
```
[1] Smith, J. Q., "A study of things," *Journal of Studies*, vol. 12, no. 3, pp. 34–56, 2020, doi: 10.1234/abc.
```

### Continuous numbering across calls

This is the package's headline feature. Pass the `numberMap`
from a previous call:

```ts
const ch1 = compileCitations({ content: ch1md, citations, format: 'ieee' });
const ch2 = compileCitations({
  content: ch2md,
  citations,
  format: 'ieee',
  numberMap: ch1.numberMap, // ← continues from ch1
});
```

If ch1 numbered A as `[1]` and B as `[2]`, then ch2 will number
A as `[1]` (re-used) and C as `[3]` (new). B won't appear in
ch2's reference list because B wasn't cited in ch2.

### Edge cases handled

- ✓ Reuse of numbers across chapters
- ✓ Reference list per-chapter only contains cited entries
- ✓ `et al.` at 7+ authors in the reference list
- ✓ DOI without the URL prefix
- ✓ Page range en-dash

### Not handled

- No automatic `vol.` / `no.` / `pp.` abbreviation. If you want
  the abbreviations, leave them out of the input fields.
- No handling of "in press" or "to be published" — pass an
  approximate year and adjust the title.

---

## Chicago Author-Date 17th

**Id:** `'chicago'`
**Source:** The Chicago Manual of Style, 17th edition (2017).
**Sort order:** Alphabetical by first-author surname.
**Numbered:** No.

Note: Chicago has two systems — Notes-Bibliography and
Author-Date. This package implements **Author-Date only**. The
NB system uses footnotes, which is a different architecture;
adding it would require new API surface.

### In-text

| Authors | Parenthetical | Narrative |
|---------|---------------|-----------|
| 1       | `(Smith 2020)` | `Smith (2020)` |
| 2       | `(Smith and Jones 2020)` | `Smith and Jones (2020)` |
| 3       | `(Smith, Jones, and Doe 2020)` | `Smith, Jones, and Doe (2020)` |
| 4+      | `(Smith et al. 2020)` | `Smith et al. (2020)` |

With page number: `(Smith 2020, 42)` or `(Smith 2020, p. 42)`
depending on the rule being followed. Pass `page: '42'`.

### Reference list

**Article:** `Smith, Jane Q. Year. "Title." *Journal* Volume (Issue): Pages. URL.`
- Year immediately after author (not at the end)
- Article title in quotes
- Journal name italic, volume plain
- No comma between volume and (issue)

**Example output:**
```
Smith, J. Q. 2020. "A study of things." *Journal of Studies* 12 (3): 34–56. https://doi.org/10.1234/abc.
```

### Edge cases handled

- ✓ Author name particles (van, de, von)
- ✓ Page range en-dash
- ✓ DOI as link

---

## MLA 9th

**Id:** `'mla'`
**Source:** MLA Handbook, 9th edition (2021).
**Sort order:** Alphabetical by first-author surname.
**Numbered:** No.

### In-text

| Authors | Output |
|---------|--------|
| 1       | `(Smith 12)` |
| 2       | `(Smith and Jones 12)` |
| 3+      | `(Smith et al. 12)` |

**Page number is required** when available. Pass `page: '12'`.
If you don't have a page number, the output will be `(Smith)`.
**Year is not used** in the in-text citation — that's
intentional per MLA 9.

### Reference list

**Article:** `Smith, Jane Q. "Title." *Journal*, vol. X, no. Y, Year, pp. 12–34.`
- Article title in quotes
- Journal name italic
- "vol.", "no.", "pp." literals
- Year in the middle (between journal info and pages)

**Example output:**
```
Smith, J. Q. "A study of things." *Journal of Studies*, vol. 12, no. 3, 2020, pp. 34–56.
```

### 3+ authors

`Smith, Jane Q., et al.` — only the first author is listed, with
"et al." at the end.

### Edge cases handled

- ✓ `et al.` for 3+ authors in both in-text and reference
- ✓ Page range en-dash
- ✓ DOI as link (if present; MLA doesn't always require it)

---

## Vancouver (ICMJE)

**Id:** `'vancouver'`
**Source:** ICMJE Recommendations (latest revision).
**Sort order:** Order of first appearance.
**Numbered:** Yes.

### In-text

| Position | Output |
|----------|--------|
| Single | `(1)` |
| Multiple, same place | `(1)`, `(1, 2)`, `(1–3)` |

### Reference list

**Article:** `1. Smith JQ, Jones JB. Title of paper. Journal. Year;Volume(Issue):Pages. doi:10.x/y.`
- Authors in natural order (initials last name no comma)
- No comma between journal name and year
- `;` between year and volume
- `:` between volume(issue) and pages
- DOI without `https://doi.org/`

**Example output:**
```
1. Smith, J. Q. A study of things. Journal of Studies. 2020;12(3):34–56. doi:10.1234/abc.
```

### 7+ authors

First 6 authors, then `et al.`

### Edge cases handled

- ✓ NLM-style punctuation (`. ` between fields, `;` before volume)
- ✓ DOI without URL prefix
- ✓ `et al.` for 7+ authors

### Not handled

- No automatic conversion to NLM journal abbreviations (e.g.
  "JAMA" for "Journal of the American Medical Association"). Use
  the `journal` field to pre-abbreviate.

---

## Harvard (Cite Them Right 12th)

**Id:** `'harvard'`
**Source:** Cite Them Right, 12th edition (Pears and Shields,
2022). Used in UK and Australian universities.
**Sort order:** Alphabetical by first-author surname.
**Numbered:** No.

Note: there are many "Harvard" variants. This implementation
follows Cite Them Right 12, the most common UK style. If your
university uses a different Harvard style, register a custom
format.

### In-text

| Authors | Parenthetical | Narrative |
|---------|---------------|-----------|
| 1       | `(Smith, 2020)` | `Smith (2020)` |
| 2       | `(Smith and Jones, 2020)` | `Smith and Jones (2020)` |
| 3+      | `(Smith et al., 2020)` | `Smith et al. (2020)` |

With page number: `(Smith, 2020, p. 42)`.

### Reference list

**Article:** `Smith, J. Q. and Jones, A. B. (2020) 'Title', *Journal*, 12(3), pp. 34–56. doi: 10.x/y.`
- Year in parentheses immediately after author
- Article title in single quotes
- Journal name italic
- `pp.` before pages
- DOI without `https://doi.org/`

**Example output:**
```
Smith, J. Q. and Jones, A. B. (2020) 'A study of things', *Journal of Studies*, 12(3), pp. 34–56. doi: 10.1234/abc.
```

### 4+ authors

First author, then `et al.`

---

## Which format to use

| Field | Format |
|-------|--------|
| Psychology, education, social sciences, nursing | APA |
| Engineering, computer science, electrical engineering | IEEE |
| History, arts, humanities (some) | Chicago Author-Date |
| Literature, languages, cultural studies | MLA |
| Medicine, life sciences, public health | Vancouver |
| UK / Australian universities (general) | Harvard |
| Law | Bluebook (not built-in; register a custom format) |
| Chemistry | ACS (not built-in) |
| Physics, astronomy | APS / AAS (not built-in) |

If your user is in a specific programme, ask. If they say
"IEEE" but they're in psychology, they're wrong — point them
to APA.

---

## Extending a format

The cleanest way to customise one of the built-in formats is to
register a new format that reuses the built-in's helpers:

```ts
import { apaStrategy, registerFormat, type FormatStrategy } from 'cite-formatter';

const apaWithDOIsAsBare: FormatStrategy = {
  ...apaStrategy,
  id: 'apa-bare-doi',
  label: 'APA 7 (bare DOI)',
  // Override the reference formatter
  reference: (c, ctx) => {
    const base = apaStrategy.reference(c, ctx);
    if (!c.doi) return base;
    // Replace the link form with the bare DOI
    return base.replace(/ https:\/\/doi\.org\//, ' doi: ');
  },
};

registerFormat(apaWithDOIsAsBare);
```

This pattern works for any built-in. Override `inText`,
`reference`, `sort`, or any combination.

If you find yourself overriding built-ins often, that's a signal
that a new built-in format is warranted. Open an issue.
