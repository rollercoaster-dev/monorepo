# Claude Tools Architecture

A robust and flexible architecture for multi-agent workflows in Claude Code.

## Overview

This document defines the architecture for Claude Code tooling in this monorepo. It establishes clear boundaries between components, explicit contracts for agents, and patterns for building reliable workflows.

### Design Goals

| Goal           | Description                                                                       |
| -------------- | --------------------------------------------------------------------------------- |
| **Robust**     | Handles failures gracefully, resumes from interruptions, clear state management   |
| **Flexible**   | Easy to add workflows, agents composable in different orders, not tightly coupled |
| **Simple**     | Minimal orchestrator complexity, agents are self-sufficient, clear contracts      |
| **Debuggable** | State is traceable, each component is isolated, easy to identify failures         |

### Core Principles

1. **Single Responsibility**: Each component does ONE thing well
2. **Self-Sufficiency**: Agents manage their own state and checkpointing
3. **Composability**: Agents can be combined in any order to create workflows
4. **Explicit Contracts**: Clear inputs, outputs, and side effects for each agent
5. **Graceful Degradation**: Non-critical failures don't block progress

---

## The Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 3: WORKFLOWS                           │
│         Entry points that compose agents                        │
│                                                                 │
│  /auto-issue    /work-on-issue    /auto-milestone               │
│                                                                 │
│  Workflows are SIMPLE:                                          │
│  • Spawn agents via Task tool                                   │
│  • Handle gates (if gated workflow)                             │
│  • Handle escalation                                            │
│  • NO direct CLI commands                                       │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │ Task(agent, input)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 2: AGENTS                              │
│         Self-contained phase executors                          │
│                                                                 │
│  Each agent:                                                    │
│  • Has explicit INPUT contract                                  │
│  • Has explicit OUTPUT contract                                 │
│  • Manages own checkpointing                                    │
│  • Handles own errors                                           │
│  • Uses skills for reference                                    │
│  • Is idempotent (safe to re-run)                               │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │ Skill(name) for reference
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: SKILLS                              │
│         Shared knowledge and reference                          │
│                                                                 │
│  Skills are:                                                    │
│  • Reference documentation for CLI commands                     │
│  • IDs, patterns, and conventions                               │
│  • Loaded into agent context on-demand                          │
│  • NOT executors - just knowledge                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Skills

Skills provide shared knowledge that agents can reference. They are NOT executors.

### Skill Structure

```
.claude/skills/
├── board-manager/
│   └── SKILL.md          # GraphQL for board operations
└── ...
```

### Skill Usage Pattern

Skills are loaded into an agent's context via the Skill tool. The agent then uses the information to execute commands.

```markdown
# In agent prompt:

"Use the `board-manager` skill for GraphQL reference when updating the board."

# Agent's behavior:

1. Loads skill via Skill tool (gets documentation)
2. Reads GraphQL syntax from loaded content
3. Executes appropriate commands via Bash tool
```

### Current Skills

| Skill               | Purpose                  | Used By                     |
| ------------------- | ------------------------ | --------------------------- |
| `board-manager`     | Board mutation GraphQL   | setup-agent, finalize-agent |
| `board-status`      | Board query GraphQL      | milestone-planner           |
| `issue-fetcher`     | Issue fetch patterns     | setup-agent                 |
| `milestone-tracker` | Milestone query patterns | auto-milestone              |
| `pr-review-checker` | PR review query patterns | review-handler              |

### Skill Design Rules

1. **Documentation only**: Skills provide reference, not execution
2. **Complete examples**: Include full CLI syntax with placeholders
3. **ID references**: Include all relevant IDs (board, fields, options)
4. **Error patterns**: Document common errors and handling

---

## Layer 2: Agents

Agents are self-contained executors that own an entire phase of work.

### Agent Contract

Every agent MUST define:

```yaml
name: agent-name
description: What this agent does (one sentence)

INPUT:
  required:
    - field_name: type # What the agent needs
  optional:
    - field_name: type # Optional parameters

OUTPUT:
  - field_name: type # What the agent returns

SIDE_EFFECTS:
  - Description of side effect # What changes in the world

SKILLS_USED:
  - skill-name # Skills loaded for reference

ERROR_HANDLING:
  - condition: behavior # How errors are handled
```

### Agent Categories

#### Setup Agents

Prepare environment for work.

| Agent         | Purpose                                 |
| ------------- | --------------------------------------- |
| `setup-agent` | Create branch, checkpoint, add to board |

#### Research Agents

Analyze and plan work.

| Agent               | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `issue-researcher`  | Analyze codebase, create dev plan         |
| `milestone-planner` | Analyze milestone, build dependency graph |

#### Implementation Agents

Execute planned work.

| Agent              | Purpose                            |
| ------------------ | ---------------------------------- |
| `atomic-developer` | Implement plan with atomic commits |
| `auto-fixer`       | Apply fixes for review findings    |

#### Review Agents

Validate work quality.

| Agent                            | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `review-orchestrator`            | Coordinate review agents, classify findings |
| `code-reviewer`                  | Code quality and patterns                   |
| `test-analyzer`                  | Test coverage gaps                          |
| `silent-failure-hunter`          | Error handling issues                       |
| `openbadges-compliance-reviewer` | OB spec compliance                          |

#### Finalization Agents

Complete and publish work.

| Agent            | Purpose                         |
| ---------------- | ------------------------------- |
| `finalize-agent` | Create PR, update board, notify |
| `review-handler` | Process PR review comments      |

#### Utility Agents

Support operations.

| Agent            | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `github-master`  | GitHub operations (issues, PRs, branches) |
| `docs-assistant` | Documentation operations                  |

### Agent Design Rules

1. **Idempotent**: Safe to re-run (checks existing state first)
2. **Clear boundaries**: Does one phase, returns control to orchestrator
3. **Error isolation**: Agent failures don't corrupt other agents
4. **Skill-based**: Uses skills for reference, not hardcoded commands

### Agent File Structure

```markdown
---
name: agent-name
description: Brief description for Task tool
tools: Bash, Read, Write, Edit, Glob, Grep
model: sonnet
---

# Agent Name

## Contract

### Input

- `field`: type - description

### Output

- `field`: type - description

### Side Effects

- What changes in the world

## Workflow

### Phase 1: Name

1. Step description
2. Step description

### Phase 2: Name

...

## Skills Used

- `skill-name`: what for

## Error Handling

- Condition → Behavior

## Example
```

Input: { ... }
Output: { ... }

```

```

---

## Layer 3: Workflows

Workflows are simple orchestrators that compose agents.

### Workflow Structure

````markdown
# /command-name <arguments>

Brief description of workflow.

## Quick Reference

```bash
/command-name 123              # Basic usage
/command-name 123 --flag       # With options
```
````

## Configuration

| Flag | Default | Description |
| ---- | ------- | ----------- |

## Workflow

### Phase 1: Name

Task(agent-name):
Input: { field: value }
Output: { field: value }

### Phase 2: Name

Task(agent-name):
Input: { field: <from-phase-1> }
Output: { field: value }

## Gates (if gated)

GATE N: Description

- Show: what to display
- Wait for: "proceed" | "stop"

## Escalation

Condition → Behavior

## Flags

--flag: Description

````

### Workflow Design Rules

1. **No direct CLI**: Workflows only spawn agents via Task tool
2. **Clear phases**: Each phase maps to one agent
3. **Explicit data flow**: Show what passes between phases
4. **Minimal logic**: Gates and escalation only, no implementation

### Workflow Categories

#### Autonomous Workflows
No human gates, proceed until completion or escalation.

| Workflow | Description |
|----------|-------------|
| `/auto-issue` | Issue to PR, fully autonomous |
| `/auto-milestone` | Milestone to PRs, parallel execution |

#### Gated Workflows
Require human approval at checkpoints.

| Workflow | Description |
|----------|-------------|
| `/work-on-issue` | Issue to PR with approval gates |

#### Utility Workflows
Single-purpose operations.

| Workflow | Description |
|----------|-------------|
| `/worktree` | Worktree management |

---

## Agent Contracts (Detailed)

### setup-agent

```yaml
name: setup-agent
description: Prepares environment for issue work - branch, board

INPUT:
  required:
    - issue_number: number
  optional:
    - branch_name: string       # Auto-generated if not provided
    - skip_board: boolean       # Default: false
    - notify: boolean           # Default: true

OUTPUT:
  - branch: string
  - issue:
      number: number
      title: string
      body: string
      labels: string[]

SIDE_EFFECTS:
  - Creates git branch (or checks out existing)
  - Adds issue to board as "In Progress"
  - Sends Telegram notification (if notify=true)

SKILLS_USED:
  - board-manager: for board GraphQL mutations
  - issue-fetcher: for issue query patterns

ERROR_HANDLING:
  - Branch exists: checkout existing
  - Issue not found: return error, no side effects
  - Board update fails: warn and continue (non-critical)
````

### issue-researcher

```yaml
name: issue-researcher
description: Analyzes codebase and creates detailed development plan

INPUT:
  required:
    - issue_number: number
  optional:
    - issue_body: string # If already fetched by setup-agent

OUTPUT:
  - plan_path: string # Path to dev plan file
  - complexity: enum # TRIVIAL | SMALL | MEDIUM | LARGE
  - estimated_lines: number
  - commit_count: number
  - affected_files: string[]

SIDE_EFFECTS:
  - Creates dev plan at .claude/dev-plans/issue-{N}.md

ERROR_HANDLING:
  - Scope too large: flag in output, suggest splitting
  - Dependencies unmet: warn in plan, continue
```

### atomic-developer

```yaml
name: atomic-developer
description: Implements development plan with atomic commits

INPUT:
  required:
    - issue_number: number
    - plan_path: string
  optional:
    - start_step: number        # Resume from specific step
    - skip_validation: boolean  # Default: false

OUTPUT:
  - commits: array
      - sha: string
      - message: string
      - files: string[]
  - validation:
      type_check: boolean
      lint: boolean
      tests: boolean
      build: boolean

SIDE_EFFECTS:
  - Creates/modifies files per plan
  - Makes git commits

ERROR_HANDLING:
  - Validation fails: attempt fix, report in output
  - Merge conflict: stop immediately, return error
  - Plan deviation: note in output, continue if minor
```

### review-orchestrator

```yaml
name: review-orchestrator
description: Coordinates review agents and manages auto-fix loop

INPUT:
  optional:
    - skip_agents: string[]     # Agents to skip
    - max_retry: number         # Default: 3
    - parallel: boolean         # Default: true

OUTPUT:
  - findings: array
      - agent: string
      - severity: enum          # CRITICAL | HIGH | MEDIUM | LOW
      - file: string
      - line: number
      - message: string
      - fixed: boolean
  - summary:
      total: number
      critical: number
      fixed: number
      unresolved: number

SIDE_EFFECTS:
  - Spawns review agents
  - Spawns auto-fixer for critical findings

ERROR_HANDLING:
  - Agent fails: log, continue with others
  - All agents fail: escalate
  - Fix fails MAX_RETRY: add to unresolved
```

### finalize-agent

```yaml
name: finalize-agent
description: Creates PR, updates board, completes workflow

INPUT:
  required:
    - issue_number: number
  optional:
    - findings_summary: object # From review-orchestrator
    - force: boolean # Create PR even with issues

OUTPUT:
  - pr:
      number: number
      url: string
      title: string
  - board_status: string

SIDE_EFFECTS:
  - Pushes branch to remote
  - Creates GitHub PR
  - Updates board to "Blocked" (awaiting review)
  - Sends Telegram notification with PR link

SKILLS_USED:
  - board-manager: for status update

ERROR_HANDLING:
  - Push fails: return error (critical)
  - PR create fails: return error (critical)
  - Board update fails: warn, continue
  - Telegram fails: warn, continue
```

---

## Workflow Examples

### /auto-issue (Simplified)

```markdown
# /auto-issue <issue-number>

Fully autonomous issue-to-PR workflow.

## Workflow

### Phase 1: Setup

Task(setup-agent):
Input: { issue_number: <N> }
Output: { branch, issue }

### Phase 2: Research

Task(issue-researcher):
Input: { issue_number: <N> }
Output: { plan_path, complexity, commit_count }

If --dry-run: STOP, show plan, exit.

### Phase 3: Implement

Task(atomic-developer):
Input: { issue_number: <N>, plan_path: <from-phase-2> }
Output: { commits, validation }

### Phase 4: Review

Task(review-orchestrator):
Input: { }
Output: { findings, summary }

If summary.unresolved > 0: ESCALATE

### Phase 5: Finalize

Task(finalize-agent):
Input: { issue_number: <N>, findings_summary: <from-phase-4> }
Output: { pr }

## Escalation

When review-orchestrator returns unresolved critical findings:

1. Notify user via Telegram with findings list
2. Wait for response:
   - "continue": manual fix expected, re-run Phase 4
   - "force-pr": proceed to Phase 5 with issues flagged
   - "abort": delete branch, mark workflow failed
```

### /work-on-issue (Gated)

```markdown
# /work-on-issue <issue-number>

Gated workflow requiring human approval at each phase.

## Workflow

### Phase 1: Setup

Task(setup-agent):
Input: { issue_number: <N>, notify: true }
Output: { branch, issue }

**GATE 1: Issue Review**
Show: Full issue content
Wait for: "proceed"

### Phase 2: Research

Task(issue-researcher):
Input: { issue_number: <N> }
Output: { plan_path, complexity }

**GATE 2: Plan Review**
Show: Full development plan
Wait for: "proceed"

### Phase 3: Implement

For each commit in plan:
Make changes per plan step

**GATE 3: Commit Review** (per commit)
Show: git diff
Wait for: "proceed"

Commit changes

### Phase 4: Review

Task(review-orchestrator):
Input: { }
Output: { findings, summary }

**GATE 4: Pre-PR Review**
Show: Findings summary
Wait for: "proceed"

### Phase 5: Finalize

Task(finalize-agent):
Input: { issue_number: <N> }
Output: { pr }
```

---

## Migration Guide

### Phase 1: Create New Agents

Create these new agents that don't exist yet:

| Agent                 | Purpose                               | Priority |
| --------------------- | ------------------------------------- | -------- |
| `setup-agent`         | Extract setup logic from workflows    | HIGH     |
| `finalize-agent`      | Extract finalize logic from workflows | HIGH     |
| `review-orchestrator` | Coordinate reviews + auto-fix         | MEDIUM   |

### Phase 2: Enhance Existing Agents

Update existing agents to follow contracts:

| Agent              | Changes Needed                          |
| ------------------ | --------------------------------------- |
| `issue-researcher` | Add contract header, self-checkpoint    |
| `atomic-developer` | Add contract header, self-checkpoint    |
| `auto-fixer`       | Add contract header, log fix attempts   |
| `github-master`    | Split into setup-agent + finalize-agent |

### Phase 3: Simplify Workflows

Rewrite workflows to use agent composition:

| Workflow            | From       | To         |
| ------------------- | ---------- | ---------- |
| `auto-issue.md`     | 740 lines  | ~80 lines  |
| `work-on-issue.md`  | 474 lines  | ~100 lines |
| `auto-milestone.md` | 300+ lines | ~120 lines |

### Phase 4: Deprecate Old Patterns

Remove from workflows:

- Direct `gh` commands
- Inline GraphQL
- Manual board updates

---

## Appendix: Anti-Patterns

### Don't: Complex Logic in Workflows

```markdown
# BAD - workflow has complex logic

3b. If branch exists, skip. Otherwise create...
```

```markdown
# GOOD - workflow spawns agent

### Phase 1: Setup

Task(setup-agent):
Input: { issue_number: 485 }
```

### Don't: Agents Without Contracts

```markdown
# BAD - no clear contract

## Purpose

Does stuff with issues.

## Workflow

1. Do things
2. Do more things
```

```markdown
# GOOD - explicit contract

## Contract

### Input

- `issue_number`: number - The GitHub issue to process

### Output

- `plan_path`: string - Path to created dev plan

### Side Effects

- Creates file at .claude/dev-plans/issue-{N}.md
```

### Don't: Shared State Between Agents

```markdown
# BAD - agents share mutable state

Agent A writes to global variable
Agent B reads from global variable
```

```markdown
# GOOD - explicit data passing

Agent A returns { result: value }
Orchestrator passes to Agent B: { input: <from-A> }
```

### Don't: Silent Failures

```markdown
# BAD - failure not communicated

if (error) {
// ignore
}
```

```markdown
# GOOD - explicit error handling

ERROR_HANDLING:

- Board update fails: warn and continue (non-critical)
- Issue not found: return error, no side effects
```

---

## References

- [LangGraph State Management](https://sparkco.ai/blog/mastering-langgraph-state-management-in-2025)
- [Google ADK Multi-Agent Patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
- [Microservices IDEALS](https://www.infoq.com/articles/microservices-design-ideals/)
- [SOLID for Microservices](https://www.freecodecamp.org/news/solid-principles-for-microservices/)
