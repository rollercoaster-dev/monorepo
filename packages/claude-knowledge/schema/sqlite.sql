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

-- Knowledge graph entities
-- Entity types:
--   Learning: A learning captured during a workflow session
--   CodeArea: A logical area of the codebase
--   File: A file in the codebase
--   Pattern: A recognized pattern derived from learnings
--   Mistake: A mistake made during development and how it was fixed
--   Topic: A conversation topic that persists across sessions
--   DocSection: A section of a markdown document (heading + content)
--   CodeDoc: JSDoc/TSDoc extracted from code
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Learning', 'CodeArea', 'File', 'Pattern', 'Mistake', 'Topic', 'DocSection', 'CodeDoc')),
  data JSON NOT NULL,
  embedding BLOB,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Relationships between entities
-- Relationship types:
--   ABOUT: Learning → CodeArea (learning relates to a code area)
--   IN_FILE: Learning/Mistake → File (located in a file)
--   LED_TO: Pattern/Mistake → Learning (derived from / fixed by)
--   APPLIES_TO: Pattern → CodeArea (pattern applies to area)
--   SUPERSEDES: Learning → Learning (for updates)
--   CHILD_OF: DocSection → DocSection (hierarchical parent-child)
--   DOCUMENTS: CodeDoc → Entity (links docs to code entities)
--   IN_DOC: DocSection → File (links section to parent file)
--   REFERENCES: DocSection → DocSection/File (cross-document links)
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
