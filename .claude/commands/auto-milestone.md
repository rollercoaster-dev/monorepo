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

### 1.3 Planning Gate

```
IF planning_status == "needs_review":
    Display proposed dependency plan
    Display issues needing dependency mapping
    STOP: "Please review the proposed plan and approve or modify"

    Wait for user input:
    - "approve" → Continue with proposed plan
    - "abort" → Exit workflow
    - User provides modifications → Re-analyze
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
5. Run validation: bun run type-check && bun run lint && bun test
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

### 2.3 Track Progress

Update worktree state as subagents complete:

```bash
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" update-status "$ISSUE" "pr-created" "$PR_NUMBER"
```

### 2.4 Handle Failures

If a subagent returns `status: "failed"`:

1. Log the failure with error details
2. Mark issue as failed in state
3. Identify dependent issues → mark as skipped
4. Continue with remaining issues

```
FAILURE HANDLING:

Issue #111 failed: "Type error in key generation"
  → Skipping dependent issues: #112, #113
  → Continuing with independent issues: #116, #118
```

---

## Phase 3: Review Handling

### 3.1 Collect All PRs

After all subagents complete, gather PR list:

```bash
PRS=$(jq -r '.worktrees | to_entries[] | select(.value.pr != "") | .value.pr' "$STATE_FILE")
```

### 3.2 Wait for Reviews

Poll each PR for review status:

```bash
for pr in $PRS; do
  # Check for CodeRabbit and Claude reviews
  gh pr view "$pr" --json reviews,comments

  # Check CI status
  gh pr checks "$pr"
done
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

---

## Phase 4: Merge (Ordered)

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

# 3. Run local validation in worktree
cd "$WORKTREE_PATH"
bun run type-check && bun run lint && bun test && bun run build
```

### 4.3 Merge PR

```bash
gh pr merge "$PR" --squash --delete-branch
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

## Phase 5: Cleanup & Report

### 5.1 Cleanup Worktrees

```bash
for issue in $COMPLETED_ISSUES; do
  "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" remove "$issue"
done
```

### 5.2 Final Report

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
  }
}
```

Status values:

- `created` - Worktree ready
- `implementing` - /auto-issue running
- `pr-created` - PR exists
- `reviewing` - Handling reviews
- `ready-merge` - Approved, ready to merge
- `merged` - Complete
- `failed` - Escalated, needs manual help
- `skipped` - Skipped due to dependency failure

---

## Success Criteria

This workflow is successful when:

- All free issues in milestone are processed
- PRs are created, reviewed, and merged
- Failures are clearly reported
- Worktrees are cleaned up
- User can track progress via tmux attach
