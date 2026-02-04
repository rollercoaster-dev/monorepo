# Claude Tools Architecture

A robust and flexible architecture for multi-agent workflows in Claude Code.

## Overview

This document defines the architecture for Claude Code tooling in this monorepo. It establishes clear boundaries between components, explicit contracts, and patterns for building reliable workflows.

### Design Goals

| Goal           | Description                                                                           |
| -------------- | ------------------------------------------------------------------------------------- |
| **Robust**     | Handles failures gracefully, resumes from interruptions, clear state management       |
| **Flexible**   | Easy to add workflows, components composable in different orders, not tightly coupled |
| **Simple**     | Minimal orchestrator complexity, clear contracts                                      |
| **Debuggable** | State is traceable, each component is isolated, easy to identify failures             |
| **Efficient**  | Skills run inline to avoid context duplication; subagents only for isolated work      |

### Core Principles

1. **Single Responsibility**: Each component does ONE thing well
2. **Inline by Default**: Use skills (inline) unless isolation is needed
3. **Composability**: Components can be combined in any order to create workflows
4. **Explicit Contracts**: Clear inputs, outputs, and side effects for each component
5. **Graceful Degradation**: Non-critical failures don't block progress

---

## The Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 3: WORKFLOWS                           │
│         Entry points that compose skills and agents             │
│                                                                 │
│  /auto-issue    /work-on-issue    /auto-milestone               │
│                                                                 │
│  Workflows:                                                     │
│  • Invoke skills inline via Skill tool                          │
│  • Spawn isolated agents via Task tool (research only)          │
│  • Handle gates (if gated workflow)                             │
│  • Handle escalation                                            │
│  • Pass data between phases                                     │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │ Skill(name) inline  │  Task(agent) isolated
                        ▼                     ▼
┌────────────────────────────────┐ ┌──────────────────────────────┐
│       LAYER 2a: SKILLS         │ │     LAYER 2b: AGENTS         │
│    Inline phase executors      │ │   Isolated phase executors   │
│                                │ │                              │
│  Run in orchestrator context:  │ │  Run in separate context:    │
│  • No context duplication      │ │  • Own context window        │
│  • Direct tool access          │ │  • Returns compact result    │
│  • Orchestrator sees all state │ │  • Good for broad search     │
│                                │ │                              │
│  setup, implement, review,     │ │  issue-researcher,           │
│  finalize                      │ │  auto-fixer                  │
└────────────────────────────────┘ └──────────────────────────────┘
                        │
                        │ Skill(name) for reference
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: REFERENCE SKILLS                    │
│         Shared knowledge and reference                          │
│                                                                 │
│  Skills are:                                                    │
│  • Reference documentation for CLI commands                     │
│  • IDs, patterns, and conventions                               │
│  • Loaded into context on-demand                                │
│  • NOT executors - just knowledge                               │
│                                                                 │
│  board-manager, board-status, issue-fetcher,                    │
│  milestone-tracker, pr-review-checker, telegram                 │
└─────────────────────────────────────────────────────────────────┘
```

### Skills vs Agents: When to Use Which

| Use Case                     | Mechanism            | Why                                                   |
| ---------------------------- | -------------------- | ----------------------------------------------------- |
| Setup (branch, board)        | **Skill** (inline)   | Small scope, no search bloat                          |
| Research (codebase analysis) | **Agent** (subagent) | Broad search would bloat orchestrator context         |
| Implementation               | **Skill** (inline)   | Orchestrator needs to see commits, handle errors      |
| Review coordination          | **Skill** (inline)   | But spawns review agents as Task subagents internally |
| Individual reviewers         | **Agent** (subagent) | Independent, parallel, isolated results               |
| Finalization (PR, board)     | **Skill** (inline)   | Small scope, no search bloat                          |
| Auto-fix                     | **Agent** (subagent) | Isolated fix attempts, safe to retry                  |

---

## Layer 1: Reference Skills

Reference skills provide shared knowledge that other skills and agents can load. They are NOT executors.

### Current Reference Skills

| Skill               | Purpose                  | Used By                     |
| ------------------- | ------------------------ | --------------------------- |
| `board-manager`     | Board mutation GraphQL   | setup skill, finalize skill |
| `board-status`      | Board query GraphQL      | milestone-planner           |
| `issue-fetcher`     | Issue fetch patterns     | setup skill                 |
| `milestone-tracker` | Milestone query patterns | auto-milestone              |
| `pr-review-checker` | PR review query patterns | review-handler              |
| `telegram`          | Telegram notifications   | setup skill, finalize skill |

---

## Layer 2a: Executor Skills (Inline)

Executor skills run inline in the orchestrator's context. They do NOT create subagents (except review, which spawns Task subagents for reviewers).

### setup

```yaml
name: setup
description: Prepares environment for issue work - branch, board

INPUT:
  required:
    - issue_number: number
  optional:
    - branch_name: string
    - skip_board: boolean
    - skip_notify: boolean

OUTPUT:
  - branch: string
  - issue: { number, title, body, labels }

SIDE_EFFECTS:
  - Creates git branch (or checks out existing)
  - Adds issue to board as "In Progress"
  - Sends Telegram notification
```

### implement

```yaml
name: implement
description: Implements development plan with atomic commits

INPUT:
  required:
    - issue_number: number
    - plan_path: string
  optional:
    - workflow_id: string
    - start_step: number

OUTPUT:
  - commits: [{ sha, message, files }]
  - validation: { type_check, lint, tests, build }

SIDE_EFFECTS:
  - Creates/modifies files per plan
  - Makes git commits
```

### review

```yaml
name: review
description: Coordinates review agents and manages auto-fix loop

INPUT:
  required:
    - workflow_id: string
  optional:
    - skip_agents: string[]
    - max_retry: number # Default: 3
    - parallel: boolean # Default: true

OUTPUT:
  - findings: [{ agent, severity, file, line, message, fixed }]
  - summary: { total, critical, fixed, unresolved }

SIDE_EFFECTS:
  - Spawns review agents (as Task subagents)
  - Spawns auto-fixer for critical findings
  - Creates fix commits

INTERNAL_SUBAGENTS:
  - pr-review-toolkit:code-reviewer
  - pr-review-toolkit:pr-test-analyzer
  - pr-review-toolkit:silent-failure-hunter
  - openbadges-compliance-reviewer (if badge code detected)
  - auto-fixer (for critical findings)
```

### finalize

```yaml
name: finalize
description: Creates PR, updates board, completes workflow

INPUT:
  required:
    - issue_number: number
  optional:
    - findings_summary: object
    - force: boolean
    - skip_board: boolean
    - skip_notify: boolean

OUTPUT:
  - pr: { number, url, title }
  - board_status: string

SIDE_EFFECTS:
  - Pushes branch to remote
  - Creates GitHub PR
  - Updates board to "Blocked" (awaiting review)
  - Sends Telegram notification with PR link
```

---

## Layer 2b: Agents (Isolated Subagents)

Agents run in isolated contexts via the Task tool. Used when broad search or isolation is needed.

### Research Agents

| Agent               | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `issue-researcher`  | Analyze codebase, create dev plan         |
| `milestone-planner` | Analyze milestone, build dependency graph |

### Review Agents (spawned by review skill)

| Agent                            | Purpose                   |
| -------------------------------- | ------------------------- |
| `code-reviewer`                  | Code quality and patterns |
| `pr-test-analyzer`               | Test coverage gaps        |
| `silent-failure-hunter`          | Error handling issues     |
| `openbadges-compliance-reviewer` | OB spec compliance        |

### Utility Agents

| Agent            | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `auto-fixer`     | Apply fixes for review findings           |
| `pr-creator`     | Create structured PRs (standalone use)    |
| `review-handler` | Process PR review comments                |
| `github-master`  | GitHub operations (issues, PRs, branches) |
| `docs-assistant` | Documentation operations                  |

### Domain Agents

| Agent                            | Purpose                    |
| -------------------------------- | -------------------------- |
| `openbadges-expert`              | OB2/OB3 specification help |
| `openbadges-compliance-reviewer` | OB spec compliance review  |
| `vue-hono-expert`                | Vue 3 + Bun/Hono patterns  |

---

## Layer 3: Workflows

Workflows are orchestrators that compose skills and agents.

### Workflow Categories

#### Autonomous Workflows

No human gates, proceed until completion or escalation.

| Workflow          | Description                          |
| ----------------- | ------------------------------------ |
| `/auto-issue`     | Issue to PR, fully autonomous        |
| `/auto-milestone` | Milestone to PRs, parallel execution |

#### Gated Workflows

Require human approval at checkpoints.

| Workflow         | Description                     |
| ---------------- | ------------------------------- |
| `/work-on-issue` | Issue to PR with approval gates |

### Workflow Design Rules

1. **Skills inline**: Use `Skill(name)` for phases that don't need isolation
2. **Agents for isolation**: Use `Task(agent)` only when broad search or parallelism is needed
3. **Clear phases**: Each phase maps to one skill or agent
4. **Explicit data flow**: Show what passes between phases
5. **Minimal logic**: Gates and escalation only, no implementation detail

---

## Workflow Examples

### /auto-issue (Autonomous)

```text
Phase 1: Skill(setup)           → { branch, issue }
Phase 2: Task(issue-researcher) → { plan_path }      ← subagent
Phase 3: Skill(implement)       → { commits }
Phase 4: Skill(review)          → { findings }        ← spawns Task subagents internally
Phase 5: Skill(finalize)        → { pr }

If Phase 4 has unresolved criticals → ESCALATE
```

### /work-on-issue (Gated)

```text
Phase 1: Skill(setup)           → GATE 1 (Issue Review)
Phase 2: Task(issue-researcher) → GATE 2 (Plan Review)   ← subagent
Phase 3: (orchestrator inline)  → GATE 3 (per Commit)
Phase 4: Skill(review)          → GATE 4 (Pre-PR Review)  ← spawns Task subagents
Phase 5: Skill(finalize)        → Done
```

---

## Anti-Patterns

### Don't: Use Subagents for Small-Scoped Work

```markdown
# BAD - subagent for simple branch creation

Task(setup-agent): "Create branch for issue 123"

# GOOD - inline skill

Skill(setup): "Create branch for issue 123"
```

### Don't: Run Broad Search Inline

```markdown
# BAD - search bloats orchestrator context

Read 50 files, Grep 30 patterns inline

# GOOD - isolated subagent returns compact result

Task(issue-researcher): "Analyze issue 123"
→ Returns: { plan_path: ".claude/dev-plans/issue-123.md" }
```

### Don't: Shared State Between Components

```markdown
# BAD - components share mutable state

Skill A writes to global variable
Agent B reads from global variable

# GOOD - explicit data passing

Skill A returns { result: value }
Orchestrator passes to Agent B: { input: <from-A> }
```

---

## Deleted Agents (Replaced by Skills)

| Former Agent          | Replaced By        | Why                               |
| --------------------- | ------------------ | --------------------------------- |
| `setup-agent`         | `Skill(setup)`     | Small scope, no context bloat     |
| `atomic-developer`    | `Skill(implement)` | Orchestrator needs to see commits |
| `review-orchestrator` | `Skill(review)`    | Orchestrator handles escalation   |
| `finalize-agent`      | `Skill(finalize)`  | Small scope, no context bloat     |

Previously deleted agents:

| Agent                   | Replaced By                         |
| ----------------------- | ----------------------------------- |
| dev-orchestrator        | Claude (main) handles orchestration |
| feature-executor        | implement skill (handles all sizes) |
| pr-finalizer            | finalize skill (handles all cases)  |
| test-coverage-validator | Manual + pr-review-toolkit          |
| dependency-analyzer     | bun install + manual                |
| documentation-updater   | docs-assistant (absorbed)           |

---

## References

- [LangGraph State Management](https://sparkco.ai/blog/mastering-langgraph-state-management-in-2025)
- [Google ADK Multi-Agent Patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
- [Microservices IDEALS](https://www.infoq.com/articles/microservices-design-ideals/)
- [SOLID for Microservices](https://www.freecodecamp.org/news/solid-principles-for-microservices/)
