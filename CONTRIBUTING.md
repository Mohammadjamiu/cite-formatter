# Contributing to cite-formatter

Thanks for your interest in improving `cite-formatter`. This document
covers how to set up the project locally, run the tests, and submit
changes.

## Setup

```bash
git clone https://github.com/Mohammadjamiu/cite-formatter.git
cd cite-formatter
npm install
```

Requires Node.js >= 18. The CI runs on Node 20.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run build` | Bundle ESM + CJS + `.d.ts` to `dist/` via tsup |
| `npm test` | Run all tests once via vitest |
| `npm run test:watch` | Watch mode for tests |
| `npm run typecheck` | Run `tsc --noEmit` against the full source tree |
| `npm run lint` | Lint `src/` and `tests/` with eslint |
| `npm run format` | Format `src/` and `tests/` with prettier |

CI runs `lint`, `typecheck`, `test`, and `build` on every push and PR.
All four must pass before merge.

## Project structure

Read [`docs/UNDERSTANDING.md`](./docs/UNDERSTANDING.md) first. It walks
through the codebase file by file, explains the architecture, and lists
the design decisions. The short version:

- `src/compile.ts` — public entry point. `compileCitations()` is the
  only function most consumers ever call.
- `src/types.ts` — public types: `Citation`, `CompileOptions`,
  `CompileResult`, `FormatStrategy`.
- `src/formats/` — one file per built-in citation style. Each exports
  a `FormatStrategy` object.
- `src/utils/` — author-name parsing and placeholder utilities.
- `tests/` — mirrors the source structure. One file per format plus
  edge cases.

## Adding a new built-in format

1. Create `src/formats/yourformat.ts` exporting a `FormatStrategy`.
2. Add it to the registry in `src/formats/index.ts`.
3. Add the id to `FormatId` in `src/types.ts`.
4. Add a test file `tests/yourformat.test.ts`. Look at the existing
   test files for the conventions.
5. Add a per-format section to `docs/FORMATS.md`.
6. Update the table in the README.

## Adding a new feature

Open an issue first. `cite-formatter` is intentionally small, and
scope creep is the main risk. A few questions to answer before
starting work:

- Does this belong in the core, or as a separate package?
- Does it preserve the zero-dependency promise?
- Does it require new fields on `Citation`? If yes, are they optional?
- Does it break any existing test?

## Submitting a pull request

1. Fork the repo.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Make your change with tests.
4. Run `npm run lint && npm run typecheck && npm test && npm run build`.
   All four must pass.
5. Push and open a PR. The CI will run the same four checks.
6. Wait for review. Be patient — this is a side project.

## Reporting a security issue

**Do not open a public issue.** See [`SECURITY.md`](./SECURITY.md) for
the disclosure process.

## Code of conduct

Be kind. Assume good faith. This is a small library; we can keep the
bar civil without a 30-page document.
