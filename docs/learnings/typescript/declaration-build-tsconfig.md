# Declaration Build Tsconfig

**Discovered:** 2026-05-01
**Context:** `openbadges-ui` Vitest 4 dependency upgrade in Dependabot PR #953
**Applies to:** TypeScript, package publishing, declaration emit

## Summary

Published declaration builds should use a build-specific tsconfig that includes only package source intended for consumers.

## The Learning

Do not use a broad development tsconfig for `tsc --emitDeclarationOnly` when that config includes tests, mocks, stories, or tooling files. Test files often import Node APIs, Vitest spy types, or local-only helpers. Those types are valid in the test environment but should not be part of published package declarations.

Prefer a `tsconfig.build.json` that extends the development config, includes package source, and excludes:

- `tests/**/*`
- `src/**/__tests__/**`
- `**/*.test.ts`
- `**/*.spec.ts`
- `src/**/*.mock.ts`
- stories and story files

Then run declaration emit with:

```bash
tsc -p tsconfig.build.json --emitDeclarationOnly
```

## Example

`openbadges-ui` keeps `tsconfig.json` useful for local type-checking and editor support, while `tsconfig.build.json` controls the published declaration surface.

## Related

- `docs/learnings/general/dependabot-upgrade-gotchas.md`
