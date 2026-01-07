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
  phase TEXT NOT NULL CHECK (phase IN ('research', 'implement', 'review', 'finalize')),
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflows_issue ON workflows(issue_number);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_actions_workflow ON actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_commits_workflow ON commits(workflow_id);
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
