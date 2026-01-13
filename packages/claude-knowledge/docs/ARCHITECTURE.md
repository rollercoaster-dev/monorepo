# Architecture: claude-knowledge

> System design, data flows, and module responsibilities.

## High-Level Overview

```
                           claude-knowledge
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
       ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
       │  Checkpoint  │    │  Knowledge   │    │  Code Graph  │
       │   System     │    │    Graph     │    │   (Static)   │
       └──────────────┘    └──────────────┘    └──────────────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                           ┌──────────────┐
                           │    SQLite    │
                           │   Database   │
                           └──────────────┘
                                  │
                    .claude/execution-state.db
```

## Three Core Subsystems

### 1. Checkpoint System (Ephemeral State)

**Purpose**: Track workflow execution state for recovery after context compaction.

**Lifecycle**: Created at workflow start, deleted on completion/failure.

```
src/checkpoint/
├── index.ts       # Main API exports
├── workflow.ts    # Workflow CRUD operations
├── milestone.ts   # Milestone coordination for /auto-milestone
├── metrics.ts     # Context and graph query metrics
└── utils.ts       # Shared utilities
```

**Key Entities**:

| Entity    | Purpose                            | Lifespan    |
| --------- | ---------------------------------- | ----------- |
| Workflow  | Single issue execution state       | Until done  |
| Milestone | Multi-issue coordination           | Until done  |
| Action    | Audit log of agent actions         | With parent |
| Commit    | Git commits for rollback           | With parent |
| Baseline  | Pre-milestone lint/typecheck state | With parent |

### 2. Knowledge Graph (Persistent Learning)

**Purpose**: Store learnings that persist across all sessions.

**Lifecycle**: Grows over time, never deleted (only superseded).

```
src/knowledge/
├── index.ts       # Main API exports
├── store.ts       # Entity and relationship storage
├── query.ts       # Query API with 2-hop traversal
├── context.ts     # formatForContext() high-level API
├── semantic.ts    # Semantic search with embeddings
└── helpers.ts     # Shared utilities
```

**Key Entities**:

| Entity   | Purpose                            | Example                                |
| -------- | ---------------------------------- | -------------------------------------- |
| Learning | Knowledge unit from a session      | "Use rd-logger for structured logging" |
| Pattern  | Reusable pattern across code areas | "Input Validation Pattern"             |
| Mistake  | Error made and how it was fixed    | "SQL injection via string concat"      |
| Topic    | Conversation theme across sessions | "Authentication implementation"        |
| CodeArea | Semantic grouping (auto-created)   | "API Development", "Database"          |
| File     | File path reference (auto-created) | "src/api/handler.ts"                   |

### 3. Code Graph (Static Analysis)

**Purpose**: Parse TypeScript code and track relationships for queries.

**Lifecycle**: On-demand parsing, results cached in database.

```
src/graph/
├── index.ts       # Main API exports
├── parser.ts      # ts-morph based parsing
├── query.ts       # Graph queries (what-calls, blast-radius)
├── store.ts       # Entity and relationship persistence
└── types.ts       # Type definitions
```

**Key Entities**:

| Entity   | Purpose                   | Example            |
| -------- | ------------------------- | ------------------ |
| Function | Function definition       | `getDatabase()`    |
| Class    | Class definition          | `WorkflowManager`  |
| Type     | Type/interface definition | `Learning`         |
| File     | Source file               | `src/db/sqlite.ts` |

**Relationships**:

| Type       | Meaning                    |
| ---------- | -------------------------- |
| calls      | Function calls function    |
| imports    | File imports from file     |
| exports    | File exports entity        |
| extends    | Class extends class        |
| implements | Class implements interface |
| defines    | File defines entity        |

## Database Schema

All data stored in `.claude/execution-state.db` (SQLite).

### Checkpoint Tables

```sql
-- Workflow execution state
workflows (
  id TEXT PRIMARY KEY,
  issue_number INTEGER NOT NULL,
  branch TEXT NOT NULL,
  worktree TEXT,
  phase TEXT NOT NULL,      -- research|implement|review|finalize|planning|execute|merge|cleanup
  status TEXT NOT NULL,     -- running|paused|completed|failed
  retry_count INTEGER,
  created_at TEXT,
  updated_at TEXT
)

-- Action audit log
actions (
  id INTEGER PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL,     -- success|failed|pending
  metadata TEXT,            -- JSON
  created_at TEXT
)

-- Git commits for rollback
commits (
  id INTEGER PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT
)

-- Milestone coordination
milestones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  github_milestone_number INTEGER,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
)

-- Pre-milestone validation baseline
baselines (
  id INTEGER PRIMARY KEY,
  milestone_id TEXT NOT NULL,
  lint_exit_code INTEGER,
  lint_warnings INTEGER,
  lint_errors INTEGER,
  typecheck_exit_code INTEGER,
  typecheck_errors INTEGER,
  captured_at TEXT
)

-- Workflow-milestone junction
milestone_workflows (
  milestone_id TEXT,
  workflow_id TEXT,
  wave_number INTEGER,
  PRIMARY KEY (milestone_id, workflow_id)
)
```

### Knowledge Graph Tables

```sql
-- All entities (Learning, Pattern, Mistake, Topic, CodeArea, File)
entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,       -- Learning|CodeArea|File|Pattern|Mistake|Topic
  data JSON NOT NULL,       -- Entity-specific data
  embedding BLOB,           -- TF-IDF or neural embedding vector
  created_at TEXT,
  updated_at TEXT
)

-- Relationships between entities
relationships (
  id INTEGER PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL,       -- ABOUT|IN_FILE|LED_TO|APPLIES_TO|SUPERSEDES
  data JSON,
  created_at TEXT,
  UNIQUE(from_id, to_id, type)
)
```

### Code Graph Tables

```sql
-- Code entities (functions, classes, types, files)
graph_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,       -- function|class|type|interface|variable|file
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  exported INTEGER,
  package TEXT,
  metadata TEXT
)

-- Code relationships
graph_relationships (
  id INTEGER PRIMARY KEY,
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,
  type TEXT NOT NULL,       -- calls|imports|exports|extends|implements|defines
  metadata TEXT,
  UNIQUE(from_entity, to_entity, type)
)
```

### Metrics Tables

```sql
-- Session metrics for dogfooding validation
context_metrics (
  id INTEGER PRIMARY KEY,
  session_id TEXT UNIQUE,
  issue_number INTEGER,
  files_read INTEGER,
  compacted INTEGER,
  duration_minutes INTEGER,
  review_findings TEXT,     -- JSON or legacy integer
  learnings_injected INTEGER,
  learnings_captured INTEGER,
  created_at TEXT
)

-- Graph query metrics
graph_queries (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  workflow_id TEXT,
  query_type TEXT,          -- what-calls|blast-radius|find|exports
  query_params TEXT,
  result_count INTEGER,
  duration_ms INTEGER,
  created_at TEXT
)
```

## Data Flows

### Flow 1: Workflow State Recovery

```
/auto-issue 123 starts
        │
        ▼
┌─────────────────────────────────┐
│  checkpoint.findByIssue(123)   │
└─────────────────────────────────┘
        │
        ▼
   Found existing?
   ┌─────┴─────┐
   │           │
  Yes          No
   │           │
   ▼           ▼
Resume     checkpoint.create(123, branch)
   │           │
   └─────┬─────┘
         │
         ▼
   Work on issue...
         │
         ▼
   checkpoint.setPhase(id, 'implement')
   checkpoint.logCommit(id, sha, msg)
         │
         ▼
   Context compaction!
         │
         ▼
┌─────────────────────────────────┐
│  checkpoint.findByIssue(123)   │
└─────────────────────────────────┘
         │
         ▼
   Resume from saved phase
```

### Flow 2: Knowledge Injection at Session Start

```
Claude Code session starts
        │
        ▼
SessionStart hook fires
        │
        ▼
┌─────────────────────────────────┐
│  hooks.onSessionStart({        │
│    workingDir,                 │
│    branch,                     │
│    modifiedFiles               │
│  })                            │
└─────────────────────────────────┘
        │
        ▼
Parse issue number from branch
Infer code areas from files
        │
        ▼
┌─────────────────────────────────┐
│  knowledge.query({             │
│    codeArea,                   │
│    filePath,                   │
│    issueNumber                 │
│  })                            │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  formatKnowledgeContext(...)   │
│  - Prioritize by relevance     │
│  - Enforce token budget        │
│  - Group by code area          │
└─────────────────────────────────┘
        │
        ▼
Return formatted markdown
for context injection
```

### Flow 3: Learning Capture at Session End

```
PreCompact hook fires
        │
        ▼
┌─────────────────────────────────┐
│  hooks.onSessionEnd({          │
│    commits,                    │
│    modifiedFiles               │
│  })                            │
└─────────────────────────────────┘
        │
        ▼
Parse conventional commits
        │
        ▼
┌─────────────────────────────────┐
│  knowledge.store([             │
│    { content, codeArea,        │
│      filePath, confidence }    │
│  ])                            │
└─────────────────────────────────┘
        │
        ▼
Auto-create CodeArea/File entities
Create ABOUT/IN_FILE relationships
        │
        ▼
Generate embeddings for semantic search
```

### Flow 4: Code Graph Query

```
User/agent requests: "What calls getDatabase()?"
        │
        ▼
┌─────────────────────────────────┐
│  graph.whatCalls('getDatabase')│
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  SELECT * FROM graph_entities  │
│  WHERE name = 'getDatabase'    │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  SELECT * FROM graph_relations │
│  WHERE to_entity = entity.id   │
│  AND type = 'calls'            │
└─────────────────────────────────┘
        │
        ▼
Return list of callers with file:line
```

## Integration Points

### CLI Entry Points

```bash
# Main CLI
bun run checkpoint <command>

# Workflow commands
workflow create <issue> <branch>
workflow find <issue>
workflow set-phase <id> <phase>
workflow log-action <id> <action> <result>
workflow log-commit <id> <sha> <message>

# Session hooks
session-start    # Called by SessionStart hook
session-end      # Called by PreCompact hook

# Graph commands
graph parse <path>
graph what-calls <name>
graph blast-radius <name>
graph find <name>
```

### Claude Code Settings Hook Integration

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

### Skill Integration

Skills invoke checkpoint via CLI using shell commands. The workflow commands are designed to be called from skill scripts:

```bash
# Create workflow
bun run checkpoint workflow create 123 "feat/issue-123"

# Update phase
bun run checkpoint workflow set-phase $WORKFLOW_ID implement

# Log commit
bun run checkpoint workflow log-commit $WORKFLOW_ID "abc123" "feat: add feature"
```

## Module Dependencies

```
src/
├── index.ts              # Public API exports
├── types.ts              # All TypeScript types
├── db/
│   └── sqlite.ts         # Database connection and schema
├── checkpoint/           # Depends on: db
│   ├── workflow.ts
│   ├── milestone.ts
│   └── metrics.ts
├── knowledge/            # Depends on: db, embeddings
│   ├── store.ts
│   ├── query.ts
│   ├── context.ts
│   └── semantic.ts
├── graph/                # Depends on: db
│   ├── parser.ts         # Also depends on: ts-morph
│   ├── query.ts
│   └── store.ts
├── embeddings/           # Standalone
│   ├── index.ts
│   ├── similarity.ts
│   └── api-providers.ts
├── hooks.ts              # Depends on: knowledge, checkpoint
├── formatter.ts          # Depends on: types only
└── cli/                  # Depends on: all modules
    └── index.ts
```

## Key Design Decisions

### 1. Single SQLite Database

**Decision**: All data in one `.claude/execution-state.db` file.

**Rationale**:

- Simple backup (copy one file)
- No coordination between databases
- Atomic transactions across all data
- Easy to reset (delete file)

**Trade-off**: Can't scale to very large codebases, but that's out of scope anyway.

### 2. Embedded Schema

**Decision**: Schema defined as SQL string in `sqlite.ts`, not external file.

**Rationale**:

- No runtime file resolution issues
- Works in all execution contexts (CLI, tests, agents)
- Single source of truth

**Trade-off**: Harder to read, but schema changes are rare.

### 3. Entity-Relationship Model for Knowledge

**Decision**: Generic `entities` + `relationships` tables instead of separate tables per entity type.

**Rationale**:

- Flexible graph traversal
- Easy to add new entity types
- Standard graph query patterns

**Trade-off**: JSON data column requires parsing, slightly slower queries.

### 4. Embedding Storage in Entity Table

**Decision**: Embeddings stored as BLOB in `entities.embedding` column.

**Rationale**:

- Co-located with entity data
- Single query to get entity + embedding
- No separate vector database needed

**Trade-off**: SQLite doesn't have native vector search, so we do linear scan (fine for <10K entities).

### 5. Hooks as CLI Commands

**Decision**: Session hooks call CLI commands, not direct function calls.

**Rationale**:

- Works with any execution environment
- No module bundling issues
- Easy to debug (run commands manually)

**Trade-off**: Subprocess overhead, but hooks run infrequently.

---

_Last updated: 2026-01-13_
_Related: [VISION.md](./VISION.md) | [FEATURE-ASSESSMENT.md](./FEATURE-ASSESSMENT.md) | [ROADMAP.md](./ROADMAP.md)_
