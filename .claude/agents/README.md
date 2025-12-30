# Claude Code Agents

Custom agents for domain-specific tasks. General workflows use [official plugins](https://github.com/anthropics/claude-code).

## Key Insight: Orchestrator-Worker Pattern

**Claude (main) is the orchestrator.** Worker agents handle focused tasks.

Subagents CANNOT stop mid-task and wait for approval. They complete their task and return.

Therefore: **Claude (main) handles ALL gates**, worker agents do focused work and return.

### Roles

- **Human**: Approves at each gate
- **Claude (Main)**: Orchestrates workflow, handles gates, spawns workers
- **Worker Agents**: Execute focused tasks and return results

### Architecture Diagram

```
Human (You) - approves at each gate
    │
    ▼
Claude (Main) - THE ORCHESTRATOR - handles gates
    │
    ├── /work-on-issue 123
    │       │
    │       ▼
    │   ╔═══════════════════╗
    │   ║  GATE 1: Issue    ║ ← Claude shows full issue
    │   ╚═════════╤═════════╝
    │             ▼
    │   [issue-researcher] → returns plan
    │             │
    │             ▼
    │   ╔═══════════════════╗
    │   ║  GATE 2: Plan     ║ ← Claude shows full plan
    │   ╚═════════╤═════════╝
    │             ▼
    │   For each commit:
    │     [atomic-developer] → returns diff
    │             │
    │             ▼
    │     ╔═══════════════════╗
    │     ║  GATE 3: Commit   ║ ← Claude shows diff
    │     ╚═══════════════════╝
    │             ▼
    │   [pr-review-toolkit]
    │             │
    │             ▼
    │   ╔═══════════════════╗
    │   ║  GATE 4: Review   ║ ← Claude shows findings
    │   ╚═════════╤═════════╝
    │             ▼
    └── [pr-creator] → PR created
```

## Agent Inventory (9 Total)

```
PLUGINS (Official)                    CUSTOM AGENTS (9 total)
──────────────────                    ────────────────────────────
feature-dev (exploration)             WORKFLOW (4):
pr-review-toolkit (pre-PR review)       issue-researcher
hookify (behavioral hooks)              atomic-developer
context7 (library docs)                 pr-creator
playwright (E2E testing)                review-handler
frontend-design (UI)
security-guidance                     DOMAIN (5):
                                        openbadges-expert
                                        openbadges-compliance-reviewer
                                        vue-hono-expert
                                        docs-assistant
                                        github-master
```

## Workflow Agents

### issue-researcher.md

Creates atomic commit plans from GitHub issues. Checks dependencies, assesses complexity, updates board.

### atomic-developer.md

Executes plans with atomic commits. Minimal implementation philosophy - no over-engineering. Handles both small and large work.

### pr-creator.md

Creates structured PRs. Triggers CodeRabbit, links issues. Handles both simple and complex PRs.

### review-handler.md

Handles POST-PR review feedback from CodeRabbit, Claude, or humans. Implements fixes.

## Domain Agents

### openbadges-expert.md

OB2/OB3 specification guidance for badge-related questions.

### openbadges-compliance-reviewer.md

Validates OB spec compliance before PR. Uses Opus model for authoritative review.

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
    pr-creator
        ↓
    review-handler (handles feedback)
```

## Deleted/Consolidated Agents

| Agent                   | Replaced By                          |
| ----------------------- | ------------------------------------ |
| dev-orchestrator        | Claude (main) handles orchestration  |
| feature-executor        | atomic-developer (handles all sizes) |
| pr-finalizer            | pr-creator (handles all complexity)  |
| test-coverage-validator | Manual + pr-review-toolkit           |
| dependency-analyzer     | bun install + manual                 |
| documentation-updater   | docs-assistant (absorbed)            |
