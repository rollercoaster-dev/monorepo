# claude-knowledge

Cross-session learning and workflow persistence for Claude Code autonomous workflows.

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Checkpoint API](#checkpoint-api)
- [Knowledge Graph API](#knowledge-graph-api)
- [Data Model](#data-model)
- [CLI Reference](#cli-reference)
- [Integration Points](#integration-points)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Why This Exists

Claude Code agents face a fundamental challenge: **context compaction erases workflow state**.

When working on complex issues, context windows fill up. Compaction resets the conversation, and without persistence, agents restart from scratch—re-analyzing issues, re-reading files, losing track of commits already made.

`claude-knowledge` solves this with two complementary systems:

| System              | Purpose                 | Lifecycle                         |
| ------------------- | ----------------------- | --------------------------------- |
| **Checkpoint**      | Workflow state recovery | Ephemeral (deleted on completion) |
| **Knowledge Graph** | Cross-session learning  | Persistent (grows over time)      |

### Design Philosophy

- **Local-first**: SQLite database, no external services
- **Zero-config**: Works out of the box, no setup required
- **Atomic operations**: Transactions ensure data consistency
- **Idempotent**: Safe to retry operations

---

## Quick Start

### Checkpoint (Workflow Recovery)

```typescript
import { checkpoint } from "claude-knowledge";

// Start a workflow for issue #123
const workflow = checkpoint.create(123, "feat/issue-123-feature");

// Update as work progresses
checkpoint.setPhase(workflow.id, "implement");
checkpoint.logCommit(workflow.id, "abc123", "feat: add initial implementation");

// After compaction - resume where you left off
const state = checkpoint.findByIssue(123);
if (state) {
  console.log(`Resume from phase: ${state.workflow.phase}`);
  console.log(`Commits made: ${state.commits.length}`);
}
```

### Knowledge Graph (Cross-Session Learning)

```typescript
import { knowledge } from "claude-knowledge";

// Store what you learned
await knowledge.store([
  {
    id: "learning-zod-validation",
    content: "Always validate API input with Zod schemas before processing",
    codeArea: "API Development",
    filePath: "src/api/handlers.ts",
    confidence: 0.95,
  },
]);

// Query relevant knowledge
const results = await knowledge.query({ codeArea: "API Development" });
```

### Database Location

All data is stored in `.claude/execution-state.db` (gitignored by default).

---

## Architecture

```text
                           claude-knowledge
                                  │
              ┌───────────────────┴───────────────────┐
              │                                       │
       ┌──────────────┐                      ┌─────────────────┐
       │  Checkpoint  │                      │ Knowledge Graph │
       │   (State)    │                      │   (Learning)    │
       └──────────────┘                      └─────────────────┘
              │                                       │
       ┌──────┴──────┐                    ┌──────────┼──────────┐
       │             │                    │          │          │
   Workflows    Milestones           Learnings  Patterns   Mistakes
       │             │                    │          │          │
   Actions       Baselines                └────┬─────┴──────────┘
   Commits                                     │
                                         Relationships
                                    (ABOUT, IN_FILE, LED_TO,
                                     APPLIES_TO, SUPERSEDES)
```

### Checkpoint System (Ephemeral)

Tracks active workflow state for recovery after context compaction:

- **Workflows**: Issue-level execution state (phase, status, retry count)
- **Milestones**: Multi-issue coordination for `/auto-milestone`
- **Actions**: Audit log of agent actions
- **Commits**: Git commits for potential rollback
- **Baselines**: Pre-milestone lint/typecheck snapshots

Workflow data is deleted when status becomes `completed` or `failed`.

### Knowledge Graph (Persistent)

Stores learnings that persist across all sessions:

- **Learnings**: Knowledge units captured during work
- **Patterns**: Recognized reusable patterns
- **Mistakes**: Errors made and how they were fixed
- **Relationships**: Graph edges connecting entities

Knowledge is never deleted—only superseded by newer learnings.

---

## Checkpoint API

### Workflow Lifecycle

```text
create() → setPhase() → logAction/logCommit → setStatus("completed")
```

### Workflow Methods

| Method                                     | Description                         |
| ------------------------------------------ | ----------------------------------- |
| `create(issue, branch, worktree?)`         | Create new workflow                 |
| `load(id)`                                 | Load workflow + actions + commits   |
| `save(workflow)`                           | Update workflow state               |
| `findByIssue(issue)`                       | Find most recent workflow for issue |
| `setPhase(id, phase)`                      | Update workflow phase               |
| `setStatus(id, status)`                    | Update workflow status              |
| `logAction(id, action, result, metadata?)` | Log an action                       |
| `logCommit(id, sha, message)`              | Log a git commit                    |
| `incrementRetry(id)`                       | Increment retry counter             |
| `listActive()`                             | List running/paused workflows       |
| `delete(id)`                               | Delete workflow and related data    |

### Workflow Phases

| Phase       | Description                          |
| ----------- | ------------------------------------ |
| `research`  | Fetching issue, analyzing, planning  |
| `implement` | Writing code, making commits         |
| `review`    | Running review agents, auto-fix loop |
| `finalize`  | Creating PR, cleanup                 |

### Workflow Statuses

| Status      | Description                      |
| ----------- | -------------------------------- |
| `running`   | Actively being worked on         |
| `paused`    | Temporarily stopped (can resume) |
| `completed` | Successfully finished            |
| `failed`    | Stopped due to errors            |

### Milestone Methods

For `/auto-milestone` parallel workflow coordination:

| Method                                       | Description                           |
| -------------------------------------------- | ------------------------------------- |
| `createMilestone(name, ghNumber?)`           | Create milestone                      |
| `getMilestone(id)`                           | Load milestone + baseline + workflows |
| `findMilestoneByName(name)`                  | Find milestone by name                |
| `setMilestonePhase(id, phase)`               | Update milestone phase                |
| `setMilestoneStatus(id, status)`             | Update milestone status               |
| `saveBaseline(id, data)`                     | Save lint/typecheck baseline          |
| `linkWorkflowToMilestone(wfId, msId, wave?)` | Link workflow                         |
| `listMilestoneWorkflows(msId)`               | List child workflows                  |
| `listActiveMilestones()`                     | List running/paused milestones        |
| `deleteMilestone(id)`                        | Delete milestone                      |

### Milestone Phases

| Phase      | Description                            |
| ---------- | -------------------------------------- |
| `planning` | Analyzing dependencies, building waves |
| `execute`  | Running parallel workflows             |
| `review`   | Reviewing all PRs                      |
| `merge`    | Merging in dependency order            |
| `cleanup`  | Removing worktrees, final report       |

---

## Knowledge Graph API

### Storing Knowledge

#### `store(learnings: Learning[])`

Store learnings with automatic entity and relationship creation.

```typescript
await knowledge.store([
  {
    id: "learning-1", // Optional, auto-generated if omitted
    content: "Use rd-logger for logging", // Required
    codeArea: "Logging", // Auto-creates CodeArea + ABOUT relationship
    filePath: "src/api/handler.ts", // Auto-creates File + IN_FILE relationship
    sourceIssue: 365, // Optional reference
    confidence: 0.92, // Optional 0.0-1.0
  },
]);
```

#### `storePattern(pattern: Pattern, learningIds?: string[])`

Store a recognized pattern, optionally linking to source learnings.

```typescript
await knowledge.storePattern(
  {
    id: "pattern-validation",
    name: "Input Validation Pattern",
    description: "Validate all user input at API boundaries with Zod",
    codeArea: "Security", // Auto-creates APPLIES_TO relationship
  },
  ["learning-1", "learning-2"],
); // Creates LED_TO relationships
```

#### `storeMistake(mistake: Mistake, learningId?: string)`

Capture a mistake and how it was fixed.

```typescript
await knowledge.storeMistake(
  {
    id: "mistake-sql-injection",
    description: "Used string concatenation for SQL query",
    howFixed: "Switched to parameterized queries with bun:sqlite",
    filePath: "src/db/queries.ts", // Auto-creates IN_FILE relationship
  },
  "learning-fix-sql",
); // Creates LED_TO relationship
```

### Querying Knowledge

#### `query(context: QueryContext): Promise<QueryResult[]>`

Flexible query with 2-hop traversal for related patterns and mistakes.

```typescript
// By code area
const results = await knowledge.query({ codeArea: "Security" });

// By file path
const results = await knowledge.query({ filePath: "src/db/queries.ts" });

// By keywords (searches content)
const results = await knowledge.query({ keywords: ["validation", "input"] });

// By source issue
const results = await knowledge.query({ issueNumber: 123 });

// Combined filters (AND logic)
const results = await knowledge.query({
  codeArea: "API Development",
  issueNumber: 365,
  limit: 10,
});
```

**QueryResult structure:**

```typescript
interface QueryResult {
  learning: Learning; // Primary result
  relatedPatterns?: Pattern[]; // Via 2-hop LED_TO traversal
  relatedMistakes?: Mistake[]; // Via 2-hop LED_TO traversal
}
```

#### `getMistakesForFile(filePath: string): Promise<Mistake[]>`

Get past mistakes in a file (useful for pre-commit warnings).

```typescript
const mistakes = await knowledge.getMistakesForFile("src/db/queries.ts");
// Returns: [{ description: "SQL injection", howFixed: "..." }, ...]
```

#### `getPatternsForArea(codeArea: string): Promise<Pattern[]>`

Get patterns for a code area (useful for scaffolding).

```typescript
const patterns = await knowledge.getPatternsForArea("Security");
// Returns: [{ name: "Input Validation Pattern", ... }, ...]
```

---

## Data Model

### Entity Types

| Type       | Purpose                                 | Key Fields                             |
| ---------- | --------------------------------------- | -------------------------------------- |
| `Learning` | Knowledge unit from a session           | `content`, `confidence`, `sourceIssue` |
| `Pattern`  | Reusable pattern derived from learnings | `name`, `description`, `codeArea`      |
| `Mistake`  | Error made and how it was fixed         | `description`, `howFixed`, `filePath`  |
| `CodeArea` | Semantic grouping (auto-created)        | `name`                                 |
| `File`     | File path reference (auto-created)      | `path`                                 |

### Relationship Types

| Type         | From              | To       | Meaning                       |
| ------------ | ----------------- | -------- | ----------------------------- |
| `ABOUT`      | Learning          | CodeArea | Learning relates to this area |
| `IN_FILE`    | Learning, Mistake | File     | Located in this file          |
| `LED_TO`     | Pattern, Mistake  | Learning | Derived from / fixed by       |
| `APPLIES_TO` | Pattern           | CodeArea | Pattern applies to this area  |
| `SUPERSEDES` | Learning          | Learning | Newer learning replaces older |

### Graph Visualization

```text
(Learning)──ABOUT──>(CodeArea)<──APPLIES_TO──(Pattern)
    │                                            │
    └──IN_FILE──>(File)<──IN_FILE──(Mistake)     │
                                      │          │
                                      └──LED_TO──┘
```

---

## CLI Reference

### Running the CLI

```bash
# From monorepo root
bun packages/claude-knowledge/src/cli.ts <command>
```

### Workflow Commands

```bash
checkpoint workflow create <issue-number> <branch> [worktree]
checkpoint workflow get <id>
checkpoint workflow find <issue-number>
checkpoint workflow set-phase <id> <phase>
checkpoint workflow set-status <id> <status>
checkpoint workflow log-action <id> <action> <result> [metadata-json]
checkpoint workflow log-commit <id> <sha> <message>
checkpoint workflow list-active
checkpoint workflow delete <id>
checkpoint workflow link <workflow-id> <milestone-id> [wave]
checkpoint workflow list <milestone-id>
```

### Milestone Commands

```bash
checkpoint milestone create <name> [github-number]
checkpoint milestone get <id>
checkpoint milestone find <name>
checkpoint milestone set-phase <id> <phase>
checkpoint milestone set-status <id> <status>
checkpoint milestone list-active
checkpoint milestone delete <id>
```

### Baseline Commands

```bash
checkpoint baseline save <milestone-id> <lint-exit> <lint-warnings> <lint-errors> <typecheck-exit> <typecheck-errors>
```

### Knowledge Commands

Coming soon ([#380](https://github.com/rollercoaster-dev/monorepo/issues/380)).

---

## Integration Points

### /auto-issue Workflow

```typescript
// At workflow start
const existing = checkpoint.findByIssue(issueNumber);
if (existing?.workflow.status === "running") {
  // Resume from saved phase
  const { workflow, actions, commits } = existing;
}

// At each phase transition
checkpoint.setPhase(workflowId, "implement");
checkpoint.logAction(workflowId, "phase_transition", "success", { from, to });

// Log commits for rollback capability
checkpoint.logCommit(workflowId, sha, message);

// On completion
checkpoint.setStatus(workflowId, "completed");
```

### /auto-milestone Workflow

```typescript
// Create milestone with optional GitHub milestone number
const milestone = checkpoint.createMilestone("OB3 Phase 1", 22);

// Capture baseline before changes
checkpoint.saveBaseline(milestone.id, {
  capturedAt: new Date().toISOString(),
  lintExitCode: 0,
  lintWarnings: 5,
  lintErrors: 0,
  typecheckExitCode: 0,
  typecheckErrors: 0,
});

// Create and link workflows for each issue
for (const { issue, wave } of sortedIssues) {
  const workflow = checkpoint.create(issue, branch, worktreePath);
  checkpoint.linkWorkflowToMilestone(workflow.id, milestone.id, wave);
}

// Track progress
checkpoint.setMilestonePhase(milestone.id, "execute");
```

### Session Hooks

Session hooks enable automatic knowledge capture and loading based on git context.

#### onSessionStart

Load relevant knowledge at the start of a Claude Code session:

```typescript
import { hooks } from "claude-knowledge";

const context = await hooks.onSessionStart({
  workingDir: process.cwd(),
  branch: "feat/issue-123-feature", // optional, auto-detected
  modifiedFiles: ["src/api/users.ts"], // optional, from git status
  issueNumber: 123, // optional, parsed from branch
});

console.log(context.summary); // Formatted markdown for injection
```

The hook parses issue number from branch name, infers code areas from files, queries the knowledge graph, and returns a formatted summary.

#### onSessionEnd

Extract and store learnings at the end of a session:

```typescript
const result = await hooks.onSessionEnd({
  workflowId: "workflow-123", // optional
  commits: [{ sha: "abc123", message: "feat(api): add user endpoint" }],
  modifiedFiles: ["src/api/users.ts"],
});

console.log(`Stored ${result.learningsStored} learnings`);
```

The hook parses conventional commits, creates learnings with lower confidence (0.6), and groups by code area.

#### Claude Code Integration

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "bun run packages/claude-knowledge/src/cli.ts session-start"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run packages/claude-knowledge/src/cli.ts session-end"
          }
        ]
      }
    ]
  }
}
```

### Context Injection (Planned)

Future: Auto-inject relevant knowledge into agent prompts ([#385](https://github.com/rollercoaster-dev/monorepo/issues/385)).

---

## Roadmap

Track progress: [Milestone 22: Claude Knowledge Graph](https://github.com/rollercoaster-dev/monorepo/milestone/22)

### Completed

- [x] Checkpoint API (workflows, milestones, baselines)
- [x] Knowledge storage (`knowledge.store()`) - [#365](https://github.com/rollercoaster-dev/monorepo/issues/365)
- [x] Query API (`knowledge.query()`) - [#366](https://github.com/rollercoaster-dev/monorepo/issues/366)
- [x] CLI for checkpoint operations
- [x] Session lifecycle hooks - [#367](https://github.com/rollercoaster-dev/monorepo/issues/367)

### Planned

| Feature                      | Issue                                                            | Priority |
| ---------------------------- | ---------------------------------------------------------------- | -------- |
| Semantic search (embeddings) | [#379](https://github.com/rollercoaster-dev/monorepo/issues/379) | High     |
| Context injection            | [#385](https://github.com/rollercoaster-dev/monorepo/issues/385) | High     |
| CLI for knowledge commands   | [#380](https://github.com/rollercoaster-dev/monorepo/issues/380) | Medium   |
| SUPERSEDES relationship      | [#383](https://github.com/rollercoaster-dev/monorepo/issues/383) | Low      |
| LED_TO semantics cleanup     | [#381](https://github.com/rollercoaster-dev/monorepo/issues/381) | Low      |

---

## Contributing

### Development

```bash
# Run tests
bun test packages/claude-knowledge

# Type check
bun run type-check --filter claude-knowledge
```

### Database Reset

```bash
# Delete the database to start fresh
rm .claude/execution-state.db
```

### Finding Work

Issues labeled `pkg:claude-knowledge`:
[View on GitHub](https://github.com/rollercoaster-dev/monorepo/labels/pkg%3Aclaude-knowledge)
