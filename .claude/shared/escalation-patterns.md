# Escalation Patterns

Shared patterns for handling workflow failures and user intervention.

## Escalation Triggers

| Trigger                  | Description                        | Threshold  |
| ------------------------ | ---------------------------------- | ---------- |
| MAX_RETRY exceeded       | Same finding after N fix attempts  | 3 attempts |
| MAX_FIX_COMMITS exceeded | Total fix commits limit            | 10 commits |
| Validation failure       | Type-check or lint fails after fix | Immediate  |
| Test failure             | Tests fail (if --require-tests)    | Immediate  |
| Build failure            | Build doesn't succeed              | Immediate  |
| Agent failure            | Review agent fails to execute      | Immediate  |

## Response Options

Standard escalation options:

| Option     | Action                                |
| ---------- | ------------------------------------- |
| `continue` | Fix manually, then resume workflow    |
| `force-pr` | Create PR with issues flagged         |
| `abort`    | Delete branch and exit                |
| `reset`    | Go back to last good state and retry  |
| `skip`     | Skip current item, continue with next |

## Escalation Report Format

```markdown
## ESCALATION REQUIRED

**Issue:** #$ISSUE - <title>
**Branch:** feat/issue-$ISSUE-<desc>
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
4. **Reset** - Type `reset` to go back to last good state
```

## Telegram Escalation

Using `askTelegram` for remote approval:

```typescript
const escalationMessage = `🚨 ESCALATION REQUIRED

Issue: #${issueNumber} - ${title}
Branch: ${branchName}
Retry: ${retryCount}/${MAX_RETRY}

Critical Findings:
${findings.map((f) => `• ${f.file}: ${f.issue}`).join("\n")}

Options:
1. 'continue' - Fix manually, then continue
2. 'force-pr' - Create PR with issues flagged
3. 'abort' - Delete branch and exit
4. 'reset' - Go back to last good state`;

const response = await askTelegram(escalationMessage, context);

switch (response.toLowerCase().trim()) {
  case "continue":
    // Wait for manual fix, then re-run review
    break;
  case "force-pr":
    // Proceed to PR creation with issues flagged
    break;
  case "abort":
    // Clean up and exit
    await cleanupBranch(branchName);
    break;
  case "reset":
    // Reset to last good commit
    await resetToLastGoodState();
    break;
  case "TELEGRAM_UNAVAILABLE":
    // Fall through to terminal-based escalation
    break;
}
```

## Logging Escalation

```typescript
checkpoint.setStatus(WORKFLOW_ID, "failed");
checkpoint.logAction(WORKFLOW_ID, "escalation", "failed", {
  reason: "MAX_RETRY exceeded",
  unresolvedFindings: criticalFindings.length,
  retryCount: retryCount,
  fixAttempts: fixCommitCount,
  trigger: escalationTrigger, // e.g., "max_retry", "build_failed"
});
```

## Flag Behaviors

| Flag              | Behavior on Escalation                        |
| ----------------- | --------------------------------------------- |
| (default)         | Show report, wait for input                   |
| `--force-pr`      | Create PR with `## UNRESOLVED ISSUES` section |
| `--abort-on-fail` | Delete branch, report failure, exit           |

## Force PR Format

When `--force-pr` is used:

```markdown
## Summary

[normal PR content]

## ⚠️ UNRESOLVED ISSUES

The following issues could not be auto-fixed and require manual attention:

| Finding | File          | Issue              |
| ------- | ------------- | ------------------ |
| 1       | src/foo.ts:42 | Missing null check |
| 2       | src/bar.ts:89 | Silent catch block |

### Labels Added

- `needs-attention`
```

## User Intervention Commands

The user can intervene at ANY time:

| Input            | Action                                   |
| ---------------- | ---------------------------------------- |
| `stop` / `pause` | Halt workflow, show current status       |
| `skip review`    | Skip remaining review, go to PR creation |
| `abort`          | Clean up (delete branch), exit           |
| `continue`       | Resume after manual fix                  |
| `force-pr`       | Force PR creation                        |
| `reset`          | Reset to last good commit, retry         |

## Break Glass Pattern

Between phases, check for user input:

```typescript
// Check if user has typed anything
if (userHasInput()) {
  const input = await readUserInput();
  await handleUserIntervention(input);
}
```

## Rollback on Failure

If auto-fix makes things worse:

```bash
# Revert the fix immediately
git checkout -- <file>

# Do not commit broken code
# Report the failure
# Move to next finding or escalate
```

## State Preservation

Always preserve ability to recover:

1. Don't squash during auto-fix
2. Each fix commit is separate
3. Can cherry-pick or revert individual fixes
4. Branch history shows full fix journey
