# Telegram MCP Helpers

> **Architecture:** Used by setup-agent and finalize-agent for notifications. See [agent-architecture.md](../docs/agent-architecture.md).

Shared notification patterns for workflow commands.

## MCP Tools

| Tool                                          | Purpose              | Blocking                 |
| --------------------------------------------- | -------------------- | ------------------------ |
| `mcp__mcp-communicator-telegram__notify_user` | One-way notification | No                       |
| `mcp__mcp-communicator-telegram__ask_user`    | Two-way interaction  | Yes (waits for response) |
| `mcp__mcp-communicator-telegram__send_file`   | Send file to user    | No                       |

## Helper Functions

### notifyTelegram (Non-blocking)

```typescript
function notifyTelegram(message: string, context: string): void {
  try {
    mcp__mcp_communicator_telegram__notify_user({ message });
  } catch {
    console.log(`[${context}] (Telegram unavailable - continuing)`);
  }
}
```

**Usage:** Status updates, phase transitions, completion notices.

### askTelegram (Blocking with fallback)

```typescript
async function askTelegram(question: string, context: string): Promise<string> {
  try {
    return await mcp__mcp_communicator_telegram__ask_user({ question });
  } catch {
    console.log(`[${context}] (Telegram unavailable - waiting for terminal)`);
    return "TELEGRAM_UNAVAILABLE";
  }
}
```

**Usage:** Gate approvals, escalation decisions, user choices.

**Handling response:**

```typescript
const response = await askTelegram(question, "WORK-ON-ISSUE");
if (response === "TELEGRAM_UNAVAILABLE") {
  // Continue waiting in terminal as normal
} else {
  // Process Telegram response
}
```

## Notification Templates

### Workflow Start

```typescript
notifyTelegram(
  `🚀 Starting /<command> #${issueNumber}

Branch: ${branchName}
Mode: ${mode}

You'll receive updates at each phase.`,
  context,
);
```

### Phase Transition

```typescript
notifyTelegram(
  `[${context} #${issueNumber}] Phase: ${from} → ${to}

${details}`,
  context,
);
```

### Gate Approval (Gated Workflows)

```typescript
const response = await askTelegram(
  `🚦 GATE ${n}: ${gateName}

${summary}

Reply "proceed" to continue, or provide feedback.`,
  context,
);
```

### Escalation (Autonomous Workflows)

```typescript
const response = await askTelegram(
  `🚨 ESCALATION REQUIRED

Issue: #${issueNumber} - ${title}
Retry: ${retryCount}/${MAX_RETRY}

Critical Findings:
${findings.map((f) => `• ${f.file}: ${f.issue}`).join("\n")}

Options:
1. 'continue' - Fix manually, then continue
2. 'force-pr' - Create PR with issues flagged
3. 'abort' - Delete branch and exit`,
  context,
);
```

### Completion

```typescript
notifyTelegram(
  `✅ PR Created!

Issue #${issueNumber}: ${title}

PR #${prNumber}: ${prTitle}
${prUrl}

Commits: ${commitCount}
Reviews: CodeRabbit + Claude triggered`,
  context,
);
```

### Permission Needed

```typescript
notifyTelegram(
  `⏳ [${context} #${issueNumber}] Permission needed in terminal

Tool: ${toolName}
File: ${filePath}

Waiting for approval...`,
  context,
);
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
🚦 GATE 1: Issue Review
Issue #N: <title>
<2-3 line summary>
Labels: X | Milestone: Y | Blockers: Z
Reply "proceed" to continue.
```

**WOI_GATE_2** (ask):

```text
🚦 GATE 2: Plan Review
Issue #N: <title>
Commits planned: X | Files affected: Y
Reply "proceed" to continue.
```

**WOI_GATE_3** (ask):

```text
🚦 GATE 3: Commit Review (N/M)
<type>(<scope>): <message>
Changes: <file list> | Lines: +X -Y
Reply "proceed" to approve.
```

**WOI_GATE_4** (ask):

```text
🚦 GATE 4: Pre-PR Review
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
🚀 [AUTO-ISSUE #N] Started
Issue: #N
Branch: feat/issue-N-description
Mode: Autonomous

Phase transitions will not be announced.
You will be notified on escalation, completion, or error.
```

**AI_ESCALATION** (ask):

```text
🚨 [AUTO-ISSUE #N] ESCALATION

Issue: #N - <title>
Branch: feat/issue-N-description
Retry: X/3

Critical Findings (Unresolved):
• <agent>: <file> - <issue>
• <agent>: <file> - <issue>

Options:
1. 'continue' - Fix manually, then continue
2. 'force-pr' - Create PR with issues flagged
3. 'abort' - Delete branch and exit
4. 'reset' - Go back to last good state

Reply with your choice.
```

**AI_COMPLETE** (notify):

```text
✅ [AUTO-ISSUE #N] PR Created!

PR #M: <type>(<scope>): <description>
https://github.com/rollercoaster-dev/monorepo/pull/M

Commits: X implementation + Y fixes
Reviews triggered: CodeRabbit, Claude
```

**AI_ERROR** (notify):

```text
❌ [AUTO-ISSUE #N] Failed

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

If the MCP server is unavailable:

- `notify_user` calls fail silently (logged to console)
- `ask_user` calls return `"TELEGRAM_UNAVAILABLE"` - workflow continues in terminal
- All gates still function - just in terminal instead of Telegram

## Setup Instructions

Configure in `~/.claude.json`:

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

**Getting credentials:**

1. Create a bot via [@BotFather](https://t.me/botfather) on Telegram
2. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
3. Restart Claude Code after configuration
