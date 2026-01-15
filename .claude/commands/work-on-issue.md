# /work-on-issue <issue-number>

Gated workflow requiring human approval at each phase.

**Mode:** Supervised - 4 hard gates, explicit approval required at each.

## Quick Reference

```bash
/work-on-issue 123              # Standard gated workflow
/work-on-issue 123 --skip-review # Skip Gate 4 (pre-PR review)
```

## Workflow

```
Phase 1: Setup     → setup-agent     → GATE 1 (Issue Review)
Phase 2: Research  → issue-researcher → GATE 2 (Plan Review)
Phase 3: Implement → (manual commits) → GATE 3 (per commit)
Phase 4: Review    → review agents    → GATE 4 (Pre-PR Review)
Phase 5: Finalize  → finalize-agent
```

---

## Phase 1: Setup

**Agent:** `setup-agent`

```
Task(setup-agent):
  Input:  { issue_number: <N> }
  Output: { workflow_id, branch, issue }
```

The setup-agent will:

- Check for existing workflow (offer resume if found)
- Fetch issue details
- Create feature branch
- Create checkpoint workflow
- Add issue to board as "In Progress"
- Send Telegram notification

---

## GATE 1: Issue Review

**STOP** - Hard gate requiring explicit approval.

**Show to user:**

- Full issue title and number
- Full body (verbatim - do NOT summarize)
- Labels and milestone
- Blockers if any

**Ask via Telegram** (or terminal):

> Issue #<N>: <title>
>
> <summary>
>
> Proceed with this issue? (yes/no)

**Wait for:** "proceed", "yes", "go ahead", "approved"

**Do NOT continue until explicit approval received.**

---

## Phase 2: Research

**Agent:** `issue-researcher`

```
Task(issue-researcher):
  Input:  { issue_number: <N>, workflow_id: <from-phase-1> }
  Output: { plan_path, complexity, commit_count }
```

The issue-researcher will:

- Analyze codebase using graph queries
- Check dependencies
- Create dev plan at `.claude/dev-plans/issue-<N>.md`
- Log plan creation to checkpoint

---

## GATE 2: Plan Review

**STOP** - Hard gate requiring explicit approval.

**Show to user:**

- Full development plan (every line, no summarizing)
- Planned commit count
- Affected files

**Ask via Telegram** (or terminal):

> Plan ready for Issue #<N>
>
> <commit-count> commits planned
>
> Proceed with implementation? (yes/no)

**Wait for:** "proceed", "yes", "go ahead", "approved"

**Do NOT continue until explicit approval received.**

---

## Phase 3: Implement

**Note:** Unlike /auto-issue, this phase does NOT use atomic-developer agent.
The orchestrator handles implementation directly with per-commit gates.

For each commit in the plan:

1. **Make changes** per plan step
2. **Run validation:**
   ```
   bun run type-check
   bun run lint
   ```
3. **Show diff** to user

### GATE 3: Commit Review (per commit)

**STOP** - Hard gate for each commit.

**Show to user:**

- git diff of staged changes
- Proposed commit message

**Ask via Telegram** (or terminal):

> Commit <N>/<total>: <message>
>
> <files-changed> files changed
>
> Approve this commit? (yes/no)

**Wait for:** "proceed", "yes", "approved"

4. **If approved:** Commit changes, log to checkpoint
5. **If rejected:** Ask for guidance, modify, re-show

---

## Phase 4: Review

**If `--skip-review`:** Skip to Phase 5.

Run review agents (can be parallel):

- `pr-review-toolkit:code-reviewer`
- `pr-review-toolkit:pr-test-analyzer`
- `pr-review-toolkit:silent-failure-hunter`

Collect and classify findings by severity.

---

## GATE 4: Pre-PR Review

**STOP** - Hard gate requiring explicit approval.

**Show to user:**

- Summary of findings by severity
- Critical issues (if any)
- Recommendation (proceed or fix)

**Ask via Telegram** (or terminal):

> Review complete for Issue #<N>
>
> <finding-count> findings (<critical-count> critical)
>
> Create PR? (yes/no/fix)

**Wait for:**

- "proceed", "yes" → Continue to Phase 5
- "fix" → Address issues, re-run Phase 4
- "no" → Pause, wait for guidance

---

## Phase 5: Finalize

**Agent:** `finalize-agent`

```
Task(finalize-agent):
  Input:  { issue_number: <N>, workflow_id, findings_summary: <from-phase-4> }
  Output: { pr }
```

The finalize-agent will:

- Run final validation
- Clean up dev plan file
- Push branch
- Create PR
- Update board to "Blocked"
- Mark workflow complete
- Send Telegram notification with PR link

---

## Gate Rules

From `.claude/rules/gate-workflow.md`:

1. **Gates require explicit approval** - Silence is not approval
2. **One gate at a time** - Don't batch or preview future gates
3. **Show complete information** - Don't summarize at gates
4. **File changes after gate approval** - Modifications only after Gate 2

---

## Error Handling

| Error              | Behavior                     |
| ------------------ | ---------------------------- |
| Issue not found    | Report error, exit           |
| Existing workflow  | Offer resume or fresh start  |
| Gate timeout       | Wait indefinitely            |
| Validation failure | Show error, ask for guidance |

---

## Success Criteria

Workflow succeeds when:

- All 4 gates passed with explicit approval
- PR is created
- Board updated to "Blocked"
- Workflow marked complete

---

## Agents Summary

| Phase | Agent              | Gate After                   |
| ----- | ------------------ | ---------------------------- |
| 1     | `setup-agent`      | GATE 1: Issue Review         |
| 2     | `issue-researcher` | GATE 2: Plan Review          |
| 3     | (orchestrator)     | GATE 3: Commit Review (each) |
| 4     | review agents      | GATE 4: Pre-PR Review        |
| 5     | `finalize-agent`   | -                            |

See `.claude/docs/agent-architecture.md` for full agent contracts.
