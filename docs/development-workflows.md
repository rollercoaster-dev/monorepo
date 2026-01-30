# Development Workflows

This document details the development workflows available in the monorepo.

---

## CRITICAL: Why These Workflows Exist

These workflows aren't bureaucracy - they're **guardrails that protect code quality and user control**.

### The Core Principle

**Every code change goes through a PR.** No exceptions.

This means:

- User can review before merge
- CI can validate before merge
- Rollback is trivial (close PR vs. revert commits)
- Code review catches bugs early

### What "Autonomous" Doesn't Mean

"Autonomous" mode removes **user approval gates** - it does NOT remove:

- Branch creation (still required)
- PR creation (still required)
- Review phase (still runs, just auto-fixes)
- The phases themselves (all still execute)

### Why This Saves Tokens

Counter-intuitively, following the workflow **reduces** total token usage:

| With Workflow                   | Without Workflow                    |
| ------------------------------- | ----------------------------------- |
| Research → understand once      | Trial-and-error → understand slowly |
| Atomic commits → small, focused | Big commits → hard to review/fix    |
| Review phase → catch bugs early | No review → bugs reach production   |
| PR → async CI review            | Direct commits → no safety net      |

---

## Workflow Overview

| Workflow   | Command                   | Use Case                                   |
| ---------- | ------------------------- | ------------------------------------------ |
| Gated      | `/work-on-issue <number>` | Supervised issue-to-PR with approval gates |
| Autonomous | `/auto-issue <number>`    | Fully automated issue-to-PR                |
| Milestone  | `/auto-milestone <name>`  | Parallel milestone execution               |
| Epic       | `/auto-epic <number>`     | Epic sub-issues with GitHub deps           |

## Gated Workflow (`/work-on-issue`)

Use for complex architectural changes or learning/teaching scenarios.

```text
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

```text
Phase 1: Research    → Fetch issue, create plan (NO GATE)
Phase 2: Implement   → atomic-developer executes plan (NO GATE)
Phase 3: Review      → pr-review-toolkit + auto-fix loop
Phase 4: Finalize    → Create PR (NO GATE)
ESCALATION           → Only if auto-fix fails MAX_RETRY times
```

## Milestone Workflow (`/auto-milestone`)

Use for batch processing entire milestones with dependency awareness.

```text
Phase 1: Plan    → claude -p milestone-planner → GATE (if dependencies unclear)
Phase 2: Execute → per-wave: launch claude -p /auto-issue N (Opus 4.5)
Phase 3: Review  → per-PR: CI → CodeRabbit → fix → Telegram approval → merge
Phase 4: Cleanup → remove worktrees, summary, notification
```

Run in tmux for SSH observability: `tmux new -s milestone && claude`

## Epic Workflow (`/auto-epic`)

Use for processing epic sub-issues with explicit GitHub dependencies.

```text
Phase 1: Plan    → read GitHub sub-issue graph → compute waves inline
Phase 2: Execute → per-wave: launch claude -p /auto-issue N (Opus 4.5)
Phase 3: Review  → per-PR: CI → CodeRabbit → fix → Telegram approval → merge
Phase 4: Cleanup → remove worktrees, update epic, summary, notification
```

## Workflow Selection Guide

| Scenario                           | `/work-on-issue` | `/auto-issue` | `/auto-milestone` | `/auto-epic` |
| ---------------------------------- | ---------------- | ------------- | ----------------- | ------------ |
| Complex architectural changes      | Yes              | No            | No                | No           |
| Simple feature, clear requirements | No               | Yes           | Yes (batch)       | No           |
| Learning/teaching mode             | Yes              | No            | No                | No           |
| Batch of routine fixes             | No               | Yes           | Yes               | No           |
| Entire milestone with deps mapped  | No               | No            | Yes               | No           |
| Epic with explicit GitHub deps     | No               | No            | No                | Yes          |

## Review Pipeline

```text
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
