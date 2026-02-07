# Claude Code Agents & Skills

Custom agents and skills for domain-specific tasks. General workflows use [official plugins](https://github.com/anthropics/claude-code).

## Key Insight: Skills over Subagents

**Skills run inline** in the orchestrator context, avoiding context duplication that causes OOM with subagents. Subagents are only used when isolation is needed (broad codebase search, parallel review).

### Architecture

```
WORKFLOWS (Layer 3)
    │
    ├── Skill(setup)           ← inline, no context copy
    ├── Task(issue-researcher) ← subagent, returns compact plan
    ├── Skill(implement)       ← inline, no context copy
    ├── Skill(review)          ← inline, spawns review subagents
    │     ├── Task(code-reviewer)         ← parallel
    │     ├── Task(pr-test-analyzer)      ← parallel
    │     ├── Task(silent-failure-hunter)  ← parallel
    │     └── Task(auto-fixer)            ← for critical findings
    └── Skill(finalize)        ← inline, no context copy
```

### Roles

- **Human**: Approves at gates (gated workflows only)
- **Claude (Main)**: Orchestrates workflow, invokes skills inline, handles gates
- **Skills (Inline)**: Execute focused phases within orchestrator context
- **Agents (Subagents)**: Execute isolated tasks and return compact results

## Executor Skills (4)

These run **inline** via `Skill()` tool — no context duplication.

```
EXECUTOR SKILLS
──────────────────────────────────
setup      - Branch, board, notify
implement  - Atomic commits per plan
review     - Coordinate reviewers + auto-fix
finalize   - PR, board, notify
```

### setup (SKILL.md)

Prepares environment: fetches issue, creates branch, updates board, sends notification.

### implement (SKILL.md)

Executes dev plan with atomic commits. Minimal implementation philosophy - no over-engineering.

### review (SKILL.md)

Coordinates review agents (spawns as Task subagents), classifies findings, auto-fixes critical issues.

### finalize (SKILL.md)

Pushes branch, creates PR, updates board to "Blocked", sends notification.

## Custom Agents (10 Total)

These run as **subagents** via `Task()` tool — isolated context.

```
PLUGINS (Official)                    CUSTOM AGENTS (10 total)
──────────────────                    ────────────────────────────
feature-dev (exploration)             WORKFLOW (5):
pr-review-toolkit (pre-PR review)       issue-researcher
hookify (behavioral hooks)              pr-creator
context7 (library docs)                 review-handler
playwright (E2E testing)                auto-fixer
frontend-design (UI)                    milestone-planner
security-guidance
                                      DOMAIN (5):
                                        openbadges-expert
                                        openbadges-compliance-reviewer
                                        vue-hono-expert
                                        docs-assistant
                                        github-master
```

## Workflow Agents

### issue-researcher.md

Creates atomic commit plans from GitHub issues. Checks dependencies, assesses complexity, updates board. **Runs as subagent** because broad codebase search would bloat orchestrator context.

### pr-creator.md

Creates structured PRs. Triggers CodeRabbit, links issues. Can be used standalone.

### review-handler.md

Handles POST-PR review feedback from CodeRabbit, Claude, or humans. Implements fixes.

### auto-fixer.md

Applies fixes for critical findings from review agents. Spawned by review skill during auto-fix loop. Makes minimal, targeted fixes and validates before committing.

### milestone-planner.md

Analyzes GitHub milestones, builds dependency graphs, identifies parallelizable issues.

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
Skill(review) spawns:             CodeRabbit
  pr-review-toolkit               Claude review
  openbadges-compliance-reviewer
        ↓
    Skill(finalize)
        ↓
    review-handler (handles feedback)
```

## Deleted/Consolidated Agents

| Agent                   | Replaced By                          |
| ----------------------- | ------------------------------------ |
| setup-agent             | Skill(setup)                         |
| atomic-developer        | Skill(implement)                     |
| review-orchestrator     | Skill(review)                        |
| finalize-agent          | Skill(finalize)                      |
| dev-orchestrator        | Claude (main) handles orchestration  |
| feature-executor        | Skill(implement) (handles all sizes) |
| pr-finalizer            | Skill(finalize) (handles all cases)  |
| test-coverage-validator | Manual + pr-review-toolkit           |
| dependency-analyzer     | bun install + manual                 |
| documentation-updater   | docs-assistant (absorbed)            |
