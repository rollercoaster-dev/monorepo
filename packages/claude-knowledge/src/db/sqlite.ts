import { Database } from "bun:sqlite";
import { existsSync, statSync } from "fs";

let db: Database | null = null;
let currentDbPath: string | null = null;
let exitHandlersRegistered = false;
let idleCloseTimeout: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_DB_PATH = ".claude/execution-state.db";

/**
 * Idle timeout in milliseconds before auto-closing the database connection.
 * 5 seconds allows normal operation bursts while preventing lock contention
 * from connections held open across process boundaries (orphaned terminals).
 */
const IDLE_CLOSE_TIMEOUT_MS = 5000;

/**
 * Schedule the database connection to close after idle timeout.
 * Resets the timer on each access, so rapid operations keep the connection open.
 */
function scheduleIdleClose(): void {
  // Clear any existing timeout
  if (idleCloseTimeout) {
    clearTimeout(idleCloseTimeout);
    idleCloseTimeout = null;
  }

  // Schedule close after idle period
  idleCloseTimeout = setTimeout(() => {
    if (db) {
      try {
        db.close();
      } catch {
        // Ignore close errors
      }
      db = null;
      currentDbPath = null;
      idleCloseTimeout = null;
    }
  }, IDLE_CLOSE_TIMEOUT_MS);
}

/**
 * Register process exit handlers to close any open database connections.
 * This helps prevent lock contention from orphaned connections when processes
 * are terminated (e.g., terminal closed without /exit).
 */
function registerExitHandlers(): void {
  if (exitHandlersRegistered) return;
  exitHandlersRegistered = true;

  const cleanup = () => {
    if (db) {
      try {
        db.close();
        db = null;
        currentDbPath = null;
      } catch {
        // Ignore errors during cleanup - process is exiting anyway
      }
    }
  };

  // Handle normal exit
  process.on("exit", cleanup);

  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130); // Standard exit code for SIGINT
  });

  // Handle SIGTERM
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143); // Standard exit code for SIGTERM
  });
}

// Embedded schema to avoid runtime file resolution issues
const SCHEMA = `
-- Workflow execution state
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  issue_number INTEGER NOT NULL,
  branch TEXT NOT NULL,
  worktree TEXT,
  phase TEXT NOT NULL CHECK (phase IN ('research', 'implement', 'review', 'finalize', 'planning', 'execute', 'merge', 'cleanup')),
  status TEXT NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Actions log for debugging/trace
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'pending')),
  metadata TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Commits made during workflow
CREATE TABLE IF NOT EXISTS commits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Milestones for /auto-milestone workflow
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  github_milestone_number INTEGER,
  phase TEXT NOT NULL CHECK (phase IN ('planning', 'execute', 'review', 'merge', 'cleanup')),
  status TEXT NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Baseline snapshots for preflight validation
CREATE TABLE IF NOT EXISTS baselines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  lint_exit_code INTEGER NOT NULL,
  lint_warnings INTEGER NOT NULL,
  lint_errors INTEGER NOT NULL,
  typecheck_exit_code INTEGER NOT NULL,
  typecheck_errors INTEGER NOT NULL,
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
);

-- Junction table linking workflows to milestones
CREATE TABLE IF NOT EXISTS milestone_workflows (
  milestone_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  wave_number INTEGER,
  PRIMARY KEY (milestone_id, workflow_id),
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflows_issue ON workflows(issue_number);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_actions_workflow ON actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_commits_workflow ON commits(workflow_id);
CREATE INDEX IF NOT EXISTS idx_milestones_name ON milestones(name);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_baselines_milestone ON baselines(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_workflows_milestone ON milestone_workflows(milestone_id);

-- Knowledge graph entities
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Learning', 'CodeArea', 'File', 'Pattern', 'Mistake', 'Topic', 'DocSection', 'CodeDoc')),
  data JSON NOT NULL,
  embedding BLOB,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Relationships between entities
CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ABOUT', 'IN_FILE', 'LED_TO', 'APPLIES_TO', 'SUPERSEDES', 'CHILD_OF', 'DOCUMENTS', 'IN_DOC', 'REFERENCES')),
  data JSON,
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- Indexes for knowledge graph queries
CREATE INDEX IF NOT EXISTS idx_entity_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_rel_from ON relationships(from_id, type);
CREATE INDEX IF NOT EXISTS idx_rel_to ON relationships(to_id, type);
CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships(type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rel_unique ON relationships(from_id, to_id, type);

-- Context metrics for dogfooding validation
CREATE TABLE IF NOT EXISTS context_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  issue_number INTEGER,
  files_read INTEGER DEFAULT 0,
  compacted INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  -- review_findings can be INTEGER (legacy) or JSON string (ReviewFindingsSummary)
  -- JSON format: {"critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0}
  review_findings TEXT DEFAULT '0',
  learnings_injected INTEGER DEFAULT 0,
  learnings_captured INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Indexes for context metrics queries
CREATE INDEX IF NOT EXISTS idx_context_metrics_session ON context_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_context_metrics_issue ON context_metrics(issue_number);

-- Graph query metrics for tracking code graph usage patterns
-- source: "cli" | "agent:{name}" | "skill:{name}" | "hook:{name}" | "unknown"
-- session_id: Optional, populated when CLAUDE_SESSION_ID env var is set
CREATE TABLE IF NOT EXISTS graph_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL DEFAULT 'unknown',
  session_id TEXT,
  workflow_id TEXT,
  query_type TEXT NOT NULL,
  query_params TEXT,
  result_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Indexes for graph query metrics
-- Note: idx_graph_queries_source is created in Migration 2 (line ~280, after adding source column)
CREATE INDEX IF NOT EXISTS idx_graph_queries_session ON graph_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_graph_queries_workflow ON graph_queries(workflow_id);
CREATE INDEX IF NOT EXISTS idx_graph_queries_type ON graph_queries(query_type);

-- Code graph entities (functions, classes, files, types, enums)
-- Part of Issue #431 Experiment 3: Code Graph Prototype
CREATE TABLE IF NOT EXISTS graph_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('function', 'class', 'type', 'interface', 'variable', 'file', 'enum')),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  exported INTEGER DEFAULT 0,
  package TEXT,
  metadata TEXT
);

-- Code graph relationships (calls, imports, exports, extends)
-- Note: Only from_entity has FK constraint because to_entity can reference external
-- modules (e.g., "external:fs") that don't exist in graph_entities
CREATE TABLE IF NOT EXISTS graph_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('calls', 'imports', 'exports', 'extends', 'implements', 'defines')),
  metadata TEXT,
  FOREIGN KEY (from_entity) REFERENCES graph_entities(id) ON DELETE CASCADE
);

-- Indexes for code graph queries
CREATE INDEX IF NOT EXISTS idx_graph_entities_name ON graph_entities(name);
CREATE INDEX IF NOT EXISTS idx_graph_entities_file ON graph_entities(file_path);
CREATE INDEX IF NOT EXISTS idx_graph_entities_type ON graph_entities(type);
CREATE INDEX IF NOT EXISTS idx_graph_entities_package ON graph_entities(package);
CREATE INDEX IF NOT EXISTS idx_graph_rel_from ON graph_relationships(from_entity);
CREATE INDEX IF NOT EXISTS idx_graph_rel_to ON graph_relationships(to_entity);
CREATE INDEX IF NOT EXISTS idx_graph_rel_type ON graph_relationships(type);
-- Prevent duplicate relationships
CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_rel_unique ON graph_relationships(from_entity, to_entity, type);

-- Document indexing state for incremental updates
CREATE TABLE IF NOT EXISTS doc_index (
  file_path TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  indexed_at TEXT NOT NULL
);

-- Indexes for document indexing lookups
CREATE INDEX IF NOT EXISTS idx_doc_index_hash ON doc_index(content_hash);

-- Graph file metadata for incremental parsing
CREATE TABLE IF NOT EXISTS graph_file_metadata (
  file_path TEXT PRIMARY KEY,
  package TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  last_parsed TEXT NOT NULL,
  entity_count INTEGER DEFAULT 0
);

-- Indexes for graph file metadata lookups
CREATE INDEX IF NOT EXISTS idx_graph_file_metadata_package ON graph_file_metadata(package, mtime_ms);

-- External documentation cache (for fetched specs like OB2, OB3, VC)
CREATE TABLE IF NOT EXISTS external_docs (
  url TEXT PRIMARY KEY,
  cached_path TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  spec_version TEXT,
  source_type TEXT NOT NULL
);

-- Indexes for external docs lookups
CREATE INDEX IF NOT EXISTS idx_external_docs_source_type ON external_docs(source_type);

-- Tool usage metrics for tracking Claude's tool selection patterns
-- Used by PreToolUse hook to log calls, reported at session end
CREATE TABLE IF NOT EXISTS tool_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_category TEXT NOT NULL CHECK (tool_category IN ('graph', 'search', 'read', 'write', 'other')),
  created_at TEXT NOT NULL
);

-- Indexes for tool usage queries
CREATE INDEX IF NOT EXISTS idx_tool_usage_session ON tool_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_category ON tool_usage(tool_category);

-- Task snapshots table
-- Captures task state at workflow phase boundaries for metrics tracking
-- parent_task_id enables hierarchical task structures (Issue #580)
CREATE TABLE IF NOT EXISTS task_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_subject TEXT NOT NULL,
  task_status TEXT NOT NULL,
  task_metadata TEXT,
  parent_task_id TEXT,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_snapshots_workflow ON task_snapshots(workflow_id);
CREATE INDEX IF NOT EXISTS idx_task_snapshots_phase ON task_snapshots(phase);
-- Note: idx_task_snapshots_parent is created in Migration 6 after adding parent_task_id column
-- This avoids failures on existing DBs that lack the column during schema init

-- Task hierarchy table
-- Stores explicit parent-child relationships for hierarchical task structures
CREATE TABLE IF NOT EXISTS task_hierarchy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_task_id TEXT NOT NULL,
  child_task_id TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(parent_task_id, child_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_hierarchy_parent ON task_hierarchy(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_hierarchy_child ON task_hierarchy(child_task_id);

-- Planning graph entities (Goal/Interrupt stack for project management)
-- Part of Issue #625: Planning Graph Phase 1
CREATE TABLE IF NOT EXISTS planning_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Goal', 'Interrupt')),
  title TEXT NOT NULL,
  data JSON NOT NULL,
  stack_order INTEGER,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Planning graph relationships (links between planning entities)
CREATE TABLE IF NOT EXISTS planning_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INTERRUPTED_BY', 'PAUSED_FOR', 'COMPLETED_AS')),
  data JSON,
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_id) REFERENCES planning_entities(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id) REFERENCES planning_entities(id) ON DELETE CASCADE
);

-- Indexes for planning graph queries
CREATE INDEX IF NOT EXISTS idx_planning_entities_type ON planning_entities(type);
CREATE INDEX IF NOT EXISTS idx_planning_entities_status ON planning_entities(status);
CREATE INDEX IF NOT EXISTS idx_planning_entities_stack_order ON planning_entities(stack_order);
CREATE INDEX IF NOT EXISTS idx_planning_rel_from ON planning_relationships(from_id, type);
CREATE INDEX IF NOT EXISTS idx_planning_rel_to ON planning_relationships(to_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_planning_rel_unique ON planning_relationships(from_id, to_id, type);

-- Planning graph plans (milestone/epic execution order)
CREATE TABLE IF NOT EXISTS planning_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('milestone', 'epic', 'learning-path', 'manual')),
  source_ref TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES planning_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planning_plans_goal ON planning_plans(goal_id);
CREATE INDEX IF NOT EXISTS idx_planning_plans_source ON planning_plans(source_type, source_ref);

-- Planning graph steps (individual units of work within a plan)
CREATE TABLE IF NOT EXISTS planning_steps (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  wave INTEGER NOT NULL,
  external_ref_type TEXT NOT NULL CHECK (external_ref_type IN ('issue', 'badge', 'manual')),
  external_ref_number INTEGER,
  external_ref_criteria TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES planning_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planning_steps_plan ON planning_steps(plan_id);
CREATE INDEX IF NOT EXISTS idx_planning_steps_wave ON planning_steps(wave);
CREATE INDEX IF NOT EXISTS idx_planning_steps_ordinal ON planning_steps(ordinal);

-- Planning step dependencies (directed acyclic graph)
CREATE TABLE IF NOT EXISTS planning_step_dependencies (
  step_id TEXT NOT NULL,
  depends_on_step_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (step_id, depends_on_step_id),
  FOREIGN KEY (step_id) REFERENCES planning_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_step_id) REFERENCES planning_steps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_step_deps_step ON planning_step_dependencies(step_id);
CREATE INDEX IF NOT EXISTS idx_step_deps_depends_on ON planning_step_dependencies(depends_on_step_id);
`;

/**
 * Run database migrations for schema changes that can't be handled by CREATE TABLE IF NOT EXISTS.
 * SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we need to recreate tables.
 */
function runMigrations(database: Database): void {
  // Migration 1: Add 'Topic' to entities type CHECK constraint
  // Check if the constraint already includes 'Topic' by querying the schema
  const schemaRow = database
    .query<
      { sql: string },
      []
    >("SELECT sql FROM sqlite_master WHERE type='table' AND name='entities'")
    .get();

  if (schemaRow && !schemaRow.sql.includes("'Topic'")) {
    // Need to recreate the table with the new constraint
    database.run("BEGIN TRANSACTION");
    try {
      // Create new table with updated constraint
      database.run(`
        CREATE TABLE entities_new (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('Learning', 'CodeArea', 'File', 'Pattern', 'Mistake', 'Topic')),
          data JSON NOT NULL,
          embedding BLOB,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Copy existing data
      database.run("INSERT INTO entities_new SELECT * FROM entities");

      // Drop old table and rename new one
      database.run("DROP TABLE entities");
      database.run("ALTER TABLE entities_new RENAME TO entities");

      // Recreate indexes
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_entity_type ON entities(type)",
      );

      database.run("COMMIT");
    } catch (error) {
      database.run("ROLLBACK");
      throw new Error(
        `Migration failed (add Topic to entities): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Migration 2: Add 'source' column to graph_queries table
  // Check if source column exists by checking column info
  const graphQueriesColumns = database
    .query<{ name: string }, []>("PRAGMA table_info(graph_queries)")
    .all();

  const hasSourceColumn = graphQueriesColumns.some(
    (col) => col.name === "source",
  );

  if (!hasSourceColumn) {
    try {
      // Add source column with default value 'unknown'
      database.run(
        "ALTER TABLE graph_queries ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown'",
      );

      // Create index for source column
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_graph_queries_source ON graph_queries(source)",
      );
    } catch (error) {
      throw new Error(
        `Migration failed (add source to graph_queries): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Migration 3: Add 'DocSection' and 'CodeDoc' to entities type CHECK constraint
  if (schemaRow && !schemaRow.sql.includes("'DocSection'")) {
    database.run("BEGIN TRANSACTION");
    try {
      database.run(`
        CREATE TABLE entities_new (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('Learning', 'CodeArea', 'File', 'Pattern', 'Mistake', 'Topic', 'DocSection', 'CodeDoc')),
          data JSON NOT NULL,
          embedding BLOB,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      database.run("INSERT INTO entities_new SELECT * FROM entities");
      database.run("DROP TABLE entities");
      database.run("ALTER TABLE entities_new RENAME TO entities");
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_entity_type ON entities(type)",
      );
      database.run("COMMIT");
    } catch (error) {
      database.run("ROLLBACK");
      throw new Error(
        `Migration failed (add DocSection/CodeDoc to entities): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Migration 4: Add 'CHILD_OF', 'DOCUMENTS', 'IN_DOC', 'REFERENCES' to relationships type CHECK constraint
  const relSchemaRow = database
    .query<
      { sql: string },
      []
    >("SELECT sql FROM sqlite_master WHERE type='table' AND name='relationships'")
    .get();

  if (relSchemaRow && !relSchemaRow.sql.includes("'CHILD_OF'")) {
    database.run("BEGIN TRANSACTION");
    try {
      database.run(`
        CREATE TABLE relationships_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_id TEXT NOT NULL,
          to_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('ABOUT', 'IN_FILE', 'LED_TO', 'APPLIES_TO', 'SUPERSEDES', 'CHILD_OF', 'DOCUMENTS', 'IN_DOC', 'REFERENCES')),
          data JSON,
          created_at TEXT NOT NULL,
          FOREIGN KEY (from_id) REFERENCES entities(id) ON DELETE CASCADE,
          FOREIGN KEY (to_id) REFERENCES entities(id) ON DELETE CASCADE
        )
      `);
      database.run("INSERT INTO relationships_new SELECT * FROM relationships");
      database.run("DROP TABLE relationships");
      database.run("ALTER TABLE relationships_new RENAME TO relationships");
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_rel_from ON relationships(from_id, type)",
      );
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_rel_to ON relationships(to_id, type)",
      );
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships(type)",
      );
      database.run(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_rel_unique ON relationships(from_id, to_id, type)",
      );
      database.run("COMMIT");
    } catch (error) {
      database.run("ROLLBACK");
      throw new Error(
        `Migration failed (add doc relationship types): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Migration 5: Add 'task_id' column to workflows table (for task system integration)
  // Check if task_id column exists
  const workflowsColumns = database
    .query<{ name: string }, []>("PRAGMA table_info(workflows)")
    .all();

  const hasTaskIdColumn = workflowsColumns.some(
    (col) => col.name === "task_id",
  );

  if (!hasTaskIdColumn) {
    try {
      // Add task_id column (nullable, optional for backward compatibility)
      database.run("ALTER TABLE workflows ADD COLUMN task_id TEXT NULL");
    } catch (error) {
      throw new Error(
        `Migration failed (add task_id to workflows): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Migration 6: Add 'parent_task_id' column to task_snapshots table (for task hierarchy)
  // Check if parent_task_id column exists
  const taskSnapshotsColumns = database
    .query<{ name: string }, []>("PRAGMA table_info(task_snapshots)")
    .all();

  const hasParentTaskIdColumn = taskSnapshotsColumns.some(
    (col) => col.name === "parent_task_id",
  );

  try {
    if (!hasParentTaskIdColumn) {
      // Add parent_task_id column (nullable, for hierarchical task structures)
      database.run(
        "ALTER TABLE task_snapshots ADD COLUMN parent_task_id TEXT NULL",
      );
    }

    // Always ensure index exists (idempotent) - handles both new and migrated DBs
    database.run(
      "CREATE INDEX IF NOT EXISTS idx_task_snapshots_parent ON task_snapshots(parent_task_id)",
    );
  } catch (error) {
    throw new Error(
      `Migration failed (add parent_task_id to task_snapshots): ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Migration 7: Add 'enum' to graph_entities type CHECK constraint
  const graphEntitiesSchemaRow = database
    .query<
      { sql: string },
      []
    >("SELECT sql FROM sqlite_master WHERE type='table' AND name='graph_entities'")
    .get();

  if (
    graphEntitiesSchemaRow &&
    !graphEntitiesSchemaRow.sql.includes("'enum'")
  ) {
    database.run("BEGIN TRANSACTION");
    try {
      database.run(`
        CREATE TABLE graph_entities_new (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('function', 'class', 'type', 'interface', 'variable', 'file', 'enum')),
          name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          line_number INTEGER,
          exported INTEGER DEFAULT 0,
          package TEXT,
          metadata TEXT
        )
      `);
      database.run(
        "INSERT INTO graph_entities_new SELECT * FROM graph_entities",
      );
      database.run("DROP TABLE graph_entities");
      database.run("ALTER TABLE graph_entities_new RENAME TO graph_entities");

      // Recreate indexes
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_graph_entities_name ON graph_entities(name)",
      );
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_graph_entities_file ON graph_entities(file_path)",
      );
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_graph_entities_type ON graph_entities(type)",
      );
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_graph_entities_package ON graph_entities(package)",
      );

      database.run("COMMIT");
    } catch (error) {
      database.run("ROLLBACK");
      throw new Error(
        `Migration failed (add enum to graph_entities): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Migration 8: Add 'content_hash' column to entities table for duplicate detection
  // Check if content_hash column exists
  const entitiesColumns = database
    .query<{ name: string }, []>("PRAGMA table_info(entities)")
    .all();

  const hasContentHashColumn = entitiesColumns.some(
    (col) => col.name === "content_hash",
  );

  if (!hasContentHashColumn) {
    try {
      // Add content_hash column (nullable for backward compatibility)
      database.run("ALTER TABLE entities ADD COLUMN content_hash TEXT NULL");

      // Create index for content_hash lookups
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_entity_content_hash ON entities(content_hash)",
      );
    } catch (error) {
      throw new Error(
        `Migration failed (add content_hash to entities): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Migration 10: Add 'updated_at' column to planning_plans and planning_steps tables
  const plansColumns = database
    .query<{ name: string }, []>("PRAGMA table_info(planning_plans)")
    .all();

  const plansHasUpdatedAt = plansColumns.some(
    (col) => col.name === "updated_at",
  );

  if (!plansHasUpdatedAt) {
    try {
      database.run(
        `ALTER TABLE planning_plans ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`,
      );
      // Backfill existing rows: set updated_at = created_at
      database.run(
        `UPDATE planning_plans SET updated_at = created_at WHERE updated_at = ''`,
      );
    } catch (error) {
      throw new Error(
        `Migration failed (add updated_at to planning_plans): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const stepsColumns = database
    .query<{ name: string }, []>("PRAGMA table_info(planning_steps)")
    .all();

  const stepsHasUpdatedAt = stepsColumns.some(
    (col) => col.name === "updated_at",
  );

  if (!stepsHasUpdatedAt) {
    try {
      database.run(
        `ALTER TABLE planning_steps ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`,
      );
      // Backfill existing rows: set updated_at = created_at
      database.run(
        `UPDATE planning_steps SET updated_at = created_at WHERE updated_at = ''`,
      );
    } catch (error) {
      throw new Error(
        `Migration failed (add updated_at to planning_steps): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Migration 9: Add 'plan_step_id' column to planning_entities table
  const planningEntitiesColumns = database
    .query<{ name: string }, []>("PRAGMA table_info(planning_entities)")
    .all();

  const hasPlanStepIdColumn = planningEntitiesColumns.some(
    (col) => col.name === "plan_step_id",
  );

  if (!hasPlanStepIdColumn) {
    try {
      database.run(
        "ALTER TABLE planning_entities ADD COLUMN plan_step_id TEXT NULL",
      );
      database.run(
        "CREATE INDEX IF NOT EXISTS idx_planning_entities_plan_step ON planning_entities(plan_step_id)",
      );
    } catch (error) {
      throw new Error(
        `Migration failed (add plan_step_id to planning_entities): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/**
 * Execute a database operation with automatic connection management.
 *
 * Opens a new database connection, executes the callback, and ensures
 * the connection is closed in a finally block. This prevents connection
 * leaks and lock contention from orphaned connections.
 *
 * **This is the recommended way to access the database.** Unlike `getDatabase()`,
 * which caches connections forever, `withDatabase` guarantees cleanup even if
 * the process exits abnormally.
 *
 * @param fn - The database operation to execute
 * @param dbPath - Optional custom database path (uses default if not provided)
 * @returns The result of the callback function
 *
 * @example
 * ```typescript
 * // Read operation
 * const results = withDatabase((db) => {
 *   return db.query("SELECT * FROM entities WHERE type = ?")
 *     .all("Learning");
 * });
 *
 * // Write operation with transaction
 * withDatabase((db) => {
 *   db.transaction(() => {
 *     db.run("INSERT INTO entities ...");
 *     db.run("INSERT INTO relationships ...");
 *   })();
 * });
 * ```
 */
export function withDatabase<T>(fn: (db: Database) => T, dbPath?: string): T {
  // Use provided path, or singleton's path if initialized, or default
  const effectivePath = dbPath ?? currentDbPath ?? DEFAULT_DB_PATH;

  let database: Database;
  try {
    database = new Database(effectivePath, { create: true });
  } catch (error) {
    throw new Error(
      `Failed to create/open database at "${effectivePath}": ${error instanceof Error ? error.message : String(error)}. ` +
        `Ensure the directory exists and is writable.`,
    );
  }

  try {
    // Enable foreign keys
    database.run("PRAGMA foreign_keys = ON;");

    // Enable WAL mode for better concurrency
    database.run("PRAGMA journal_mode = WAL;");

    // Set busy timeout - 5 seconds
    database.run("PRAGMA busy_timeout = 5000;");

    // Performance optimizations
    database.run("PRAGMA synchronous = NORMAL;");
    database.run("PRAGMA cache_size = 10000;");
    database.run("PRAGMA temp_store = MEMORY;");

    // Run schema initialization
    for (const statement of SCHEMA.split(";").filter((s) => s.trim())) {
      database.run(statement);
    }

    // Run migrations
    runMigrations(database);

    return fn(database);
  } catch (error) {
    // Close on error before re-throwing
    try {
      database.close();
    } catch {
      // Ignore close errors
    }
    throw error;
  } finally {
    // Always close the connection
    try {
      database.close();
    } catch {
      // Ignore close errors - connection may already be closed from catch block
    }
  }
}

/**
 * Get a cached database connection.
 *
 * @deprecated Use `withDatabase()` instead for automatic connection management.
 * This function caches connections forever, which can cause lock contention
 * when multiple processes access the database.
 *
 * @param dbPath - Optional custom database path (uses default if not provided)
 * @returns The cached Database instance
 */
export function getDatabase(dbPath?: string): Database {
  // Register exit handlers on first access to ensure cleanup
  registerExitHandlers();

  // If database already initialized, return it
  // This allows checkpoint module to work with whatever db was initialized
  if (db) {
    // Only throw if explicitly requesting a different path
    if (dbPath !== undefined && currentDbPath !== dbPath) {
      throw new Error(
        `Database already initialized with path "${currentDbPath}", cannot use "${dbPath}". ` +
          `Call closeDatabase() first to switch databases.`,
      );
    }
    // Reset idle timeout on each access
    scheduleIdleClose();
    return db;
  }

  const effectivePath = dbPath ?? DEFAULT_DB_PATH;

  try {
    db = new Database(effectivePath, { create: true });
  } catch (error) {
    throw new Error(
      `Failed to create/open database at "${effectivePath}": ${error instanceof Error ? error.message : String(error)}. ` +
        `Ensure the directory exists and is writable.`,
    );
  }

  currentDbPath = effectivePath;

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON;");

  // Enable WAL mode for better concurrency (readers don't block writers)
  // This reduces the risk of DB lock issues when multiple processes access the DB
  db.run("PRAGMA journal_mode = WAL;");

  // Set busy timeout before other operations - allows processes to wait for locks
  // instead of failing immediately. 5 seconds is aggressive enough to catch real
  // deadlocks while tolerating normal operation delays with WAL mode.
  db.run("PRAGMA busy_timeout = 5000;");

  // Performance optimizations for bulk indexing operations
  // synchronous=NORMAL: trades some durability for significant write speed gain
  // cache_size=10000: ~40MB cache (10000 pages * 4KB default page size)
  // temp_store=MEMORY: keep temporary tables in memory
  db.run("PRAGMA synchronous = NORMAL;");
  db.run("PRAGMA cache_size = 10000;");
  db.run("PRAGMA temp_store = MEMORY;");

  // Run schema initialization
  try {
    for (const statement of SCHEMA.split(";").filter((s) => s.trim())) {
      db.run(statement);
    }
  } catch (error) {
    // Close database connection on schema initialization failure
    if (db) {
      db.close();
      db = null;
      currentDbPath = null;
    }
    throw new Error(
      `Failed to initialize database schema: ${error instanceof Error ? error.message : String(error)}. ` +
        `The database file may be corrupted. Try deleting "${effectivePath}" and retrying.`,
    );
  }

  // Run migrations for schema changes that can't be handled by CREATE TABLE IF NOT EXISTS
  try {
    runMigrations(db);
  } catch (error) {
    // Close database connection on migration failure
    if (db) {
      db.close();
      db = null;
      currentDbPath = null;
    }
    throw new Error(
      `Failed to run database migrations: ${error instanceof Error ? error.message : String(error)}. ` +
        `The database file may be corrupted. Try deleting "${effectivePath}" and retrying.`,
    );
  }

  // Schedule auto-close after idle period
  scheduleIdleClose();

  return db;
}

export function closeDatabase(): void {
  // Clear any pending idle close timeout
  if (idleCloseTimeout) {
    clearTimeout(idleCloseTimeout);
    idleCloseTimeout = null;
  }
  if (db) {
    db.close();
    db = null;
    currentDbPath = null;
  }
}

export function resetDatabase(dbPath: string = DEFAULT_DB_PATH): Database {
  closeDatabase();
  return getDatabase(dbPath);
}

/**
 * Custom error for timeout operations
 */
export class DatabaseTimeoutError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = "DatabaseTimeoutError";
  }
}

/**
 * Execute a database operation with a timeout.
 * Returns the result if the operation completes within the timeout.
 * Throws DatabaseTimeoutError if the operation exceeds the timeout.
 *
 * Note: This uses Promise.race with setTimeout. For synchronous SQLite operations,
 * this will still block the event loop, but provides a way to set an upper bound
 * on how long callers will wait before giving up.
 *
 * @param operation - The database operation to execute
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param context - Description of the operation for error messages
 */
export function withTimeout<T>(
  operation: () => T | Promise<T>,
  timeoutMs: number,
  context: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new DatabaseTimeoutError(
          `Database operation timed out after ${timeoutMs}ms: ${context}`,
          context,
          timeoutMs,
        ),
      );
    }, timeoutMs);

    try {
      const result = operation();
      if (result instanceof Promise) {
        result
          .then((value) => {
            clearTimeout(timeoutId);
            resolve(value);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      } else {
        clearTimeout(timeoutId);
        resolve(result);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Database health check result.
 */
export interface DatabaseHealthResult {
  healthy: boolean;
  responsiveMs: number;
  walSizeKb: number;
  shmSizeKb: number;
  dbSizeKb: number;
  error?: string;
}

/**
 * Check database health by verifying responsiveness and WAL file sizes.
 *
 * This function helps diagnose lock contention issues by:
 * - Testing if the database responds to a simple query within 1 second
 * - Reporting WAL and SHM file sizes (large WAL indicates checkpoint issues)
 * - Reporting total database size
 *
 * @param dbPath - Optional custom database path (uses default if not provided)
 * @returns Health check result with timing and file size information
 */
export function checkDatabaseHealth(dbPath?: string): DatabaseHealthResult {
  const effectivePath = dbPath ?? DEFAULT_DB_PATH;
  const walPath = `${effectivePath}-wal`;
  const shmPath = `${effectivePath}-shm`;

  // Check file sizes
  let dbSizeKb = 0;
  let walSizeKb = 0;
  let shmSizeKb = 0;

  try {
    if (existsSync(effectivePath)) {
      dbSizeKb = Math.round(statSync(effectivePath).size / 1024);
    }
    if (existsSync(walPath)) {
      walSizeKb = Math.round(statSync(walPath).size / 1024);
    }
    if (existsSync(shmPath)) {
      shmSizeKb = Math.round(statSync(shmPath).size / 1024);
    }
  } catch {
    // File access errors are non-fatal for health check
  }

  // Test database responsiveness
  const startMs = Date.now();
  try {
    const database = getDatabase(dbPath);
    // Simple query to test responsiveness
    database.query<{ result: number }, []>("SELECT 1 as result").get();
    const responsiveMs = Date.now() - startMs;

    return {
      healthy: responsiveMs < 1000, // Healthy if responds within 1 second
      responsiveMs,
      walSizeKb,
      shmSizeKb,
      dbSizeKb,
    };
  } catch (error) {
    const responsiveMs = Date.now() - startMs;
    return {
      healthy: false,
      responsiveMs,
      walSizeKb,
      shmSizeKb,
      dbSizeKb,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
