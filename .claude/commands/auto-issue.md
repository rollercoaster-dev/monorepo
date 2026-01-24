# /auto-issue <issue-number>

Fully autonomous issue-to-PR workflow. Delegates to specialized agents.

**Mode:** Autonomous - no gates, auto-fix enabled, escalation only on unresolved critical findings.

## Quick Reference

```bash
/auto-issue 123                    # Full autonomous run
/auto-issue 123 --dry-run          # Research only, show plan
/auto-issue 123 --force-pr         # Create PR even with issues
/auto-issue 123 --skip-review      # Skip review phase
```

## Workflow

```text
Phase 1: Setup     → setup-agent
Phase 2: Research  → issue-researcher
Phase 3: Implement → atomic-developer
Phase 4: Review    → review-orchestrator
Phase 5: Finalize  → finalize-agent
```

---

## Task System Integration

Native task tracking provides progress visualization during autonomous execution. Tasks are supplementary to the checkpoint system (which remains source of truth).

### Task Creation Pattern

Create ALL tasks upfront after Phase 1 Setup completes:

```text
After Phase 1 Setup completes, create all tasks at once:

  setup = TaskCreate({
    subject: "Setup: Initialize #<N>",
    description: "Create branch, checkpoint, update board",
    activeForm: "Setting up issue #<N>",
    metadata: { issueNumber: <N>, workflowId, phase: "setup" }
  })
  TaskUpdate(setup, { status: "completed" })  # Already done

  research = TaskCreate({
    subject: "Research: Analyze #<N>",
    description: "Analyze codebase, create development plan",
    activeForm: "Researching issue #<N>",
    metadata: { issueNumber: <N>, workflowId, phase: "research" }
  })
  TaskUpdate(research, { addBlockedBy: [setup] })

  implement = TaskCreate({
    subject: "Implement: Build #<N>",
    description: "Implement changes with atomic commits",
    activeForm: "Implementing issue #<N>",
    metadata: { issueNumber: <N>, workflowId, phase: "implement" }
  })
  TaskUpdate(implement, { addBlockedBy: [research] })

  review = TaskCreate({
    subject: "Review: Validate #<N>",
    description: "Run review agents, auto-fix critical findings",
    activeForm: "Reviewing issue #<N>",
    metadata: { issueNumber: <N>, workflowId, phase: "review" }
  })
  TaskUpdate(review, { addBlockedBy: [implement] })

  finalize = TaskCreate({
    subject: "Finalize: Create PR for #<N>",
    description: "Push branch, create PR, update board",
    activeForm: "Finalizing issue #<N>",
    metadata: { issueNumber: <N>, workflowId, phase: "finalize" }
  })
  TaskUpdate(finalize, { addBlockedBy: [review] })

  TaskList() → Show full workflow tree immediately
```

### Task Updates During Workflow

Update status as phases progress (autonomous - no user interaction):

```text
Starting Research:
  TaskUpdate(research, { status: "in_progress" })

Research Complete:
  TaskUpdate(research, { status: "completed" })
  TaskUpdate(implement, { status: "in_progress" })

Implementation Complete:
  TaskUpdate(implement, { status: "completed" })
  TaskUpdate(review, { status: "in_progress" })

Review Complete:
  TaskUpdate(review, { status: "completed" })
  TaskUpdate(finalize, { status: "in_progress" })

PR Created:
  TaskUpdate(finalize, { status: "completed" })
  TaskList() → Show final progress summary
```

### Progress Visualization

Display progress at phase transitions with `TaskList()`:

```text
Issue #123 Progress:
├─ Setup: Initialize #123     [COMPLETED] ✓
├─ Research: Analyze #123     [COMPLETED] ✓
├─ Implement: Build #123      [IN_PROGRESS] ...
├─ Review: Validate #123      [PENDING, blocked by Implement]
└─ Finalize: Create PR #123   [PENDING, blocked by Review]
```

### Key Points

- **Checkpoint remains source of truth** - Tasks provide UI only
- **blockedBy enforces sequence** - Visualizes workflow order
- **Tasks are supplementary** - Workflow continues if task operations fail
- **Metadata links to checkpoint** - Enables cross-reference for debugging

---

## Phase 1: Setup

**Agent:** `setup-agent`

```text
Task(setup-agent):
  Input:  { issue_number: <N> }
  Output: { workflow_id, branch, issue }
```

The setup-agent will:

- Fetch issue details
- Create feature branch
- Create checkpoint workflow
- Add issue to board as "In Progress"
- Send Telegram notification

**On error:** Report and exit.

---

## Phase 2: Research

**Agent:** `issue-researcher`

```text
Task(issue-researcher):
  Input:  { issue_number: <N>, workflow_id: <from-phase-1> }
  Output: { plan_path, complexity, commit_count }
```

The issue-researcher will:

- Analyze codebase using graph queries
- Check dependencies
- Create dev plan at `.claude/dev-plans/issue-<N>.md`
- Log plan creation to checkpoint

**If `--dry-run`:** Stop here, display plan, exit.

**If blockers found:** Warn but continue (autonomous mode).

---

## Phase 3: Implement

**Agent:** `atomic-developer`

```text
Task(atomic-developer):
  Input:  { issue_number: <N>, workflow_id, plan_path: <from-phase-2> }
  Output: { commits, validation }
```

The atomic-developer will:

- Implement each step in the plan
- Make atomic commits
- Run validation after each commit
- Log commits to checkpoint

**On validation failure:** Attempt inline fix, continue.

---

## Phase 4: Review

**Agent:** `review-orchestrator`

```text
Task(review-orchestrator):
  Input:  { workflow_id }
  Output: { findings, summary }
```

**If `--skip-review`:** Skip to Phase 5.

The review-orchestrator will:

- Spawn review agents in parallel
- Classify findings by severity
- Auto-fix critical findings (up to 3 attempts each)
- Return summary with unresolved findings

**If `summary.unresolved > 0`:** Escalate (see below).

---

## Phase 5: Finalize

**Agent:** `finalize-agent`

```text
Task(finalize-agent):
  Input:  { issue_number: <N>, workflow_id, findings_summary: <from-phase-4> }
  Output: { pr }
```

The finalize-agent will:

- Run final validation
- Clean up dev plan file
- Push branch
- Create PR
- Update board to "Blocked"
- Mark workflow complete
- Send Telegram notification with PR link

---

## Escalation

Triggered when `review-orchestrator` returns unresolved critical findings.

**Notify user via Telegram:**

```text
ESCALATION: Issue #<N>

Unresolved critical findings:
1. [agent] file:line - message
2. [agent] file:line - message

Options:
- "continue" - I'll fix manually, then re-run review
- "force-pr" - Create PR with issues flagged
- "abort" - Delete branch and exit
```

**Handle response:**

- `continue` → Wait, then re-run Phase 4
- `force-pr` → Proceed to Phase 5 with `force: true`
- `abort` → Delete branch, mark workflow failed, exit

---

## Flags

| Flag            | Effect                                |
| --------------- | ------------------------------------- |
| `--dry-run`     | Stop after Phase 2, show plan         |
| `--force-pr`    | Create PR even with unresolved issues |
| `--skip-review` | Skip Phase 4 entirely                 |

---

## Error Handling

| Error              | Behavior                                  |
| ------------------ | ----------------------------------------- |
| Issue not found    | Report error, exit                        |
| Branch conflict    | Checkout existing, find existing workflow |
| Agent failure      | Report error, exit (critical)             |
| Validation failure | Attempt fix, continue if possible         |

---

## Success Criteria

Workflow succeeds when:

- PR is created
- Board updated to "Blocked"
- Telegram notification sent
- Workflow marked complete

---

## Agents Summary

| Phase | Agent                 | Purpose                   |
| ----- | --------------------- | ------------------------- |
| 1     | `setup-agent`         | Branch, checkpoint, board |
| 2     | `issue-researcher`    | Analyze, plan             |
| 3     | `atomic-developer`    | Implement, commit         |
| 4     | `review-orchestrator` | Review, fix               |
| 5     | `finalize-agent`      | PR, cleanup               |

See `.claude/docs/agent-architecture.md` for full agent contracts.
