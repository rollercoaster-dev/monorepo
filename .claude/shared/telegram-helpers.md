# Telegram Skill Helpers

> **Architecture:** Used by setup and finalize skills for notifications. See [agent-architecture.md](../docs/agent-architecture.md).

Shared notification patterns for workflow commands.

## Invoking Telegram

All Telegram communication uses the global `telegram` skill via the `Skill` tool. Do **not** call MCP tools directly.

| Action            | Invocation                                   | Blocking |
| ----------------- | -------------------------------------------- | -------- |
| Send notification | `Skill(telegram, args: "notify: <message>")` | No       |
| Ask a question    | `Skill(telegram, args: "ask: <question>")`   | Yes      |

## Helper Functions

### notifyTelegram (Non-blocking)

```
Invoke: Skill(telegram, args: "notify: <message>")

On failure: log and continue (Telegram is non-critical).
```

**Usage:** Status updates, phase transitions, completion notices.

### askTelegram (Blocking with fallback)

```
Invoke: Skill(telegram, args: "ask: <question>")

On success: returns the user's reply text.
On failure: treat as "TELEGRAM_UNAVAILABLE" and fall through to terminal.
```

**Usage:** Gate approvals, escalation decisions, user choices.

**Handling response:**

```text
response = Skill(telegram, args: "ask: <question>")

if response failed or unavailable:
  // Continue waiting in terminal as normal (TELEGRAM_UNAVAILABLE)
else:
  // Process Telegram response
```

## Notification Templates

### Workflow Start

```text
notify: Started /<command> #<issueNumber>

Branch: <branchName>
Mode: <mode>

You'll receive updates at each phase.
```

### Phase Transition

```text
notify: [<context> #<issueNumber>] Phase: <from> -> <to>

<details>
```

### Gate Approval (Gated Workflows)

```text
ask: GATE <n>: <gateName>

<summary>

Reply "proceed" to continue, or provide feedback.
```

### Escalation (Autonomous Workflows)

```text
ask: ESCALATION REQUIRED

Issue: #<issueNumber> - <title>
Retry: <retryCount>/<MAX_RETRY>

Critical Findings:
<bullet list of findings>

Options:
1. 'continue' - Fix manually, then continue
2. 'force-pr' - Create PR with issues flagged
3. 'abort' - Delete branch and exit
```

### Completion

```text
notify: PR Created!

Issue #<issueNumber>: <title>

PR #<prNumber>: <prTitle>
<prUrl>

Commits: <commitCount>
Reviews: CodeRabbit + Claude triggered
```

### Permission Needed

```text
notify: [<context> #<issueNumber>] Permission needed in terminal

Tool: <toolName>
File: <filePath>

Waiting for approval...
```

## /work-on-issue Templates

These templates are used by the gated `/work-on-issue` workflow. Use template names when documenting notification points.

| Template                | Type   | When Used                         |
| ----------------------- | ------ | --------------------------------- |
| `WOI_START`             | notify | Workflow started, branch created  |
| `WOI_GATE_1`            | ask    | Issue review gate                 |
| `WOI_GATE_1_APPROVED`   | notify | Starting research phase           |
| `WOI_RESEARCH_COMPLETE` | notify | Plan ready for review             |
| `WOI_GATE_2`            | ask    | Plan review gate                  |
| `WOI_GATE_2_APPROVED`   | notify | Starting implementation           |
| `WOI_GATE_3`            | ask    | Commit review gate (repeated)     |
| `WOI_COMMIT_APPROVED`   | notify | Commit N/M complete               |
| `WOI_IMPL_COMPLETE`     | notify | All commits done, starting review |
| `WOI_GATE_4`            | ask    | Pre-PR review gate                |
| `WOI_GATE_4_APPROVED`   | notify | Creating PR                       |
| `WOI_COMPLETE`          | notify | PR created with link              |
| `WOI_PERMISSION`        | notify | Waiting for terminal approval     |

### Template Details

**WOI_GATE_1** (ask):

```text
GATE 1: Issue Review
Issue #N: <title>
<2-3 line summary>
Labels: X | Milestone: Y | Blockers: Z
Reply "proceed" to continue.
```

**WOI_GATE_2** (ask):

```text
GATE 2: Plan Review
Issue #N: <title>
Commits planned: X | Files affected: Y
Reply "proceed" to continue.
```

**WOI_GATE_3** (ask):

```text
GATE 3: Commit Review (N/M)
<type>(<scope>): <message>
Changes: <file list> | Lines: +X -Y
Reply "proceed" to approve.
```

**WOI_GATE_4** (ask):

```text
GATE 4: Pre-PR Review
Critical: X | High: Y | Medium: Z
Reply "proceed" to create PR.
```

---

## /auto-issue Templates

These templates are used by the autonomous `/auto-issue` workflow. Unlike `/work-on-issue`, this workflow has minimal notifications - only essential state changes.

| Template        | Type   | When Used                             |
| --------------- | ------ | ------------------------------------- |
| `AI_START`      | notify | Workflow started                      |
| `AI_ESCALATION` | ask    | MAX_RETRY exceeded, needs user choice |
| `AI_COMPLETE`   | notify | PR created successfully               |
| `AI_ERROR`      | notify | Fatal workflow failure                |

### Template Details

**AI_START** (notify):

```text
[AUTO-ISSUE #N] Started
Issue: #N
Branch: feat/issue-N-description
Mode: Autonomous

Phase transitions will not be announced.
You will be notified on escalation, completion, or error.
```

**AI_ESCALATION** (ask):

```text
[AUTO-ISSUE #N] ESCALATION

Issue: #N - <title>
Branch: feat/issue-N-description
Retry: X/3

Critical Findings (Unresolved):
- <agent>: <file> - <issue>
- <agent>: <file> - <issue>

Options:
1. 'continue' - Fix manually, then continue
2. 'force-pr' - Create PR with issues flagged
3. 'abort' - Delete branch and exit
4. 'reset' - Go back to last good state

Reply with your choice.
```

**AI_COMPLETE** (notify):

```text
[AUTO-ISSUE #N] PR Created!

PR #M: <type>(<scope>): <description>
https://github.com/rollercoaster-dev/monorepo/pull/M

Commits: X implementation + Y fixes
Reviews triggered: CodeRabbit, Claude
```

**AI_ERROR** (notify):

```text
[AUTO-ISSUE #N] Failed

Phase: <phase>
Error: <error message>

Current state:
- Branch: feat/issue-N-description
- Commits made: X
- Last action: <action>

Check terminal for details.
```

---

## Graceful Degradation

If the `telegram` skill is unavailable:

- Notification calls fail silently (logged to console)
- Ask calls return no response — workflow continues in terminal
- All gates still function — just in terminal instead of Telegram
