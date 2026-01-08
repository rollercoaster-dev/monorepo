# Telegram MCP Helpers

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
