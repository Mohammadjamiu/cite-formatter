# Changelog

All notable changes to `cite-formatter` are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-06-11

### Fixed
- No longer crashes with "Cannot read properties of undefined (reading 'map')"
  when a citation is passed without an `authors` field (possible from plain-JS
  callers or database-sourced data). The surname fallback in APA, Chicago,
  Harvard, and MLA now treats missing `authors` as an empty list and renders
  `Anonymous`, matching the existing behaviour for empty author arrays.

## [0.3.0] - 2026-06-11

### Added
- **Placeholder modifiers.** `[CITE:id]` now accepts `|`-delimited options:
  - `[CITE:id|p=42]` — per-citation page (`page=`, `pp=`, `p:` also work),
    overriding the global `page` option. Different placeholders for the same
    source can carry different pages.
  - `[CITE:id|narrative]` (or `|n`) — narrative form, e.g. `Smith (2020)` /
    `Smith and Jones (2020)`. MLA renders `Smith (12)`; numbered formats keep
    `[1]`.
  - Combinable: `[CITE:id|narrative|p=42]`.
- **Same-author / same-year disambiguation.** APA, Chicago, and Harvard add
  letter suffixes (`2020a`, `2020b`) in-text *and* in the reference list when
  two distinct cited works share a first author and year. Suffixes are assigned
  by title order.
- `parseCiteModifiers()` helper and `CiteModifiers` type.
- `disambiguateYears` flag on `FormatStrategy`; `yearSuffix` on
  `InTextContext` / `ReferenceContext`.
- **Grouped in-text citations** are now produced inline during compilation via a
  `groupInText` strategy method (still gated by the `groupAdjacent` option,
  default `true`):
  - APA / Chicago / Harvard / MLA: `(Smith, 2020; Jones, 2021)` (alphabetised)
  - IEEE: `[1, 2]`, with 3+ consecutive numbers collapsed to `[1–3]`
  - Vancouver: `(1, 2)` / `(1–3)`
  Placeholders separated by words (`[CITE:a] and [CITE:b]`) or a line break are
  left as separate citations. A group containing an unknown id falls back to
  per-placeholder rendering, preserving `onMissing` behaviour.
- `groupInText` optional method on `FormatStrategy` and a `GroupItem` type, so
  custom formats can define their own grouping.
- `formatNumberRanges()` utility for numbered styles.

### Changed
- Adjacent-citation merging is now performed during the compile pass (via
  `groupInText`) rather than as a separate post-processing step. The standalone
  `mergeAdjacentCitations()` export is retained for backward compatibility.

## [0.2.1] - 2026-06-10

### Fixed
- Fixed an issue where duplicate citations were not properly removed during merging in some author-date formats.

### Changed
- Adjacent citation merging now **preserves the original citation order** specified by the user, while still deduplicating repetitions.
- Adjacent citation merging is now more robust: it handles optional commas and semicolons between tags (e.g., `[CITE:1], [CITE:2]` correctly merges).
- Optimized `mergeAuthorDateRuns` logic for better performance.

### Added
- Specific tests for adjacent citation merging across various separators.

## [0.2.0] - 2026-06-09

### Added
- Automatic merging of adjacent in-text citations after compilation (enabled by default via `groupAdjacent`)
- APA / Harvard / Chicago: `(A, 2020)(B, 2021)` → `(A, 2020; B, 2021)`
- IEEE: `[1][2]` → `[1, 2]`, `[5][4]` → `[4, 5]`, `[1][2][3]` → `[1]–[3]`, with deduplication
- Vancouver: `(1)(2)` → `(1, 2)` with the same range rules in parentheses
- Exported `mergeAdjacentCitations()` for standalone post-processing

## [0.1.0] - 2026-06-01

### Added
- 6 built-in formats: APA 7, IEEE, Chicago (Author-Date), MLA 9, Vancouver, Harvard
- `compileCitations()` with `numberMap` for continuous IEEE/Vancouver numbering
- `registerFormat()` / `unregisterFormat()` for custom house styles
- `toBibtex()` export
- CLI: `npx cite-formatter <input.md> <citations.json>`
- Author-name utilities: `extractSurname`, `toSurnameFirst`, `toInitialsFirst`, `getSurnames`, `byFirstSurname`
- Dual ESM + CJS build with full TypeScript types
- Vitest test suite covering all formats + edge cases
- Documentation: `docs/UNDERSTANDING.md`, `docs/INTEGRATION.md`, `docs/FORMATS.md`
- Examples: basic, multi-chapter, custom format, BibTeX export
