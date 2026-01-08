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

## MCP Integration (Telegram Notifications)

This workflow supports optional Telegram notifications via the `mcp-communicator-telegram` MCP server.

### MCP Tools Used

| Tool                                          | Purpose              | Blocking                 |
| --------------------------------------------- | -------------------- | ------------------------ |
| `mcp__mcp-communicator-telegram__notify_user` | One-way notification | No                       |
| `mcp__mcp-communicator-telegram__ask_user`    | Two-way interaction  | Yes (waits for response) |

### Notification Points

| Phase      | Type        | Trigger                 | Content                |
| ---------- | ----------- | ----------------------- | ---------------------- |
| 1→2        | notify_user | Research complete       | Dev plan path          |
| 2→3        | notify_user | Implementation complete | Commit count           |
| 3→4        | notify_user | Review complete         | Findings summary       |
| Escalation | ask_user    | MAX_RETRY exceeded      | Findings + options     |
| 4          | notify_user | PR created              | PR link, review status |

### Graceful Degradation

If the MCP server is unavailable:

- `notify_user` calls fail silently (logged to console)
- `ask_user` calls fall back to terminal input
- Workflow continues without interruption

```typescript
// Helper: Send notification (non-blocking, fail-safe)
function notifyTelegram(message: string): void {
  try {
    // prettier-ignore
    mcp__mcp_communicator_telegram__notify_user({ message });
  } catch {
    console.log("[AUTO-ISSUE] (Telegram unavailable - continuing)");
  }
}

// Helper: Ask user with fallback (blocking)
async function askTelegram(question: string): Promise<string> {
  try {
    // prettier-ignore
    return await mcp__mcp_communicator_telegram__ask_user({ question });
  } catch {
    console.log(
      "[AUTO-ISSUE] (Telegram unavailable - waiting for terminal input)",
    );
    // Fall back to terminal - workflow will wait for user input in chat
    return "TELEGRAM_UNAVAILABLE";
  }
}
```

### Permission Notifications

When waiting for tool permissions (Edit, Write, Bash, etc.), notify the user:

```typescript
// Before any tool that might need permission approval
notifyTelegram(`⏳ [AUTO-ISSUE #$ARGUMENTS] Permission needed in terminal

Tool: Edit
File: ${filePath}

Waiting for approval...`);
```

This ensures users monitoring via Telegram know when to check the terminal.

### Enabling Telegram MCP

To enable Telegram notifications, configure the MCP server in `~/.claude.json`:

```json
{
  "mcpServers": {
    "mcp-communicator-telegram": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "-p", "mcp-communicator-telegram", "mcptelegram"],
      "env": {
        "TELEGRAM_TOKEN": "<your-bot-token>",
        "CHAT_ID": "<your-chat-id>"
      }
    }
  }
}
```

**Getting your credentials:**

1. Create a bot via [@BotFather](https://t.me/botfather) on Telegram
2. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
3. Restart Claude Code after configuration

---

## Checkpoint Integration

This workflow uses `claude-knowledge` checkpoint API to persist state across context compactions.

### Import

```typescript
import { checkpoint } from "claude-knowledge";
```

### Workflow ID

A `WORKFLOW_ID` is established at workflow start and passed to all sub-agents for state tracking.

```typescript
// Set at Phase 1 start, used throughout
let WORKFLOW_ID: string;
```

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

    ```typescript
    import { checkpoint } from "claude-knowledge";

    const existing = checkpoint.findByIssue($ARGUMENTS);
    if (existing && existing.workflow.status === "running") {
      console.log(`[AUTO-ISSUE #$ARGUMENTS] Resuming from phase: ${existing.workflow.phase}`);
      console.log(`[AUTO-ISSUE #$ARGUMENTS] Previous actions: ${existing.actions.length}`);
      console.log(`[AUTO-ISSUE #$ARGUMENTS] Previous commits: ${existing.commits.length}`);

      WORKFLOW_ID = existing.workflow.id;

      // Resume based on phase
      switch (existing.workflow.phase) {
        case "implement":
          // Skip to Phase 2
          goto PHASE_2;
        case "review":
          // Skip to Phase 3
          goto PHASE_3;
        case "finalize":
          // Skip to Phase 4
          goto PHASE_4;
        default:
          // Continue from research phase
          break;
      }
    }
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

    ```typescript
    if (!WORKFLOW_ID) {
      const branchName = `feat/issue-$ARGUMENTS-{short-description}`;
      const workflow = checkpoint.create($ARGUMENTS, branchName);
      WORKFLOW_ID = workflow.id;

      checkpoint.logAction(WORKFLOW_ID, "workflow_started", "success", {
        issueNumber: $ARGUMENTS,
        branch: branchName,
        flags: {
          dryRun: $DRY_RUN,
          requireTests: $REQUIRE_TESTS,
          forcePr: $FORCE_PR,
          abortOnFail: $ABORT_ON_FAIL
        }
      });

      console.log(`[AUTO-ISSUE #$ARGUMENTS] Checkpoint created: ${WORKFLOW_ID}`);
    }
    ```

4. **Spawn `issue-researcher` agent:**
   - Analyze codebase
   - Check dependencies
   - Create dev plan at `.claude/dev-plans/issue-$ARGUMENTS.md`
   - Pass `WORKFLOW_ID` for checkpoint integration

   **Log agent spawn:**

   ```typescript
   checkpoint.logAction(WORKFLOW_ID, "spawned_agent", "success", {
     agent: "issue-researcher",
     task: "analyze codebase and create dev plan",
     issueNumber: $ARGUMENTS,
   });
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

    ```typescript
    checkpoint.setPhase(WORKFLOW_ID, "implement");
    checkpoint.logAction(WORKFLOW_ID, "phase_transition", "success", {
      from: "research",
      to: "implement",
      devPlanPath: `.claude/dev-plans/issue-$ARGUMENTS.md`
    });
    console.log(`[AUTO-ISSUE #$ARGUMENTS] Phase: research → implement`);

    // Telegram notification (non-blocking)
    notifyTelegram(`[AUTO-ISSUE #$ARGUMENTS] Phase: research → implement

Dev plan created at .claude/dev-plans/issue-$ARGUMENTS.md
Starting implementation...`);

````

---

## Phase 2: Implement (Autonomous)

7. **Spawn `atomic-developer` agent with dev plan:**
   - Execute all commits per plan
   - Each commit is atomic and buildable
   - Agent handles validation internally
   - Pass `WORKFLOW_ID` for commit tracking

   **Log agent spawn:**

   ```typescript
   checkpoint.logAction(WORKFLOW_ID, "spawned_agent", "success", {
     agent: "atomic-developer",
     task: "execute dev plan with atomic commits",
     devPlanPath: `.claude/dev-plans/issue-$ARGUMENTS.md`,
   });
````

8. **On completion, run validation:**

   ```bash
   bun run type-check && bun run lint
   ```

   - If validation fails: Attempt to fix inline, then continue
   - If still fails: Log and proceed to review (reviewer will catch it)

8b. **Log phase transition (implement → review):**

    ```typescript
    checkpoint.setPhase(WORKFLOW_ID, "review");
    checkpoint.logAction(WORKFLOW_ID, "phase_transition", "success", {
      from: "implement",
      to: "review",
      commitCount: $COMMIT_COUNT  // Number of commits from atomic-developer
    });
    console.log(`[AUTO-ISSUE #$ARGUMENTS] Phase: implement → review`);

    // Telegram notification (non-blocking)
    notifyTelegram(`[AUTO-ISSUE #$ARGUMENTS] Phase: implement → review

Implementation complete: ${$COMMIT_COUNT} commits
Starting code review...`);

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

```typescript
const reviewAgents = [
  "pr-review-toolkit:code-reviewer",
  "pr-review-toolkit:pr-test-analyzer",
  "pr-review-toolkit:silent-failure-hunter",
];

// Add OB compliance if badge code detected
if (hasBadgeCode) {
  reviewAgents.push("openbadges-compliance-reviewer");
}

for (const agent of reviewAgents) {
  checkpoint.logAction(WORKFLOW_ID, "spawned_agent", "success", {
    agent,
    task: "code review",
    phase: "review",
  });
}
````

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

        # Log auto-fixer spawn
        checkpoint.logAction(WORKFLOW_ID, "spawned_agent", "success", {
          agent: "auto-fixer",
          task: "fix critical finding",
          finding: finding.description,
          file: finding.file,
          attemptNumber: retry_count + 1
        })

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

10b. **Log phase transition (review → finalize):**

     ```typescript
     checkpoint.setPhase(WORKFLOW_ID, "finalize");
     checkpoint.logAction(WORKFLOW_ID, "phase_transition", "success", {
       from: "review",
       to: "finalize",
       criticalResolved: $CRITICAL_RESOLVED,
       fixCommits: $FIX_COMMIT_COUNT,
       retryCount: $RETRY_COUNT
     });
     console.log(`[AUTO-ISSUE #$ARGUMENTS] Phase: review → finalize`);

     // Telegram notification (non-blocking)
     notifyTelegram(`[AUTO-ISSUE #$ARGUMENTS] Phase: review → finalize

Review complete: ${$CRITICAL_RESOLVED} critical issues resolved
Fix commits: ${$FIX_COMMIT_COUNT}
Creating PR...`);

````

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

     ```typescript
     checkpoint.setStatus(WORKFLOW_ID, "completed");
     checkpoint.logAction(WORKFLOW_ID, "pr_created", "success", {
       prNumber: PR_NUMBER,
       commitCount: $TOTAL_COMMITS,
       fixCommitCount: $FIX_COMMIT_COUNT,
       branch: branchName
     });
     console.log(`[AUTO-ISSUE #$ARGUMENTS] Workflow completed: PR #${PR_NUMBER}`);

     // Telegram notification (non-blocking)
     notifyTelegram(`[AUTO-ISSUE #$ARGUMENTS] ✅ PR Created!

PR #${PR_NUMBER}: <title>
https://github.com/rollercoaster-dev/monorepo/pull/${PR_NUMBER}

Commits: ${$TOTAL_COMMITS} implementation + ${$FIX_COMMIT_COUNT} fixes
Reviews triggered: CodeRabbit, Claude`);
````

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

### Telegram Escalation (Interactive)

When escalation is triggered, use `ask_user` to get user input via Telegram:

```typescript
// Build escalation message
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
const response = await askTelegram(escalationMessage);

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

When escalation is triggered, log the failure:

```typescript
checkpoint.setStatus(WORKFLOW_ID, "failed");
checkpoint.logAction(WORKFLOW_ID, "escalation", "failed", {
  reason: "MAX_RETRY exceeded",
  unresolvedFindings: criticalFindings.length,
  retryCount: workflow.retryCount,
  fixAttempts: $FIX_COMMIT_COUNT,
  trigger: escalationTrigger, // e.g., "max_retry", "build_failed", "test_failed"
});
console.log(`[AUTO-ISSUE #$ARGUMENTS] Workflow failed: Escalation required`);
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

```typescript
import { checkpoint } from "claude-knowledge";

const existing = checkpoint.findByIssue($ARGUMENTS);
if (existing && existing.workflow.status === "running") {
  // Workflow found - can resume
}
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

```typescript
const data = checkpoint.findByIssue($ARGUMENTS);
if (data) {
  console.log(`Workflow ${data.workflow.id}:`);
  console.log(`- Phase: ${data.workflow.phase}`);
  console.log(`- Status: ${data.workflow.status}`);
  console.log(`- Retry Count: ${data.workflow.retryCount}`);
  console.log(`- Actions: ${data.actions.length}`);
  console.log(`- Commits: ${data.commits.length}`);

  // List commits made so far
  data.commits.forEach((c) => {
    console.log(`  ${c.sha.slice(0, 7)} ${c.message}`);
  });
}
```

### Manual Resume Commands

If automatic resume fails, use these commands:

```bash
# Check database state
bun repl
> import { checkpoint } from "./packages/claude-knowledge/src/checkpoint.ts"
> checkpoint.findByIssue(354)

# List all active workflows
> checkpoint.listActive()

# Mark workflow as failed (to start fresh)
> checkpoint.setStatus("workflow-id", "failed")
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
