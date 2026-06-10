# Changelog

All notable changes to `cite-formatter` are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
