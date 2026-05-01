# Dependabot Upgrade Gotchas

**Discovered:** 2026-05-01
**Context:** Dependabot PRs #953 and #954 CI diagnosis
**Applies to:** Dependabot, Bun workspaces, CI

## Summary

Grouped Dependabot bumps can combine unrelated major upgrades, so broad CI failure usually needs dependency graph diagnosis before code changes.

## The Learning

When many jobs fail at once, inspect the first failing command in each job before treating the PR as generally broken. In #953, lint failed because ESLint 10 was installed while the Vue/React lint plugin stack was still ESLint 9-compatible. In #954, builds failed because AJV existed at two versions and `ajv-formats` types resolved against the wrong copy.

For grouped dependency PRs:

- Check whether the changed package is a direct dependency, peer dependency, or transitive dependency pulled by tooling.
- Keep major runtime/tooling families aligned within a single branch. For example, Expo SDK 55 dev tooling should not be accepted into a branch where the app runtime is still SDK 54.
- Treat CodeQL autobuild failures as secondary when they reproduce the normal workspace build failure.
- Regenerate `bun.lock` after any package metadata or patch change and re-run `bun install --frozen-lockfile`.

## Example

If Dependabot bumps `eslint` to a new major but shared lint plugins remain on the previous major compatibility line, pin ESLint to the latest compatible major and document the deferred major upgrade as manual work.

## Related

- `docs/learnings/typescript/declaration-build-tsconfig.md`
- `docs/golden-principles.md`
