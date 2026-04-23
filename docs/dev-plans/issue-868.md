# Development Plan: Issue #868

## Issue Summary

**Title**: Architecture map and golden principles docs
**Type**: documentation / enhancement
**Complexity**: SMALL
**Estimated Lines**: ~250 lines (two new markdown files + CLAUDE.md additions)

## Intent Verification

Observable criteria derived from the issue.

- [ ] `docs/architecture/overview.md` exists and documents all packages and apps with their roles, dependency directions, prohibited import directions, cross-cutting concerns, and a data-flow diagram
- [ ] `docs/golden-principles.md` exists with at least 5 mechanical, enforceable rules, each with a do/don't/rationale structure and an escalation path to lint
- [ ] Root `CLAUDE.md` references both new files in its Documentation section
- [ ] Issue #869 (mechanical enforcement) is unblocked: its scope explicitly states it depends on `docs/architecture/overview.md` for boundary rules and `docs/golden-principles.md` as the doc target

## Dependencies

| Issue  | Title | Status | Type |
| ------ | ----- | ------ | ---- |
| (none) | —     | —      | —    |

**Status**: All dependencies met. Issue body explicitly states "None — this is a foundation issue."

## Objective

Create two foundational reference documents — an architecture map and a golden principles guide — that establish the system's structure and mechanical coding rules. These documents are the prerequisite for issue #869 (import boundary lint rules and structured logging enforcement) and serve as the permanent source of truth about package dependencies and team conventions.

## Decisions

| ID  | Decision                                                                                                          | Alternatives Considered              | Rationale                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Create `docs/architecture/` as a new subdirectory rather than a flat file at `docs/architecture.md`               | Single flat file                     | Issue #869 may add additional architecture docs (e.g., diagrams, ADRs); a directory is more extensible and matches the existing pattern of `docs/vision/`, `docs/design/`                                                                         |
| D2  | Derive golden principles from observed PR review patterns rather than abstract theory                             | Generic coding principles            | Issue explicitly requires "rules drawn from patterns corrected 2+ times in PR reviews"; PR history shows recurrent CodeRabbit findings that qualify                                                                                               |
| D3  | Include `openbadges-core` and `design-tokens` in the architecture map even though the issue only names 6 packages | Strict 6-package scope               | The issue lists the packages from the original `CLAUDE.md` but the actual monorepo has 8 packages — omitting `openbadges-core` and `design-tokens` would produce an inaccurate map; the scope of the doc should match reality                     |
| D4  | Document `docs/index.md` reference as conditional ("once it exists")                                              | Require docs/index.md to exist first | Issue #867 (which creates `docs/index.md`) has no stated dependency order relative to #868; both are Phase 0 foundations. The reference to `docs/index.md` in the acceptance criteria should be addressed when #867 lands, not blocked on it here |

## Affected Areas

- `docs/architecture/overview.md` — new file: package map, dependency directions, cross-cutting concerns, data flow, prohibited imports
- `docs/golden-principles.md` — new file: 5+ mechanical rules with do/don't/rationale and lint-escalation guide
- `CLAUDE.md` — add references to both new docs in the Documentation section

## Implementation Plan

### Step 1: Create docs/architecture/overview.md

**Files**: `docs/architecture/overview.md` (new)
**Commit**: `docs(architecture): add architecture map and package dependency guide`
**Changes**:

- [ ] Document all 8 packages/apps: `rd-logger`, `openbadges-types`, `openbadges-ui`, `design-tokens`, `shared-config`, `openbadges-core`, `openbadges-modular-server`, `openbadges-system`
- [ ] For each package: name, npm identifier, role, what it exports, who it can import from
- [ ] Dependency table derived from `package.json` workspace deps (see notes below)
- [ ] Cross-cutting concerns section: auth (enters at `openbadges-system` server layer), logging (`rd-logger` enters all apps and `openbadges-core`), types (`openbadges-types` enters all consuming packages)
- [ ] ASCII data-flow diagram showing browser → openbadges-system client → Hono server → openbadges-core / rd-logger; badge issuer → openbadges-modular-server → openbadges-types
- [ ] Prohibited import directions (must not list; enforced by #869): `packages/*` must not import from `apps/*`; `shared-config` must not import from any other workspace package; `openbadges-types` must not import from any other workspace package

**Dependency map derived from package.json files (verified):**

| Package                     | Workspace deps                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `shared-config`             | none                                                                                     |
| `design-tokens`             | none                                                                                     |
| `openbadges-types`          | `shared-config` (dev)                                                                    |
| `rd-logger`                 | `shared-config` (dev)                                                                    |
| `openbadges-ui`             | `design-tokens`, `openbadges-types`, `shared-config` (dev)                               |
| `openbadges-core`           | `rd-logger`, `openbadges-types`                                                          |
| `openbadges-modular-server` | `rd-logger`, `openbadges-types`, `shared-config` (dev)                                   |
| `openbadges-system`         | `rd-logger`, `openbadges-types`, `openbadges-ui`, `design-tokens`, `shared-config` (dev) |

### Step 2: Create docs/golden-principles.md

**Files**: `docs/golden-principles.md` (new)
**Commit**: `docs: add golden principles with mechanical enforcement rules`
**Changes**:

- [ ] Minimum 5 rules, each with: rule title, DO, DON'T, rationale, status (doc-only | lint-enforced)
- [ ] Rules drawn from observed recurring PR review findings (see notes below)
- [ ] Escalation section: explains how to propose a new rule, how to promote doc-only → lint-enforced (issue + shared-config PR)

**Golden principles sourced from PR review history:**

1. **Use `rd-logger` for all application logging — never `console.*`**
   - Recurring: PR #788, PR #786 (CodeRabbit flagged console usage; structured logging enforced via #869)
   - Status: doc-only until #869 adds lint rule

2. **Never version-bump `package.json` directly — always use Changesets**
   - Recurring: PR #815 (CodeRabbit comment explicitly called this out), noted in commit-rules.md
   - Status: doc-only (enforced by human review and Changesets CI)

3. **Use `:focus-visible` not `:focus` on interactive elements**
   - Recurring: PR #775, PR #771 (design review pattern; `all: unset` destroys focus rings)
   - Noted in `MEMORY.md` as a repeated finding
   - Status: doc-only

4. **Rate-limit every public auth endpoint consistently**
   - Recurring: PR #786, PR #788 (CodeRabbit flagged missing rate limit on `/refresh`)
   - Status: doc-only

5. **Keep `packages/*` dependency-direction clean — packages must not import from `apps/*`**
   - Structural rule reinforced by issue #869 scope (lint enforcement forthcoming)
   - Status: doc-only until #869

6. **Add database indexes for all query filter columns (expiry, foreign keys)**
   - Recurring: PR #788 CodeRabbit flagged missing `expiresAt` index for auth tables
   - Status: doc-only

7. **Use `substring` not deprecated `substr`**
   - Recurring: PR #788 CodeRabbit nitpick
   - Status: lint-enforceable (`no-restricted-syntax` or TypeScript)

### Step 3: Update root CLAUDE.md

**Files**: `CLAUDE.md`
**Commit**: `docs(claude): reference architecture map and golden principles`
**Changes**:

- [ ] Add `docs/architecture/overview.md` to the Documentation section with description "Package map, dependency directions, prohibited imports"
- [ ] Add `docs/golden-principles.md` to the Documentation section with description "Mechanical coding rules drawn from PR reviews"

## Testing Strategy

This issue produces only documentation — no code changes, no test files needed.

Manual verification:

- [ ] Both files render correctly as GitHub Markdown (check for broken table formatting, unclosed code blocks)
- [ ] All package names in the architecture map match actual `package.json` `name` fields
- [ ] All workspace dependency entries verified against actual `package.json` files (cross-checked during research)
- [ ] CLAUDE.md links resolve to real file paths

## Not in Scope

| Item                                          | Reason                                                                     | Follow-up                                           |
| --------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| Creating `docs/index.md`                      | Owned by issue #867                                                        | #867                                                |
| Implementing lint rules for import boundaries | Owned by issue #869                                                        | #869                                                |
| Implementing `no-console` lint rule           | Owned by issue #869                                                        | #869                                                |
| Creating `docs/vision/harness-engineering.md` | Referenced by multiple Harness Engineering issues but not assigned to #868 | Unclear which issue owns it; likely a separate task |
| Moving dev-plans to `docs/plans/` structure   | Owned by issue #867                                                        | #867                                                |

## Discovery Log

<!-- Entries added during implementation:
- [2026-03-25] docs/vision/harness-engineering.md does not exist yet — this file is referenced in the issue body but not created by any current open issue; flagged as unknown owner
- [2026-03-25] Actual package count is 8, not 6 — openbadges-core and design-tokens are present in packages/ and have workspace deps; included in architecture map scope
- [2026-03-25] docs/architecture/ directory does not exist — must be created
- [2026-03-25] docs/index.md does not exist — owned by #867, acceptance criterion "Both referenced from docs/index.md" must be fulfilled when #867 lands, not in this PR
-->
