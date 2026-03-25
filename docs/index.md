# Documentation Index

Full catalog of all documentation in this repository, organized by topic.

## Freshness Criteria

| Status    | Meaning                                           |
| --------- | ------------------------------------------------- |
| `current` | Updated within the last 90 days (after 2025-12-25) |
| `stale`   | Not updated in 90+ days (before 2025-12-25)       |

Freshness is relative to 2026-03-25. Re-audit periodically.

**Excluded:** `docs/dev-plans/` — transient agent workspace, not cataloged. Active plans live in `docs/plans/active/`.

---

## Vision & Strategy

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [VISION.md](VISION.md) | Project vision and product direction | 2026-02-03 | repo | current |
| [ROADMAP.md](ROADMAP.md) | Milestone roadmap and priority ordering | 2026-01-16 | repo | current |
| [issue-themes.md](issue-themes.md) | Thematic groupings of GitHub issues | 2026-01-16 | repo | current |
| [vision/harness-engineering.md](vision/harness-engineering.md) | Harness Engineering milestone vision | 2026-03-25 | repo | current |
| [vision/learning-graph.md](vision/learning-graph.md) | Learning graph architecture vision | 2026-01-28 | repo | current |
| [vision/planning-graph.md](vision/planning-graph.md) | Planning graph architecture vision | 2026-02-03 | repo | current |

## Development Workflows

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [development-workflows.md](development-workflows.md) | Agent workflows, gates, and automation | 2026-03-15 | repo | current |
| [publishing-guide.md](publishing-guide.md) | npm, Docker, and Changeset publishing | 2026-01-11 | repo | current |
| [monorepo-structure.md](monorepo-structure.md) | Package dependencies, env vars, structure | 2026-02-06 | repo | current |
| [context-engineering-best-practices.md](context-engineering-best-practices.md) | Claude Code prompting and context guidelines | 2026-01-11 | repo | current |
| [package-audit.md](package-audit.md) | Package dependency audit and optimization | 2026-02-03 | repo | current |

## Plans

### Active

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [plans/active/README.md](plans/active/README.md) | Convention for active development plans | 2026-03-25 | repo | current |

### Completed

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [plans/completed/README.md](plans/completed/README.md) | Convention for completed plan archive | 2026-03-25 | repo | current |
| [plans/completed/2026-01-29-planning-graph-phase2-design.md](plans/completed/2026-01-29-planning-graph-phase2-design.md) | Planning graph Phase 2 design plan | 2026-01-29 | repo | current |
| [plans/completed/directory-components-plan.md](plans/completed/directory-components-plan.md) | Directory components feature plan | 2025-11-29 | repo | stale |
| [plans/completed/server-side-badge-filtering-plan.md](plans/completed/server-side-badge-filtering-plan.md) | Server-side badge filtering plan | 2025-11-29 | repo | stale |

## Architecture & Design

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [design/DESIGN_LANGUAGE.md](design/DESIGN_LANGUAGE.md) | Design language specification | 2026-02-06 | openbadges-ui | current |
| [design/issuer-model.md](design/issuer-model.md) | Issuer domain model design | 2026-01-16 | openbadges-server | current |
| [SYSTEM-REVIEW.md](SYSTEM-REVIEW.md) | System health review and architecture audit | 2025-11-29 | repo | stale |
| [landing/LANDING-PAGE-FLOW.md](landing/LANDING-PAGE-FLOW.md) | Landing page flow design | 2026-01-16 | repo | current |

## Research

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [research/BADGE_DESIGN_ANALYSIS.md](research/BADGE_DESIGN_ANALYSIS.md) | Badge design research and analysis | 2025-11-29 | openbadges-ui | stale |
| [research/BADGE_VISUAL_EFFECTS_RESEARCH.md](research/BADGE_VISUAL_EFFECTS_RESEARCH.md) | Badge visual effects research | 2025-11-29 | openbadges-ui | stale |
| [research/OPENBADGES_BADGE_BUILDER_CONCEPT.md](research/OPENBADGES_BADGE_BUILDER_CONCEPT.md) | Badge Builder concept and architecture | 2025-11-29 | openbadges-system | stale |

## Analysis

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [analysis/milestone-analysis.md](analysis/milestone-analysis.md) | Milestone dependency and scope analysis | 2026-01-16 | repo | current |

## Migrations

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [migrations/README.md](migrations/README.md) | Migrations directory guide | 2025-11-29 | repo | stale |
| [migrations/ARCHIVED-original-migration-agent.md](migrations/ARCHIVED-original-migration-agent.md) | Archived original migration agent design | 2025-11-29 | repo | stale |
| [migrations/MIGRATION_PLAN_openbadges-system.md](migrations/MIGRATION_PLAN_openbadges-system.md) | openbadges-system Bun migration plan | 2025-11-29 | openbadges-system | stale |
| [migrations/MIGRATION_PLAN_rd-logger.md](migrations/MIGRATION_PLAN_rd-logger.md) | rd-logger Bun migration plan | 2025-11-29 | rd-logger | stale |
| [BUN-MIGRATION-PLAN.md](BUN-MIGRATION-PLAN.md) | Bun migration plan and tracking | 2025-11-29 | repo | stale |
| [MIGRATION-AGENTS.md](MIGRATION-AGENTS.md) | Migration agent design and usage | 2025-11-29 | repo | stale |

## Learnings

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [learnings/README.md](learnings/README.md) | Learnings index and usage guide | 2025-12-29 | repo | current |
| [learnings/bun-hono/README.md](learnings/bun-hono/README.md) | Bun + Hono learnings index | 2025-12-29 | repo | current |
| [learnings/general/README.md](learnings/general/README.md) | General development learnings | 2025-12-29 | repo | current |
| [learnings/openbadges/README.md](learnings/openbadges/README.md) | OpenBadges-specific learnings | 2025-12-29 | repo | current |
| [learnings/typescript/README.md](learnings/typescript/README.md) | TypeScript learnings | 2025-12-29 | repo | current |
| [learnings/vue/README.md](learnings/vue/README.md) | Vue 3 learnings | 2025-12-29 | repo | current |

## Mockups

| Path | Description | Last Modified | Owner | Freshness |
| ---- | ----------- | ------------- | ----- | --------- |
| [mockups/openbadges-system-ui.html](mockups/openbadges-system-ui.html) | Full-page UI mockup (HTML) | 2026-01-17 | openbadges-system | current |
| [mockups/openbadges-system-ui/](mockups/openbadges-system-ui/) | Multi-page UI mockup set (6 HTML pages + CSS) | 2026-02-06 | openbadges-system | current |
