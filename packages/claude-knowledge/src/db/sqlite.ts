import { Database } from "bun:sqlite";

let db: Database | null = null;
let currentDbPath: string | null = null;

const DEFAULT_DB_PATH = ".claude/execution-state.db";

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

-- Code graph entities (functions, classes, files, types)
-- Part of Issue #431 Experiment 3: Code Graph Prototype
CREATE TABLE IF NOT EXISTS graph_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('function', 'class', 'type', 'interface', 'variable', 'file')),
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
CREATE TABLE IF NOT EXISTS task_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_subject TEXT NOT NULL,
  task_status TEXT NOT NULL,
  task_metadata TEXT,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_snapshots_workflow ON task_snapshots(workflow_id);
CREATE INDEX IF NOT EXISTS idx_task_snapshots_phase ON task_snapshots(phase);
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
}

export function getDatabase(dbPath?: string): Database {
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

  return db;
}

export function closeDatabase(): void {
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
