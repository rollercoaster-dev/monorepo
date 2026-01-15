# /auto-issue <issue-number>

Fully autonomous issue-to-PR workflow. Delegates to specialized agents.

**Mode:** Autonomous - no gates, auto-fix enabled, escalation only on unresolved critical findings.

## Quick Reference

```bash
/auto-issue 123                    # Full autonomous run
/auto-issue 123 --dry-run          # Research only, show plan
/auto-issue 123 --force-pr         # Create PR even with issues
/auto-issue 123 --skip-review      # Skip review phase
```

## Workflow

```
Phase 1: Setup     → setup-agent
Phase 2: Research  → issue-researcher
Phase 3: Implement → atomic-developer
Phase 4: Review    → review-orchestrator
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

- Fetch issue details
- Create feature branch
- Create checkpoint workflow
- Add issue to board as "In Progress"
- Send Telegram notification

**On error:** Report and exit.

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

**If `--dry-run`:** Stop here, display plan, exit.

**If blockers found:** Warn but continue (autonomous mode).

---

## Phase 3: Implement

**Agent:** `atomic-developer`

```
Task(atomic-developer):
  Input:  { issue_number: <N>, workflow_id, plan_path: <from-phase-2> }
  Output: { commits, validation }
```

The atomic-developer will:

- Implement each step in the plan
- Make atomic commits
- Run validation after each commit
- Log commits to checkpoint

**On validation failure:** Attempt inline fix, continue.

---

## Phase 4: Review

**Agent:** `review-orchestrator`

```
Task(review-orchestrator):
  Input:  { workflow_id }
  Output: { findings, summary }
```

**If `--skip-review`:** Skip to Phase 5.

The review-orchestrator will:

- Spawn review agents in parallel
- Classify findings by severity
- Auto-fix critical findings (up to 3 attempts each)
- Return summary with unresolved findings

**If `summary.unresolved > 0`:** Escalate (see below).

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

## Escalation

Triggered when `review-orchestrator` returns unresolved critical findings.

**Notify user via Telegram:**

```
ESCALATION: Issue #<N>

Unresolved critical findings:
1. [agent] file:line - message
2. [agent] file:line - message

Options:
- "continue" - I'll fix manually, then re-run review
- "force-pr" - Create PR with issues flagged
- "abort" - Delete branch and exit
```

**Handle response:**

- `continue` → Wait, then re-run Phase 4
- `force-pr` → Proceed to Phase 5 with `force: true`
- `abort` → Delete branch, mark workflow failed, exit

---

## Flags

| Flag            | Effect                                |
| --------------- | ------------------------------------- |
| `--dry-run`     | Stop after Phase 2, show plan         |
| `--force-pr`    | Create PR even with unresolved issues |
| `--skip-review` | Skip Phase 4 entirely                 |

---

## Error Handling

| Error              | Behavior                                  |
| ------------------ | ----------------------------------------- |
| Issue not found    | Report error, exit                        |
| Branch conflict    | Checkout existing, find existing workflow |
| Agent failure      | Report error, exit (critical)             |
| Validation failure | Attempt fix, continue if possible         |

---

## Success Criteria

Workflow succeeds when:

- PR is created
- Board updated to "Blocked"
- Telegram notification sent
- Workflow marked complete

---

## Agents Summary

| Phase | Agent                 | Purpose                   |
| ----- | --------------------- | ------------------------- |
| 1     | `setup-agent`         | Branch, checkpoint, board |
| 2     | `issue-researcher`    | Analyze, plan             |
| 3     | `atomic-developer`    | Implement, commit         |
| 4     | `review-orchestrator` | Review, fix               |
| 5     | `finalize-agent`      | PR, cleanup               |

See `.claude/docs/agent-architecture.md` for full agent contracts.
