# /work-on-issue $ARGUMENTS

Execute the gated workflow for issue #$ARGUMENTS.

**YOU are the orchestrator. Do not delegate gate handling to agents.**

---

## Workflow Overview

```
GATE 1: Issue Review    → STOP, show full issue, wait for "proceed"
GATE 2: Plan Review     → STOP, show full plan, wait for "proceed"
GATE 3: Commit Review   → STOP, show diff, wait for approval (repeated per commit)
GATE 4: Pre-PR Review   → STOP, show findings, wait for approval
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

3. Show the **COMPLETE** issue to the user:
   - Full title and number
   - Full body (verbatim - do NOT summarize)
   - Labels and milestone
   - Blockers if any

4. **STOP HERE** and wait for user to say one of:
   - "proceed"
   - "yes"
   - "go ahead"
   - "approved"

**Do NOT continue until you receive explicit approval.**

---

## After Gate 1 Approval: Research & Plan

5. Create feature branch FIRST:

   ```bash
   git checkout -b feat/issue-$ARGUMENTS-{short-description}
   ```

6. Spawn `issue-researcher` agent to:
   - Analyze codebase
   - Check dependencies
   - Create dev plan at `.claude/dev-plans/issue-$ARGUMENTS.md`

7. When researcher returns, READ the plan file with the Read tool.

---

## GATE 2: Show Plan

**STOP** - This is a hard gate.

8. Show the **COMPLETE** plan to the user:
   - Every section
   - Every step
   - Every commit planned
   - Do NOT summarize

9. **STOP HERE** and wait for explicit approval.

**Do NOT continue until you receive explicit approval.**

---

## After Gate 2 Approval: Implement

10. For each atomic commit in the plan:
    - Make the changes according to plan
    - Run validation: `bun run type-check && bun run lint`
    - Prepare the diff

---

## GATE 3: Commit Review (Repeated Per Commit)

**STOP** - This is a hard gate for EACH commit.

11. Show the diff: `git diff`

12. Explain what changed and why

13. **STOP HERE** and wait for approval

14. Only after approval:

    ```bash
    git add . && git commit -m "<type>(<scope>): <description>"
    ```

15. Repeat for each commit in the plan

**Do NOT batch commits. One at a time, one approval at a time.**

---

## After All Commits: Finalization

16. Run full validation:

    ```bash
    bun test && bun run type-check && bun run lint && bun run build
    ```

17. Run pr-review-toolkit agents:
    - pr-review-toolkit:code-reviewer
    - pr-review-toolkit:pr-test-analyzer
    - pr-review-toolkit:silent-failure-hunter

18. If badge/credential code, spawn `openbadges-compliance-reviewer`

---

## GATE 4: Pre-PR Review Results

**STOP** - This is a hard gate.

19. Present findings grouped by severity:
    - **Critical (must fix)**: Security, bugs, breaking changes
    - **High (should fix)**: Code quality, error handling
    - **Medium (consider)**: Style, documentation

20. **STOP HERE** and wait for approval to create PR.

**Do NOT create PR until Critical issues are resolved and user approves.**

---

## After Gate 4 Approval: Create PR

21. Push branch:

    ```bash
    git push -u origin HEAD
    ```

22. Create PR:

    ```bash
    gh pr create --title "<type>(<scope>): <description> (#$ARGUMENTS)" --body "..."
    ```

23. Report PR URL and next steps

---

## Critical Rules

1. **YOU are the orchestrator** - Worker agents return to you, you handle gates
2. **STOP means STOP** - Literally halt and wait for user input
3. **One gate at a time** - No batching, no previewing future gates
4. **Show, don't summarize** - Full content at every gate
5. **Explicit approval only** - "proceed", "yes", "approved" (not silence)

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
