# /auto-milestone $ARGUMENTS

Autonomous milestone-to-PRs workflow. Validates dependencies, spawns sequential /auto-issue workers by default, handles reviews, merges in order.

**Mode:** Autonomous with planning gate - only stops if dependencies are unclear.

**Recommended:** Run in tmux for remote observability:

```bash
tmux new -s milestone
claude
/auto-milestone "OB3 Phase 1"
```

---

## CRITICAL: Branch Isolation is Non-Negotiable

**YOU MUST NEVER commit directly to `main` during this workflow.**

### Why Branch Isolation Matters

1. **Review Quality** - Each issue gets its own PR with focused code review. Committing to main bypasses all review.
2. **Rollback Safety** - If an issue's implementation is wrong, we can close the PR. Direct commits to main require reverts.
3. **Dependency Tracking** - The workflow tracks which issues depend on others. Direct commits break this graph.
4. **User Control** - The user can review each PR before it merges. Direct commits remove user control entirely.
5. **Token Efficiency** - PRs allow asynchronous CI review. The workflow can move on while CI runs.

### What Happens If You Bypass

- Code quality degrades (no focused review)
- User loses ability to approve/reject changes
- Rollbacks become painful (revert commits vs. close PR)
- You break the trust the user placed in you
- The workflow loses all its value

### The Correct Pattern

```text
Issue #123 → feat/issue-123-... branch → PR #456 → Review → Merge to main
Issue #124 → feat/issue-124-... branch → PR #457 → Review → Merge to main

NEVER: Issue #123 → commit directly to main
```

## Quick Reference

```bash
/auto-milestone "OB3 Phase 1"              # All issues in milestone (sequential)
/auto-milestone 153 154 155                # Specific issues (space-separated)
/auto-milestone 153,154,155                # Specific issues (comma-separated)
/auto-milestone "Badge Generator" --dry-run # Analyze only, show plan
/auto-milestone "OB3 Phase 1" --parallel 3  # Run 3 issues concurrently
/auto-milestone "OB3 Phase 1" --wave 1      # Only run first wave
```

## Configuration

| Setting        | Default | Description                  |
| -------------- | ------- | ---------------------------- |
| `--parallel`   | 1       | Max concurrent issue workers |
| `--dry-run`    | false   | Analyze and plan only        |
| `--wave`       | all     | Only run specific wave       |
| `--skip-ci`    | false   | Skip waiting for CI          |
| `--force-plan` | false   | Re-plan even if mapped       |

---

## Task System Integration

Native task tracking provides wave-based progress visualization during milestone execution. Tasks are supplementary to the checkpoint system (which remains source of truth).

### Wave-Based Task Creation

Create ALL tasks upfront during Phase 1 (Planning) after dependency analysis:

```text
Phase 1: After dependency analysis complete, create all tasks at once:

wave1Tasks = []
wave2Tasks = []
waveNTasks = []

# Create Wave 1 tasks (no dependencies)
For each issue in Wave 1:
  taskId = TaskCreate({
    subject: "Issue #<N>: <title>",
    description: "<issue-summary>",
    activeForm: "Working on issue #<N>",
    metadata: {
      issueNumber: <N>,
      workflowId: "<milestone-workflow-id>",
      waveNumber: 1,
      milestoneId: "<milestone-name>"
    }
  })
  wave1Tasks.push(taskId)

# Create Wave 2 tasks (blocked by Wave 1)
For each issue in Wave 2:
  taskId = TaskCreate({
    subject: "Issue #<N>: <title>",
    description: "<issue-summary>",
    activeForm: "Working on issue #<N>",
    metadata: {
      issueNumber: <N>,
      workflowId: "<milestone-workflow-id>",
      waveNumber: 2,
      milestoneId: "<milestone-name>"
    }
  })
  TaskUpdate(taskId, { addBlockedBy: wave1Tasks })
  wave2Tasks.push(taskId)

# Create Wave N tasks (blocked by Wave N-1)
For each issue in Wave N:
  taskId = TaskCreate({ ... })
  TaskUpdate(taskId, { addBlockedBy: waveN-1Tasks })
  waveNTasks.push(taskId)

TaskList() → Show full milestone tree immediately
```

### Task Updates During Execution

Update task status as issues progress through Phase 2:

```text
Phase 2: Execute (as each issue progresses):

On /auto-issue start for issue:
  TaskUpdate(taskId, { status: "in_progress" })

On /auto-issue complete (PR created):
  TaskUpdate(taskId, { status: "completed" })

On /auto-issue failure:
  TaskUpdate(taskId, { status: "completed", metadata: { failed: true, error } })

After each wave completes:
  TaskList() → Show wave progress, next wave unblocked
```

### Progress Visualization

Display progress at phase transitions with `TaskList()`:

```text
Milestone "OB3 Phase 1" Progress:

Wave 1 (No dependencies):
├─ Issue #153: Add KeyPair type      [COMPLETED] ✓
├─ Issue #154: Implement generator   [COMPLETED] ✓
└─ Issue #155: Add storage service   [IN_PROGRESS] ...

Wave 2 (Depends on Wave 1):
├─ Issue #156: Add JWKS endpoint     [PENDING, blocked by Wave 1]
└─ Issue #157: Integrate with auth   [PENDING, blocked by Wave 1]

Wave 3 (Depends on Wave 2):
└─ Issue #158: E2E tests             [PENDING, blocked by Wave 2]

Progress: 2/6 complete (33%)
```

### Key Points

- **Checkpoint remains source of truth** - Tasks provide UI only
- **blockedBy enforces wave order** - Prevents premature execution
- **Tasks track per-issue status** - Independent of /auto-issue internals
- **Metadata links to checkpoint** - Enables cross-reference for debugging
- **Tasks survive failures** - Mark as completed with error metadata

---

## Workflow

```
Phase 1: Plan     → milestone-planner → GATE (if dependencies unclear)
Phase 2: Execute  → spawn /auto-issue in worktrees (sequential by default)
Phase 3: Review   → poll PRs, dispatch fixes
Phase 4: Merge    → merge in dependency order
Phase 5: Cleanup  → remove worktrees, report summary
```

### Why Each Phase Matters

| Phase   | Purpose                                                                                   |
| ------- | ----------------------------------------------------------------------------------------- |
| Plan    | **Prevents wasted work** - identifies blocked issues BEFORE starting implementation       |
| Execute | **Isolates changes** - each issue in its own worktree/branch prevents cross-contamination |
| Review  | **Catches bugs early** - automated review agents find issues before human reviewers do    |
| Merge   | **Maintains stability** - dependency order ensures each merge builds on a stable base     |
| Cleanup | **Respects the codebase** - removes temporary worktrees, leaves repo clean                |

### Why Worktrees?

Git worktrees allow parallel branches without switching contexts. Each issue gets its own directory:

```
.worktrees/
├── issue-153/  ← feat/issue-153-add-keypair
├── issue-154/  ← feat/issue-154-implement-generator
└── issue-155/  ← feat/issue-155-add-storage
```

**Benefits:**

- **Isolation** - Changes to one issue don't affect others
- **Parallel CI** - Each PR can run CI independently
- **Easy cleanup** - Delete the directory, branch survives
- **Resume safety** - If interrupted, worktrees preserve state

---

## Argument Parsing

Detect input type from `$ARGUMENTS`:

| Pattern                              | Mode        | Example                        |
| ------------------------------------ | ----------- | ------------------------------ |
| Numbers only (space/comma separated) | `issues`    | `153 154 155` or `153,154,155` |
| Quoted string or text                | `milestone` | `"OB3 Phase 1"`                |

**Validation:**

- Empty arguments → Error: "Usage: /auto-milestone <milestone-name> or <issue-numbers>"
- Mix of numbers and text → Error: "Cannot mix issue numbers and milestone name"
- Invalid issue number → Error: "Issue #X not found"

---

## Phase 1: Plan

**Agent:** `milestone-planner`

```
Task(milestone-planner):
  Input:  {
    mode: "milestone" | "issues",
    milestone_name: "$ARGUMENTS",   # if mode == "milestone"
    issue_numbers: [153, 154, 155]  # if mode == "issues" (parsed from $ARGUMENTS)
  }
  Output: { planning_status, free_issues[], dependency_graph, execution_waves[] }
```

The milestone-planner will:

**For mode: "milestone":**

- Validate milestone exists
- Fetch all issues in milestone

**For mode: "issues":**

- Validate each issue exists
- Fetch issue details directly

**Then (both modes):**

- Parse dependency markers
- Build dependency graph
- Identify free (unblocked) issues
- Return waves for execution

### Planning Gate

**If planning_status == "needs_review":**

```
STOP - Show proposed dependency plan
Wait for: "approve", "abort", or modifications
```

Display:

- Unmapped dependencies detected
- Proposed dependency plan
- User options

---

## Phase 2: Execute

For each issue in the current wave (up to `--parallel` limit, default: 1 sequential):

1. **Create worktree:**

   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" create "$issue"
   ```

2. **Spawn /auto-issue subagent(s):** (sequential by default, use `--parallel N` for concurrency)

   ```
   Task(auto-issue workflow):
     Input:  { issue_number, worktree_path }
     Output: { issue, status, pr_number, branch, error? }
   ```

3. **Track progress:**
   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" update-status "$issue" "pr-created" "$pr"
   ```

### Failure Handling

If a subagent returns `status: "failed"`:

- Log failure with error details
- Mark dependent issues as skipped
- Continue with remaining issues

---

## Phase 3: Review

After all subagents complete:

1. **Collect PRs** from worktree state
2. **Wait for CI/reviews** with exponential backoff:
   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" ci-status "$pr" --wait
   ```
3. **Classify findings** (same as /auto-issue rules)
4. **Dispatch fix subagents** for critical findings
5. **Re-poll after fixes** (max 3 retries per PR)

### Escalation

If MAX_RETRY exceeded, ask user via `telegram` skill:

- `skip <issue>` - Skip PR and dependents
- `force <issue>` - Mark ready despite issues
- `continue` - After manual fix

---

## Phase 4: Merge

Using dependency graph from Phase 1:

1. **Determine merge order** (respects dependencies)
2. **Pre-merge validation:**
   ```bash
   bun run type-check
   bun run lint
   bun test
   ```
3. **Merge PR:**
   ```bash
   gh pr merge "$pr" --squash --delete-branch
   ```
4. **Handle conflicts** - rebase remaining PRs after each merge
5. **Process next wave** after current wave merges

### Post-Merge Integration Test

After all PRs merged:

```bash
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" integration-test
```

---

## Phase 5: Cleanup

1. **Remove worktrees:**

   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" cleanup-all --force
   ```

2. **Generate summary:**

   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" summary
   ```

3. **Send notification** with final stats

---

## Worktree Manager Commands

| Command                     | Purpose                  |
| --------------------------- | ------------------------ |
| `create <issue>`            | Create worktree          |
| `remove <issue>`            | Remove worktree          |
| `status`                    | Show all statuses        |
| `update-status <i> <s> [p]` | Update status            |
| `preflight`                 | Baseline lint/type-check |
| `checkpoint [phase] [desc]` | Save state for resume    |
| `resume`                    | Show checkpoint info     |
| `ci-status <pr> [--wait]`   | Check/wait for CI        |
| `integration-test`          | Full test suite on main  |
| `summary`                   | Generate report          |
| `cleanup-all [--force]`     | Remove all worktrees     |

---

## State Management

All state tracked in `.worktrees/.state.json`:

- `milestone` - Current milestone name
- `phase` - Current phase (planning/executing/reviewing/merging/cleanup)
- `worktrees` - Per-issue state (status, branch, PR)
- `baseline` - Pre-flight lint/type-check results
- `integration_test_status` - Post-merge test results

Checkpoint data in `.claude/execution-state.db` (SQLite).

### Resume

If interrupted, workflow checks for existing state at start:

```bash
bun run checkpoint milestone find "$MILESTONE_ID"
```

Resume based on phase:
| Phase | Resume Action |
| -------- | -------------------------------- |
| planning | Re-run milestone-planner |
| execute | Spawn remaining free issues |
| review | Continue review handling |
| merge | Continue from next unmerged PR |
| cleanup | Re-run cleanup |

---

## Error Handling

| Error               | Behavior                    |
| ------------------- | --------------------------- |
| Milestone not found | Show available, exit        |
| All issues blocked  | Report cycle, wait for user |
| Worktree failure    | Offer clean or skip         |
| Network/API failure | Retry with backoff (max 4)  |
| Integration failure | Stop, don't mark complete   |

---

## Success Criteria

Workflow succeeds when:

- All free issues processed
- PRs created, reviewed, and merged
- Integration tests pass
- Worktrees cleaned up
- Summary report generated
