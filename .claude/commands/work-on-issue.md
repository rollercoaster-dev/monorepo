# /work-on-issue $ARGUMENTS

Execute the gated workflow for issue #$ARGUMENTS.

**YOU are the orchestrator. Do not delegate gate handling to agents.**

---

## Shared References

This workflow uses patterns from [shared/](../shared/) and executable helpers from `claude-workflows`:

**Documentation patterns (for reference):**

- [telegram-helpers.md](../shared/telegram-helpers.md) - Telegram MCP integration
- [checkpoint-patterns.md](../shared/checkpoint-patterns.md) - Workflow state persistence
- [validation-commands.md](../shared/validation-commands.md) - Type-check, lint, test
- [conventional-commits.md](../shared/conventional-commits.md) - Commit message format

**Executable helpers (for scripts):**

```typescript
import {
  notifyTelegram,
  askTelegram,
  transitionPhase,
  validateBasic,
  checkDependencies,
  gateApprovalPrompt,
} from "claude-workflows";
```

### Telegram Notification Points

| Point             | Type     | Content                            |
| ----------------- | -------- | ---------------------------------- |
| START             | notify   | Workflow started, branch created   |
| GATE 1            | ask_user | Issue summary, ask to proceed      |
| After Gate 1      | notify   | Starting research phase            |
| Research complete | notify   | Plan created, ready for review     |
| GATE 2            | ask_user | Plan summary, ask to proceed       |
| After Gate 2      | notify   | Starting implementation phase      |
| GATE 3 (each)     | ask_user | Diff summary, ask to approve       |
| Commit approved   | notify   | Commit N/M complete                |
| All commits done  | notify   | Implementation complete, reviewing |
| GATE 4            | ask_user | Findings summary, ask to proceed   |
| After Gate 4      | notify   | Starting finalization, creating PR |
| END               | notify   | PR link                            |
| Permission needed | notify   | Waiting for terminal tool approval |

---

## Workflow Overview

```
START:      Check/create checkpoint, detect resume
GATE 1:     Issue Review    → STOP, show full issue, wait for "proceed"
GATE 2:     Plan Review     → STOP, show full plan, wait for "proceed"
GATE 3:     Commit Review   → STOP, show diff, wait for approval (repeated per commit)
GATE 4:     Pre-PR Review   → STOP, show findings, wait for approval
END:        Mark completed
```

---

## Workflow Start: Checkpoint Initialization

**Before anything else**, check for existing workflow state:

1. Check for existing workflow:

   ```typescript
   import { checkpoint } from "claude-knowledge";

   const existing = checkpoint.findByIssue($ARGUMENTS);
   ```

2. **If existing workflow found** (not null):
   - Show the workflow state:
     ```text
     Found existing workflow for issue #$ARGUMENTS
     - Phase: <phase>
     - Status: <status>
     - Branch: <branch>
     - Last updated: <timestamp>
     - Actions taken: <count>
     - Commits made: <count>
     ```
   - Ask user: "Resume from **<phase>** phase, or start fresh?"
   - If resume: checkout the branch, skip to appropriate gate
   - If fresh: delete old workflow, continue to create new

3. **If no existing workflow**:
   - **Verify not in a worktree for a different issue:**
     ```bash
     # Check if we're in a worktree
     if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
       WORKTREE_ROOT=$(git rev-parse --show-toplevel)
       if [[ "$WORKTREE_ROOT" == *".worktrees"* ]]; then
         echo "ERROR: Running inside a worktree. Switch to main repo first."
         exit 1
       fi
     fi
     ```
   - Create feature branch:
     ```bash
     git checkout -b feat/issue-$ARGUMENTS-{short-description}
     ```
   - **CRITICAL: Verify branch checkout succeeded:**
     ```bash
     CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
     EXPECTED_BRANCH="feat/issue-$ARGUMENTS-{short-description}"
     if [[ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]]; then
       echo "ERROR: Branch checkout failed!"
       echo "Expected: $EXPECTED_BRANCH"
       echo "Actual: $CURRENT_BRANCH"
       exit 1
     fi
     echo "✓ Verified on branch: $CURRENT_BRANCH"
     ```
   - Create checkpoint:
     ```typescript
     const workflow = checkpoint.create(
       $ARGUMENTS,
       "feat/issue-$ARGUMENTS-{short-description}",
     );
     const WORKFLOW_ID = workflow.id;
     ```
   - Store the workflow ID for subsequent commands
   - **Notify via Telegram**: `WOI_START` template (branch name, gated mode)

**IMPORTANT**: Store the `WORKFLOW_ID` from the create command output. Example:

```json
{
  "id": "workflow-364-1736285400000",
  "issueNumber": 364,
  "branch": "feat/issue-364-schema-extension",
  "phase": "research",
  "status": "running",
  ...
}
```

Extract and store the ID for subsequent commands:

```typescript
const workflow = checkpoint.create($ARGUMENTS, "feat/issue-$ARGUMENTS-desc");
const WORKFLOW_ID = workflow.id;
```

---

## GATE 1: Show Issue

**STOP** - This is a hard gate.

1. Fetch the issue:

   ```bash
   gh issue view $ARGUMENTS --json number,title,body,labels,milestone,assignees
   ```

2. Check for blockers:

   ```bash
   gh issue view $ARGUMENTS --json body | grep -iE "blocked by|depends on"
   ```

3. Show the **COMPLETE** issue to the user (in terminal):
   - Full title and number
   - Full body (verbatim - do NOT summarize)
   - Labels and milestone
   - Blockers if any

4. **Ask via Telegram** (with terminal fallback): `WOI_GATE_1` template
   - Include: title, 2-3 line summary, labels, milestone, blockers
   - Accept: "proceed", "yes", "go ahead", "approved"
   - If Telegram unavailable, wait for terminal input

**Do NOT continue until you receive explicit approval.**

---

## After Gate 1 Approval: Log & Research

5. Log the gate passage:

```typescript
checkpoint.logAction(WORKFLOW_ID, "gate-1-issue-reviewed", "success", {
  issue: $ARGUMENTS,
});
```

5b. **Notify via Telegram**: `WOI_GATE_1_APPROVED` template

6. Spawn `issue-researcher` agent to:
   - Analyze codebase
   - Check dependencies
   - Create dev plan at `.claude/dev-plans/issue-$ARGUMENTS.md`

7. When researcher returns, READ the plan file with the Read tool.

8. Update phase to research complete:

```typescript
checkpoint.logAction(WORKFLOW_ID, "research-complete", "success", {
  plan: ".claude/dev-plans/issue-$ARGUMENTS.md",
});
```

8b. **Notify via Telegram**: `WOI_RESEARCH_COMPLETE` template (plan path)

---

## GATE 2: Show Plan

**STOP** - This is a hard gate.

9. Show the **COMPLETE** plan to the user (in terminal):
   - Every section
   - Every step
   - Every commit planned
   - Do NOT summarize

10. **Ask via Telegram** (with terminal fallback): `WOI_GATE_2` template
    - Include: title, commits planned, files affected
    - Accept: "proceed", "yes", "go ahead", "approved"
    - If Telegram unavailable, wait for terminal input

**Do NOT continue until you receive explicit approval.**

---

## After Gate 2 Approval: Transition to Implement

11. Log gate passage and transition phase:

    ```typescript
    checkpoint.logAction(WORKFLOW_ID, "gate-2-plan-approved", "success", {});
    checkpoint.setPhase(WORKFLOW_ID, "implement");
    ```

11b. **Notify via Telegram**: `WOI_GATE_2_APPROVED` template (commit count)

12. For each atomic commit in the plan:
    - Make the changes according to plan
    - Run validation: `bun run type-check && bun run lint`
    - Prepare the diff

---

## GATE 3: Commit Review (Repeated Per Commit)

**STOP** - This is a hard gate for EACH commit.

13. Show the diff in terminal: `git diff`

14. Explain what changed and why

15. **Ask via Telegram** (with terminal fallback): `WOI_GATE_3` template
    - Include: commit N/M, message, file changes, line counts
    - Accept: "proceed", "yes", "go ahead", "approved"
    - If Telegram unavailable, wait for terminal input

16. Only after approval, **verify branch and commit**:

    ```bash
    # CRITICAL: Verify we're on the feature branch before committing
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "master" ]]; then
      echo "ERROR: About to commit to $CURRENT_BRANCH! Aborting."
      echo "Expected to be on feature branch."
      exit 1
    fi
    echo "✓ Verified on branch: $CURRENT_BRANCH"

    git add . && git commit -m "<type>(<scope>): <description>"
    ```

    Then log the commit:

    ```typescript
    // Get the commit SHA and log it
    const sha = await $`git rev-parse HEAD`.text().trim();
    checkpoint.logCommit(WORKFLOW_ID, sha, "<type>(<scope>): <description>");
    ```

16b. **Notify via Telegram**: `WOI_COMMIT_APPROVED` template (N/M, remaining)

17. Repeat for each commit in the plan

**Do NOT batch commits. One at a time, one approval at a time.**

---

## After All Commits: Transition to Review

18. Update phase to review:

    ```typescript
    checkpoint.setPhase(WORKFLOW_ID, "review");
    checkpoint.logAction(WORKFLOW_ID, "implementation-complete", "success", {});
    ```

18b. **Notify via Telegram**: `WOI_IMPL_COMPLETE` template (commit count)

19. Run full validation:

    ```bash
    bun test && bun run type-check && bun run lint && bun run build
    ```

20. Run pr-review-toolkit agents:
    - pr-review-toolkit:code-reviewer
    - pr-review-toolkit:pr-test-analyzer
    - pr-review-toolkit:silent-failure-hunter

21. If badge/credential code, spawn `openbadges-compliance-reviewer`

22. Log review completion:

    ```typescript
    checkpoint.logAction(WORKFLOW_ID, "review-agents-complete", "success", { findings: <count> });
    ```

---

## GATE 4: Pre-PR Review Results

**STOP** - This is a hard gate.

23. Present findings grouped by severity (in terminal):
    - **Critical (must fix)**: Security, bugs, breaking changes
    - **High (should fix)**: Code quality, error handling
    - **Medium (consider)**: Style, documentation

24. **Ask via Telegram** (with terminal fallback): `WOI_GATE_4` template
    - Include: finding counts by severity, warning if critical > 0
    - Accept: "proceed", "yes", "go ahead", "approved"
    - If Telegram unavailable, wait for terminal input

**Do NOT create PR until Critical issues are resolved and user approves.**

---

## After Gate 4 Approval: Finalize & Create PR

25. Log gate passage and transition to finalize:

    ```typescript
    checkpoint.logAction(WORKFLOW_ID, "gate-4-review-approved", "success", {});
    checkpoint.setPhase(WORKFLOW_ID, "finalize");
    ```

25b. **Notify via Telegram**: `WOI_GATE_4_APPROVED` template

26. **Clean up dev-plan file:**

    ```bash
    rm .claude/dev-plans/issue-$ARGUMENTS.md
    git add .claude/dev-plans/
    git commit -m "chore: clean up dev-plan for issue #$ARGUMENTS"
    ```

    Log this commit too:

    ```typescript
    const sha = await $`git rev-parse HEAD`.text().trim();
    checkpoint.logCommit(
      WORKFLOW_ID,
      sha,
      "chore: clean up dev-plan for issue #$ARGUMENTS",
    );
    ```

27. Push branch:

    ```bash
    git push -u origin HEAD
    ```

28. Create PR:

    ```bash
    gh pr create --title "<type>(<scope>): <description> (#$ARGUMENTS)" --body "..."
    ```

29. Log completion and mark workflow done:

    ```typescript
    checkpoint.logAction(WORKFLOW_ID, "pr-created", "success", {
      pr_url: "<url>",
    });
    checkpoint.setStatus(WORKFLOW_ID, "completed");
    ```

30. **Notify via Telegram**: `WOI_COMPLETE` template (PR number, URL, commit count)

31. Report PR URL and next steps in terminal

---

## Permission Wait Notifications

When Claude needs to wait for terminal tool approval, use `WOI_PERMISSION` template to notify via Telegram. This prevents users from missing terminal prompts when monitoring via Telegram.

**When to notify:** File edits, new file creation, bash commands that modify state, git operations.

---

## Critical Rules

1. **YOU are the orchestrator** - Worker agents return to you, you handle gates
2. **STOP means STOP** - Literally halt and wait for user input
3. **One gate at a time** - No batching, no previewing future gates
4. **Show, don't summarize** - Full content at every gate
5. **Explicit approval only** - "proceed", "yes", "approved" (not silence)
6. **Always log checkpoints** - Every gate, every commit, every phase transition

---

## Resume Behavior

When resuming from an existing workflow:

| Previous Phase              | Resume Point                                 |
| --------------------------- | -------------------------------------------- |
| `research` (running)        | Re-run researcher, go to GATE 2              |
| `research` (gate-2 pending) | Go directly to GATE 2                        |
| `implement`                 | Show commits made, continue from last commit |
| `review`                    | Re-run review agents, go to GATE 4           |
| `finalize`                  | Check if PR exists, if not create it         |

To determine resume point, check:

1. The `phase` field in the workflow
2. The `actions` array for which gates were passed
3. The `commits` array for implementation progress

---

## Error Handling

### Issue Not Found

```
Error: Issue #X not found. Please check the issue number.
```

### No Approval Given

If user says something ambiguous, ask for clarification:

```
I need explicit approval to proceed. Please say "proceed" to continue or "stop" to halt.
```

### Skipped Gate Recovery

If you realize you skipped a gate:

1. STOP immediately
2. Acknowledge: "I skipped a gate. Let me go back."
3. Return to missed gate
4. Do not continue until gate passed

### Context Compaction Recovery

If context is compacted mid-workflow:

1. The checkpoint system preserves state in `.claude/execution-state.db`
2. On resume, use `checkpoint.findByIssue($ARGUMENTS)` to restore state
3. Review the actions and commits arrays to understand progress
4. Resume from the appropriate gate

---

## API References

- **Checkpoint API**: See [checkpoint-patterns.md](../shared/checkpoint-patterns.md)
- **Telegram API**: See [telegram-helpers.md](../shared/telegram-helpers.md)
