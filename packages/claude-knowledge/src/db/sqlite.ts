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
  type TEXT NOT NULL CHECK (type IN ('Learning', 'CodeArea', 'File', 'Pattern', 'Mistake')),
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
  type TEXT NOT NULL CHECK (type IN ('ABOUT', 'IN_FILE', 'LED_TO', 'APPLIES_TO', 'SUPERSEDES')),
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
CREATE TABLE IF NOT EXISTS graph_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  workflow_id TEXT,
  query_type TEXT NOT NULL,
  query_params TEXT,
  result_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Indexes for graph query metrics
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
`;

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
