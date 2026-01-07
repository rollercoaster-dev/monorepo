# /auto-issue $ARGUMENTS

Execute fully autonomous issue-to-PR workflow for issue #$ARGUMENTS.

**Mode:** Autonomous - no gates, auto-fix enabled, escalation only on MAX_RETRY exceeded

**Workflow Logging:** This workflow uses `scripts/workflow-logger.sh` to persist progress to `.claude/workflow-state/auto-issue-$ARGUMENTS/`. See `.claude/workflow-state/README.md` for details on resuming workflows.

---

## Quick Reference

```bash
/auto-issue 123                  # Fully autonomous (default)
/auto-issue 123 --dry-run        # Research only, show plan, don't implement
/auto-issue 123 --require-tests  # Fail if tests don't pass
/auto-issue 123 --force-pr       # Create PR even with unresolved issues
/auto-issue 123 --abort-on-fail  # Abort if auto-fix fails
/auto-issue 123 --sequential     # Run review agents sequentially (slower, easier debug)
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

## Workflow Overview

```
PHASE 1: Research    → Fetch issue, create dev plan (NO GATE)
PHASE 2: Implement   → Execute plan with atomic commits (NO GATE)
PHASE 3: Review      → Batch review + auto-fix loop
PHASE 4: Finalize    → Create PR (NO GATE)
ESCALATION           → Only if auto-fix fails MAX_RETRY times
```

**Key Difference from `/work-on-issue`:** No human gates. The workflow proceeds autonomously unless critical issues cannot be resolved.

---

## Helper Functions

These reusable functions are used throughout the workflow:

### Get Item ID for Issue

```bash
get_item_id_for_issue() {
  local issue_number=$1
  gh api graphql -f query='
    query {
      organization(login: "rollercoaster-dev") {
        projectV2(number: 11) {
          items(first: 100) {
            nodes {
              id
              content { ... on Issue { number } }
            }
          }
        }
      }
    }' | jq -r ".data.organization.projectV2.items.nodes[] | select(.content.number == $issue_number) | .id"
}
```

### Update Board Status

```bash
update_board_status() {
  local item_id=$1
  local option_id=$2
  local status_name=$3

  RESULT=$(gh api graphql \
    -f projectId="PVT_kwDOB1lz3c4BI2yZ" \
    -f itemId="$item_id" \
    -f fieldId="PVTSSF_lADOB1lz3c4BI2yZzg5MUx4" \
    -f optionId="$option_id" \
    -f query='mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }' 2>&1)

  # Validate response - check for errors in GraphQL response
  if echo "$RESULT" | jq -e '.errors | length > 0' > /dev/null 2>&1; then
    echo "[AUTO-ISSUE #$ARGUMENTS] WARNING: Board update failed (GraphQL error)"
    return 1
  elif echo "$RESULT" | jq -e '.data.updateProjectV2ItemFieldValue.projectV2Item.id' > /dev/null 2>&1; then
    echo "[AUTO-ISSUE #$ARGUMENTS] Board: Moved to '$status_name'"
    return 0
  else
    echo "[AUTO-ISSUE #$ARGUMENTS] WARNING: Board update failed (unexpected response)"
    return 1
  fi
}
```

---

## Phase 1: Research (Autonomous)

0. **Initialize workflow logging:**

   ```bash
   # Source the workflow logger utility
   source scripts/workflow-logger.sh

   # Initialize workflow state
   WORKFLOW_ID=$(init_workflow "auto-issue" "$ARGUMENTS")
   echo "[AUTO-ISSUE #$ARGUMENTS] Workflow logging initialized: $WORKFLOW_ID"

   # Log workflow start
   log_phase_start "$WORKFLOW_ID" "research"
   ```

1. **Validate input:**

   ```bash
   # Ensure $ARGUMENTS is a valid issue number
   if ! [[ "$ARGUMENTS" =~ ^[0-9]+$ ]]; then
     echo "[AUTO-ISSUE] ERROR: Invalid issue number: $ARGUMENTS"
     echo "[AUTO-ISSUE] Usage: /auto-issue <issue-number>"
     log_workflow_abort "$WORKFLOW_ID" "Invalid issue number"
     exit 1
   fi
   ```

2. **Fetch issue details:**

   ```bash
   ISSUE_DATA=$(gh issue view $ARGUMENTS --json number,title,body,labels,milestone,assignees)
   ISSUE_TITLE=$(echo "$ISSUE_DATA" | jq -r '.title')

   # Update workflow metadata with issue title (use jq for safe JSON construction)
   ISSUE_META=$(jq -n --arg title "$ISSUE_TITLE" '{issueTitle: $title}')
   update_phase "$WORKFLOW_ID" "research" "$ISSUE_META"
   ```

3. **Check for blockers:**

   ```bash
   gh issue view $ARGUMENTS --json body | grep -iE "blocked by|depends on"
   ```

   - If blockers found: **WARN but continue** (unlike /work-on-issue which stops)
   - Log: "Warning: Issue has blockers - proceeding anyway"

   ```bash
   # Log blocker warning if found
   if [blockers detected]; then
     log_event "$WORKFLOW_ID" "warning.blockers" '{"message":"Issue has blockers, proceeding anyway"}'
   fi
   ```

4. **Create feature branch:**

   ```bash
   git checkout -b feat/issue-$ARGUMENTS-{short-description}
   ```

5. **Spawn `issue-researcher` agent:**

   ```bash
   log_agent_spawn "$WORKFLOW_ID" "issue-researcher"
   ```

   - Analyze codebase
   - Check dependencies
   - Create dev plan at `.claude/dev-plans/issue-$ARGUMENTS.md`

   ```bash
   # After dev plan is created (use jq for safe JSON construction)
   PLAN_PATH=".claude/dev-plans/issue-$ARGUMENTS.md"
   RESEARCH_META=$(jq -n --arg path "$PLAN_PATH" '{planPath: $path}')
   log_phase_complete "$WORKFLOW_ID" "research" "$RESEARCH_META"
   set_resume_context "$WORKFLOW_ID" "Issue #$ARGUMENTS research complete. Dev plan created at $PLAN_PATH. Next: implementation phase."
   ```

6. **Update board status to "In Progress":**

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
     log_event "$WORKFLOW_ID" "board.update" '{"status":"In Progress"}'
   else
     echo "[AUTO-ISSUE #$ARGUMENTS] WARNING: Issue not found on project board"
     echo "[AUTO-ISSUE #$ARGUMENTS] Continuing without board update..."
   fi
   ```

   **If board update fails:** Log warning but continue - board updates are not critical to implementation.

7. **If `--dry-run`:** Stop here, show plan, exit.

   ```bash
   if [[ "$DRY_RUN" == "true" ]]; then
     log_workflow_abort "$WORKFLOW_ID" "Dry run completed"
     archive_workflow "$WORKFLOW_ID"
   fi
   ```

---

## Phase 2: Implement (Autonomous)

8. **Initialize implementation phase:**

   ```bash
   log_phase_start "$WORKFLOW_ID" "implement"
   update_phase "$WORKFLOW_ID" "implement" '{"commits":0,"completedSteps":0}'
   set_resume_context "$WORKFLOW_ID" "Issue #$ARGUMENTS implementation started. Plan: .claude/dev-plans/issue-$ARGUMENTS.md. Resume by checking git log and continuing implementation."
   ```

9. **Spawn `atomic-developer` agent with dev plan:**

   ```bash
   # Use jq for safe JSON construction
   PLAN_PATH=".claude/dev-plans/issue-$ARGUMENTS.md"
   DEV_META=$(jq -n --arg path "$PLAN_PATH" '{planPath: $path}')
   log_agent_spawn "$WORKFLOW_ID" "atomic-developer" "$DEV_META"
   ```

   - Execute all commits per plan
   - Each commit is atomic and buildable
   - Agent handles validation internally

   ```bash
   # After each commit made by atomic-developer
   COMMIT_SHA=$(git rev-parse HEAD)
   COMMIT_MSG=$(git log -1 --pretty=%s)
   log_commit "$WORKFLOW_ID" "$COMMIT_SHA" "$COMMIT_MSG"

   # Update phase data with commit count (use jq for safe JSON construction)
   COMMIT_COUNT=$(git rev-list --count HEAD ^main)
   IMPL_META=$(jq -n --argjson commits "$COMMIT_COUNT" --arg sha "$COMMIT_SHA" '{commits: $commits, lastCommit: $sha}')
   update_phase "$WORKFLOW_ID" "implement" "$IMPL_META"
   ```

10. **On completion, run validation:**

    ```bash
    bun run type-check && bun run lint
    ```

    - If validation fails: Attempt to fix inline, then continue
    - If still fails: Log and proceed to review (reviewer will catch it)

    ```bash
    # Log implementation complete (use jq for safe JSON construction)
    IMPL_COMPLETE_META=$(jq -n --argjson commits "$COMMIT_COUNT" '{commits: $commits}')
    log_phase_complete "$WORKFLOW_ID" "implement" "$IMPL_COMPLETE_META"
    set_resume_context "$WORKFLOW_ID" "Issue #$ARGUMENTS implementation complete with $COMMIT_COUNT commits. Next: review phase."
    ```

---

## Phase 3: Review + Auto-Fix Loop

### 3a. Batch Review (Parallel by Default)

11. **Initialize review phase:**

    ```bash
    log_phase_start "$WORKFLOW_ID" "review"
    update_phase "$WORKFLOW_ID" "review" '{"findings":[],"fixAttempts":0}'
    set_resume_context "$WORKFLOW_ID" "Issue #$ARGUMENTS entering review phase. Implementation complete with $COMMIT_COUNT commits. Resume by running review agents."
    ```

12. **Launch review agents in parallel:**

    ```bash
    # Log each review agent spawn
    log_agent_spawn "$WORKFLOW_ID" "code-reviewer"
    log_agent_spawn "$WORKFLOW_ID" "pr-test-analyzer"
    log_agent_spawn "$WORKFLOW_ID" "silent-failure-hunter"

    # If badge code detected
    if [badge code detected]; then
      log_agent_spawn "$WORKFLOW_ID" "openbadges-compliance-reviewer"
    fi
    ```

    **Badge code detection:** Files matching:
    - `**/badge*`, `**/credential*`, `**/issuer*`, `**/assertion*`
    - `**/ob2/**`, `**/ob3/**`, `**/openbadges/**`

13. **Collect and classify findings:**

    ```bash
    # Log review findings (use jq for safe JSON construction)
    for finding in findings; do
      FINDING_META=$(jq -n --arg sev "$severity" --arg agent "$agent" --arg file "$file" \
        '{severity: $sev, agent: $agent, file: $file}')
      log_event "$WORKFLOW_ID" "review.finding" "$FINDING_META"
    done
    ```

### 3b. Finding Classification

| Agent                  | CRITICAL if                          | NON-CRITICAL if          |
| ---------------------- | ------------------------------------ | ------------------------ |
| code-reviewer          | Confidence >= 91 OR label="Critical" | Confidence < 91          |
| silent-failure-hunter  | Severity="CRITICAL"                  | Severity="HIGH"/"MEDIUM" |
| pr-test-analyzer       | Gap rating >= 8                      | Gap rating < 8           |
| ob-compliance-reviewer | "MUST violation"                     | "SHOULD violation"       |

### 3c. Auto-Fix Loop

```bash
retry_count=0
fix_commit_count=0

while has_critical_findings AND retry_count < MAX_RETRY; do
    for each critical_finding; do
        if [[ $fix_commit_count -ge $MAX_FIX_COMMITS ]]; then
            # Use jq for safe JSON construction
            ESC_META=$(jq -n --argjson count "$fix_commit_count" '{fixCommits: $count}')
            log_escalation "$WORKFLOW_ID" "Max fix commits reached" "$ESC_META"
            ESCALATE("Max fix commits reached")
            break
        fi

        # Log fix attempt (use jq for safe JSON construction)
        ATTEMPT_META=$(jq -n --arg finding "$finding" --argjson attempt "$((retry_count + 1))" \
          '{finding: $finding, attempt: $attempt}')
        log_event "$WORKFLOW_ID" "fix.attempt" "$ATTEMPT_META"

        # Spawn auto-fixer agent with finding
        FIXER_META=$(jq -n --arg finding "$finding" '{finding: $finding}')
        log_agent_spawn "$WORKFLOW_ID" "auto-fixer" "$FIXER_META"

        if fix_successful; then
            ((fix_commit_count++))
            COMMIT_SHA=$(git rev-parse HEAD)
            log_commit "$WORKFLOW_ID" "$COMMIT_SHA" "fix: $finding"
            SUCCESS_META=$(jq -n --arg finding "$finding" --arg sha "$COMMIT_SHA" \
              '{finding: $finding, sha: $sha}')
            log_event "$WORKFLOW_ID" "fix.success" "$SUCCESS_META"
        else
            FAIL_META=$(jq -n --arg finding "$finding" --arg reason "$failure_reason" \
              '{finding: $finding, reason: $reason}')
            log_event "$WORKFLOW_ID" "fix.failure" "$FAIL_META"
        fi
    done

    # Re-review after fixes
    run review agents again
    classify findings
    ((retry_count++))

    # Update phase data (use jq for safe JSON construction)
    REVIEW_META=$(jq -n --argjson findings "$critical_count" --argjson attempts "$retry_count" \
      --argjson fixes "$fix_commit_count" '{findings: $findings, fixAttempts: $attempts, fixCommits: $fixes}')
    update_phase "$WORKFLOW_ID" "review" "$REVIEW_META"
done

if has_critical_findings; then
    # Use jq for safe JSON construction
    ESC_META=$(jq -n --argjson count "$critical_count" '{unresolved: $count}')
    log_escalation "$WORKFLOW_ID" "Critical findings unresolved after $MAX_RETRY attempts" "$ESC_META"
    ESCALATE_TO_HUMAN()
else:
    COMPLETE_META=$(jq -n --argjson fixes "$fix_commit_count" '{fixCommits: $fixes}')
    log_phase_complete "$WORKFLOW_ID" "review" "$COMPLETE_META"
    set_resume_context "$WORKFLOW_ID" "Issue #$ARGUMENTS review complete. All critical findings resolved. Next: finalize and create PR."
    PROCEED_TO_PHASE_4()
fi
```

---

## Phase 4: Finalize (Autonomous)

14. **Initialize finalize phase:**

    ```bash
    log_phase_start "$WORKFLOW_ID" "finalize"
    set_resume_context "$WORKFLOW_ID" "Issue #$ARGUMENTS finalizing. Running validation and preparing PR."
    ```

15. **Run final validation:**

    ```bash
    bun test && bun run type-check && bun run lint && bun run build
    ```

    - If `--require-tests` and tests fail: ESCALATE
    - If build fails: ESCALATE
    - Otherwise: Proceed

16. **Clean up dev-plan file:**

    ```bash
    rm .claude/dev-plans/issue-$ARGUMENTS.md
    git add .claude/dev-plans/
    git commit -m "chore: clean up dev-plan for issue #$ARGUMENTS"

    COMMIT_SHA=$(git rev-parse HEAD)
    log_commit "$WORKFLOW_ID" "$COMMIT_SHA" "chore: clean up dev-plan"
    ```

17. **Push branch:**

    ```bash
    git push -u origin HEAD
    # Use jq for safe JSON construction
    PUSH_META=$(jq -n --arg branch "$(git branch --show-current)" '{branch: $branch}')
    log_event "$WORKFLOW_ID" "git.push" "$PUSH_META"
    ```

18. **Create PR:**

    ```bash
    PR_URL=$(gh pr create --title "<type>(<scope>): <description> (#$ARGUMENTS)" --body "..." --json url -q .url)
    PR_NUMBER=$(gh pr view "$PR_URL" --json number -q .number)

    log_pr_created "$WORKFLOW_ID" "$PR_NUMBER" "$PR_URL"
    # Use jq for safe JSON construction
    PR_META=$(jq -n --argjson num "$PR_NUMBER" --arg url "$PR_URL" '{prNumber: $num, prUrl: $url}')
    update_phase "$WORKFLOW_ID" "finalize" "$PR_META"
    ```

    PR body includes:
    - Summary from dev plan
    - Non-critical findings (for reviewer awareness)
    - Auto-fix log (if any fixes were applied)
    - Footer: `Closes #$ARGUMENTS`

19. **Trigger reviews:**

    ```bash
    gh pr comment "$PR_NUMBER" --body "@coderabbitai full review"
    gh pr comment "$PR_NUMBER" --body "@claude review"

    log_event "$WORKFLOW_ID" "pr.review_requested" '{"reviewers":["coderabbitai","claude"]}'
    ```

20. **Update board status to "Blocked" (awaiting review):**

    ```bash
    # Get item ID and update status using helper functions
    ITEM_ID=$(get_item_id_for_issue "$ARGUMENTS")

    if [ -n "$ITEM_ID" ]; then
      update_board_status "$ITEM_ID" "51c2af7b" "Blocked (awaiting review)"
      # Use jq for safe JSON construction
      BOARD_META=$(jq -n --arg status "Blocked (awaiting review)" '{status: $status}')
      log_event "$WORKFLOW_ID" "board.update" "$BOARD_META"
    else
      echo "[AUTO-ISSUE #$ARGUMENTS] WARNING: Issue not found on project board"
      echo "[AUTO-ISSUE #$ARGUMENTS] PR created but board not updated"
    fi
    ```

    **If board update fails:** Log warning but continue - PR creation is the critical step.

21. **Complete workflow and archive:**

    ```bash
    # Use jq for safe JSON construction
    FINAL_META=$(jq -n --argjson num "$PR_NUMBER" '{prNumber: $num}')
    log_phase_complete "$WORKFLOW_ID" "finalize" "$FINAL_META"
    SUCCESS_META=$(jq -n --argjson num "$PR_NUMBER" --arg url "$PR_URL" '{prNumber: $num, prUrl: $url}')
    log_workflow_success "$WORKFLOW_ID" "$SUCCESS_META"
    archive_workflow "$WORKFLOW_ID"
    ```

22. **Report completion:**

    ```
    AUTO-ISSUE COMPLETE

    Issue: #$ARGUMENTS
    Branch: feat/issue-$ARGUMENTS-<desc>
    Commits: N implementation + M fixes
    PR: $PR_URL

    Workflow logs archived to: .claude/workflow-state/archive/auto-issue-$ARGUMENTS/

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
