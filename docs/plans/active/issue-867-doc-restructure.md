# Development Plan: Issue #867

## Issue Summary

**Title**: Doc restructuring: index, plans reorganization, and CLAUDE.md audit
**Type**: enhancement (documentation infrastructure)
**Complexity**: MEDIUM
**Estimated Lines**: ~350 lines (net new across all files; mostly additions and restructured content)

## Intent Verification

Observable criteria derived from the issue:

- [ ] `docs/index.md` exists, lists every file currently in `docs/` with path, one-line description, last verified date, owner, and freshness status
- [ ] `docs/plans/active/` and `docs/plans/completed/` directories exist with a README explaining the convention
- [ ] Existing plans in `docs/plans/` are moved to `docs/plans/completed/` (all three are historical, none are active)
- [ ] `.claude/dev-plans/README.md` is updated to redirect readers to `docs/plans/`
- [ ] `.claude/WORKFLOW.md` references to `.claude/dev-plans/` are updated to new path
- [ ] Root `CLAUDE.md` is at or under 150 lines and references `docs/index.md` as the documentation entry point
- [ ] `apps/openbadges-modular-server/CLAUDE.md` (229 lines) and `apps/openbadges-system/CLAUDE.md` (253 lines) are reduced to 100 lines or fewer, with extracted content moved to topic-specific docs
- [ ] `packages/openbadges-core/CLAUDE.md` (117 lines) is reduced to 100 lines or fewer
- [ ] No file reference in any CLAUDE.md points to a non-existent file
- [ ] `docs/vision/harness-engineering.md` is created (referenced in issue but does not yet exist)

## Dependencies

None — this is a foundation issue.

## Objective

Establish a navigable, auditable documentation system for the monorepo. This means: a single index file as the entry point, a structured plans directory with clear lifecycle states, and CLAUDE.md files that function as maps (short, pointer-based) rather than manuals (long, inline content).

## Decisions

| ID  | Decision                                                                                                                        | Alternatives Considered      | Rationale                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | All three existing `docs/plans/` files go to `completed/`                                                                       | Put some in `active/`        | `2026-01-29-planning-graph-phase2-design.md` (Jan 2026), `directory-components-plan.md` and `server-side-badge-filtering-plan.md` (Nov 2025) — all reference shipped features; none is actively in-flight |
| D2  | `.claude/dev-plans/` holds only one file (`README.md`); the README itself is what needs updating, not a migration of many files | Rename or move the directory | The directory currently has one README — no plans to migrate. The README must be updated to point to `docs/plans/` going forward                                                                          |
| D3  | Extract `openbadges-modular-server/CLAUDE.md` architecture section to `apps/openbadges-modular-server/docs/architecture.md`     | Extract to monorepo `docs/`  | Keeps app-level docs co-located with the app                                                                                                                                                              |
| D4  | Extract `openbadges-system/CLAUDE.md` architecture section to `apps/openbadges-system/docs/architecture.md`                     | Same as above                | Same rationale — app-specific detail lives with the app                                                                                                                                                   |
| D5  | `docs/vision/harness-engineering.md` created as a stub with the milestone description as content                                | Skip entirely                | The issue and milestone both reference it; creating a stub unblocks future issues that depend on it                                                                                                       |
| D6  | Freshness threshold: stale = not updated in 90+ days from today (2026-03-25), so cutoff = 2025-12-25                            | 60 days                      | Matches the criteria stated in the issue; any file last modified before 2025-12-25 is `stale`                                                                                                             |

## Affected Areas

### New files

- `docs/index.md` — full catalog of docs/ with freshness tracking
- `docs/plans/active/README.md` — explains active/ convention
- `docs/plans/completed/README.md` — explains completed/ convention
- `docs/vision/harness-engineering.md` — stub for milestone vision doc
- `apps/openbadges-modular-server/docs/architecture.md` — extracted from CLAUDE.md
- `apps/openbadges-system/docs/architecture.md` — extracted from CLAUDE.md

### Moved/restructured files

- `docs/plans/2026-01-29-planning-graph-phase2-design.md` → `docs/plans/completed/`
- `docs/plans/directory-components-plan.md` → `docs/plans/completed/`
- `docs/plans/server-side-badge-filtering-plan.md` → `docs/plans/completed/`

### Modified files

- `docs/plans/server-side-badge-filtering-plan.md` (before move): update self-reference path on line 142
- `apps/openbadges-modular-server/CLAUDE.md` — trim to ~100 lines, pointer to new architecture doc
- `apps/openbadges-system/CLAUDE.md` — trim to ~100 lines, pointer to new architecture doc
- `packages/openbadges-core/CLAUDE.md` — trim from 117 to ~100 lines
- `CLAUDE.md` (root) — add pointer to `docs/index.md`; currently 89 lines so within limit, just needs the pointer
- `.claude/dev-plans/README.md` — update paths to reference `docs/plans/`
- `.claude/WORKFLOW.md` — update `.claude/dev-plans/issue-108.md` reference (line 46) and `dev-plans/` listing (line 272) to `docs/plans/`

## Implementation Plan

### Step 1: Create docs/vision/harness-engineering.md stub

**Files**: `docs/vision/harness-engineering.md`
**Commit**: `docs(vision): add harness-engineering vision stub`
**Changes**:

- [ ] Create `docs/vision/harness-engineering.md` with milestone title, description, and phase overview
- [ ] Content sourced from the GitHub milestone description: "Adapt harness engineering principles for agent-first development. Restructure docs as system of record, add mechanical architecture enforcement, make the application legible to agents, and build continuous hygiene processes."
- [ ] Document the four phases: Foundation (Phase 0), Architecture Enforcement, Legibility, Continuous Hygiene

### Step 2: Restructure docs/plans/ into active/ and completed/

**Files**: `docs/plans/active/README.md`, `docs/plans/completed/README.md`, move three plan files
**Commit**: `docs(plans): restructure plans into active/ and completed/ subdirectories`
**Changes**:

- [ ] Create `docs/plans/active/README.md` explaining that `active/` holds plans for work currently in development
- [ ] Create `docs/plans/completed/README.md` explaining that `completed/` holds historical plans for shipped work
- [ ] Move `docs/plans/2026-01-29-planning-graph-phase2-design.md` to `docs/plans/completed/`
- [ ] Move `docs/plans/directory-components-plan.md` to `docs/plans/completed/`
- [ ] Move `docs/plans/server-side-badge-filtering-plan.md` to `docs/plans/completed/` (update the self-reference on line 142 from `docs/plans/server-side-badge-filtering-plan.md` to `docs/plans/completed/server-side-badge-filtering-plan.md` before or after moving)
- [ ] Future dev plans created by issue-researcher go to `docs/plans/active/issue-<n>-<desc>.md` and are moved to `completed/` when the PR merges

### Step 3: Update .claude/dev-plans/ references

**Files**: `.claude/dev-plans/README.md`, `.claude/WORKFLOW.md`
**Commit**: `chore(claude): update dev-plans references to docs/plans/`
**Changes**:

- [ ] Rewrite `.claude/dev-plans/README.md` to redirect readers to `docs/plans/` — explain that plans now live there
- [ ] Update `.claude/WORKFLOW.md` line 46: change `.claude/dev-plans/issue-108.md` to `docs/plans/active/issue-108.md`
- [ ] Update `.claude/WORKFLOW.md` line 272: change `dev-plans/` to `docs/plans/`

### Step 4: Extract and trim apps/openbadges-modular-server/CLAUDE.md

**Files**: `apps/openbadges-modular-server/CLAUDE.md`, `apps/openbadges-modular-server/docs/architecture.md`
**Commit**: `docs(openbadges-server): extract architecture docs, trim CLAUDE.md to 100 lines`
**Changes**:

- [ ] Create `apps/openbadges-modular-server/docs/architecture.md` containing the Architecture Overview section (lines 110–230 of current CLAUDE.md: Core Architecture Patterns, Key Architectural Components, Database-Specific Considerations, Testing Strategy)
- [ ] Trim `apps/openbadges-modular-server/CLAUDE.md` to ~100 lines: keep Essential Development Commands and Development Guidelines sections; replace Architecture Overview with a single pointer line: `See [docs/architecture.md](docs/architecture.md) for full architecture details.`
- [ ] Remove the Docker operations detail that duplicates GitHub Actions workflow info (keep only the pull command)
- [ ] Add pointer to `docs/database-integration-guide.md` (already referenced in Development Guidelines)

### Step 5: Extract and trim apps/openbadges-system/CLAUDE.md

**Files**: `apps/openbadges-system/CLAUDE.md`, `apps/openbadges-system/docs/architecture.md`
**Commit**: `docs(openbadges-system): extract architecture docs, trim CLAUDE.md to 100 lines`
**Changes**:

- [ ] Create `apps/openbadges-system/docs/architecture.md` containing Directory Structure, Workspace Dependencies, Key Architectural Patterns, Testing Strategy sections (roughly lines 126–253 of current CLAUDE.md)
- [ ] Trim `apps/openbadges-system/CLAUDE.md` to ~100 lines: keep Monorepo Context, Development Commands (root and app), and key pointers; replace Architecture Overview with pointer to `docs/architecture.md`
- [ ] Collapse Docker Operations to a 3-command block (up/down/logs); it is already minimal
- [ ] Remove the closing paragraph ("When working on this codebase...") — redundant with root CLAUDE.md conventions

### Step 6: Trim packages/openbadges-core/CLAUDE.md

**Files**: `packages/openbadges-core/CLAUDE.md`
**Commit**: `docs(openbadges-core): trim CLAUDE.md to 100 lines`
**Changes**:

- [ ] Current file is 117 lines; remove the "Current Status" section (lines 103–117) — it lists issues by number but those issues may already be done and the status is better tracked in GitHub
- [ ] Confirm remaining content is under 100 lines
- [ ] No extraction needed; the remaining content (Purpose, Key Patterns, Testing, Conventions, Build, Dependencies) is reference-quality

### Step 7: Update root CLAUDE.md to reference docs/index.md

**Files**: `CLAUDE.md`
**Commit**: `docs(root): add docs/index.md pointer to Documentation section`
**Changes**:

- [ ] Root CLAUDE.md is currently 89 lines — within the 150-line limit, no trimming required
- [ ] Add `[Documentation Index](docs/index.md) - full catalog of all docs with freshness status` to the Documentation section (after the three existing links)
- [ ] Verify no other references are broken

### Step 8: Create docs/index.md

**Files**: `docs/index.md`
**Commit**: `docs: add docs/index.md catalog with freshness tracking`
**Changes**:

- [ ] Create `docs/index.md` with a freshness criteria section at the top (stale = not updated in 90+ days; cutoff = 2025-12-25 relative to 2026-03-25)
- [ ] Catalog every file in `docs/` by topic section (not flat alphabetical), with path, one-line description, last verified date, owner, and freshness status
- [ ] Sections: Vision & Strategy, Development Workflows, Plans (with active/completed sub-sections), Architecture & Design, Research, Migrations, Learnings, Mockups, Analysis

## Detailed docs/index.md Catalog

Below is the complete catalog data gathered during research, to be used when writing `docs/index.md`.

**Freshness cutoff**: 2025-12-25 (90 days before 2026-03-25)

| Path                                                              | Description                                  | Last Modified    | Owner             | Freshness |
| ----------------------------------------------------------------- | -------------------------------------------- | ---------------- | ----------------- | --------- |
| `docs/VISION.md`                                                  | Project vision and product direction         | 2026-02-03       | repo              | current   |
| `docs/ROADMAP.md`                                                 | Milestone roadmap and priority ordering      | 2026-01-16       | repo              | current   |
| `docs/issue-themes.md`                                            | Thematic groupings of GitHub issues          | 2026-01-16       | repo              | current   |
| `docs/SYSTEM-REVIEW.md`                                           | System health review and architecture audit  | 2025-11-29       | repo              | stale     |
| `docs/development-workflows.md`                                   | Agent workflows, gates, and automation       | 2026-03-15       | repo              | current   |
| `docs/publishing-guide.md`                                        | npm, Docker, and Changeset publishing        | 2026-01-11       | repo              | current   |
| `docs/monorepo-structure.md`                                      | Package dependencies, env vars, structure    | 2026-02-06       | repo              | current   |
| `docs/package-audit.md`                                           | Package dependency audit and optimization    | 2026-02-03       | repo              | current   |
| `docs/context-engineering-best-practices.md`                      | Claude Code prompting and context guidelines | 2026-01-11       | repo              | current   |
| `docs/BUN-MIGRATION-PLAN.md`                                      | Bun migration plan and tracking              | 2025-11-29       | repo              | stale     |
| `docs/MIGRATION-AGENTS.md`                                        | Migration agent design and usage             | 2025-11-29       | repo              | stale     |
| `docs/vision/harness-engineering.md`                              | Harness Engineering milestone vision         | 2026-03-25 (new) | repo              | current   |
| `docs/vision/learning-graph.md`                                   | Learning graph architecture vision           | 2026-01-28       | repo              | current   |
| `docs/vision/planning-graph.md`                                   | Planning graph architecture vision           | 2026-02-03       | repo              | current   |
| `docs/plans/active/README.md`                                     | Convention for active development plans      | 2026-03-25 (new) | repo              | current   |
| `docs/plans/completed/README.md`                                  | Convention for completed plan archive        | 2026-03-25 (new) | repo              | current   |
| `docs/plans/completed/2026-01-29-planning-graph-phase2-design.md` | Planning graph Phase 2 design plan           | 2026-01-29       | repo              | current   |
| `docs/plans/completed/directory-components-plan.md`               | Directory components feature plan            | 2025-11-29       | repo              | stale     |
| `docs/plans/completed/server-side-badge-filtering-plan.md`        | Server-side badge filtering plan             | 2025-11-29       | repo              | stale     |
| `docs/analysis/milestone-analysis.md`                             | Milestone dependency and scope analysis      | 2026-01-16       | repo              | current   |
| `docs/design/DESIGN_LANGUAGE.md`                                  | Design language specification                | 2026-02-06       | openbadges-ui     | current   |
| `docs/design/issuer-model.md`                                     | Issuer domain model design                   | 2026-01-16       | openbadges-server | current   |
| `docs/research/BADGE_DESIGN_ANALYSIS.md`                          | Badge design research and analysis           | 2025-11-29       | openbadges-ui     | stale     |
| `docs/research/BADGE_VISUAL_EFFECTS_RESEARCH.md`                  | Badge visual effects research                | 2025-11-29       | openbadges-ui     | stale     |
| `docs/research/OPENBADGES_BADGE_BUILDER_CONCEPT.md`               | Badge Builder concept and architecture       | 2025-11-29       | openbadges-system | stale     |
| `docs/migrations/ARCHIVED-original-migration-agent.md`            | Archived original migration agent design     | 2025-11-29       | repo              | stale     |
| `docs/migrations/MIGRATION_PLAN_openbadges-system.md`             | openbadges-system Bun migration plan         | 2025-11-29       | openbadges-system | stale     |
| `docs/migrations/MIGRATION_PLAN_rd-logger.md`                     | rd-logger Bun migration plan                 | 2025-11-29       | rd-logger         | stale     |
| `docs/migrations/README.md`                                       | Migrations directory guide                   | 2025-11-29       | repo              | stale     |
| `docs/learnings/README.md`                                        | Learnings index and usage guide              | 2025-12-29       | repo              | current   |
| `docs/learnings/bun-hono/README.md`                               | Bun + Hono learnings index                   | 2025-12-29       | repo              | current   |
| `docs/learnings/general/README.md`                                | General development learnings                | 2025-12-29       | repo              | current   |
| `docs/learnings/openbadges/README.md`                             | OpenBadges-specific learnings                | 2025-12-29       | repo              | current   |
| `docs/learnings/typescript/README.md`                             | TypeScript learnings                         | 2025-12-29       | repo              | current   |
| `docs/learnings/vue/README.md`                                    | Vue 3 learnings                              | 2025-12-29       | repo              | current   |
| `docs/mockups/openbadges-system-ui.html`                          | Full-page UI mockup (HTML)                   | 2026-01-17       | openbadges-system | current   |
| `docs/landing/LANDING-PAGE-FLOW.md`                               | Landing page flow design                     | 2026-01-16       | repo              | current   |

## Testing Strategy

This issue is pure documentation — no runtime behavior changes.

- [ ] Manual: verify all file references in modified CLAUDE.md files resolve to real files
- [ ] Manual: verify `docs/index.md` covers every file found under `docs/` with no omissions
- [ ] Manual: run `wc -l` on all modified CLAUDE.md files to confirm line-count compliance
- [ ] Manual: confirm `docs/plans/completed/` contains the three moved plan files
- [ ] Manual: verify `.claude/WORKFLOW.md` links in lines 46 and 272 now point to `docs/plans/`

## Not in Scope

| Item                                                                             | Reason                                                                                                                                                 | Follow-up                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Updating `apps/docs/` references that may exist within app source code           | Out of scope; this issue targets CLAUDE.md and docs/, not source code                                                                                  | None                             |
| Deleting `.claude/dev-plans/` directory                                          | The README serves as a redirect pointer; deleting it would break the agent skill contract which expects to write there — needs a separate skill update | Future Harness Engineering issue |
| Auditing `.claude/rules/` or `.claude/skills/` content                           | Out of scope for this issue; separate Harness Engineering concern                                                                                      | Future issue                     |
| Writing content for the learnings subdirectories (beyond their existing READMEs) | No content files exist there yet; out of scope                                                                                                         | Future issue                     |
| `docs/vision/harness-engineering.md` as a full vision doc                        | Stub only — full authoring is a separate effort                                                                                                        | Harness Engineering milestone    |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

---

## Research Notes

### CLAUDE.md Line Counts

| File                                       | Lines | Limit | Status                                            |
| ------------------------------------------ | ----- | ----- | ------------------------------------------------- |
| `CLAUDE.md` (root)                         | 89    | 150   | Within limit — only needs `docs/index.md` pointer |
| `apps/openbadges-modular-server/CLAUDE.md` | 229   | 100   | 129 lines over — extract Architecture Overview    |
| `apps/openbadges-system/CLAUDE.md`         | 253   | 100   | 153 lines over — extract Architecture Overview    |
| `packages/design-tokens/CLAUDE.md`         | 85    | 100   | Within limit                                      |
| `packages/openbadges-core/CLAUDE.md`       | 117   | 100   | 17 lines over — remove "Current Status" section   |
| `packages/openbadges-types/CLAUDE.md`      | 61    | 100   | Within limit                                      |
| `packages/openbadges-ui/CLAUDE.md`         | 47    | 100   | Within limit                                      |
| `packages/rd-logger/CLAUDE.md`             | 47    | 100   | Within limit                                      |
| `packages/shared-config/CLAUDE.md`         | 53    | 100   | Within limit                                      |

### Existing docs/plans/ Files — Classification

| File                                         | Last Modified | Classification | Rationale                                                  |
| -------------------------------------------- | ------------- | -------------- | ---------------------------------------------------------- |
| `2026-01-29-planning-graph-phase2-design.md` | 2026-01-29    | completed      | Planning graph feature was shipped (#629, merged Jan 2026) |
| `directory-components-plan.md`               | 2025-11-29    | completed      | Directory components shipped (#105, Nov 2025)              |
| `server-side-badge-filtering-plan.md`        | 2025-11-29    | completed      | Server-side filtering shipped (#107, Nov 2025)             |

### Missing Referenced File

`docs/vision/harness-engineering.md` is referenced in the issue body and milestone description but does not exist. It must be created (even as a stub) to avoid a dead link immediately after `docs/index.md` is published.

### References to .claude/dev-plans/ in Codebase

- `.claude/WORKFLOW.md` line 46: `Saves to .claude/dev-plans/issue-108.md`
- `.claude/WORKFLOW.md` line 272: `├── dev-plans/           # Stored development plans`
- `.claude/docs/agent-architecture.md` line 342: `→ Returns: { plan_path: ".claude/dev-plans/issue-123.md" }` — this is in agent architecture docs; update separately or note as a follow-up (the agent skill itself may hardcode this path)
