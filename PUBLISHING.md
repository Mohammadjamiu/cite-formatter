# Publishing a new version

This is the runbook for cutting a new release. It is written for the
project maintainer (`mohammadjamiu` on npm, `Mohammadjamiu` on GitHub),
but it doubles as documentation for any future maintainer.

If you are a contributor submitting a PR, you do not need to read this
file. CI handles tests. Merging is the maintainer's job.

## Pre-requisites (one-time setup)

1. **npm account** — https://www.npmjs.com/signup
2. **Two-factor authentication** — Account → Two Factor Authentication.
   Use an authenticator app (Authy, 1Password, Google Authenticator).
   **Do not use SMS.**
3. **Local login** — `npm login` (will ask for username, password, OTP)
4. **Verify** — `npm whoami` should print your username

## Per-release checklist

### 1. Update the CHANGELOG

Move the `[Unreleased]` section to a new versioned section with today's
date. Example:

```diff
-## [Unreleased]
+## [0.2.0] - 2026-07-15
```

Add a fresh empty `[Unreleased]` above it for the next cycle.

### 2. Bump the version

Pick the right semver bump:

| Change kind | Bump | Example |
|-------------|------|---------|
| Bug fix, no API change | patch | 0.1.0 → 0.1.1 |
| New feature, backward-compatible | minor | 0.1.0 → 0.2.0 |
| Breaking change | major (pre-1.0: minor) | 0.x.y → 0.(x+1).0 |

For 0.x packages (we are pre-1.0), **breaking changes also bump minor**
to signal to users that the API is still settling. Save `major` for
1.0.0.

Edit `package.json` manually, or:

```bash
npm version patch   # or minor / major
```

`npm version` also creates a git tag. Good.

### 3. Run the local sanity check

```bash
npm run typecheck
npm test
npm run build
npm pack
```

Inspect `cite-formatter-X.Y.Z.tgz` — should be ~30 KB, contain only:

- `dist/`
- `bin/`
- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `package.json`

The `files` field in `package.json` controls this. If you see `src/`,
`tests/`, `docs/`, or `examples/` in the tarball, something is wrong.

### 4. Push the version

```bash
git push origin main --follow-tags
```

`--follow-tags` pushes the tag created by `npm version`.

### 5. Publish to npm

**From your laptop (PowerShell / macOS / Linux):** provenance is **not**
available — npm needs an OIDC-capable CI provider (e.g. GitHub Actions).
If you pass `--provenance` locally, you get:

`Automatic provenance generation not supported for provider: null`

Use:

```bash
npm publish --access public
```

**From CI (optional, for provenance):** in a workflow that has `id-token: write`
and runs on a supported provider, you can use:

```bash
npm publish --provenance --access public
```

That attaches SLSA provenance linking the tarball to the git commit and CI run.

After changing metadata, run `npm pkg fix` once so `package.json` matches what
npm expects (repository URL form, `bin` paths).

### 6. Post-publish

- Visit https://www.npmjs.com/package/cite-formatter and check the page
  renders right (description, keywords, license, README)
- On GitHub: Releases → "Draft a new release" → choose the tag →
  paste the CHANGELOG entry as the body → "Publish release"
- Optionally tweet / blog about it

## Rolling back a bad release

You **cannot unpublish a package** once it has been out for 72 hours
or has dependents. To retract a bad release:

1. `npm unpublish cite-formatter@X.Y.Z --force` (within 72 hours and
   no dependents)
2. Or, the recommended approach: cut a patch release that fixes the
   bug, then deprecate the bad version:
   `npm deprecate cite-formatter@X.Y.Z "broken, use X.Y.Z+1"`

## Pre-1.0 caveats

We are on `0.x.y`. SemVer does not constrain the API; minor bumps
**can** be breaking. Stay on a minor version in your own code if
you depend on this:

```json
"cite-formatter": "^0.1.0"   // accepts 0.1.x, not 0.2.0
```

The first stable 1.0.0 is the "API is locked" signal. We are not
there yet.
