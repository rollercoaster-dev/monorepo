# Development Plan: Issue #869

## Issue Summary

**Title**: Mechanical enforcement: lint rules and docs freshness CI
**Type**: enhancement
**Complexity**: LARGE
**Estimated Lines**: ~600 lines

> Note: This is LARGE due to breadth (4 scope areas across 6+ files) but each individual change is straightforward. The work is additive — no refactoring of existing logic — and every scope area is independent. Could be split into 2 PRs (lint rules vs. CI job) if needed.

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [ ] Running `bun run lint` on the monorepo fails when a package under `packages/*` imports from `apps/*`
- [ ] Running `bun run lint` fails when `shared-config`, `design-tokens`, or `openbadges-types` import any workspace package
- [ ] Running `bun run lint` fails on `console.log(...)` or `console.debug(...)` in any `.ts` or `.vue` file outside of `*.test.ts` / `*.spec.ts`
- [ ] Running `bun run lint` fails on `.vue` component files not named in PascalCase (within `src/components/` directories)
- [ ] The CI pipeline includes a `docs-freshness` job that warns (does not fail) when a doc in `docs/index.md` has not been verified in 90+ days
- [ ] The docs freshness job runs on PRs and on a weekly schedule
- [ ] `docs/golden-principles.md` has all four enforced rules marked `lint-enforced` with the PR number
- [ ] `docs/index.md` exists with verification date metadata for tracked docs

## Dependencies

| Issue | Title                                       | Status                          | Type    |
| ----- | ------------------------------------------- | ------------------------------- | ------- |
| #868  | Architecture map and golden principles docs | Met (PR #874 merged 2026-03-25) | Blocker |

**Status**: All dependencies met.

## Objective

Add mechanical enforcement for four code-quality rules currently marked `doc-only` in `golden-principles.md`: import boundary violations between packages, file naming conventions (Vue PascalCase), structured logging (`console.*` ban), and docs freshness tracking via a scheduled CI job. The existing codebase is already compliant — these rules codify what the project already does correctly.

## Decisions

| ID  | Decision                                                                                                                                   | Alternatives Considered                                     | Rationale                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use ESLint `no-restricted-imports` for import boundary rules (not `eslint-plugin-import`)                                                  | `eslint-plugin-import/no-restricted-paths`, custom AST rule | `no-restricted-imports` is built-in, zero new dependencies, supports custom messages. Sufficient for package-to-package boundary rules.             |
| D2  | Use `vue/component-definition-name-casing` (already in shared-config) plus `vue/match-component-file-name` for PascalCase file enforcement | Custom rule, filename linting plugin                        | `vue/match-component-file-name` is part of `eslint-plugin-vue` which is already installed. No new deps.                                             |
| D3  | Promote `no-console` from `warn` to `error` in shared-config `base` and `vue` configs, with test file override                             | Per-package override in each ESLint config                  | Shared-config is the right layer — all consumers inherit the rule and only test configs opt out.                                                    |
| D4  | Docs freshness CI is a separate workflow file, not a job in `ci.yml`                                                                       | Add job to `ci.yml`                                         | Keeps freshness as a non-blocking, scheduled process distinct from the main CI gate. Easier to toggle independently.                                |
| D5  | `docs/index.md` uses a simple YAML frontmatter or a markdown table for verification dates                                                  | Dedicated JSON manifest, git log scraping                   | Markdown table in `docs/index.md` is human-editable, readable, and doesn't require tooling to update. The CI script parses it with grep/awk.        |
| D6  | Scope import boundary rules to `packages/*` internal imports only                                                                          | Also enforcing in `apps/*`                                  | Apps legitimately import from all packages. The layering rules only prohibit packages importing from apps and foundation packages importing upward. |

## Affected Areas

- `packages/shared-config/eslint.config.mjs`: Promote `no-console` to `error` (all methods); add `vue/match-component-file-name` to `vue` config
- `packages/shared-config/package.json`: No dependency changes needed (all rules use existing plugins)
- `packages/openbadges-types/eslint.config.mjs`: Add `no-restricted-imports` for boundary rules (must not import workspace packages)
- `packages/rd-logger/eslint.config.mjs` (create if absent): Same foundation-layer boundary rule
- `packages/design-tokens/eslint.config.mjs` (create if absent): Same foundation-layer boundary rule
- `packages/openbadges-core/eslint.config.mjs`: Add boundary rule (must not import from apps)
- `packages/openbadges-ui/eslint.config.mjs`: Add boundary rule (must not import from apps)
- `.github/workflows/docs-freshness.yml`: New workflow — warns on docs not verified in 90+ days
- `docs/index.md`: New file — index of tracked docs with last-verified dates
- `docs/golden-principles.md`: Update rules 1 and 5 status from `doc-only` to `lint-enforced`

## Implementation Plan

### Step 1: Promote `no-console` to error in shared-config

**Files**: `packages/shared-config/eslint.config.mjs`
**Commit**: `feat(config): promote no-console to error in shared ESLint config`
**Changes**:

- [ ] In `base` config: change `'no-console': ['warn', { allow: ['warn', 'error'] }]` to `'no-console': 'error'` (ban all console methods)
- [ ] In `vue` config: same change to `no-console`
- [ ] Add a new exported config object `test` (or document override pattern) that sets `'no-console': 'off'` so test configs can easily opt out
- [ ] Verify no existing `.ts` or `.vue` source files (non-test) use raw `console.*` — research confirms the codebase uses `rd-logger` aliases (`nlog`, `nerror`, `nwarn`) already, so no fixup needed

> Note: `openbadges-modular-server/eslint.config.mjs` already sets `'no-console': 'error'` locally. After this change, it inherits from shared-config and the local override becomes redundant (but harmless). No change needed there.

### Step 2: Add Vue file naming enforcement to shared-config

**Files**: `packages/shared-config/eslint.config.mjs`
**Commit**: `feat(config): enforce PascalCase Vue component file names`
**Changes**:

- [ ] Add `'vue/match-component-file-name': ['error', { extensions: ['vue'], shouldMatchCase: true }]` to the `vue` config's rules block
- [ ] Verify existing Vue component files in `packages/openbadges-ui/src/components/` are all PascalCase — confirmed: `BadgeClassCard.vue`, `AccessibilitySettings.vue`, etc. are compliant
- [ ] Verify `apps/openbadges-system/src/client/components/` — confirmed: `Auth/LoginForm.vue`, `Badge/BadgeCard.vue`, etc. are compliant
- [ ] Document in the rule comment that page files (`pages/**/*.vue`) use lowercase by vue-router convention and this rule targets `components/` only — configure `ignores` or path pattern if needed to exclude `pages/**`

> Note: `pages/**/*.vue` files (e.g., `admin/badges.vue`) are vue-router file-based routing artifacts. They intentionally use lowercase. The `vue/match-component-file-name` rule applies to component name vs. filename — pages typically don't declare a component name, so the rule will not trigger. Verify this assumption during implementation.

### Step 3: Add import boundary rules for foundation packages

**Files**: `packages/openbadges-types/eslint.config.mjs`, `packages/rd-logger/eslint.config.mjs`, `packages/design-tokens/eslint.config.mjs`, `packages/shared-config/eslint.config.mjs`
**Commit**: `feat(config): add import boundary lint rules for foundation packages`
**Changes**:

- [ ] In each foundation package ESLint config, add `no-restricted-imports` rule that bans any `@rollercoaster-dev/*` or local workspace package imports with a message: `"Foundation packages must not import from workspace packages. See docs/architecture/overview.md#prohibited-import-directions"`
- [ ] `openbadges-types`: ban `@rollercoaster-dev/rd-logger`, `@rollercoaster-dev/openbadges-core`, `@rollercoaster-dev/openbadges-ui`, `@rollercoaster-dev/design-tokens`, and `apps/*` path patterns
- [ ] `rd-logger`: same ban on all workspace packages (it is a foundation package)
- [ ] `design-tokens`: ban on all workspace packages
- [ ] `shared-config`: ban on all workspace packages
- [ ] Check `packages/openbadges-core/eslint.config.mjs` and `packages/openbadges-ui/eslint.config.mjs`: add rule banning `apps/*` imports
- [ ] Add remediation message to each `no-restricted-imports` entry pointing to the architecture overview

### Step 4: Create docs/index.md with verification metadata

**Files**: `docs/index.md`
**Commit**: `docs: create docs index with verification date tracking`
**Changes**:

- [ ] Create `docs/index.md` as a registry of key documentation files with `Last Verified` dates
- [ ] Use a markdown table format:

```markdown
# Docs Index

This file tracks the verification status of key documentation.
The CI `docs-freshness` job warns when a doc has not been verified in 90+ days.

To mark a doc as verified: update the "Last Verified" date to today's date.

## Tracked Documents

| File                          | Description                               | Last Verified |
| ----------------------------- | ----------------------------------------- | ------------- |
| docs/architecture/overview.md | Architecture map and package dependencies | 2026-03-25    |
| docs/golden-principles.md     | Mechanical lint rules                     | 2026-03-25    |
| docs/development-workflows.md | Dev workflow gates and agents             | 2026-03-25    |
| docs/monorepo-structure.md    | Monorepo package structure                | 2026-03-25    |
| CLAUDE.md                     | Project instructions for Claude Code      | 2026-03-25    |
```

- [ ] The date format is `YYYY-MM-DD` (ISO 8601) for unambiguous parsing

### Step 5: Add docs freshness CI workflow

**Files**: `.github/workflows/docs-freshness.yml`
**Commit**: `ci: add docs freshness warning job`
**Changes**:

- [ ] Create `.github/workflows/docs-freshness.yml`
- [ ] Trigger on: `pull_request` and `schedule` (weekly, e.g., `cron: '0 9 * * 1'`)
- [ ] Single job: checkout repo, run a shell script that:
  1. Reads `docs/index.md`
  2. Parses each row in the tracked documents table
  3. Computes days since `Last Verified` date
  4. If >= 90 days: outputs a warning line (does NOT `exit 1`)
  5. Summarizes how many docs are stale
- [ ] Make threshold configurable via env var `DOCS_FRESHNESS_THRESHOLD_DAYS` (default: 90)
- [ ] Use `actions/checkout@v4` (match existing CI pattern but note `ci.yml` uses `v6` — match the repo's convention)
- [ ] Job name: `Docs Freshness Check`

### Step 6: Update golden-principles.md with lint-enforced status

**Files**: `docs/golden-principles.md`
**Commit**: `docs(principles): mark logging and boundary rules as lint-enforced`
**Changes**:

- [ ] Rule 1 (rd-logger logging): update status from `doc-only (lint rule tracked in #869)` to `lint-enforced (PR #<this-pr>)`
- [ ] Rule 5 (package dependency directions): update status from `doc-only (lint enforcement tracked in #869)` to `lint-enforced (PR #<this-pr>)`
- [ ] Add a new Rule entry for file naming conventions (PascalCase Vue components), marked `lint-enforced`
- [ ] Add a new Rule entry for docs freshness (90-day warning CI), marked `ci-enforced`

## Testing Strategy

- [ ] Run `bun run lint` from monorepo root after Step 1 and confirm it passes (no false positives)
- [ ] Manually introduce a `console.log` in a source file, run `bun run lint`, confirm it errors
- [ ] Manually create a `mycomponent.vue` file in a components dir, run `bun run lint`, confirm it errors (or skip if `vue/match-component-file-name` doesn't trigger on files without component name declaration)
- [ ] Manually add a workspace import to `openbadges-types`, run `bun run lint`, confirm it errors
- [ ] Verify the docs-freshness script logic by setting a test date older than 90 days in `docs/index.md` and running the script locally
- [ ] Run full CI via PR to verify all jobs pass and docs-freshness job appears in checks

## Not in Scope

| Item                                                                    | Reason                                                                                                                                                                                                                                                                                                                    | Follow-up           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Circular dependency detection (issue #796)                              | `no-restricted-imports` catches directional violations. True circular dep detection requires `eslint-plugin-import/no-circular` which adds a new dependency and significant lint time cost.                                                                                                                               | New issue if needed |
| Enforcing camelCase for utility files                                   | ESLint does not have a built-in filename linting rule for non-Vue files without adding `eslint-plugin-filenames` (new dep). The boundary and naming violations that matter most are covered by existing rules.                                                                                                            | New issue if needed |
| Enforcing `*.test.ts` colocation                                        | ESLint cannot enforce file placement relative to source. Would require a custom script or Jest/Vitest config.                                                                                                                                                                                                             | New issue if needed |
| Fixing `openbadges-system` server config exposing `console` as a global | The `src/server/**/*.ts` block in `openbadges-system/eslint.config.mjs` declares `console: 'readonly'` as a global but the shared-config `no-console: error` rule still catches usage. The global declaration just prevents `no-undef` errors on `console` — it does not disable the `no-console` rule. No change needed. | None                |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
