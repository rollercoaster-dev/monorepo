# /auto-issue $ARGUMENTS

Execute fully autonomous issue-to-PR workflow for issue #$ARGUMENTS.

**Mode:** Autonomous - no gates, auto-fix enabled, escalation only on MAX_RETRY exceeded

---

## Quick Reference

```bash
/auto-issue 123                    # Fully autonomous (default)
/auto-issue 123 --dry-run          # Research only, show plan, don't implement
/auto-issue 123 --require-tests    # Fail if tests don't pass
/auto-issue 123 --force-pr         # Create PR even with unresolved issues
/auto-issue 123 --abort-on-fail    # Abort if auto-fix fails
/auto-issue 123 --sequential       # Run review agents sequentially (slower, easier debug)
/auto-issue 123 --skip-retrospective # Skip Phase 3.5 (learning capture)
```

---

## Configuration

| Setting           | Default  | Description                                       |
| ----------------- | -------- | ------------------------------------------------- |
| `MAX_RETRY`       | 3        | Max auto-fix attempts per critical finding        |
| `MAX_FIX_COMMITS` | 10       | Max total fix commits before escalation           |
| `REQUIRE_TESTS`   | false    | Fail if tests don't pass (use `--require-tests`)  |
| `OB_COMPLIANCE`   | auto     | Run ob-compliance if badge code detected          |
| `ESCALATION`      | wait     | Default escalation behavior (wait/force-pr/abort) |
| `REVIEW_MODE`     | parallel | Run reviews parallel or sequential                |

---

## Shared References

This workflow uses patterns from [shared/](../shared/) and Claude Code skills:

**Claude Code Skills (auto-invoked):**

- `checkpoint-workflow` - Workflow state persistence (find, create, log-action, log-commit)
- `checkpoint-session` - Session lifecycle and learning extraction
- `graph-query` - Code graph queries (what-calls, blast-radius, find, exports) for understanding codebase structure

**Documentation patterns (for reference):**

- [telegram-helpers.md](../shared/telegram-helpers.md) - Telegram MCP integration
- [board-operations.md](../shared/board-operations.md) - Board status updates
- [validation-commands.md](../shared/validation-commands.md) - Type-check, lint, test
- [escalation-patterns.md](../shared/escalation-patterns.md) - Escalation handling

**CLI for checkpoint operations:**

```bash
# All checkpoint commands use this base path:
bun run checkpoint <command> [args...]

# Key commands:
# workflow find <issue>           - Find existing workflow
# workflow create <issue> <branch> - Create new workflow
# workflow set-phase <id> <phase> - Update phase
# workflow set-status <id> <status> - Update status
# workflow log-action <id> <action> <result> [json] - Log action
# workflow log-commit <id> <sha> <message> - Log commit
# learning analyze <workflow-id> <dev-plan-path> - Extract learnings
```

### Telegram Notification Points

| Phase      | Type        | Content                |
| ---------- | ----------- | ---------------------- |
| 1→2        | notify_user | Dev plan path          |
| 2→3        | notify_user | Commit count           |
| 3→4        | notify_user | Findings summary       |
| Escalation | ask_user    | Findings + options     |
| 4          | notify_user | PR link, review status |

### Checkpoint Integration

A `WORKFLOW_ID` is established at workflow start and passed to all sub-agents for state tracking.
See the `checkpoint-workflow` skill for available CLI commands.

---

## Workflow Overview

```
PHASE 1: Research      → Fetch issue, create dev plan (NO GATE)
PHASE 2: Implement     → Execute plan with atomic commits (NO GATE)
PHASE 3: Review        → Batch review + auto-fix loop
PHASE 3.5: Retrospective → Capture learnings (NON-BLOCKING)
PHASE 4: Finalize      → Create PR (NO GATE)
ESCALATION             → Only if auto-fix fails MAX_RETRY times
```

**Key Difference from `/work-on-issue`:** No human gates. The workflow proceeds autonomously unless critical issues cannot be resolved.

---

## Helper Functions

See [board-operations.md](../shared/board-operations.md) for:

- `get_item_id_for_issue()` - Get project item ID
- `update_board_status()` - Update issue status on board
- `add_issue_to_board()` - Add issue to project

---

## Phase 1: Research (Autonomous)

0. **Validate input:**

   ```bash
   # Ensure $ARGUMENTS is a valid issue number
   if ! [[ "$ARGUMENTS" =~ ^[0-9]+$ ]]; then
     echo "[AUTO-ISSUE] ERROR: Invalid issue number: $ARGUMENTS"
     echo "[AUTO-ISSUE] Usage: /auto-issue <issue-number>"
     exit 1
   fi
   ```

0b. **Check for existing workflow (resume detection):**

    ```bash
    # Check for existing workflow
    EXISTING=$(bun run checkpoint workflow find $ARGUMENTS)

    if [ "$EXISTING" != "null" ]; then
      WORKFLOW_ID=$(echo "$EXISTING" | jq -r '.workflow.id')
      PHASE=$(echo "$EXISTING" | jq -r '.workflow.phase')
      STATUS=$(echo "$EXISTING" | jq -r '.workflow.status')

      if [ "$STATUS" = "running" ]; then
        echo "[AUTO-ISSUE #$ARGUMENTS] Resuming from phase: $PHASE"
        echo "[AUTO-ISSUE #$ARGUMENTS] Workflow ID: $WORKFLOW_ID"

        # Resume based on phase
        case "$PHASE" in
          "implement") # Skip to Phase 2 ;;
          "review") # Skip to Phase 3 ;;
          "finalize") # Skip to Phase 4 ;;
          *) # Continue from research ;;
        esac
      fi
    fi
    ```

1. **Fetch issue details:**

   ```bash
   gh issue view $ARGUMENTS --json number,title,body,labels,milestone,assignees
   ```

2. **Check for blockers:**

   ```bash
   gh issue view $ARGUMENTS --json body | grep -iE "blocked by|depends on"
   ```

   - If blockers found: **WARN but continue** (unlike /work-on-issue which stops)
   - Log: "Warning: Issue has blockers - proceeding anyway"

3. **Create feature branch:**

   ```bash
   git checkout -b feat/issue-$ARGUMENTS-{short-description}
   ```

3b. **Create workflow checkpoint (if not resuming):**

    ```bash
    if [ -z "$WORKFLOW_ID" ]; then
      BRANCH_NAME="feat/issue-$ARGUMENTS-{short-description}"
      RESULT=$(bun run checkpoint workflow create $ARGUMENTS "$BRANCH_NAME")
      WORKFLOW_ID=$(echo "$RESULT" | jq -r '.id')

      bun run checkpoint workflow log-action "$WORKFLOW_ID" "workflow_started" "success" \
        "{\"issueNumber\": $ARGUMENTS, \"branch\": \"$BRANCH_NAME\"}"

      echo "[AUTO-ISSUE #$ARGUMENTS] Checkpoint created: $WORKFLOW_ID"
    fi
    ```

3c. **Telegram notification - AI_START template (non-blocking):**

    ```typescript
    // Notify user of workflow start
    notifyTelegram(`🚀 [AUTO-ISSUE #$ARGUMENTS] Started

Issue: #$ARGUMENTS
Branch: ${branchName}
Mode: Autonomous

Phase transitions will not be announced.
You will be notified on escalation, completion, or error.`, "AUTO-ISSUE");

````

4. **Spawn `issue-researcher` agent:**
   - Analyze codebase
   - Check dependencies
   - Create dev plan at `.claude/dev-plans/issue-$ARGUMENTS.md`
   - Pass `WORKFLOW_ID` for checkpoint integration

   **Log agent spawn:**

   ```bash
   bun run checkpoint workflow log-action "$WORKFLOW_ID" "spawned_agent" "success" \
     '{"agent": "issue-researcher", "task": "analyze codebase and create dev plan"}'
   ```

5. **Update board status to "In Progress":**

   ```bash
   # Try to add issue to project (silently fails if already present)
   ISSUE_NODE_ID=$(gh issue view $ARGUMENTS --json id -q .id)
   gh api graphql -f query='
     mutation($projectId: ID!, $contentId: ID!) {
       addProjectV2ItemById(input: {
         projectId: $projectId
         contentId: $contentId
       }) { item { id } }
     }' -f projectId="PVT_kwDOB1lz3c4BI2yZ" -f contentId="$ISSUE_NODE_ID" 2>/dev/null || true

   # Get item ID and update status using helper functions
   ITEM_ID=$(get_item_id_for_issue "$ARGUMENTS")

   if [ -n "$ITEM_ID" ]; then
     update_board_status "$ITEM_ID" "3e320f16" "In Progress"
   else
     echo "[AUTO-ISSUE #$ARGUMENTS] WARNING: Issue not found on project board"
     echo "[AUTO-ISSUE #$ARGUMENTS] Continuing without board update..."
   fi
   ```

   **If board update fails:** Log warning but continue - board updates are not critical to implementation.

6. **If `--dry-run`:** Stop here, show plan, exit.

6b. **Log phase transition (research → implement):**

    ```bash
    bun run checkpoint workflow set-phase "$WORKFLOW_ID" "implement"
    bun run checkpoint workflow log-action "$WORKFLOW_ID" "phase_transition" "success" \
      '{"from": "research", "to": "implement"}'
    echo "[AUTO-ISSUE #$ARGUMENTS] Phase: research → implement"
    ```

---

## Phase 2: Implement (Autonomous)

7. **Spawn `atomic-developer` agent with dev plan:**
   - Execute all commits per plan
   - Each commit is atomic and buildable
   - Agent handles validation internally
   - Pass `WORKFLOW_ID` for commit tracking

   **Log agent spawn:**

   ```bash
   bun run checkpoint workflow log-action "$WORKFLOW_ID" "spawned_agent" "success" \
     '{"agent": "atomic-developer", "task": "execute dev plan with atomic commits"}'
   ```

8. **On completion, run validation:**

   ```bash
   bun run type-check && bun run lint
   ```

   - If validation fails: Attempt to fix inline, then continue
   - If still fails: Log and proceed to review (reviewer will catch it)

8b. **Log phase transition (implement → review):**

    ```bash
    bun run checkpoint workflow set-phase "$WORKFLOW_ID" "review"
    bun run checkpoint workflow log-action "$WORKFLOW_ID" "phase_transition" "success" \
      "{\"from\": \"implement\", \"to\": \"review\", \"commitCount\": $COMMIT_COUNT}"
    echo "[AUTO-ISSUE #$ARGUMENTS] Phase: implement → review"
    ```

---

## Phase 3: Review + Auto-Fix Loop

### 3a. Batch Review (Parallel by Default)

9. **Launch review agents in parallel:**

```

- pr-review-toolkit:code-reviewer
- pr-review-toolkit:pr-test-analyzer
- pr-review-toolkit:silent-failure-hunter
- openbadges-compliance-reviewer (if badge code detected)

````

**Log each agent spawn:**

```bash
for AGENT in "pr-review-toolkit:code-reviewer" "pr-review-toolkit:pr-test-analyzer" \
             "pr-review-toolkit:silent-failure-hunter"; do
  bun run checkpoint workflow log-action "$WORKFLOW_ID" "spawned_agent" "success" \
    "{\"agent\": \"$AGENT\", \"task\": \"code review\", \"phase\": \"review\"}"
done
```

**Badge code detection:** Files matching:

- `**/badge*`, `**/credential*`, `**/issuer*`, `**/assertion*`
- `**/ob2/**`, `**/ob3/**`, `**/openbadges/**`

10. **Collect and classify findings:**

### 3b. Finding Classification

| Agent                  | CRITICAL if                          | NON-CRITICAL if          |
| ---------------------- | ------------------------------------ | ------------------------ |
| code-reviewer          | Confidence >= 91 OR label="Critical" | Confidence < 91          |
| silent-failure-hunter  | Severity="CRITICAL"                  | Severity="HIGH"/"MEDIUM" |
| pr-test-analyzer       | Gap rating >= 8                      | Gap rating < 8           |
| ob-compliance-reviewer | "MUST violation"                     | "SHOULD violation"       |

### 3c. Auto-Fix Loop

```bash
RETRY_COUNT=0
FIX_COMMIT_COUNT=0

while [ $HAS_CRITICAL_FINDINGS -eq 1 ] && [ $RETRY_COUNT -lt $MAX_RETRY ]; do
    for FINDING in $CRITICAL_FINDINGS; do
        if [ $FIX_COMMIT_COUNT -ge $MAX_FIX_COMMITS ]; then
            # ESCALATE "Max fix commits reached"
            break
        fi

        # Spawn auto-fixer agent with finding
        # Log auto-fixer spawn
        bun run checkpoint workflow log-action "$WORKFLOW_ID" "spawned_agent" "success" \
          "{\"agent\": \"auto-fixer\", \"task\": \"fix critical finding\", \"attemptNumber\": $((RETRY_COUNT + 1))}"

        if [ $FIX_SUCCESSFUL -eq 1 ]; then
            FIX_COMMIT_COUNT=$((FIX_COMMIT_COUNT + 1))
        fi
    done

    # Re-review after fixes
    # run review agents again
    # classify findings
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $HAS_CRITICAL_FINDINGS -eq 1 ]; then
    # ESCALATE_TO_HUMAN()
else
    # PROCEED_TO_PHASE_4()
fi
```

10b. **Log phase transition (review → retrospective):**

     ```bash
     bun run checkpoint workflow set-phase "$WORKFLOW_ID" "retrospective"
     bun run checkpoint workflow log-action "$WORKFLOW_ID" "phase_transition" "success" \
       "{\"from\": \"review\", \"to\": \"retrospective\", \"fixCommits\": $FIX_COMMIT_COUNT}"
     echo "[AUTO-ISSUE #$ARGUMENTS] Phase: review → retrospective"
     ```

---

## Phase 3.5: Retrospective (Autonomous)

After review findings are resolved, analyze the workflow execution to capture learnings.

**Note:** This phase is non-blocking - failures don't prevent PR creation. Skip with `--skip-retrospective` flag.

10c. **Run retrospective analysis:**

    ```bash
    DEV_PLAN_PATH=".claude/dev-plans/issue-$ARGUMENTS.md"

    # Analyze workflow execution vs dev plan
    if bun run checkpoint learning analyze "$WORKFLOW_ID" "$DEV_PLAN_PATH"; then
      bun run checkpoint workflow log-action "$WORKFLOW_ID" "retrospective_complete" "success"
      echo "[AUTO-ISSUE #$ARGUMENTS] Retrospective complete"
    else
      # Non-blocking - log warning and continue
      bun run checkpoint workflow log-action "$WORKFLOW_ID" "retrospective_failed" "failed"
      echo "[AUTO-ISSUE #$ARGUMENTS] Warning: Retrospective failed"
      echo "[AUTO-ISSUE #$ARGUMENTS] Continuing to finalize phase..."
    fi
    ```

10d. **Report captured learnings (if successful):**

    ```
    WORKFLOW LEARNING CAPTURED

    Deviations from plan: N
    Patterns extracted: M (reusable approaches)
    Mistakes captured: P (to avoid in future)

    Improvement suggestions:
    - <suggestion 1>
    - <suggestion 2>
    ```

10e. **Log phase transition (retrospective → finalize):**

    ```bash
    bun run checkpoint workflow set-phase "$WORKFLOW_ID" "finalize"
    bun run checkpoint workflow log-action "$WORKFLOW_ID" "phase_transition" "success" \
      '{"from": "retrospective", "to": "finalize"}'
    echo "[AUTO-ISSUE #$ARGUMENTS] Phase: retrospective → finalize"
    ```

---

## Phase 4: Finalize (Autonomous)

11. **Run final validation:**

    ```bash
    bun test && bun run type-check && bun run lint && bun run build
    ```

    - If `--require-tests` and tests fail: ESCALATE
    - If build fails: ESCALATE
    - Otherwise: Proceed

12. **Clean up dev-plan file:**

    ```bash
    rm .claude/dev-plans/issue-$ARGUMENTS.md
    git add .claude/dev-plans/
    git commit -m "chore: clean up dev-plan for issue #$ARGUMENTS"
    ```

13. **Push branch:**

    ```bash
    git push -u origin HEAD
    ```

14. **Create PR:**

    ```bash
    gh pr create --title "<type>(<scope>): <description> (#$ARGUMENTS)" --body "..."
    PR_NUMBER=$(gh pr view --json number -q .number)
    ```

    PR body includes:
    - Summary from dev plan
    - Non-critical findings (for reviewer awareness)
    - Auto-fix log (if any fixes were applied)
    - Footer: `Closes #$ARGUMENTS`

14b. **Log workflow completion:**

     ```bash
     bun run checkpoint workflow set-status "$WORKFLOW_ID" "completed"
     bun run checkpoint workflow log-action "$WORKFLOW_ID" "pr_created" "success" \
       "{\"prNumber\": $PR_NUMBER, \"commitCount\": $TOTAL_COMMITS, \"fixCommitCount\": $FIX_COMMIT_COUNT}"
     echo "[AUTO-ISSUE #$ARGUMENTS] Workflow completed: PR #$PR_NUMBER"
     ```

15. **Trigger reviews:**

    ```
    @coderabbitai full review
    @claude review
    ```

16. **Update board status to "Blocked" (awaiting review):**

    ```bash
    # Get item ID and update status using helper functions
    ITEM_ID=$(get_item_id_for_issue "$ARGUMENTS")

    if [ -n "$ITEM_ID" ]; then
      update_board_status "$ITEM_ID" "51c2af7b" "Blocked (awaiting review)"
    else
      echo "[AUTO-ISSUE #$ARGUMENTS] WARNING: Issue not found on project board"
      echo "[AUTO-ISSUE #$ARGUMENTS] PR created but board not updated"
    fi
    ```

    **If board update fails:** Log warning but continue - PR creation is the critical step.

17. **Report completion:**

    ```
    AUTO-ISSUE COMPLETE

    Issue: #$ARGUMENTS
    Branch: feat/issue-$ARGUMENTS-<desc>
    Commits: N implementation + M fixes
    PR: https://github.com/.../pull/XXX

    Reviews triggered. Check PR for CodeRabbit/Claude feedback.
    ```

---

## Escalation Handling

### When Escalation Triggers

1. Same critical finding persists after `MAX_RETRY` (3) attempts
2. Type-check or lint fails after fix attempt
3. Tests fail (if `--require-tests` set)
4. Build fails
5. Review agent fails to execute
6. `MAX_FIX_COMMITS` (10) exceeded

### Escalation Report Format

```markdown
## AUTO-ISSUE ESCALATION REQUIRED

**Issue:** #$ARGUMENTS - <title>
**Branch:** feat/issue-$ARGUMENTS-<desc>
**Retry Count:** 3/3

### Critical Findings (Unresolved)

| #   | Agent                 | File          | Issue              | Fix Attempts         |
| --- | --------------------- | ------------- | ------------------ | -------------------- |
| 1   | code-reviewer         | src/foo.ts:42 | Missing null check | 3 - all failed       |
| 2   | silent-failure-hunter | src/bar.ts:89 | Silent catch block | 2 - validation error |

### Fix Attempt Log

**Attempt 1 (src/foo.ts:42):**

- Applied: Added optional chaining
- Result: FAILED - Type error: cannot use ?. on required property

**Attempt 2 (src/foo.ts:42):**

- Applied: Added explicit null check
- Result: FAILED - Lint error: prefer optional chaining

**Attempt 3 (src/foo.ts:42):**

- Applied: Combined approach with type narrowing
- Result: FAILED - Test failure: expected null to throw

### Your Options

1. **Fix manually** - Make the fix yourself, then type `continue`
2. **Force PR** - Type `force-pr` to create PR with issues flagged
3. **Abort** - Type `abort` to delete branch and exit
4. **Reset** - Type `reset` to go back to last good state and retry
```

### Telegram Escalation (Interactive) - AI_ESCALATION template

When escalation is triggered, use `ask_user` to get user input via Telegram:

```typescript
// Build escalation message - AI_ESCALATION template
const escalationMessage = `🚨 AUTO-ISSUE ESCALATION

Issue: #$ARGUMENTS - <title>
Branch: feat/issue-$ARGUMENTS-<desc>
Retry: ${retryCount}/${MAX_RETRY}

Critical Findings (Unresolved):
${criticalFindings.map((f) => `• ${f.agent}: ${f.file} - ${f.issue}`).join("\n")}

Options:
1. 'continue' - Fix manually, then continue
2. 'force-pr' - Create PR with issues flagged
3. 'abort' - Delete branch and exit
4. 'reset' - Go back to last good state`;

// Ask via Telegram (blocking - waits for response)
const response = await askTelegram(escalationMessage, "AUTO-ISSUE");

// Handle response
switch (response.toLowerCase().trim()) {
  case "continue":
    console.log("[AUTO-ISSUE] User chose: continue after manual fix");
    // Wait for user to make manual fixes, then re-run review
    break;
  case "force-pr":
    console.log("[AUTO-ISSUE] User chose: force-pr");
    // Proceed to Phase 4 with issues flagged
    break;
  case "abort":
    console.log("[AUTO-ISSUE] User chose: abort");
    // Delete branch and exit
    break;
  case "reset":
    console.log("[AUTO-ISSUE] User chose: reset");
    // Reset to last good commit
    break;
  case "TELEGRAM_UNAVAILABLE":
    console.log(
      "[AUTO-ISSUE] Telegram unavailable - waiting for terminal input",
    );
    // Fall through to terminal-based escalation
    break;
  default:
    console.log(`[AUTO-ISSUE] Unknown response: ${response}`);
    // Re-prompt
    break;
}
```

### Log Escalation to Checkpoint

**IMPORTANT**: Send Telegram escalation (askTelegram) BEFORE logging to checkpoint. This ensures the user is notified even if checkpoint logging fails.

When escalation is triggered, log the failure:

```bash
bun run checkpoint workflow set-status "$WORKFLOW_ID" "failed"
bun run checkpoint workflow log-action "$WORKFLOW_ID" "escalation" "failed" \
  "{\"reason\": \"MAX_RETRY exceeded\", \"fixAttempts\": $FIX_COMMIT_COUNT}"
echo "[AUTO-ISSUE #$ARGUMENTS] Workflow failed: Escalation required"
```

### Escalation Flag Behaviors

| Flag              | Behavior on Escalation                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| (default)         | Show report, wait for input                                                |
| `--force-pr`      | Create PR with `## UNRESOLVED ISSUES` section, add `needs-attention` label |
| `--abort-on-fail` | Delete branch, report failure, exit                                        |

---

## Break Glass: User Intervention

The user can intervene at ANY time by typing in the chat:

| Input             | Action                                            |
| ----------------- | ------------------------------------------------- |
| `stop` or `pause` | Halt workflow, show current status                |
| `skip review`     | Skip remaining review, go straight to PR creation |
| `abort`           | Clean up (delete branch), exit                    |
| `continue`        | Resume after manual fix (during escalation)       |
| `force-pr`        | Force PR creation (during escalation)             |
| `reset`           | Reset to last good commit, retry                  |

Between phases, the orchestrator checks for user input. If detected, handle appropriately.

---

## Resuming Interrupted Workflows

If `/auto-issue` is interrupted (context compaction, timeout, manual stop), the checkpoint API enables resumption.

### Detect Existing Workflow

At workflow start (step 0b), the orchestrator checks for existing workflows:

```bash
EXISTING=$(bun run checkpoint workflow find $ARGUMENTS)

if [ "$EXISTING" != "null" ]; then
  STATUS=$(echo "$EXISTING" | jq -r '.workflow.status')
  if [ "$STATUS" = "running" ]; then
    # Workflow found - can resume
  fi
fi
```

### Resume Based on Phase

| Phase     | Resume Action                                       |
| --------- | --------------------------------------------------- |
| research  | Re-run issue-researcher (idempotent)                |
| implement | Check `existing.commits`, continue from last commit |
| review    | Re-run review agents, check previous findings       |
| finalize  | Re-run validation, attempt PR creation again        |

### Verify Checkpoint State

Before resuming, verify the checkpoint data:

```bash
DATA=$(bun run checkpoint workflow find $ARGUMENTS)

if [ "$DATA" != "null" ]; then
  echo "Workflow $(echo $DATA | jq -r '.workflow.id'):"
  echo "- Phase: $(echo $DATA | jq -r '.workflow.phase')"
  echo "- Status: $(echo $DATA | jq -r '.workflow.status')"
  echo "- Actions: $(echo $DATA | jq '.actions | length')"
  echo "- Commits: $(echo $DATA | jq '.commits | length')"

  # List commits made so far
  echo "$DATA" | jq -r '.commits[] | "  \(.sha[0:7]) \(.message)"'
fi
```

### Manual Resume Commands

If automatic resume fails, use these commands:

```bash
# Check workflow state
bun run checkpoint workflow find 354

# List all active workflows
bun run checkpoint workflow list-active

# Mark workflow as failed (to start fresh)
bun run checkpoint workflow set-status "workflow-id" "failed"
```

### Database Location

Checkpoint data is stored in `.claude/execution-state.db` (SQLite, gitignored).

---

## Comparison: /auto-issue vs /work-on-issue

| Aspect        | /auto-issue            | /work-on-issue          |
| ------------- | ---------------------- | ----------------------- |
| Gates         | None (escalation only) | 4 hard gates            |
| User approval | Only on failure        | Every phase             |
| Speed         | Fast (autonomous)      | Slow (manual)           |
| Control       | Low during execution   | High throughout         |
| Best for      | Simple, clear issues   | Complex, uncertain work |
| Learning      | Not ideal              | Good for understanding  |

---

## Error Handling

### Issue Not Found

```
Error: Issue #$ARGUMENTS not found. Aborting.
```

### Branch Already Exists

```
Warning: Branch feat/issue-$ARGUMENTS-* exists. Checking out existing branch.
```

### Agent Failure

If any agent fails to execute:

1. Log the failure
2. Continue with remaining agents
3. If all agents fail: ESCALATE

### Git Conflicts

If git operations fail due to conflicts:

1. STOP immediately
2. Report conflict details
3. Wait for user guidance
4. Do not auto-resolve

### Fatal Error Notification

When a workflow fails due to unrecoverable error:

```bash
# Log the error
bun run checkpoint workflow set-status "$WORKFLOW_ID" "failed"
bun run checkpoint workflow log-action "$WORKFLOW_ID" "fatal_error" "failed" \
  "{\"phase\": \"$CURRENT_PHASE\", \"error\": \"$ERROR_MESSAGE\"}"

echo "[AUTO-ISSUE #$ARGUMENTS] Workflow failed: $ERROR_MESSAGE"
```

**When to use**: Issue not found, branch creation failure, git conflicts, all agents fail, validation failure on finalize.

---

## Agents Used

| Agent                                     | Purpose             | When Called             |
| ----------------------------------------- | ------------------- | ----------------------- |
| `issue-researcher`                        | Create dev plan     | Phase 1                 |
| `atomic-developer`                        | Implement changes   | Phase 2                 |
| `pr-review-toolkit:code-reviewer`         | Code quality review | Phase 3                 |
| `pr-review-toolkit:pr-test-analyzer`      | Test coverage       | Phase 3                 |
| `pr-review-toolkit:silent-failure-hunter` | Edge cases          | Phase 3                 |
| `openbadges-compliance-reviewer`          | OB spec compliance  | Phase 3 (if badge code) |
| `auto-fixer`                              | Apply fixes         | Phase 3 (auto-fix loop) |
| `pr-creator`                              | Create PR           | Phase 4                 |

---

## Success Criteria

This workflow is successful when:

- Issue is fully implemented per plan
- All critical findings resolved (or escalated)
- PR created and reviews triggered
- Board updated to "Blocked" (awaiting review)
- User informed of PR URL

```

```
