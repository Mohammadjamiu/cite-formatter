# Changelog

All notable changes to `cite-formatter` are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 6 built-in formats: APA 7, IEEE, Chicago (Author-Date), MLA 9, Vancouver, Harvard
- `compileCitations()` with `numberMap` for continuous IEEE/Vancouver numbering
- `registerFormat()` / `unregisterFormat()` for custom house styles
- `toBibtex()` export
- CLI: `npx cite-formatter <input.md> <citations.json>`
- Author-name utilities: `extractSurname`, `toSurnameFirst`, `toInitialsFirst`, `getSurnames`, `byFirstSurname`
- Dual ESM + CJS build with full TypeScript types
- Vitest test suite covering all formats + edge cases

### Notes
- Extracted and improved from `nigerian_fyp_generator/lib/citations/compiler.ts`.
- The original module is MIT-compatible; this package is a clean re-implementation, not a copy.
