# claude-knowledge

Cross-session learning persistence for Claude Code autonomous workflows.

## Overview

This package provides:

- **Phase 1 (Current):** Execution state persistence for workflow recovery after context compaction
- **Phase 2 (Future):** Knowledge graph for cross-session learning

## Installation

This is an internal monorepo package. It's automatically available to other packages.

## Usage

### Basic Checkpoint Operations

```typescript
import { checkpoint } from "claude-knowledge";

// Create a new workflow checkpoint
const workflow = checkpoint.create(123, "feat/issue-123-feature");

// Update phase as work progresses
checkpoint.setPhase(workflow.id, "implement");

// Log actions for debugging/trace
checkpoint.logAction(workflow.id, "spawned code-reviewer", "success", {
  agent: "code-reviewer",
  findings: 3,
});

// Log commits for rollback capability
checkpoint.logCommit(workflow.id, "abc123", "feat(auth): add login endpoint");

// Save full state
workflow.retryCount = 1;
checkpoint.save(workflow);

// Load on resume (after compaction)
const state = checkpoint.load(workflow.id);
if (state) {
  console.log(`Resuming from phase: ${state.workflow.phase}`);
  console.log(`Actions taken: ${state.actions.length}`);
  console.log(`Commits made: ${state.commits.length}`);
}
```

### Finding Workflows

```typescript
// Find by issue number (returns most recent)
const state = checkpoint.findByIssue(123);

// List all active workflows
const active = checkpoint.listActive();
```

### Integration with /auto-issue

```typescript
// At workflow start
const workflow = checkpoint.create(issueNumber, branchName, worktreePath);

// At each phase transition
checkpoint.setPhase(workflow.id, "review");
checkpoint.logAction(workflow.id, "phase transition", "success", {
  from: "implement",
  to: "review",
});

// On compaction recovery
const existing = checkpoint.findByIssue(issueNumber);
if (existing && existing.workflow.status === "running") {
  // Resume from where we left off
  const { workflow, actions, commits } = existing;
  // ... continue from workflow.phase
}

// On completion
checkpoint.setStatus(workflow.id, "completed");
```

## Database Location

The SQLite database is stored at `.claude/execution-state.db` (gitignored).

## Phase 2 (Not Implemented)

The following are placeholders for future work:

- `knowledge.store()` - Store learnings in Neo4j
- `knowledge.query()` - Query knowledge graph
- `hooks.onSessionStart()` - Load relevant knowledge
- `hooks.onSessionEnd()` - Capture learnings

## API Reference

### checkpoint.create(issueNumber, branch, worktree?)

Create a new workflow checkpoint.

### checkpoint.save(workflow)

Save/update workflow state.

### checkpoint.load(workflowId)

Load full checkpoint data (workflow + actions + commits).

### checkpoint.findByIssue(issueNumber)

Find most recent workflow for an issue.

### checkpoint.logAction(workflowId, action, result, metadata?)

Log an action for debugging/trace.

### checkpoint.logCommit(workflowId, sha, message)

Log a commit made during workflow.

### checkpoint.setPhase(workflowId, phase)

Update workflow phase. Valid phases: `research`, `implement`, `review`, `finalize`.

### checkpoint.setStatus(workflowId, status)

Update workflow status. Valid statuses: `running`, `paused`, `completed`, `failed`.

### checkpoint.incrementRetry(workflowId)

Increment and return retry count.

### checkpoint.listActive()

List all non-completed workflows.

### checkpoint.delete(workflowId)

Delete workflow and all associated data.

## Types

```typescript
type WorkflowPhase = "research" | "implement" | "review" | "finalize";
type WorkflowStatus = "running" | "paused" | "completed" | "failed";

interface Workflow {
  id: string;
  issueNumber: number;
  branch: string;
  worktree: string | null;
  phase: WorkflowPhase;
  status: WorkflowStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CheckpointData {
  workflow: Workflow;
  actions: Action[];
  commits: Commit[];
}
```
