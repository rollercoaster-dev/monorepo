# Development Workflows

This document details the development workflows available in the monorepo.

## Workflow Overview

| Workflow   | Command                   | Use Case                                   |
| ---------- | ------------------------- | ------------------------------------------ |
| Gated      | `/work-on-issue <number>` | Supervised issue-to-PR with approval gates |
| Autonomous | `/auto-issue <number>`    | Fully automated issue-to-PR                |
| Milestone  | `/auto-milestone <name>`  | Parallel milestone execution               |

## Gated Workflow (`/work-on-issue`)

Use for complex architectural changes or learning/teaching scenarios.

```
GATE 1: Issue Review → Fetch issue, check blockers
GATE 2: Feature Dev  → 7-phase workflow with plan review
GATE 3: Pre-PR Review → pr-review-toolkit + openbadges-compliance
GATE 4: Create PR    → CI takes over (CodeRabbit + Claude)
```

### Gate Behavior

At each gate:

1. Show complete information (not summaries)
2. Wait for explicit approval ("proceed", "yes", "approved")
3. Do not batch multiple gates
4. Do not assume approval

## Autonomous Workflow (`/auto-issue`)

Use for simple features with clear requirements.

```
Phase 1: Research    → Fetch issue, create plan (NO GATE)
Phase 2: Implement   → atomic-developer executes plan (NO GATE)
Phase 3: Review      → pr-review-toolkit + auto-fix loop
Phase 4: Finalize    → Create PR (NO GATE)
ESCALATION           → Only if auto-fix fails MAX_RETRY times
```

## Milestone Workflow (`/auto-milestone`)

Use for batch processing entire milestones with dependency awareness.

```
Phase 1: Plan        → Analyze dependencies, identify free issues
   GATE: If dependencies unclear → STOP for approval
Phase 2: Execute     → Spawn parallel /auto-issue in worktrees (default: 3)
Phase 3: Review      → Poll all PRs, dispatch parallel fixes
Phase 4: Merge       → Merge in dependency order, handle conflicts
Phase 5: Cleanup     → Remove worktrees, report summary
```

Run in tmux for SSH observability: `tmux new -s milestone && claude`

## Workflow Selection Guide

| Scenario                           | `/work-on-issue` | `/auto-issue` | `/auto-milestone` |
| ---------------------------------- | ---------------- | ------------- | ----------------- |
| Complex architectural changes      | Yes              | No            | No                |
| Simple feature, clear requirements | No               | Yes           | Yes (batch)       |
| Learning/teaching mode             | Yes              | No            | No                |
| Batch of routine fixes             | No               | Yes           | Yes               |
| Entire milestone with deps mapped  | No               | No            | Yes               |

## Review Pipeline

```
LOCAL (pre-PR)                    CI (post-PR)
────────────────────────          ─────────────────
pr-review-toolkit:code-reviewer   CodeRabbit
pr-review-toolkit:pr-test-analyzer   Claude review
pr-review-toolkit:silent-failure-hunter
openbadges-compliance-reviewer
```

## Agent & Plugin Architecture

This project uses a **plugin-first architecture** - official Claude Code plugins handle common workflows, with custom agents only for domain-specific needs.

### Plugins Used

| Plugin            | Purpose                                   |
| ----------------- | ----------------------------------------- |
| pr-review-toolkit | Pre-PR code review (6 specialized agents) |
| feature-dev       | 7-phase feature development workflow      |
| hookify           | Create behavioral hooks                   |
| context7          | Library documentation lookup              |
| playwright        | E2E testing and browser automation        |
| frontend-design   | Production UI generation                  |
| security-guidance | Security analysis                         |

### Custom Agents (Domain-Specific)

| Agent                          | Purpose                                  |
| ------------------------------ | ---------------------------------------- |
| openbadges-expert              | OB2/OB3 spec guidance                    |
| openbadges-compliance-reviewer | Pre-PR spec validation                   |
| vue-hono-expert                | Vue 3 + Bun/Hono stack patterns          |
| docs-assistant                 | Documentation search, creation, updates  |
| github-master                  | Board/milestone/issue management         |
| milestone-planner              | Dependency graph analysis, wave planning |

## Orchestrator-Worker Pattern

Claude (main) is the orchestrator. Worker agents handle focused tasks.

- Main Claude handles all gates and user interaction
- Worker agents execute focused tasks and return
- Worker agents cannot stop mid-task for approval
- Only main Claude can show output and wait for user
