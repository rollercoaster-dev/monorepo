# Claude Code Agents

Custom agents for domain-specific tasks. General workflows use [official plugins](https://github.com/anthropics/claude-code).

## Architecture

```
PLUGINS (Official)                    CUSTOM AGENTS (12 total)
──────────────────                    ────────────────────────────
feature-dev (exploration)             WORKFLOW (7):
pr-review-toolkit (pre-PR review)       issue-researcher
hookify (behavioral hooks)              atomic-developer
context7 (library docs)                 feature-executor
playwright (E2E testing)                dev-orchestrator
frontend-design (UI)                    pr-creator
security-guidance                       pr-finalizer
                                        review-handler

                                      DOMAIN (5):
                                        openbadges-expert
                                        openbadges-compliance-reviewer
                                        vue-hono-expert
                                        docs-assistant
                                        github-master
```

## Plugin vs Agent Strategy

| Tool                 | Purpose                                  |
| -------------------- | ---------------------------------------- |
| **feature-dev**      | Architecture exploration, design options |
| **issue-researcher** | GitHub issue → atomic commit plan        |
| **atomic-developer** | Small implementations (1-4 commits)      |
| **feature-executor** | Large implementations (4+ commits)       |
| **dev-orchestrator** | Full workflow coordination               |
| **pr-creator**       | Standard PR creation                     |
| **pr-finalizer**     | Comprehensive PRs for complex work       |
| **review-handler**   | Handle POST-PR review feedback           |

## Issue → PR Workflow

```
/work-on-issue #123
    │
    ├─► issue-researcher (plan)
    │   └─► .claude/dev-plans/issue-123.md
    │
    ├─► feature-dev (optional, complex architecture)
    │
    ├─► COMPLEXITY CHECK
    │   ├─ SMALL → atomic-developer
    │   └─ LARGE → feature-executor
    │
    ├─► pr-review-toolkit (pre-PR)
    │
    ├─► COMPLEXITY CHECK
    │   ├─ SIMPLE → pr-creator
    │   └─ COMPLEX → pr-finalizer
    │
    └─► review-handler (post-PR feedback)
```

## Workflow Agents

### issue-researcher.md

Creates atomic commit plans from GitHub issues. Checks dependencies, assesses complexity, updates board.

### atomic-developer.md

Executes plans with atomic commits. Minimal implementation philosophy - no over-engineering.

### feature-executor.md

Executes complex multi-step work. Interactive mode, progress tracking, comprehensive validation.

### dev-orchestrator.md

Coordinates full issue→PR workflow. Routes to appropriate agents based on complexity.

### pr-creator.md

Creates structured PRs for simple work. Triggers CodeRabbit, links issues.

### pr-finalizer.md

Creates comprehensive PRs for complex work. Multi-issue closing, documentation updates.

### review-handler.md

Handles POST-PR review feedback from CodeRabbit, Claude, or humans. Implements fixes.

## Domain Agents

### openbadges-expert.md

OB2/OB3 specification guidance for badge-related questions.

### openbadges-compliance-reviewer.md

Validates OB spec compliance before PR.

### vue-hono-expert.md

Vue 3 + Bun/Hono stack patterns.

### docs-assistant.md

Documentation search, creation, and updates.

### github-master.md

GitHub project board management.

## Review Pipeline

```
LOCAL (pre-PR)                    CI (post-PR)
────────────────────────          ─────────────────
pr-review-toolkit                 CodeRabbit
openbadges-compliance-reviewer    Claude review
        ↓
    pr-creator/finalizer
        ↓
    review-handler (handles feedback)
```

## Deleted Agents

| Agent                   | Replaced By                |
| ----------------------- | -------------------------- |
| test-coverage-validator | Manual + pr-review-toolkit |
| dependency-analyzer     | bun install + manual       |
| documentation-updater   | docs-assistant (absorbed)  |
