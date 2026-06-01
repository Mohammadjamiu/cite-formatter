# Security

If you discover a security vulnerability in `cite-formatter`, please
report it privately. **Do not open a public GitHub issue for security
problems.**

## How to report

Use GitHub's private vulnerability reporting:

1. Go to https://github.com/Mohammadjamiu/cite-formatter/security/advisories/new
2. Fill in the form with a description and reproduction steps
3. Submit

You can also email the maintainer at balogunmohammedjamiu@gmail.com
with the subject line starting with `[SECURITY] cite-formatter`.

## What to expect

- **Acknowledgement** within 72 hours
- **Initial assessment** within 7 days
- **Patch or disclosure timeline** negotiated based on severity

## Scope

`cite-formatter` is a pure-TypeScript library with **zero runtime
dependencies**. There is no network I/O, no filesystem access, no
shell execution. The attack surface is therefore very small:

- The placeholder regex in `src/utils/placeholders.ts` is intentionally
  simple (`/\[CITE:([a-zA-Z0-9_-]+)\]/g`). Crafted input could in
  theory cause issues if the regex were ever expanded without care.
- `eval`, `Function`, or any dynamic code execution: **none used**
- `child_process`, `fs`, `net`: **none used**

If you find a way to crash, hang, or extract information from
`compileCitations` with crafted input, that is a security issue.
