# Checkpoint Patterns

Shared patterns for workflow state persistence using `claude-knowledge` checkpoint API.

## Overview

The checkpoint system tracks workflow state in SQLite (`.claude/execution-state.db`), enabling:

- Resume after context compaction
- Audit trail of actions
- Cross-session state persistence

## TypeScript API (Preferred)

```typescript
import { checkpoint } from "claude-knowledge";

// Create workflow
const workflow = checkpoint.create(issueNumber, branchName);
const WORKFLOW_ID = workflow.id;

// Find existing workflow
const existing = checkpoint.findByIssue(issueNumber);

// List all active workflows
const active = checkpoint.listActive();

// Update state
checkpoint.setPhase(WORKFLOW_ID, "implement");
checkpoint.setStatus(WORKFLOW_ID, "running");

// Log actions and commits
checkpoint.logAction(WORKFLOW_ID, "action_name", "success", { metadata });
checkpoint.logCommit(WORKFLOW_ID, sha, message);

// Track retry attempts
const retryCount = checkpoint.incrementRetry(WORKFLOW_ID);
```

## CLI Commands (Alternative)

For manual debugging or shell scripts. For programmatic use, prefer the TypeScript API above.

```bash
# Create workflow
bun scripts/checkpoint-cli.ts create <issue> <branch>

# Find existing workflow
bun scripts/checkpoint-cli.ts find <issue>

# Update phase
bun scripts/checkpoint-cli.ts set-phase <workflowId> <phase>

# Update status
bun scripts/checkpoint-cli.ts set-status <workflowId> <status>

# Log action
bun scripts/checkpoint-cli.ts log-action <workflowId> <action> <result> [metadata-json]

# Log commit
bun scripts/checkpoint-cli.ts log-commit <workflowId> <sha> <message>

# List active workflows
bun scripts/checkpoint-cli.ts list-active
```

## Workflow Initialization Pattern

At workflow start, check for existing state:

```typescript
let WORKFLOW_ID: string;

// Check for existing workflow
const existing = checkpoint.findByIssue(issueNumber);

if (existing && existing.workflow.status === "running") {
  // Resume existing workflow
  console.log(`Resuming from phase: ${existing.workflow.phase}`);
  WORKFLOW_ID = existing.workflow.id;

  // Jump to appropriate phase based on saved state
  switch (existing.workflow.phase) {
    case "implement":
      // Skip to implementation
      break;
    case "review":
      // Skip to review
      break;
    case "finalize":
      // Skip to finalize
      break;
  }
} else {
  // Create new workflow
  const workflow = checkpoint.create(issueNumber, branchName);
  WORKFLOW_ID = workflow.id;

  checkpoint.logAction(WORKFLOW_ID, "workflow_started", "success", {
    issueNumber,
    branch: branchName,
  });
}
```

## Phase Transition Pattern

When moving between phases:

```typescript
function transitionPhase(
  workflowId: string,
  from: string,
  to: string,
  metadata: Record<string, unknown>,
  context: string,
): void {
  // Update checkpoint
  checkpoint.setPhase(workflowId, to);
  checkpoint.logAction(workflowId, "phase_transition", "success", {
    from,
    to,
    ...metadata,
  });

  // Log to console
  console.log(`[${context}] Phase: ${from} → ${to}`);

  // Optional: Telegram notification
  notifyTelegram(`[${context}] Phase: ${from} → ${to}`, context);
}
```

## Agent Spawn Logging Pattern

When spawning sub-agents:

```typescript
checkpoint.logAction(WORKFLOW_ID, "spawned_agent", "success", {
  agent: "issue-researcher",
  task: "analyze codebase and create dev plan",
  issueNumber,
});
```

## Commit Logging Pattern

After each git commit, log it to the checkpoint.

**For Claude Code (Bash tool calls):**

First, get the SHA (separate command):

```bash
git rev-parse HEAD
```

Then log to checkpoint using the literal SHA from the output:

```bash
bun run checkpoint workflow log-commit "<workflow-id>" "<sha>" "<type>(<scope>): <description>"
```

**IMPORTANT:** Never combine these with `&&` or use shell variables like `$COMMIT_SHA`. Each is a separate Bash tool call.

**For TypeScript code:**

```typescript
const sha = await $`git rev-parse HEAD`.text().trim();
checkpoint.logCommit(workflowId, sha, message);
```

## Gate Passage Logging

For gated workflows:

```typescript
checkpoint.logAction(WORKFLOW_ID, "gate-1-issue-reviewed", "success", {
  issue: issueNumber,
});
```

## Workflow Phases

### Issue Workflows

| Phase       | Description                   |
| ----------- | ----------------------------- |
| `research`  | Fetching issue, creating plan |
| `implement` | Writing code, making commits  |
| `review`    | Running review agents         |
| `finalize`  | Creating PR, cleanup          |

### Milestone Workflows

| Phase      | Description             |
| ---------- | ----------------------- |
| `planning` | Analyzing dependencies  |
| `execute`  | Running child workflows |
| `review`   | Polling PR status       |
| `merge`    | Merging in order        |
| `cleanup`  | Removing worktrees      |

## Workflow Statuses

| Status      | Meaning                |
| ----------- | ---------------------- |
| `running`   | Workflow in progress   |
| `paused`    | Waiting for user input |
| `completed` | Successfully finished  |
| `failed`    | Escalation or error    |

## Resume Behavior

| Saved Phase | Resume Action                           |
| ----------- | --------------------------------------- |
| `research`  | Re-run researcher, proceed to implement |
| `implement` | Check commits array, continue from last |
| `review`    | Re-run review agents                    |
| `finalize`  | Check if PR exists, create if not       |

## Debugging

```bash
# Inspect checkpoint state
bun repl
> import { checkpoint } from "./packages/claude-knowledge/src/checkpoint.ts"
> checkpoint.findByIssue(365)
> checkpoint.listActive()

# Reset stuck workflow
> checkpoint.setStatus("workflow-id", "failed")
```

## Database Location

State stored in `.claude/execution-state.db` (SQLite, gitignored).
