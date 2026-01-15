# /auto-milestone $ARGUMENTS

Autonomous milestone-to-PRs workflow. Validates dependencies, spawns parallel /auto-issue workers, handles reviews, merges in order.

**Mode:** Autonomous with planning gate - only stops if dependencies are unclear.

**Recommended:** Run in tmux for remote observability:

```bash
tmux new -s milestone
claude
/auto-milestone "OB3 Phase 1"
```

## Quick Reference

```bash
/auto-milestone "OB3 Phase 1"              # Full autonomous run
/auto-milestone "Badge Generator" --dry-run # Analyze only, show plan
/auto-milestone "OB3 Phase 1" --parallel 5  # Run 5 issues concurrently
/auto-milestone "OB3 Phase 1" --wave 1      # Only run first wave
```

## Configuration

| Setting        | Default | Description                  |
| -------------- | ------- | ---------------------------- |
| `--parallel`   | 3       | Max concurrent issue workers |
| `--dry-run`    | false   | Analyze and plan only        |
| `--wave`       | all     | Only run specific wave       |
| `--skip-ci`    | false   | Skip waiting for CI          |
| `--force-plan` | false   | Re-plan even if mapped       |

---

## Workflow

```
Phase 1: Plan     → milestone-planner → GATE (if dependencies unclear)
Phase 2: Execute  → spawn parallel /auto-issue in worktrees
Phase 3: Review   → poll PRs, dispatch fixes
Phase 4: Merge    → merge in dependency order
Phase 5: Cleanup  → remove worktrees, report summary
```

---

## Phase 1: Plan

**Agent:** `milestone-planner`

```
Task(milestone-planner):
  Input:  { milestone_name: "$ARGUMENTS" }
  Output: { planning_status, free_issues[], dependency_graph, execution_waves[] }
```

The milestone-planner will:

- Validate milestone exists
- Fetch all issues in milestone
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

## Phase 2: Execute (Parallel)

For each issue in the current wave (up to `--parallel` limit):

1. **Create worktree:**

   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" create "$issue"
   ```

2. **Spawn parallel /auto-issue subagents:**

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

If MAX_RETRY exceeded, ask user via Telegram:

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
