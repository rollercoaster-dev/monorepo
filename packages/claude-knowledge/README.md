# claude-knowledge

Cross-session learning persistence for Claude Code autonomous workflows.

## Overview

This package provides:

- **Phase 1:** Execution state persistence for workflow recovery after context compaction
- **Phase 2:** Knowledge graph for cross-session learning (SQLite-based)

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

## Phase 2: Knowledge Graph

### Storing Learnings

```typescript
import { knowledge } from "claude-knowledge";
import type { Learning } from "claude-knowledge";

// Store learnings from a session
const learnings: Learning[] = [
  {
    id: "learning-1",
    content: "Always validate API input with Zod schemas",
    codeArea: "API Development",
    confidence: 0.95,
    sourceIssue: 123,
  },
  {
    id: "learning-2",
    content: "Use rd-logger for structured logging",
    filePath: "packages/rd-logger/src/index.ts",
    confidence: 0.9,
  },
];

await knowledge.store(learnings);
```

### Storing Patterns

```typescript
import type { Pattern } from "claude-knowledge";

// Store a recognized pattern
const pattern: Pattern = {
  id: "pattern-validation",
  name: "Input Validation Pattern",
  description: "Validate all user input before processing",
  codeArea: "Security",
};

// Link to learnings that led to this pattern
await knowledge.storePattern(pattern, ["learning-1", "learning-3"]);
```

### Storing Mistakes

```typescript
import type { Mistake } from "claude-knowledge";

// Store a mistake and how it was fixed
const mistake: Mistake = {
  id: "mistake-sql-injection",
  description: "Used string concatenation for SQL query",
  howFixed: "Switched to parameterized queries with bun:sqlite",
  filePath: "src/db/queries.ts",
};

// Link to the learning that fixed it
await knowledge.storeMistake(mistake, "learning-4");
```

### Querying the Knowledge Graph

```typescript
import { knowledge } from "claude-knowledge";
import type { QueryContext, QueryResult } from "claude-knowledge";

// Query learnings by code area
const results = await knowledge.query({
  codeArea: "API Development",
  limit: 10,
});

results.forEach(({ learning, relatedPatterns, relatedMistakes }) => {
  console.log(`Learning: ${learning.content}`);
  relatedPatterns?.forEach((p) => console.log(`  Pattern: ${p.name}`));
  relatedMistakes?.forEach((m) => console.log(`  Mistake: ${m.description}`));
});

// Query by file path
const fileResults = await knowledge.query({
  filePath: "src/api/users.ts",
});

// Search by keywords (AND logic)
const searchResults = await knowledge.query({
  keywords: ["validation", "security"],
});

// Filter by source issue
const issueResults = await knowledge.query({
  issueNumber: 123,
});

// Combine multiple filters (AND logic)
const combinedResults = await knowledge.query({
  codeArea: "Security",
  filePath: "src/auth/login.ts",
  keywords: ["password"],
  limit: 5,
});
```

### Convenience Query Methods

```typescript
// Get mistakes for a file (useful for pre-commit checks)
const mistakes = await knowledge.getMistakesForFile("src/api/handler.ts");
if (mistakes.length > 0) {
  console.log("Past mistakes in this file:");
  mistakes.forEach((m) => console.log(`  - ${m.description}: ${m.howFixed}`));
}

// Get patterns for a code area (useful for scaffolding)
const patterns = await knowledge.getPatternsForArea("Security");
patterns.forEach((p) => console.log(`${p.name}: ${p.description}`));
```

### Query Traversal

The `query()` function performs graph traversal:

- **1-hop traversal**: Finds learnings via `ABOUT` (CodeArea) or `IN_FILE` (File) relationships
- **2-hop traversal**: Includes related patterns and mistakes via `LED_TO` relationships
- **Results**: Ordered by recency (newest first), respects limit parameter (default: 50)

### Relationships

The knowledge graph automatically creates and manages relationships:

- **ABOUT**: Learning → CodeArea (auto-created from `codeArea` field)
- **IN_FILE**: Learning/Mistake → File (auto-created from `filePath` field)
- **APPLIES_TO**: Pattern → CodeArea
- **LED_TO**: Pattern → Learning, Mistake → Learning

### Graph Schema

Entities and relationships are stored in SQLite tables:

- `entities`: All graph nodes (Learning, Pattern, Mistake, CodeArea, File)
- `relationships`: All graph edges with type constraints
- Indexes optimize traversal and queries

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

### knowledge.store(learnings)

Store learnings in the knowledge graph. Auto-creates CodeArea and File entities.

### knowledge.storePattern(pattern, learningIds?)

Store a pattern. Optionally link to learnings that led to the pattern.

### knowledge.storeMistake(mistake, learningId?)

Store a mistake. Optionally link to the learning that fixed it.

### knowledge.query(context)

Query the knowledge graph for learnings. Returns `QueryResult[]` with learnings and related patterns/mistakes.

**Parameters:**

- `context.codeArea?: string` - Filter by code area (1-hop via ABOUT)
- `context.filePath?: string` - Filter by file path (1-hop via IN_FILE)
- `context.keywords?: string[]` - Search content (AND logic)
- `context.issueNumber?: number` - Filter by source issue
- `context.limit?: number` - Max results (default: 50)

**Returns:** Array of `QueryResult` objects containing:

- `learning: Learning` - The matched learning
- `relatedPatterns?: Pattern[]` - Patterns linked via LED_TO (2-hop)
- `relatedMistakes?: Mistake[]` - Mistakes linked via LED_TO (2-hop)

### knowledge.getMistakesForFile(filePath)

Get all mistakes associated with a specific file. Useful for pre-commit checks.

### knowledge.getPatternsForArea(codeArea)

Get all patterns that apply to a specific code area. Useful for scaffolding.

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

// Knowledge Graph Types
interface Learning {
  id: string;
  content: string;
  sourceIssue?: number;
  codeArea?: string;
  filePath?: string;
  confidence?: number; // 0.0-1.0
  metadata?: Record<string, unknown>;
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  codeArea?: string;
}

interface Mistake {
  id: string;
  description: string;
  howFixed: string;
  filePath?: string;
}

type EntityType = "Learning" | "CodeArea" | "File" | "Pattern" | "Mistake";
type RelationshipType =
  | "ABOUT"
  | "IN_FILE"
  | "LED_TO"
  | "APPLIES_TO"
  | "SUPERSEDES";

// Query API Types
interface QueryContext {
  codeArea?: string;
  filePath?: string;
  keywords?: string[];
  issueNumber?: number;
  limit?: number; // default: 50
}

interface QueryResult {
  learning: Learning;
  relatedPatterns?: Pattern[];
  relatedMistakes?: Mistake[];
  relevanceScore?: number; // Future enhancement
}
```
