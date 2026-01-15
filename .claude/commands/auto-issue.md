# /auto-issue <issue-number>

Execute fully autonomous issue-to-PR workflow for the specified issue.

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

## Bash Command Convention

**IMPORTANT:** All bash commands must be run individually:

- **No `&&` chaining** - Run each command separately
- **No shell variables** - Use literal values, never `$VAR` syntax
- **One command per Bash tool call** - Don't combine sequential operations
- **Substitute placeholders** - Replace `<placeholder>` with actual values before execution

This ensures reliable execution and clear error attribution.

### Command Execution Guidelines

The bash examples in this document use `<placeholder>` syntax (e.g., `<issue-number>`, `<workflow-id>`).
When executing commands, **always substitute placeholders with actual values**:

```
# Documentation shows:
gh issue view <issue-number> --json number,title,body

# You execute (with actual value):
gh issue view 482 --json number,title,body
```

**Never execute shell variables** - If you see `$ARGUMENTS` or `$WORKFLOW_ID` in examples,
these are reference patterns. Use the actual values you have in context.

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

   Verify the issue number is valid before proceeding. If invalid, report error and exit.

0b. **Check for existing workflow (resume detection):**

    ```bash
    bun run checkpoint workflow find <issue-number>
    ```

    If a running workflow exists, resume from the recorded phase:
    - `implement` → Skip to Phase 2
    - `review` → Skip to Phase 3
    - `finalize` → Skip to Phase 4
    - Otherwise → Continue from research

1. **Fetch issue details:**

   ```bash
   gh issue view <issue-number> --json number,title,body,labels,milestone,assignees
   ```

2. **Check for blockers:**

   ```bash
   gh issue view <issue-number> --json body
   ```

   Search the body for "blocked by" or "depends on" patterns.
   - If blockers found: **WARN but continue** (unlike /work-on-issue which stops)
   - Log: "Warning: Issue has blockers - proceeding anyway"

3. **Create feature branch:**

   ```bash
   git checkout -b feat/issue-<issue-number>-<short-description>
   ```

3b. **Create workflow checkpoint (if not resuming):**

    ```bash
    bun run checkpoint workflow create <issue-number> "feat/issue-<issue-number>-<short-description>"
    ```

    Then log the workflow start:

    ```bash
    bun run checkpoint workflow log-action "<workflow-id>" "workflow_started" "success" '{"issueNumber": <issue-number>, "branch": "feat/issue-<issue-number>-<short-description>"}'
    ```

3c. **Telegram notification - AI_START template (non-blocking):**

    Use the `mcp__mcp-communicator-telegram__notify_user` tool to notify the user that the workflow has started.
    Include: issue number, branch name, and that phase transitions won't be announced.

4. **Spawn `issue-researcher` agent:**
   - Analyze codebase
   - Check dependencies
   - Create dev plan at `.claude/dev-plans/issue-<issue-number>.md`
   - Pass workflow ID for checkpoint integration

   **Log agent spawn:**

   ```bash
   bun run checkpoint workflow log-action "<workflow-id>" "spawned_agent" "success" '{"agent": "issue-researcher", "task": "analyze codebase and create dev plan"}'
   ```

5. **Update board status to "In Progress":**

   First, get the issue node ID:

   ```bash
   gh issue view <issue-number> --json id -q .id
   ```

   Then add to project board (use the board-manager skill or GraphQL API).
   Update status to "In Progress" (status ID: `3e320f16`).

   **If board update fails:** Log warning but continue - board updates are not critical to implementation.

6. **If `--dry-run`:** Stop here, show plan, exit.

6b. **Log phase transition (research → implement):**

    ```bash
    bun run checkpoint workflow set-phase "<workflow-id>" "implement"
    ```

    ```bash
    bun run checkpoint workflow log-action "<workflow-id>" "phase_transition" "success" '{"from": "research", "to": "implement"}'
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
   bun run checkpoint workflow log-action "<workflow-id>" "spawned_agent" "success" '{"agent": "atomic-developer", "task": "execute dev plan with atomic commits"}'
   ```

8. **On completion, run validation (as separate commands):**

   ```bash
   bun run type-check
   ```

   ```bash
   bun run lint
   ```

   - If validation fails: Attempt to fix inline, then continue
   - If still fails: Log and proceed to review (reviewer will catch it)

8b. **Log phase transition (implement → review):**

    ```bash
    bun run checkpoint workflow set-phase "<workflow-id>" "review"
    ```

    ```bash
    bun run checkpoint workflow log-action "<workflow-id>" "phase_transition" "success" '{"from": "implement", "to": "review", "commitCount": <commit-count>}'
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

```

**Log each agent spawn (run separately for each agent):**

For each review agent, log the spawn action with the actual workflow ID:

```bash
bun run checkpoint workflow log-action "<workflow-id>" "spawned_agent" "success" '{"agent": "<agent-name>", "task": "code review", "phase": "review"}'
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

**Loop Logic (reference pattern - do not execute as bash):**

1. For each critical finding (up to MAX_RETRY=3 attempts per finding):
   - Spawn `auto-fixer` agent with the finding details
   - Log the attempt:
     ```bash
     bun run checkpoint workflow log-action "<workflow-id>" "spawned_agent" "success" '{"agent": "auto-fixer", "task": "fix critical finding", "attemptNumber": <attempt>}'
     ```
   - If fix successful, increment fix commit count
   - If fix failed after MAX_RETRY, add to unresolved list

2. After processing all findings:
   - If unresolved findings remain → ESCALATE
   - Otherwise → PROCEED to Phase 4

10b. **Log phase transition (review → retrospective):**

     ```bash
     bun run checkpoint workflow set-phase "<workflow-id>" "retrospective"
     ```

     ```bash
     bun run checkpoint workflow log-action "<workflow-id>" "phase_transition" "success" '{"from": "review", "to": "retrospective", "fixCommits": <fix-count>}'
     ```

---

## Phase 3.5: Retrospective (Autonomous)

After review findings are resolved, analyze the workflow execution to capture learnings.

**Note:** This phase is non-blocking - failures don't prevent PR creation. Skip with `--skip-retrospective` flag.

10c. **Run retrospective analysis:**

    ```bash
    bun run checkpoint learning analyze "<workflow-id>" ".claude/dev-plans/issue-<issue-number>.md"
    ```

    On success:
    ```bash
    bun run checkpoint workflow log-action "<workflow-id>" "retrospective_complete" "success"
    ```

    On failure (non-blocking - continue anyway):
    ```bash
    bun run checkpoint workflow log-action "<workflow-id>" "retrospective_failed" "failed"
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
    bun run checkpoint workflow set-phase "<workflow-id>" "finalize"
    ```

    ```bash
    bun run checkpoint workflow log-action "<workflow-id>" "phase_transition" "success" '{"from": "retrospective", "to": "finalize"}'
    ```

---

## Phase 4: Finalize (Autonomous)

11. **Run final validation (as separate commands):**

    ```bash
    bun test
    ```

    ```bash
    bun run type-check
    ```

    ```bash
    bun run lint
    ```

    ```bash
    bun run build
    ```

    - If `--require-tests` and tests fail: ESCALATE
    - If build fails: ESCALATE
    - Otherwise: Proceed

12. **Push branch:**

    ```bash
    git push -u origin HEAD
    ```

13. **Create PR:**

    Use `gh pr create` with a conventional commit title and body. Example:

    ```bash
    gh pr create --title "<type>(<scope>): <description> (#<issue-number>)" --body "..."
    ```

    PR body includes:
    - Summary from dev plan
    - Non-critical findings (for reviewer awareness)
    - Auto-fix log (if any fixes were applied)
    - Footer: `Closes #<issue-number>`

13b. **Log workflow completion:**

     ```bash
     bun run checkpoint workflow set-status "<workflow-id>" "completed"
     ```

     ```bash
     bun run checkpoint workflow log-action "<workflow-id>" "pr_created" "success" '{"prNumber": <pr-number>, "commitCount": <total-commits>, "fixCommitCount": <fix-count>}'
     ```

14. **Trigger reviews (conditional):**

    CodeRabbit triggers automatically on PR creation. Only manually trigger reviews when:
    - The PR is large (>500 lines changed)
    - Multiple fix commits were made after initial implementation
    - Complex architectural changes that need deeper review

    For standard PRs, skip this step. For larger/complex PRs:

    ```
    @coderabbitai full review
    @claude review
    ```

15. **Update board status to "Blocked" (awaiting review):**

    Update the issue's board status to "Blocked" (status ID: `51c2af7b`).
    Use the board-manager skill or GraphQL API.

    **If board update fails:** Log warning but continue - PR creation is the critical step.

16. **Report completion:**

    Report the workflow completion with:
    - Issue number
    - Branch name
    - Commit counts (implementation + fixes)
    - PR URL

    Notify via Telegram using `mcp__mcp-communicator-telegram__notify_user`.

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

**Issue:** #<issue-number> - <title>
**Branch:** feat/issue-<issue-number>-<desc>
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

When escalation is triggered, use `mcp__mcp-communicator-telegram__ask_user` to get user input.

Message format:

- Issue number and title
- Branch name
- Retry count
- List of unresolved critical findings
- Options: continue, force-pr, abort, reset

Handle response:

- `continue` → Wait for manual fix, then re-run review
- `force-pr` → Proceed to Phase 4 with issues flagged
- `abort` → Delete branch and exit
- `reset` → Reset to last good commit
- `TELEGRAM_UNAVAILABLE` → Fall back to terminal input

### Log Escalation to Checkpoint

**IMPORTANT**: Send Telegram escalation BEFORE logging to checkpoint. This ensures the user is notified even if checkpoint logging fails.

When escalation is triggered, log the failure:

```bash
bun run checkpoint workflow set-status "<workflow-id>" "failed"
```

```bash
bun run checkpoint workflow log-action "<workflow-id>" "escalation" "failed" '{"reason": "MAX_RETRY exceeded", "fixAttempts": <fix-count>}'
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

At workflow start (step 0b), check for existing workflows:

```bash
bun run checkpoint workflow find <issue-number>
```

If the result is not null and status is "running", the workflow can be resumed.

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
bun run checkpoint workflow find <issue-number>
```

The output includes workflow ID, phase, status, action count, and commit history.

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

Report error and abort if the specified issue number doesn't exist.

### Branch Already Exists

If a branch for this issue already exists, check it out instead of creating a new one.

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
bun run checkpoint workflow set-status "<workflow-id>" "failed"
```

```bash
bun run checkpoint workflow log-action "<workflow-id>" "fatal_error" "failed" '{"phase": "<phase>", "error": "<error-message>"}'
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
