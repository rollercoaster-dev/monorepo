# Auto-Issue Rules

**Applies to:** `/auto-issue` command and autonomous workflows

---

## Permission Scope

The following permissions exist **only for `/auto-issue` workflow**. Don't use them outside of `/auto-issue`:

| Permission               | Allowed During | Not Allowed During              |
| ------------------------ | -------------- | ------------------------------- |
| `Edit` (without asking)  | `/auto-issue`  | Normal conversation             |
| `Write` (without asking) | `/auto-issue`  | Normal conversation             |
| `git commit`             | `/auto-issue`  | Normal conversation (ask first) |
| `git push`               | `/auto-issue`  | Normal conversation (ask first) |
| `gh pr create`           | `/auto-issue`  | Normal conversation (ask first) |

**Outside of `/auto-issue`:** Ask the user before using Edit, Write, git commit, git push, or gh pr create.

**During `/auto-issue`:** These permissions are pre-approved for autonomous operation.

---

## What "Autonomous" Means

The `/auto-issue` workflow operates without human gates:

- **No approval required** between phases
- **Auto-fix attempts** for high-priority findings
- **Escalation only** when auto-fix fails repeatedly

This is not "unsupervised" - you can intervene anytime by typing in the chat.

---

## Classification Criteria

### High Priority vs Standard

Findings are classified based on review agent output. Note: Agent outputs use their original terminology (e.g., "CRITICAL", "Severity") - the table below shows how to map these to priority classification:

| Agent                  | High Priority                        | Standard                       |
| ---------------------- | ------------------------------------ | ------------------------------ |
| code-reviewer          | Confidence >= 91 OR label="Critical" | Confidence < 91                |
| silent-failure-hunter  | Severity="CRITICAL"                  | Severity="HIGH"/"MEDIUM"/"LOW" |
| pr-test-analyzer       | Gap rating >= 8                      | Gap rating < 8                 |
| ob-compliance-reviewer | "MUST violation"                     | "SHOULD violation"/"WARNING"   |

### Classification Rules

1. **Security issues are high priority** regardless of confidence score
2. **Breaking changes are high priority**
3. **When uncertain, classify as high priority** (safer to over-fix than under-fix)
4. **Conflicting classifications**: Use the stricter one

---

## Retry Behavior

### Limits

| Setting           | Default | Purpose                             |
| ----------------- | ------- | ----------------------------------- |
| `MAX_RETRY`       | 3       | Fix attempts per critical finding   |
| `MAX_FIX_COMMITS` | 10      | Total fix commits before escalation |

### Retry Logic

```
For each critical finding:
  attempt = 0
  while finding unresolved AND attempt < MAX_RETRY:
    spawn auto-fixer
    if fix successful:
      mark resolved
    else:
      attempt++
      if attempt == MAX_RETRY:
        add to unresolved list

After all findings processed:
  if unresolved list not empty:
    ESCALATE
  else:
    PROCEED to PR
```

### What Counts as "Unresolved"

A finding is unresolved if:

1. Auto-fixer failed to apply fix
2. Fix applied but validation failed
3. Fix applied but same finding appears on re-review
4. Finding marked as "too complex for automation"

---

## Escalation Rules

### When to Escalate

1. **MAX_RETRY exceeded** - Same finding after 3 fix attempts
2. **Validation failure** - Type-check or lint fails after fix
3. **Test failure** - Tests fail (only if `--require-tests`)
4. **Build failure** - Build doesn't succeed
5. **Agent failure** - Review agent fails to execute
6. **MAX_FIX_COMMITS exceeded** - More than 10 fix commits

### Escalation Behavior (by flag)

| Flag              | Behavior                              |
| ----------------- | ------------------------------------- |
| (default)         | Show findings, wait for user input    |
| `--force-pr`      | Create PR with issues flagged in body |
| `--abort-on-fail` | Delete branch, report failure, exit   |

### Escalation Report Requirements

An escalation report should include:

1. Issue number and title
2. Branch name
3. Retry count vs max
4. Unresolved findings table
5. Fix attempt log (what was tried)
6. User options (continue/force-pr/abort/reset)

---

## Break Glass Patterns

### User Intervention Commands

The user can type these at any time:

| Command          | Effect                     |
| ---------------- | -------------------------- |
| `stop` / `pause` | Halt, show status          |
| `skip review`    | Skip to PR creation        |
| `abort`          | Delete branch, exit        |
| `continue`       | Resume after manual fix    |
| `force-pr`       | Force PR with issues       |
| `reset`          | Go back to last good state |

### Checking for Intervention

Between phases, the orchestrator should:

1. Check if user has typed anything
2. If yes, handle the command
3. If no, proceed autonomously

This ensures user can always take control.

---

## Phase-Specific Rules

### Phase 1: Research

- Warn on blockers but continue (don't stop)
- Create branch even if blockers exist
- Log all warnings for later reference

### Phase 2: Implement

- Let atomic-developer run to completion
- Don't interrupt implementation for validation failures
- Catch-up validation happens after all commits

### Phase 3: Review

- Run all review agents (parallel by default)
- Classify findings before entering fix loop
- Re-review after each fix batch (not each individual fix)

### Phase 4: Finalize

- Run full validation before PR
- Include non-critical findings in PR body
- Trigger both CodeRabbit and Claude reviews

---

## Safety Rules

### Avoid Autonomous Actions For

1. **Force push** - Don't do this autonomously
2. **Delete branches** other than the feature branch
3. **Modify main/master** - Only work on feature branch
4. **Skip all reviews** - At least one review should complete
5. **Ignore security findings** - These are high priority

### Rollback on Failure

If auto-fix introduces worse problems:

1. `git checkout -- <file>` immediately
2. Do not commit broken code
3. Report the failure
4. Move to next finding or escalate

### State Preservation

Always preserve the ability to recover:

1. Don't squash during auto-fix
2. Each fix commit is separate
3. Can cherry-pick or revert individual fixes
4. Branch history shows full fix journey

---

## Logging Requirements

### What to Log

1. Every phase transition
2. Every agent spawn and result
3. Every fix attempt and outcome
4. Every validation result
5. All escalation decisions

### Log Format

```
[AUTO-ISSUE #123] Phase 1: Research started
[AUTO-ISSUE #123] Spawned issue-researcher
[AUTO-ISSUE #123] Plan created at .claude/dev-plans/issue-123.md
[AUTO-ISSUE #123] Phase 2: Implement started
[AUTO-ISSUE #123] Spawned atomic-developer
[AUTO-ISSUE #123] 3 commits created
[AUTO-ISSUE #123] Phase 3: Review started
[AUTO-ISSUE #123] Running review agents (parallel)
[AUTO-ISSUE #123] code-reviewer: 2 critical, 1 non-critical
[AUTO-ISSUE #123] Auto-fix loop: attempt 1/3
[AUTO-ISSUE #123] Fixing: src/foo.ts:42 - null check
[AUTO-ISSUE #123] Fix SUCCESS - committed abc123
[AUTO-ISSUE #123] Re-review: 1 critical remaining
[AUTO-ISSUE #123] Auto-fix loop: attempt 2/3
...
```

---

## Comparison with /work-on-issue Rules

| Rule          | /work-on-issue             | /auto-issue                 |
| ------------- | -------------------------- | --------------------------- |
| Gates         | 4 hard gates, all required | No gates                    |
| Approval      | Explicit at each phase     | Only on escalation          |
| Blockers      | Stop and wait              | Warn and continue           |
| Fix attempts  | Manual                     | Automatic (up to MAX_RETRY) |
| PR creation   | After Gate 4 approval      | After review pass or force  |
| Board updates | At gates                   | Autonomous                  |
