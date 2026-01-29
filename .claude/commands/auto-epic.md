# /auto-epic $ARGUMENTS

Autonomous epic-to-PRs workflow. Reads GitHub sub-issues and native dependency graph, spawns sequential /auto-issue workers by default.

**Mode:** Autonomous — no gates, uses explicit GitHub dependencies (no inference needed).

**Recommended:** Run in tmux for remote observability:

```bash
tmux new -s epic
claude
/auto-epic 635
```

---

## CRITICAL: Branch Isolation is Non-Negotiable

**YOU MUST NEVER commit directly to `main` during this workflow.**

Each sub-issue gets its own branch → PR → review → merge. See `/auto-milestone` for the full rationale.

---

## Quick Reference

```bash
/auto-epic 635                    # All sub-issues of epic #635 (sequential)
/auto-epic 635 --dry-run          # Analyze only, show execution plan
/auto-epic 635 --parallel 3       # Run 3 sub-issues concurrently
/auto-epic 635 --wave 1           # Only run first wave
/auto-epic 635 --skip-ci          # Skip waiting for CI
```

## Configuration

| Setting      | Default | Description                  |
| ------------ | ------- | ---------------------------- |
| `--parallel` | 1       | Max concurrent issue workers |
| `--dry-run`  | false   | Analyze and plan only        |
| `--wave`     | all     | Only run specific wave       |
| `--skip-ci`  | false   | Skip waiting for CI          |

---

## How Epics Differ from Milestones

| Aspect         | `/auto-milestone`               | `/auto-epic`                                |
| -------------- | ------------------------------- | ------------------------------------------- |
| Input          | Milestone name or issue numbers | Epic issue number                           |
| Dependencies   | Inferred by milestone-planner   | Explicit in GitHub (blocking/blocked-by)    |
| Planning       | Heavy analysis needed           | Read the graph directly                     |
| Scope          | All open issues in milestone    | Sub-issues of one parent issue              |
| Planning graph | Optional                        | Natural — calls `/plan create --epic` first |

The epic flow is leaner because dependencies are already declared in GitHub's native sub-issue and blocking relationships. No inference step needed.

---

## Task System Integration

Same pattern as `/auto-milestone`. Create ALL tasks upfront after Phase 1, with wave-based `blockedBy` dependencies. See `/auto-milestone` for the full task creation and update patterns.

---

## Workflow

```
Phase 1: Plan     → read GitHub sub-issue graph → compute waves
Phase 2: Execute  → spawn /auto-issue per sub-issue (sequential by default)
Phase 3: Review   → poll PRs, dispatch fixes
Phase 4: Merge    → merge in dependency order
Phase 5: Cleanup  → remove worktrees, report summary
```

---

## Argument Parsing

Parse `$ARGUMENTS`:

| Pattern           | Example                      |
| ----------------- | ---------------------------- |
| Single number     | `635`                        |
| Number with flags | `635 --dry-run --parallel 3` |

**Validation:**

- Empty arguments → Error: "Usage: /auto-epic <epic-issue-number>"
- Non-existent issue → Error: "Issue #X not found"
- Issue with no sub-issues → Error: "Issue #X has no sub-issues. Use /auto-issue for single issues."

---

## Phase 1: Plan

Unlike `/auto-milestone`, this phase does NOT use the milestone-planner agent. It reads the dependency graph directly from GitHub.

### Step 1: Fetch Sub-Issues

```bash
# GraphQL query to get sub-issues
gh api graphql -f query='query {
  repository(owner: "rollercoaster-dev", name: "monorepo") {
    issue(number: <N>) {
      title
      subIssues(first: 50) {
        nodes {
          number
          title
          state
          closedAt
        }
      }
    }
  }
}'
```

### Step 2: Read Dependency Graph

```bash
# For each sub-issue, get blocking relationships (native GitHub dependencies)
gh api graphql -f query='query($number: Int!, $owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      blockedBy(first: 10) { nodes { number title state } }
      blocking(first: 10) { nodes { number title state } }
    }
  }
}' -F number=<N> -f owner=rollercoaster-dev -f repo=monorepo
```

**Fallback**: If `blockedBy`/`blocking` fields return empty, parse from issue body:

```bash
gh issue view <N> --json body -q '.body' | grep -oiE '(blocked by|depends on|after) #[0-9]+' | grep -oE '#[0-9]+'
```

### Step 3: Compute Waves

From the dependency topology:

- **Wave 1**: Sub-issues with no blockers (or all blockers already closed)
- **Wave 2**: Sub-issues blocked only by Wave 1 issues
- **Wave N**: Sub-issues blocked only by Wave 1..N-1 issues

Filter out already-closed sub-issues (they're done).

### Step 4: Planning Graph Integration (Optional)

If the planning graph Phase 2 tools are available:

```
1. Push goal for the epic (if not already on stack)
2. Call /plan create --epic <N> to populate Plan + PlanSteps
3. Each /auto-issue spawned via /plan start <sub-issue> for automatic tracking
```

If planning graph tools are NOT available, proceed without them (graceful degradation).

### Step 5: Display Plan

```
Epic #635: Planning Graph Phase 2 — generic Plan/Step model

Sub-issues: 7 total, 0 closed, 7 open

Wave 1 (no blockers):
  #636 - Add Plan and PlanStep tables to planning graph

Wave 2 (after Wave 1):
  #637 - MCP tools for Plan CRUD operations → blocked by #636
  #638 - Completion resolver system → blocked by #636

Wave 3 (after Wave 2):
  #639 - Enhanced /plan status → blocked by #637, #638
  #640 - /plan create command → blocked by #637

Wave 4 (after Wave 3):
  #641 - /plan start command → blocked by #637, #639

Wave 5 (after Wave 4):
  #642 - Auto-pop stale detection → blocked by #638, #641

Execution order: 5 waves, 7 issues. Ready to start.
```

**If `--dry-run`:** Stop here, display plan, exit.

---

## Phase 2: Execute

For each sub-issue in wave order (up to `--parallel` limit, default: 1 sequential):

1. **Skip closed sub-issues** — already done, no work needed

2. **Create worktree:**

   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" create "$issue"
   ```

3. **Spawn /auto-issue:**

   ```
   Task(auto-issue workflow):
     Input:  { issue_number, worktree_path }
     Output: { issue, status, pr_number, branch, error? }
   ```

4. **Track progress:**
   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" update-status "$issue" "pr-created" "$pr"
   ```

### Wave Gating

Wait for ALL issues in current wave to complete (PR created) before starting next wave. This ensures dependencies are merged before dependent work begins.

### Failure Handling

If a sub-issue fails:

- Log failure with error details
- Mark dependent sub-issues as skipped
- Continue with remaining independent sub-issues in current wave
- Report skipped issues in summary

---

## Phase 3: Review

After all sub-issues in a wave complete:

1. **Collect PRs** from worktree state
2. **Wait for CI/reviews** with exponential backoff
3. **Classify findings** (same as /auto-issue rules)
4. **Dispatch fix subagents** for critical findings
5. **Re-poll after fixes** (max 3 retries per PR)

### Escalation

If MAX_RETRY exceeded, ask user via Telegram:

- `skip <issue>` — Skip PR and dependents
- `force <issue>` — Mark ready despite issues
- `continue` — After manual fix

---

## Phase 4: Merge

Using dependency graph from Phase 1:

1. **Merge in wave order** (Wave 1 first, then Wave 2, etc.)
2. **Within a wave**, merge in ordinal order
3. **Pre-merge validation:**
   ```bash
   bun run type-check
   bun run lint
   bun test
   ```
4. **Merge PR:**
   ```bash
   gh pr merge "$pr" --squash --delete-branch
   ```
5. **Handle conflicts** — rebase remaining PRs after each merge
6. **Process next wave** after current wave merges

---

## Phase 5: Cleanup

1. **Remove worktrees:**

   ```bash
   "$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" cleanup-all --force
   ```

2. **Update epic issue** — check boxes for completed sub-issues

3. **Close epic** if all sub-issues are closed

4. **Planning graph cleanup** (if available):
   - Pop epic goal from stack
   - Generate Beads summary

5. **Generate summary and send notification**

---

## State Management

Same as `/auto-milestone` — state tracked in `.worktrees/.state.json`, checkpoints in SQLite.

### Resume

If interrupted, workflow checks for existing state:

| Phase   | Resume Action                   |
| ------- | ------------------------------- |
| plan    | Re-read GitHub graph            |
| execute | Spawn remaining open sub-issues |
| review  | Continue review handling        |
| merge   | Continue from next unmerged PR  |
| cleanup | Re-run cleanup                  |

---

## Error Handling

| Error                 | Behavior                     |
| --------------------- | ---------------------------- |
| Epic not found        | Report error, exit           |
| No sub-issues         | Suggest /auto-issue instead  |
| Circular deps         | Report cycle, wait for user  |
| All sub-issues closed | Report "nothing to do", exit |
| Worktree failure      | Offer clean or skip          |
| Network/API failure   | Retry with backoff (max 4)   |

---

## Success Criteria

Workflow succeeds when:

- All open sub-issues processed
- PRs created, reviewed, and merged
- Epic issue updated (checkboxes, optionally closed)
- Worktrees cleaned up
- Summary report generated
