# /auto-issue $ARGUMENTS

Execute fully autonomous issue-to-PR workflow for issue #$ARGUMENTS.

**Mode:** Autonomous - no gates, auto-fix enabled, escalation only on MAX_RETRY exceeded

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

4. **Spawn `issue-researcher` agent:**
   - Analyze codebase
   - Check dependencies
   - Create dev plan at `.claude/dev-plans/issue-$ARGUMENTS.md`

5. **Update board status to "In Progress":**

   ```bash
   # Try to add issue to project (silently fails if already present)
   # Get issue node ID first
   ISSUE_NODE_ID=$(gh issue view $ARGUMENTS --json id -q .id)
   gh api graphql -f query='
     mutation($projectId: ID!, $contentId: ID!) {
       addProjectV2ItemById(input: {
         projectId: $projectId
         contentId: $contentId
       }) { item { id } }
     }' -f projectId="PVT_kwDOB1lz3c4BI2yZ" -f contentId="$ISSUE_NODE_ID" 2>/dev/null || true

   # Get the item ID via GraphQL
   # Note: Fetches first 100 items. If project grows beyond 100, use pagination.
   ITEM_ID=$(gh api graphql -f query='
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
     }' | jq -r '.data.organization.projectV2.items.nodes[] | select(.content.number == '$ARGUMENTS') | .id')

   # Move to "In Progress" using GraphQL mutation (avoids scope issues with gh project item-edit)
   if [ -n "$ITEM_ID" ]; then
     gh api graphql \
       -f projectId="PVT_kwDOB1lz3c4BI2yZ" \
       -f itemId="$ITEM_ID" \
       -f fieldId="PVTSSF_lADOB1lz3c4BI2yZzg5MUx4" \
       -f optionId="3e320f16" \
       -f query='mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
         updateProjectV2ItemFieldValue(input: {
           projectId: $projectId
           itemId: $itemId
           fieldId: $fieldId
           value: { singleSelectOptionId: $optionId }
         }) {
           projectV2Item { id }
         }
       }'
     echo "[AUTO-ISSUE #$ARGUMENTS] Board: Moved to 'In Progress'"
   else
     echo "[AUTO-ISSUE #$ARGUMENTS] WARNING: Issue not found on project board"
     echo "[AUTO-ISSUE #$ARGUMENTS] Continuing without board update..."
   fi
   ```

   **If board update fails:** Log warning but continue - board updates are not critical to implementation.

6. **If `--dry-run`:** Stop here, show plan, exit.

---

## Phase 2: Implement (Autonomous)

7. **Spawn `atomic-developer` agent with dev plan:**
   - Execute all commits per plan
   - Each commit is atomic and buildable
   - Agent handles validation internally

8. **On completion, run validation:**

   ```bash
   bun run type-check && bun run lint
   ```

   - If validation fails: Attempt to fix inline, then continue
   - If still fails: Log and proceed to review (reviewer will catch it)

---

## Phase 3: Review + Auto-Fix Loop

### 3a. Batch Review (Parallel by Default)

9. **Launch review agents in parallel:**

   ```
   - pr-review-toolkit:code-reviewer
   - pr-review-toolkit:pr-test-analyzer
   - pr-review-toolkit:silent-failure-hunter
   - openbadges-compliance-reviewer (if badge code detected)
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

```
retry_count = 0
fix_commit_count = 0

while has_critical_findings AND retry_count < MAX_RETRY:
    for each critical_finding:
        if fix_commit_count >= MAX_FIX_COMMITS:
            ESCALATE("Max fix commits reached")
            break

        spawn auto-fixer agent with finding

        if fix successful:
            fix_commit_count++
        else:
            log failure

    # Re-review after fixes
    run review agents again
    classify findings
    retry_count++

if has_critical_findings:
    ESCALATE_TO_HUMAN()
else:
    PROCEED_TO_PHASE_4()
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
    ```

    PR body includes:
    - Summary from dev plan
    - Non-critical findings (for reviewer awareness)
    - Auto-fix log (if any fixes were applied)
    - Footer: `Closes #$ARGUMENTS`

15. **Trigger reviews:**

    ```
    @coderabbitai full review
    @claude review
    ```

16. **Update board status to "Blocked" (awaiting review):**

    ```bash
    # Get the item ID via GraphQL
    # Note: Fetches first 100 items. If project grows beyond 100, use pagination.
    ITEM_ID=$(gh api graphql -f query='
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
      }' | jq -r '.data.organization.projectV2.items.nodes[] | select(.content.number == '$ARGUMENTS') | .id')

    # Move to "Blocked" - PR created, awaiting review using GraphQL mutation
    if [ -n "$ITEM_ID" ]; then
      gh api graphql \
        -f projectId="PVT_kwDOB1lz3c4BI2yZ" \
        -f itemId="$ITEM_ID" \
        -f fieldId="PVTSSF_lADOB1lz3c4BI2yZzg5MUx4" \
        -f optionId="51c2af7b" \
        -f query='mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { singleSelectOptionId: $optionId }
          }) {
            projectV2Item { id }
          }
        }'
      echo "[AUTO-ISSUE #$ARGUMENTS] Board: Moved to 'Blocked' (awaiting review)"
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
