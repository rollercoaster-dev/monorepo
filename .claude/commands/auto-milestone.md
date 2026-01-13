# /auto-milestone $ARGUMENTS

Execute fully autonomous milestone-to-PRs workflow for milestone "$ARGUMENTS".

**Mode:** Autonomous with planning gate - validates dependencies, spawns parallel work, handles reviews, merges in order.

**Recommended:** Run inside tmux for remote observability:

```bash
tmux new -s milestone
claude
/auto-milestone "OB3 Phase 1"

# Later, from SSH:
tmux attach -t milestone
```

---

## Quick Reference

```bash
/auto-milestone "OB3 Phase 1"              # Full autonomous run
/auto-milestone "Badge Generator" --dry-run # Analyze only, show plan
/auto-milestone "OB3 Phase 1" --parallel 5  # Run 5 issues concurrently
/auto-milestone "OB3 Phase 1" --wave 1      # Only run first wave
```

---

## Configuration

| Setting        | Default | Description                             |
| -------------- | ------- | --------------------------------------- |
| `--parallel`   | 3       | Max concurrent issue workers            |
| `--dry-run`    | false   | Analyze and plan only, don't execute    |
| `--wave`       | all     | Only run specific wave number           |
| `--skip-ci`    | false   | Skip waiting for CI (not recommended)   |
| `--force-plan` | false   | Re-plan even if dependencies are mapped |

---

## Shared References

This workflow uses patterns from [shared/](../shared/) and Claude Code skills:

**Claude Code Skills (auto-invoked):**

- `checkpoint-workflow` - Workflow state persistence (find, create, log-action, log-commit)
- `checkpoint-session` - Session lifecycle and learning extraction

**Documentation patterns (for reference):**

- [telegram-helpers.md](../shared/telegram-helpers.md) - Telegram MCP integration
- [dependency-checking.md](../shared/dependency-checking.md) - Issue dependency detection
- [escalation-patterns.md](../shared/escalation-patterns.md) - Escalation handling

**CLI for checkpoint operations:**

```bash
# All checkpoint commands use this base path:
bun run checkpoint <command> [args...]

# Key commands:
# milestone create <name> [github-number] - Create milestone checkpoint
# milestone find <name>                   - Find existing milestone
# milestone set-phase <id> <phase>        - Update phase
# milestone set-status <id> <status>      - Update status
# workflow find <issue>                   - Find issue workflow
# workflow log-action <id> <action> <result> [json] - Log action
```

### Telegram Notification Points

| Phase | Type        | Content                       |
| ----- | ----------- | ----------------------------- |
| 1     | notify_user | Name, issue count, waves      |
| 2     | notify_user | Issue #, PR link, status      |
| 3     | ask_user    | Unresolved findings + options |
| 5     | notify_user | Summary, duration, stats      |

---

## Workflow Overview

```
PHASE 1: Plan        → Analyze milestone, build dependency graph
   ↓
   GATE: If dependencies unclear → STOP for approval
   ↓
PHASE 2: Execute     → Spawn parallel /auto-issue in worktrees
   ↓
PHASE 3: Review      → Poll PRs, dispatch review fixes
   ↓
PHASE 4: Merge       → Merge in dependency order, handle conflicts
   ↓
PHASE 5: Cleanup     → Remove worktrees, report summary
```

---

## Phase 1: Planning

### 1.0 Pre-flight Baseline Check

**Before starting any work**, capture the baseline state of main:

```bash
# Run pre-flight check to identify pre-existing issues
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" preflight
```

This captures:

- Current lint warnings/errors on main
- Current type-check errors on main
- Timestamp of baseline capture

If pre-existing errors are found, they are flagged but work can proceed.
This prevents mid-workflow surprises when pre-existing issues are discovered.

### 1.1 Validate Input

```bash
# Validate prerequisites
for cmd in git gh jq bun; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "[AUTO-MILESTONE] ERROR: Required command '$cmd' not found"
    echo "[AUTO-MILESTONE] Please install missing dependencies"
    exit 1
  fi
done

MILESTONE_NAME="$ARGUMENTS"

# Check milestone exists
MILESTONE_DATA=$(gh api repos/rollercoaster-dev/monorepo/milestones \
  --jq ".[] | select(.title == \"$MILESTONE_NAME\")")

if [[ -z "$MILESTONE_DATA" ]]; then
  echo "[AUTO-MILESTONE] ERROR: Milestone '$MILESTONE_NAME' not found"
  echo "[AUTO-MILESTONE] Available milestones:"
  gh api repos/rollercoaster-dev/monorepo/milestones --jq '.[].title'
  exit 1
fi
```

### 1.1b Initialize Checkpoint

Check for existing milestone checkpoint and create if needed:

```bash
# Check for existing milestone workflow
MILESTONE_ID=$(echo "$MILESTONE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
EXISTING=$(bun run checkpoint milestone find "$MILESTONE_ID" 2>/dev/null)

if [ "$EXISTING" != "null" ] && [ -n "$EXISTING" ]; then
  WORKFLOW_ID=$(echo "$EXISTING" | jq -r '.id')
  PHASE=$(echo "$EXISTING" | jq -r '.phase')
  STATUS=$(echo "$EXISTING" | jq -r '.status')

  if [ "$STATUS" = "running" ]; then
    echo "[AUTO-MILESTONE] Resuming milestone: $MILESTONE_NAME"
    echo "[AUTO-MILESTONE] Phase: $PHASE"
    echo "[AUTO-MILESTONE] Workflow ID: $WORKFLOW_ID"

    # Resume based on phase
    case "$PHASE" in
      "execute") # Skip to Phase 2 ;;
      "review") # Skip to Phase 3 ;;
      "merge") # Skip to Phase 4 ;;
      "cleanup") # Skip to Phase 5 ;;
      *) # Continue from planning ;;
    esac
  fi
else
  # Create new milestone checkpoint
  RESULT=$(bun run checkpoint milestone create "$MILESTONE_NAME")
  WORKFLOW_ID=$(echo "$RESULT" | jq -r '.id')

  # Store milestone name in metadata
  bun run checkpoint workflow log-action "$WORKFLOW_ID" "milestone_started" "success" \
    "{\"milestoneName\": \"$MILESTONE_NAME\", \"phase\": \"planning\"}"

  echo "[AUTO-MILESTONE] Checkpoint created: $WORKFLOW_ID"
fi
```

### 1.2 Spawn Milestone Planner Agent

Use the `milestone-planner` agent to:

1. Fetch all issues in milestone
2. Parse dependency markers
3. Build dependency graph
4. Identify free (unblocked) issues
5. Validate planning status

**Prompt for agent:**

```
Analyze milestone "$MILESTONE_NAME" for /auto-milestone execution.

Return JSON with:
- planning_status: "ready" or "needs_review"
- free_issues: list of issue numbers that can start immediately
- dependency_graph: full graph for merge ordering
- execution_waves: ordered waves of parallel work
- proposed_plan: if needs_review, suggested dependencies

If dependencies are not explicitly mapped, set needs_review and propose a plan.
```

**After planner completes:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "planning_complete" "success" \
  "{\"planningStatus\": \"$PLANNING_STATUS\", \"freeIssues\": $FREE_ISSUE_COUNT, \"totalIssues\": $TOTAL_ISSUES}"
```

### 1.3 Planning Gate

**If planning_status == "needs_review":**

```bash
bun run checkpoint milestone set-status "$WORKFLOW_ID" "paused"
bun run checkpoint workflow log-action "$WORKFLOW_ID" "planning_gate" "pending" \
  '{"reason": "dependency mapping required"}'
```

```text
Display proposed dependency plan
Display issues needing dependency mapping
STOP: "Please review the proposed plan and approve or modify"

Wait for user input:
- "approve" → Continue with proposed plan
- "abort" → Exit workflow
- User provides modifications → Re-analyze
```

**After user approves:**

```bash
bun run checkpoint milestone set-status "$WORKFLOW_ID" "running"
bun run checkpoint workflow log-action "$WORKFLOW_ID" "planning_gate" "success" \
  '{"userDecision": "approved"}'
echo "[AUTO-MILESTONE] Planning approved, starting Phase 2: Parallel Execution"
```

**Example output when stopping:**

```markdown
## AUTO-MILESTONE: Planning Review Required

**Milestone:** OB3 Phase 1
**Issues:** 15 open, 5 closed

### Unmapped Dependencies Detected

The following issues have no explicit dependency markers:

| Issue | Title                     | Potential Conflicts        |
| ----- | ------------------------- | -------------------------- |
| #115  | PNG baking implementation | Touches same files as #116 |
| #116  | PNG optimization          | Touches same files as #115 |

### Proposed Dependency Plan

Based on code analysis, I recommend:

1. #115 → #116 (PNG baking before optimization)
2. #119 depends on both #116 and #118

### Your Options

1. Type `approve` to accept this plan
2. Type `abort` to exit
3. Provide corrections: "115 and 116 are independent"
```

---

## Phase 2: Parallel Execution

### 2.1 Initialize Worktrees

For each issue in the current wave (up to `--parallel` limit):

```bash
# Create worktree for each free issue
for issue in "${FREE_ISSUES[@]:0:$PARALLEL}"; do
  "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" create "$issue"
done
```

**After creating worktrees:**

```bash
bun run checkpoint milestone set-phase "$WORKFLOW_ID" "execute"

for ISSUE in $FREE_ISSUES; do
  bun run checkpoint workflow log-action "$WORKFLOW_ID" "worktree_created" "success" \
    "{\"issueNumber\": $ISSUE, \"wave\": $CURRENT_WAVE}"
done

echo "[AUTO-MILESTONE] Phase: planning → execute"
```

### 2.2 Spawn Parallel /auto-issue Subagents

Use the Task tool to spawn parallel subagents. Each subagent:

1. Changes to its assigned worktree
2. Executes the `/auto-issue` workflow (not the command, but the same steps)
3. Returns result: `{issue, status, pr_number, error?}`

**Spawn pattern (parallel Task calls):**

```
For issues [111, 116, 118] with --parallel 3:

Task 1: Execute /auto-issue workflow for #111 in worktree-111
Task 2: Execute /auto-issue workflow for #116 in worktree-116
Task 3: Execute /auto-issue workflow for #118 in worktree-118
```

**Subagent prompt template:**

```
Execute the /auto-issue workflow for issue #$ISSUE in worktree.

Working directory: $WORKTREE_PATH

Steps:
1. cd to $WORKTREE_PATH
2. Fetch issue #$ISSUE details
3. Create development plan
4. Implement with atomic commits (use atomic-developer workflow)
5. Run validation (as separate commands): bun run type-check, bun run lint, bun test
6. Push branch and create PR
7. Return result JSON:
   {
     "issue": $ISSUE,
     "status": "success" | "failed",
     "pr_number": <number>,
     "branch": "<branch-name>",
     "error": "<error message if failed>"
   }

Important:
- Do NOT escalate interactively - if you hit blockers, return status: "failed" with error
- Commit message format: <type>(<scope>): <description> (#$ISSUE)
- PR should include "Closes #$ISSUE" in body
```

**When spawning each subagent:**

```bash
# Each /auto-issue creates its own checkpoint with worktree path
# The milestone tracks the relationship via metadata
bun run checkpoint workflow log-action "$WORKFLOW_ID" "spawned_child_workflow" "success" \
  "{\"issueNumber\": $ISSUE, \"childWorkflowType\": \"auto-issue\", \"wave\": $CURRENT_WAVE}"
```

**After each subagent completes:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "child_workflow_complete" "success" \
  "{\"issueNumber\": $ISSUE, \"status\": \"$STATUS\", \"prNumber\": $PR_NUMBER}"
echo "[AUTO-MILESTONE] Issue #$ISSUE complete: $STATUS (PR #$PR_NUMBER)"
```

### 2.3 Track Progress & Checkpointing

Update worktree state as subagents complete:

```bash
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" update-status "$ISSUE" "pr-created" "$PR_NUMBER"
```

**After each subagent completes**, save a checkpoint to enable resume after context overflow:

```bash
# Save checkpoint after each issue completes
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" checkpoint "executing" "after issue #$ISSUE"
```

This saves:

- Current phase and progress
- All worktree statuses
- PR numbers and their CI/review states
- Timestamp for duration tracking

**To resume from a checkpoint** (after context overflow or session restart):

```bash
# Check for existing checkpoint
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" resume
```

The resume command shows:

- Last checkpoint phase and timestamp
- Completed vs pending issues
- Next steps to continue

### 2.4 Handle Failures

If a subagent returns `status: "failed"`:

1. Log the failure with error details
2. Mark issue as failed in state
3. Identify dependent issues → mark as skipped
4. Continue with remaining issues

**When a subagent fails:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "child_workflow_failed" "failed" \
  "{\"issueNumber\": $FAILED_ISSUE, \"error\": \"$ERROR_MESSAGE\"}"

# Log each skipped dependent issue
for DEP_ISSUE in $DEPENDENT_ISSUES; do
  bun run checkpoint workflow log-action "$WORKFLOW_ID" "issue_skipped" "success" \
    "{\"issueNumber\": $DEP_ISSUE, \"reason\": \"blocked_by_failure\", \"blockedBy\": $FAILED_ISSUE}"
done
```

```
FAILURE HANDLING:

Issue #111 failed: "Type error in key generation"
  → Skipping dependent issues: #112, #113
  → Continuing with independent issues: #116, #118
```

---

## Phase 3: Review Handling

**Transition to review phase:**

```bash
bun run checkpoint milestone set-phase "$WORKFLOW_ID" "review"
bun run checkpoint workflow log-action "$WORKFLOW_ID" "phase_transition" "success" \
  "{\"from\": \"execute\", \"to\": \"review\", \"completedIssues\": $COMPLETED_COUNT}"
echo "[AUTO-MILESTONE] Phase: execute → review"
```

### 3.1 Collect All PRs

After all subagents complete, gather PR list:

```bash
PRS=$(jq -r '.worktrees | to_entries[] | select(.value.pr != "") | .value.pr' "$STATE_FILE")
```

### 3.2 Wait for CI and Reviews

Use the CI status helper for efficient polling with exponential backoff:

**For each PR waiting on CI:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "ci_wait_started" "pending" \
  "{\"prNumber\": $PR, \"issueNumber\": $ISSUE}"
```

```bash
for pr in $PRS; do
  # Wait for CI with timeout (30 min default)
  if ! "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" ci-status "$pr" --wait; then
    echo "CI failed or timed out for PR #$pr"
    # Handle failure
  fi

  # Check for CodeRabbit and Claude reviews
  gh pr view "$pr" --json reviews,comments
done
```

**After CI completes:**

```bash
if [ $CI_PASSED -eq 1 ]; then
  RESULT="success"
else
  RESULT="failed"
fi
bun run checkpoint workflow log-action "$WORKFLOW_ID" "ci_complete" "$RESULT" \
  "{\"prNumber\": $PR, \"issueNumber\": $ISSUE}"
```

The `ci-status --wait` command:

- Polls CI status with exponential backoff (30s → 60s → 120s cap)
- Default timeout: 30 minutes (configurable via `CI_POLL_TIMEOUT` env var)
- Returns success when all checks pass, failure if any check fails
- Avoids manual sleep loops

**For non-blocking status checks:**

```bash
# Get current CI status as JSON
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" ci-status "$pr"
```

Wait until:

- CI checks complete (pass or fail) — **timeout: 30 minutes**
- At least one review exists (CodeRabbit or Claude) — **timeout: 60 minutes**

If timeouts are exceeded, escalate to user for manual intervention.

### 3.3 Classify Review Findings

For each PR, classify findings (same as /auto-issue):

| Source     | Critical If                | Non-Critical If      |
| ---------- | -------------------------- | -------------------- |
| CodeRabbit | severity: critical/high    | severity: medium/low |
| Claude     | explicit blocker mentioned | suggestions only     |
| CI         | any failure                | warnings only        |

**After classifying findings:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "review_findings" "success" \
  "{\"prNumber\": $PR, \"criticalCount\": $CRITICAL_COUNT, \"nonCriticalCount\": $NON_CRITICAL_COUNT}"
```

### 3.4 Dispatch Review Fixes

For PRs with critical findings, spawn fix subagents:

```
Task: Fix review findings for PR #145 in worktree-111

Working directory: $WORKTREE_PATH

Findings to fix:
1. [CodeRabbit] src/keys.ts:42 - Missing null check
2. [Claude] src/keys.ts:89 - Consider error handling

Steps:
1. cd to $WORKTREE_PATH
2. Apply fixes with atomic commits
3. Push changes
4. Return result JSON
```

### 3.5 Re-poll After Fixes

After fixes are pushed:

1. Wait for CI to re-run
2. Wait for new review cycle
3. Repeat until all critical findings resolved or MAX_RETRY exceeded

```
MAX_RETRY = 3 per PR
MAX_TOTAL_FIX_ROUNDS = 5 across all PRs
```

### 3.6 Handle Unresolvable Issues

If a PR can't be fixed after MAX_RETRY:

```markdown
## Review Fixes Failed

PR #145 (Issue #111) has unresolved critical findings after 3 attempts.

### Unresolved Findings

1. [CodeRabbit] src/keys.ts:42 - Type mismatch (attempted 3 fixes)

### Your Options

1. Type `skip 111` to skip this PR and its dependents
2. Type `force 111` to mark as ready despite issues
3. Fix manually, then type `continue`
```

### Telegram Escalation (Interactive)

When review escalation is triggered, use `ask_user` for interactive response:

```typescript
const escalationMessage = `🚨 AUTO-MILESTONE ESCALATION

PR #${pr} (Issue #${issue}) has unresolved critical findings after ${MAX_RETRY} attempts.

Unresolved Findings:
${criticalFindings.map((f) => `• [${f.source}] ${f.file}:${f.line} - ${f.message}`).join("\n")}

Options:
1. 'skip ${issue}' - Skip this PR and dependents
2. 'force ${issue}' - Mark ready despite issues
3. 'continue' - After manual fix`;

// Ask via Telegram (blocking - waits for response)
// Loop until we get a valid response
let handled = false;
while (!handled) {
  const response = await askTelegram(escalationMessage);
  const normalized = response.trim().toLowerCase();

  // Handle response with validation
  if (normalized.startsWith("skip")) {
    const issueNum = parseInt(response.split(" ")[1], 10);
    if (Number.isNaN(issueNum)) {
      console.log(`[AUTO-MILESTONE] Invalid format. Use: skip <issue-number>`);
      continue; // Re-prompt
    }
    console.log(`[AUTO-MILESTONE] Skipping issue #${issueNum} and dependents`);
    // Mark issue and dependents as skipped
    handled = true;
  } else if (normalized.startsWith("force")) {
    const issueNum = parseInt(response.split(" ")[1], 10);
    if (Number.isNaN(issueNum)) {
      console.log(`[AUTO-MILESTONE] Invalid format. Use: force <issue-number>`);
      continue; // Re-prompt
    }
    console.log(`[AUTO-MILESTONE] Force-approving issue #${issueNum}`);
    // Proceed to merge despite issues
    handled = true;
  } else if (normalized === "continue") {
    console.log(`[AUTO-MILESTONE] Continuing after manual fix`);
    // Re-run review
    handled = true;
  } else if (response === "TELEGRAM_UNAVAILABLE") {
    console.log(
      "[AUTO-MILESTONE] Telegram unavailable - waiting for terminal input",
    );
    // Fall through to terminal-based escalation
    handled = true;
  } else {
    console.log(`[AUTO-MILESTONE] Unknown response: ${response}`);
    console.log(
      `[AUTO-MILESTONE] Valid options: skip <num>, force <num>, continue`,
    );
    // Loop continues - will re-prompt
  }
}
```

---

## Phase 4: Merge (Ordered)

**Transition to merge phase:**

```bash
bun run checkpoint milestone set-phase "$WORKFLOW_ID" "merge"
bun run checkpoint workflow log-action "$WORKFLOW_ID" "phase_transition" "success" \
  "{\"from\": \"review\", \"to\": \"merge\", \"readyToMerge\": $READY_COUNT}"
echo "[AUTO-MILESTONE] Phase: review → merge"
```

### 4.1 Determine Merge Order

Using the dependency graph from Phase 1:

```
Merge order for wave 1:
1. #111 (no dependencies)
2. #118 (no dependencies)
3. #116 (no dependencies)

After wave 1 merges, wave 2 becomes free:
4. #112 (depended on #111)
5. #119 (depended on #116, #118)
```

### 4.2 Pre-Merge Validation

For each PR, before merging:

```bash
# 1. Check CI status
gh pr checks "$PR" --required

# 2. Check review approval
gh pr view "$PR" --json reviewDecision

# 3. Run local validation in worktree (as separate commands)
cd "$WORKTREE_PATH"
bun run type-check
bun run lint
bun test
bun run build
```

### 4.3 Merge PR

**Before merging:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "merge_started" "pending" \
  "{\"prNumber\": $PR, \"issueNumber\": $ISSUE, \"mergePosition\": $CURRENT_INDEX}"
```

```bash
gh pr merge "$PR" --squash --delete-branch
```

**After merging:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "merge_complete" "success" \
  "{\"prNumber\": $PR, \"issueNumber\": $ISSUE, \"mergePosition\": $CURRENT_INDEX}"
```

### 4.4 Handle Post-Merge Conflicts

After merging PR #A, check remaining PRs:

```bash
for remaining_pr in $REMAINING_PRS; do
  worktree_path=$("$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" path "$issue")

  # Attempt rebase
  if ! "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" rebase "$issue"; then
    echo "Conflict detected in PR #$remaining_pr after merging #$merged_pr"
    # Escalate to user
  fi
done
```

**When conflict detected:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "merge_conflict" "failed" \
  "{\"prNumber\": $REMAINING_PR, \"conflictAfterMerge\": $MERGED_PR}"
```

**After conflict resolution:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "conflict_resolved" "success" \
  "{\"prNumber\": $REMAINING_PR, \"resolutionMethod\": \"$RESOLUTION_METHOD\"}"
```

If rebase fails (conflicts):

```markdown
## Merge Conflict Detected

After merging PR #145 (#111), PR #148 (#116) has conflicts.

Conflicting files:

- src/types/keys.ts

### Your Options

1. Type `resolve 116` to attempt auto-resolution
2. Type `skip 116` to skip this PR
3. Resolve manually in worktree, then type `continue`
```

### 4.5 Process Next Wave

After all PRs in current wave are merged:

1. Re-run milestone-planner to get newly freed issues
2. Spawn next wave of parallel subagents
3. Repeat phases 2-4

---

## Phase 4.5: Post-Merge Integration Test

**After all PRs are merged**, run a full integration test on main:

```bash
# Pull latest main and run full test suite
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" integration-test
```

This runs:

1. `bun run type-check` - Verify no type regressions
2. `bun run lint` - Verify no lint regressions
3. `bun test` - Run all unit tests
4. `bun run build` - Verify build succeeds

If integration tests fail:

- Stop and report failure
- Do NOT mark milestone complete
- Investigate which merged PR caused the regression

The integration test status is recorded in state for the final summary.

---

## Phase 5: Cleanup & Report

**Transition to cleanup phase:**

```bash
bun run checkpoint milestone set-phase "$WORKFLOW_ID" "cleanup"
bun run checkpoint workflow log-action "$WORKFLOW_ID" "phase_transition" "success" \
  "{\"from\": \"merge\", \"to\": \"cleanup\", \"mergedCount\": $MERGED_COUNT}"
echo "[AUTO-MILESTONE] Phase: merge → cleanup"
```

### 5.1 Cleanup Worktrees

Use `--force` to skip confirmation in autonomous mode:

```bash
# Remove all worktrees without prompting
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" cleanup-all --force
```

Or remove individually:

```bash
for issue in $COMPLETED_ISSUES; do
  "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" remove "$issue"
done
```

For a dry-run to see what would be removed:

```bash
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" cleanup-all --dry-run
```

**After cleanup completes:**

```bash
bun run checkpoint workflow log-action "$WORKFLOW_ID" "worktrees_cleaned" "success" \
  "{\"removedCount\": $REMOVED_COUNT}"
```

### 5.2 Generate Summary Report

Use the built-in summary command for a comprehensive report:

```bash
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" summary
```

This generates a report including:

- Milestone name and duration
- Issues by status (merged, failed, pending)
- All PRs created with links
- Integration test results
- Pre-existing baseline comparison
- Issues requiring attention

**After generating summary:**

```bash
bun run checkpoint milestone set-status "$WORKFLOW_ID" "completed"
bun run checkpoint workflow log-action "$WORKFLOW_ID" "milestone_complete" "success" \
  "{\"milestoneName\": \"$MILESTONE_NAME\", \"mergedCount\": $MERGED_COUNT, \"failedCount\": $FAILED_COUNT}"
echo "[AUTO-MILESTONE] Milestone completed: $WORKFLOW_ID"
```

### 5.3 Example Final Report

```markdown
## AUTO-MILESTONE COMPLETE

**Milestone:** OB3 Phase 1
**Duration:** 2h 34m

### Summary

| Status    | Count | Issues                                                                 |
| --------- | ----- | ---------------------------------------------------------------------- |
| Merged    | 12    | #111, #112, #113, #114, #115, #116, #117, #118, #119, #120, #121, #122 |
| Skipped   | 2     | #123 (failed), #124 (dependent on #123)                                |
| Remaining | 1     | #125 (external dependency)                                             |

### PRs Created & Merged

- PR #145: feat(keys): implement key generation (#111) ✓
- PR #146: feat(baking): PNG baking support (#116) ✓
- PR #147: feat(baking): SVG baking support (#118) ✓
  ...

### Integration Tests

✓ type-check: PASS
✓ lint: PASS
✓ test: PASS
✓ build: PASS

### Baseline Comparison

Pre-existing lint errors: 0
Pre-existing type errors: 0
(No pre-existing issues to filter)

### Issues Requiring Attention

- #123: Failed after 3 fix attempts - manual intervention needed
- #125: Blocked by #99 (different milestone)

### Next Steps

1. Manually resolve #123
2. Complete milestone "Core Services" to unblock #125
```

---

## Agents Used

| Agent               | Purpose                             | When Called |
| ------------------- | ----------------------------------- | ----------- |
| `milestone-planner` | Dependency analysis, wave planning  | Phase 1     |
| `issue-researcher`  | Create dev plan (inside subagent)   | Phase 2     |
| `atomic-developer`  | Implement changes (inside subagent) | Phase 2     |
| `review-handler`    | Fix review findings                 | Phase 3     |
| `pr-creator`        | Create PR (inside subagent)         | Phase 2     |

---

## Scripts Used

| Script                        | Purpose                          |
| ----------------------------- | -------------------------------- |
| `scripts/worktree-manager.sh` | Create, track, cleanup worktrees |

### Worktree Manager Commands

| Command                               | Purpose                              |
| ------------------------------------- | ------------------------------------ |
| `create <issue>`                      | Create worktree for issue            |
| `remove <issue>`                      | Remove worktree                      |
| `status`                              | Show all worktree statuses           |
| `update-status <issue> <status> [pr]` | Update worktree status               |
| `preflight`                           | Run baseline lint/type-check on main |
| `checkpoint [phase] [desc]`           | Save state for resume                |
| `resume`                              | Show checkpoint info                 |
| `ci-status <pr> [--wait]`             | Check/wait for CI status             |
| `integration-test`                    | Run full test suite on main          |
| `summary`                             | Generate milestone report            |
| `cleanup-all [--force]`               | Remove all worktrees                 |
| `validate-state`                      | Validate and migrate state file      |

---

## Error Handling

### Milestone Not Found

```
Error: Milestone "XYZ" not found.
Available: OB3 Phase 1, Badge Generator, Core Services
```

### All Issues Blocked

```
Error: All open issues in milestone are blocked.
Blocked issues: #112 (by #111), #113 (by #111, #112)
Resolve blockers first or check for circular dependencies.
```

### Git Worktree Failures

```
Error: Failed to create worktree for #111
Reason: Branch already exists

Options:
1. Type `clean 111` to remove stale branch and retry
2. Type `skip 111` to skip this issue
```

### Network/API Failures

Retry with exponential backoff: 2s, 4s, 8s, 16s (max 4 retries)

---

## State Management

All state is tracked in `.worktrees/.state.json`:

```json
{
  "checkpoint_version": "1.0",
  "milestone": "OB3 Phase 1",
  "started": "2024-01-15T09:00:00Z",
  "phase": "executing",
  "checkpoint_description": "after issue #116",
  "checkpoint_timestamp": "2024-01-15T10:45:00Z",
  "baseline": {
    "captured_at": "2024-01-15T09:00:00Z",
    "lint": { "exit_code": 0, "warnings": 5, "errors": 0 },
    "typecheck": { "exit_code": 0, "errors": 0 }
  },
  "integration_test_status": "passed",
  "integration_test_timestamp": "2024-01-15T12:00:00Z",
  "worktrees": {
    "111": {
      "status": "merged",
      "branch": "feat/issue-111-key-generation",
      "pr": "145",
      "updated": "2024-01-15T10:30:00Z"
    },
    "116": {
      "status": "reviewing",
      "branch": "feat/issue-116-png-baking",
      "pr": "146",
      "updated": "2024-01-15T10:45:00Z"
    }
  },
  "pr_statuses": {
    "145": { "state": "MERGED", "mergeable": "MERGEABLE" },
    "146": { "state": "OPEN", "mergeable": "MERGEABLE" }
  }
}
```

### State Fields

| Field                | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `checkpoint_version` | Schema version for migration                                 |
| `milestone`          | Current milestone name                                       |
| `started`            | Workflow start timestamp                                     |
| `phase`              | Current phase (planning/executing/reviewing/merging/cleanup) |
| `checkpoint_*`       | Checkpoint metadata for resume                               |
| `baseline`           | Pre-flight lint/type-check results                           |
| `integration_test_*` | Post-merge test results                                      |
| `worktrees`          | Per-issue worktree state                                     |
| `pr_statuses`        | Cached PR states at checkpoint                               |

### Worktree Status Values

- `created` - Worktree ready
- `implementing` - /auto-issue running
- `pr-created` - PR exists
- `reviewing` - Handling reviews
- `ready-merge` - Approved, ready to merge
- `merged` - Complete
- `failed` - Escalated, needs manual help
- `skipped` - Skipped due to dependency failure

### State Validation

Run `validate-state` to check and migrate state files:

```bash
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" validate-state
```

This:

- Validates JSON syntax
- Adds missing required fields
- Sets checkpoint version
- Syncs with actual git worktrees

---

## Resuming Interrupted Milestones

If `/auto-milestone` is interrupted (context compaction, timeout, manual stop), the checkpoint API enables resumption.

### Detect Existing Milestone Workflow

At workflow start (step 1.1b), the orchestrator checks for existing milestone workflows:

```bash
MILESTONE_ID=$(echo "$MILESTONE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
EXISTING=$(bun run checkpoint milestone find "$MILESTONE_ID" 2>/dev/null)

if [ "$EXISTING" != "null" ] && [ -n "$EXISTING" ]; then
  STATUS=$(echo "$EXISTING" | jq -r '.status')
  if [ "$STATUS" = "running" ]; then
    # Milestone found - can resume
  fi
fi
```

### Resume Based on Phase

| Phase    | Resume Action                                            |
| -------- | -------------------------------------------------------- |
| planning | Re-run milestone-planner (idempotent)                    |
| execute  | Check child workflow status, spawn remaining free issues |
| review   | Re-poll PR status, continue review handling              |
| merge    | Check merge progress, continue from next unmerged PR     |
| cleanup  | Re-run cleanup (idempotent)                              |

### Child Workflow Status

When resuming, check the status of all child `/auto-issue` workflows:

```bash
# List child issues from actions in the milestone
# For each issue, check its workflow status
for ISSUE in $CHILD_ISSUES; do
  CHILD=$(bun run checkpoint workflow find $ISSUE 2>/dev/null)
  if [ "$CHILD" != "null" ] && [ -n "$CHILD" ]; then
    PHASE=$(echo "$CHILD" | jq -r '.workflow.phase')
    STATUS=$(echo "$CHILD" | jq -r '.workflow.status')
    echo "Issue #$ISSUE: $PHASE - $STATUS"
  else
    echo "Issue #$ISSUE: No checkpoint found"
  fi
done
```

### Verify Checkpoint State

Before resuming, verify the checkpoint data:

```bash
DATA=$(bun run checkpoint milestone find "$MILESTONE_ID")

if [ "$DATA" != "null" ] && [ -n "$DATA" ]; then
  echo "Milestone $(echo $DATA | jq -r '.id'):"
  echo "- Phase: $(echo $DATA | jq -r '.phase')"
  echo "- Status: $(echo $DATA | jq -r '.status')"
fi
```

### Manual Resume Commands

If automatic resume fails, use these commands:

```bash
# Check milestone state
bun run checkpoint milestone find "ob3-phase-1"

# List all active milestones
bun run checkpoint milestone list-active

# Mark milestone as failed (to start fresh)
bun run checkpoint milestone set-status "milestone-id" "failed"
```

### Coordinating with worktree-manager.sh

The `/auto-milestone` workflow uses both checkpoint API and `worktree-manager.sh` state:

| State Source        | Purpose                                      | Location                     |
| ------------------- | -------------------------------------------- | ---------------------------- |
| Checkpoint API      | Workflow-level state (phases, child links)   | `.claude/execution-state.db` |
| worktree-manager.sh | Worktree-level state (branches, PRs, status) | `.worktrees/.state.json`     |

**Resume coordination:**

1. Load checkpoint to determine milestone phase
2. Load worktree state to determine issue progress
3. Cross-reference child workflow checkpoints for detailed status
4. Resume from appropriate point

**Example:**

```bash
# Check milestone checkpoint state
bun run checkpoint milestone find "ob3-phase-1"
# Shows: phase "review", status "running"

# Check worktree state
./scripts/worktree-manager.sh status
# Shows: issue-111 (reviewing, PR #145), issue-116 (reviewing, PR #146)

# Check child workflow state
bun run checkpoint workflow find 111
# Shows: phase "review", status "running"

# Resume decision: Continue review handling at Phase 3
```

### Database Location

Checkpoint data is stored in `.claude/execution-state.db` (SQLite, gitignored).
Worktree state is stored in `.worktrees/.state.json` (JSON, gitignored).

---

## Success Criteria

This workflow is successful when:

- All free issues in milestone are processed
- PRs are created, reviewed, and merged
- Failures are clearly reported
- Worktrees are cleaned up
- User can track progress via tmux attach
