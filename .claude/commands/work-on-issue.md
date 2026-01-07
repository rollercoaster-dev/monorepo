# /work-on-issue $ARGUMENTS

Execute the gated workflow for issue #$ARGUMENTS.

**YOU are the orchestrator. Do not delegate gate handling to agents.**

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

   ```bash
   bun scripts/checkpoint-cli.ts find $ARGUMENTS
   ```

2. **If existing workflow found** (not null):
   - Show the workflow state:
     ```
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
   - Create feature branch:
     ```bash
     git checkout -b feat/issue-$ARGUMENTS-{short-description}
     ```
   - Create checkpoint:
     ```bash
     bun scripts/checkpoint-cli.ts create $ARGUMENTS "feat/issue-$ARGUMENTS-{short-description}"
     ```
   - Store the workflow ID for subsequent commands

**IMPORTANT**: Store the `WORKFLOW_ID` from the create command output (it's in the `id` field of the JSON response). You'll need it for all subsequent checkpoint commands.

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

## After Gate 1 Approval: Log & Research

5. Log the gate passage:

   ```bash
   bun scripts/checkpoint-cli.ts log-action $WORKFLOW_ID "gate-1-issue-reviewed" success '{"issue": $ARGUMENTS}'
   ```

6. Spawn `issue-researcher` agent to:
   - Analyze codebase
   - Check dependencies
   - Create dev plan at `.claude/dev-plans/issue-$ARGUMENTS.md`

7. When researcher returns, READ the plan file with the Read tool.

8. Update phase to research complete:

   ```bash
   bun scripts/checkpoint-cli.ts log-action $WORKFLOW_ID "research-complete" success '{"plan": ".claude/dev-plans/issue-$ARGUMENTS.md"}'
   ```

---

## GATE 2: Show Plan

**STOP** - This is a hard gate.

9. Show the **COMPLETE** plan to the user:
   - Every section
   - Every step
   - Every commit planned
   - Do NOT summarize

10. **STOP HERE** and wait for explicit approval.

**Do NOT continue until you receive explicit approval.**

---

## After Gate 2 Approval: Transition to Implement

11. Log gate passage and transition phase:

    ```bash
    bun scripts/checkpoint-cli.ts log-action $WORKFLOW_ID "gate-2-plan-approved" success
    bun scripts/checkpoint-cli.ts set-phase $WORKFLOW_ID implement
    ```

12. For each atomic commit in the plan:
    - Make the changes according to plan
    - Run validation: `bun run type-check && bun run lint`
    - Prepare the diff

---

## GATE 3: Commit Review (Repeated Per Commit)

**STOP** - This is a hard gate for EACH commit.

13. Show the diff: `git diff`

14. Explain what changed and why

15. **STOP HERE** and wait for approval

16. Only after approval, commit and log:

    ```bash
    git add . && git commit -m "<type>(<scope>): <description>"
    ```

    Then log the commit:

    ```bash
    # Get the commit SHA
    SHA=$(git rev-parse HEAD)
    bun scripts/checkpoint-cli.ts log-commit $WORKFLOW_ID "$SHA" "<type>(<scope>): <description>"
    ```

17. Repeat for each commit in the plan

**Do NOT batch commits. One at a time, one approval at a time.**

---

## After All Commits: Transition to Review

18. Update phase to review:

    ```bash
    bun scripts/checkpoint-cli.ts set-phase $WORKFLOW_ID review
    bun scripts/checkpoint-cli.ts log-action $WORKFLOW_ID "implementation-complete" success
    ```

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

    ```bash
    bun scripts/checkpoint-cli.ts log-action $WORKFLOW_ID "review-agents-complete" success '{"findings": <count>}'
    ```

---

## GATE 4: Pre-PR Review Results

**STOP** - This is a hard gate.

23. Present findings grouped by severity:
    - **Critical (must fix)**: Security, bugs, breaking changes
    - **High (should fix)**: Code quality, error handling
    - **Medium (consider)**: Style, documentation

24. **STOP HERE** and wait for approval to create PR.

**Do NOT create PR until Critical issues are resolved and user approves.**

---

## After Gate 4 Approval: Finalize & Create PR

25. Log gate passage and transition to finalize:

    ```bash
    bun scripts/checkpoint-cli.ts log-action $WORKFLOW_ID "gate-4-review-approved" success
    bun scripts/checkpoint-cli.ts set-phase $WORKFLOW_ID finalize
    ```

26. **Clean up dev-plan file:**

    ```bash
    rm .claude/dev-plans/issue-$ARGUMENTS.md
    git add .claude/dev-plans/
    git commit -m "chore: clean up dev-plan for issue #$ARGUMENTS"
    ```

    Log this commit too:

    ```bash
    SHA=$(git rev-parse HEAD)
    bun scripts/checkpoint-cli.ts log-commit $WORKFLOW_ID "$SHA" "chore: clean up dev-plan for issue #$ARGUMENTS"
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

    ```bash
    bun scripts/checkpoint-cli.ts log-action $WORKFLOW_ID "pr-created" success '{"pr_url": "<url>"}'
    bun scripts/checkpoint-cli.ts set-status $WORKFLOW_ID completed
    ```

30. Report PR URL and next steps

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
2. On resume, use `bun scripts/checkpoint-cli.ts find $ARGUMENTS` to restore state
3. Review the actions and commits arrays to understand progress
4. Resume from the appropriate gate

---

## Checkpoint CLI Reference

```bash
# Create new workflow
bun scripts/checkpoint-cli.ts create <issue> <branch>

# Find existing workflow
bun scripts/checkpoint-cli.ts find <issue>

# Update phase (research|implement|review|finalize)
bun scripts/checkpoint-cli.ts set-phase <workflowId> <phase>

# Update status (running|paused|completed|failed)
bun scripts/checkpoint-cli.ts set-status <workflowId> <status>

# Log an action
bun scripts/checkpoint-cli.ts log-action <workflowId> <action> <result> [metadata-json]

# Log a commit
bun scripts/checkpoint-cli.ts log-commit <workflowId> <sha> <message>

# List active workflows
bun scripts/checkpoint-cli.ts list-active
```
