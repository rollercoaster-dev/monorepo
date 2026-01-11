# Experiment 3: Code Graph Prototype

**Issue:** #431 - Evaluate context strategies
**Target Package:** rd-logger (small, self-contained)
**Workflow ID:** `workflow-431-1768140445021-3rdj99`

---

## Goal

Validate whether pre-computed code relationships speed up common queries compared to grep+read approach.

## Success Criteria

- [x] Parse rd-logger with ts-morph (tree-sitter WASM had compatibility issues)
- [x] Store entities and relationships in SQLite
- [x] Answer "what calls X?" via graph query
- [x] Compare: graph query vs grep+read (time + tokens)
- [x] Decision: worth building full system? **YES - proceed**

## Results Summary

| Metric                   | Value   |
| ------------------------ | ------- |
| Files parsed             | 21      |
| Entities extracted       | 103     |
| Relationships extracted  | 305     |
| Average speedup          | **27x** |
| Token savings            | **97%** |
| Graph query total time   | 4.08ms  |
| Grep approach total time | 68.03ms |

**Recommendation:** Proceed with full code graph system. The 27x speedup and 97% token savings strongly support the investment.

---

## Phase 1: Setup Tree-Sitter

### 1.1 Install Dependencies

```bash
cd packages/claude-knowledge
bun add tree-sitter tree-sitter-typescript
```

### 1.2 Create Script Directory

```bash
mkdir -p packages/claude-knowledge/scripts/graph
```

### 1.3 Verify Tree-Sitter Works

Create `packages/claude-knowledge/scripts/graph/test-parser.ts`:

```typescript
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const code = `
function hello(name: string): void {
  console.log("Hello", name);
}
`;

const tree = parser.parse(code);
console.log(tree.rootNode.toString());
```

Run: `bun packages/claude-knowledge/scripts/graph/test-parser.ts`

**Expected:** AST output showing function_declaration node.

---

## Phase 2: Parse rd-logger

### 2.1 Target Files

```
packages/rd-logger/src/
├── index.ts          # Entry point, exports
├── logger.ts         # Logger class
├── types.ts          # Type definitions
├── format.ts         # Formatting utilities
└── adapters/
    ├── hono.ts       # Hono adapter
    ├── express.ts    # Express adapter
    └── generic.ts    # Generic adapter
```

### 2.2 Create Parser Script

`packages/claude-knowledge/scripts/graph/parse-package.ts`:

```typescript
/**
 * Parse a TypeScript package and extract entities + relationships
 */

import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

interface Entity {
  id: string;
  type: "function" | "class" | "variable" | "type" | "file";
  name: string;
  filePath: string;
  lineNumber: number;
  exported: boolean;
}

interface Relationship {
  from: string; // entity id
  to: string; // entity id or external name
  type: "calls" | "imports" | "exports" | "defines" | "extends";
}

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

// Find all .ts files recursively
function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...findTsFiles(path));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

// Extract entities from AST
function extractEntities(tree: Parser.Tree, filePath: string): Entity[] {
  const entities: Entity[] = [];
  const cursor = tree.walk();

  // TODO: Implement AST traversal
  // Look for:
  // - function_declaration
  // - class_declaration
  // - variable_declaration (with export)
  // - type_alias_declaration
  // - interface_declaration

  return entities;
}

// Extract relationships from AST
function extractRelationships(
  tree: Parser.Tree,
  filePath: string,
  entities: Entity[],
): Relationship[] {
  const relationships: Relationship[] = [];

  // TODO: Implement relationship extraction
  // Look for:
  // - import_statement → IMPORTS
  // - call_expression → CALLS
  // - export_statement → EXPORTS
  // - extends_clause → EXTENDS

  return relationships;
}

// Main
const packageDir = process.argv[2] || "packages/rd-logger/src";
const files = findTsFiles(packageDir);

console.log(`Found ${files.length} TypeScript files`);

const allEntities: Entity[] = [];
const allRelationships: Relationship[] = [];

for (const file of files) {
  const code = readFileSync(file, "utf-8");
  const tree = parser.parse(code);

  const entities = extractEntities(tree, file);
  const relationships = extractRelationships(tree, file, entities);

  allEntities.push(...entities);
  allRelationships.push(...relationships);
}

console.log(`Extracted ${allEntities.length} entities`);
console.log(`Extracted ${allRelationships.length} relationships`);

// Output JSON for next phase
console.log(
  JSON.stringify(
    { entities: allEntities, relationships: allRelationships },
    null,
    2,
  ),
);
```

### 2.3 Entity Extraction Logic

Key AST node types to find:

| Node Type                                | Entity Type    | Example                   |
| ---------------------------------------- | -------------- | ------------------------- |
| `function_declaration`                   | function       | `function createLogger()` |
| `class_declaration`                      | class          | `class Logger`            |
| `variable_declarator` + `arrow_function` | function       | `const log = () => {}`    |
| `type_alias_declaration`                 | type           | `type LogLevel = ...`     |
| `interface_declaration`                  | type           | `interface LoggerOptions` |
| `export_statement`                       | marks exported | `export { createLogger }` |

### 2.4 Relationship Extraction Logic

| AST Pattern        | Relationship | Example                   |
| ------------------ | ------------ | ------------------------- |
| `import_statement` | IMPORTS      | `import { x } from "./y"` |
| `call_expression`  | CALLS        | `createLogger()`          |
| `export_statement` | EXPORTS      | `export { Logger }`       |
| `extends_clause`   | EXTENDS      | `class X extends Y`       |

---

## Phase 3: Store in SQLite

### 3.1 Schema

Add to `packages/claude-knowledge/src/db/sqlite.ts` or create new file:

```sql
-- Code graph entities
CREATE TABLE IF NOT EXISTS graph_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'function' | 'class' | 'type' | 'file'
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  exported INTEGER DEFAULT 0,   -- boolean
  package TEXT,                 -- 'rd-logger', etc.
  metadata TEXT                 -- JSON for extra info
);

-- Code graph relationships
CREATE TABLE IF NOT EXISTS graph_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,      -- can be entity id or external name
  type TEXT NOT NULL,           -- 'calls' | 'imports' | 'exports' | 'defines' | 'extends'
  metadata TEXT,
  FOREIGN KEY (from_entity) REFERENCES graph_entities(id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_graph_entities_name ON graph_entities(name);
CREATE INDEX IF NOT EXISTS idx_graph_entities_file ON graph_entities(file_path);
CREATE INDEX IF NOT EXISTS idx_graph_rel_from ON graph_relationships(from_entity);
CREATE INDEX IF NOT EXISTS idx_graph_rel_to ON graph_relationships(to_entity);
CREATE INDEX IF NOT EXISTS idx_graph_rel_type ON graph_relationships(type);
```

### 3.2 Storage Script

`packages/claude-knowledge/scripts/graph/store-graph.ts`:

```typescript
/**
 * Store parsed graph data in SQLite
 */

import { getDatabase } from "../../src/db/sqlite";

interface GraphData {
  entities: Entity[];
  relationships: Relationship[];
}

function storeGraph(data: GraphData, packageName: string): void {
  const db = getDatabase();

  // Clear existing data for this package
  db.run(
    `DELETE FROM graph_relationships WHERE from_entity IN
          (SELECT id FROM graph_entities WHERE package = ?)`,
    [packageName],
  );
  db.run(`DELETE FROM graph_entities WHERE package = ?`, [packageName]);

  // Insert entities
  const insertEntity = db.prepare(`
    INSERT INTO graph_entities (id, type, name, file_path, line_number, exported, package)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const entity of data.entities) {
    insertEntity.run(
      entity.id,
      entity.type,
      entity.name,
      entity.filePath,
      entity.lineNumber,
      entity.exported ? 1 : 0,
      packageName,
    );
  }

  // Insert relationships
  const insertRel = db.prepare(`
    INSERT INTO graph_relationships (from_entity, to_entity, type)
    VALUES (?, ?, ?)
  `);

  for (const rel of data.relationships) {
    insertRel.run(rel.from, rel.to, rel.type);
  }

  console.log(
    `Stored ${data.entities.length} entities, ${data.relationships.length} relationships`,
  );
}

// Read from stdin or file
const input = await Bun.stdin.text();
const data: GraphData = JSON.parse(input);
storeGraph(data, "rd-logger");
```

---

## Phase 4: Query CLI

### 4.1 Add Graph Commands

Add to `packages/claude-knowledge/src/cli/index.ts`:

```typescript
// graph commands
if (command === "graph") {
  await handleGraphCommands(subcommand, args);
}
```

### 4.2 Graph Query Commands

`packages/claude-knowledge/src/cli/graph-commands.ts`:

```typescript
export async function handleGraphCommands(
  command: string,
  args: string[],
): Promise<void> {
  const db = getDatabase();

  if (command === "what-calls") {
    // Usage: graph what-calls <name>
    const name = args[0];
    const results = db
      .query(
        `
      SELECT ge.name, ge.file_path, ge.line_number
      FROM graph_relationships gr
      JOIN graph_entities ge ON gr.from_entity = ge.id
      WHERE gr.to_entity LIKE ? AND gr.type = 'calls'
    `,
      )
      .all(`%${name}%`);

    console.log(JSON.stringify(results, null, 2));
  } else if (command === "what-depends-on") {
    // Usage: graph what-depends-on <name>
    const name = args[0];
    const results = db
      .query(
        `
      SELECT ge.name, ge.file_path, gr.type
      FROM graph_relationships gr
      JOIN graph_entities ge ON gr.from_entity = ge.id
      WHERE gr.to_entity LIKE ?
    `,
      )
      .all(`%${name}%`);

    console.log(JSON.stringify(results, null, 2));
  } else if (command === "blast-radius") {
    // Usage: graph blast-radius <file>
    // Returns all entities that could be affected by changes to this file
    const file = args[0];

    // Recursive CTE to find all dependents
    const results = db
      .query(
        `
      WITH RECURSIVE dependents AS (
        -- Start with entities in the target file
        SELECT id, name, file_path, 0 as depth
        FROM graph_entities
        WHERE file_path LIKE ?

        UNION

        -- Find things that depend on those
        SELECT ge.id, ge.name, ge.file_path, d.depth + 1
        FROM graph_entities ge
        JOIN graph_relationships gr ON gr.from_entity = ge.id
        JOIN dependents d ON gr.to_entity = d.id
        WHERE d.depth < 5  -- limit depth
      )
      SELECT DISTINCT name, file_path, depth
      FROM dependents
      ORDER BY depth, file_path
    `,
      )
      .all(`%${file}%`);

    console.log(JSON.stringify(results, null, 2));
  } else if (command === "summary") {
    // Usage: graph summary [package]
    const pkg = args[0] || "%";
    const stats = db
      .query(
        `
      SELECT
        (SELECT COUNT(*) FROM graph_entities WHERE package LIKE ?) as entities,
        (SELECT COUNT(*) FROM graph_relationships WHERE from_entity IN
          (SELECT id FROM graph_entities WHERE package LIKE ?)) as relationships,
        (SELECT COUNT(DISTINCT type) FROM graph_entities WHERE package LIKE ?) as entity_types
    `,
      )
      .get(pkg, pkg, pkg);

    console.log(JSON.stringify(stats, null, 2));
  }
}
```

---

## Phase 5: Compare Performance

### 5.1 Test Queries

| Query                     | Graph Command                   | Grep Equivalent                            |
| ------------------------- | ------------------------------- | ------------------------------------------ |
| What calls createLogger?  | `graph what-calls createLogger` | `grep -r "createLogger(" --include="*.ts"` |
| What depends on Logger?   | `graph what-depends-on Logger`  | `grep -r "Logger" + manual analysis`       |
| Blast radius of format.ts | `graph blast-radius format.ts`  | Manual exploration                         |

### 5.2 Measurement Script

`packages/claude-knowledge/scripts/graph/benchmark.ts`:

```typescript
/**
 * Compare graph queries vs grep+read approach
 */

function timeExecution(name: string, fn: () => void): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)}ms`);
  return end - start;
}

// Test 1: What calls createLogger?
console.log("\n=== Test 1: What calls createLogger? ===");

const graphTime1 = timeExecution("Graph query", () => {
  // Run graph what-calls createLogger
});

const grepTime1 = timeExecution("Grep approach", () => {
  // Run grep -r "createLogger("
});

// Test 2: Blast radius
console.log("\n=== Test 2: Blast radius of format.ts ===");

const graphTime2 = timeExecution("Graph query", () => {
  // Run graph blast-radius format.ts
});

const grepTime2 = timeExecution("Manual exploration", () => {
  // Simulate: grep + read each file + follow imports
});

// Summary
console.log("\n=== Summary ===");
console.log(`Graph total: ${(graphTime1 + graphTime2).toFixed(2)}ms`);
console.log(`Grep total: ${(grepTime1 + grepTime2).toFixed(2)}ms`);
console.log(
  `Speedup: ${((grepTime1 + grepTime2) / (graphTime1 + graphTime2)).toFixed(1)}x`,
);
```

---

## Deliverables Checklist

- [ ] `scripts/graph/test-parser.ts` - Verify tree-sitter works
- [ ] `scripts/graph/parse-package.ts` - Extract entities/relationships
- [ ] `scripts/graph/store-graph.ts` - Store in SQLite
- [ ] `src/cli/graph-commands.ts` - Query commands
- [ ] `scripts/graph/benchmark.ts` - Performance comparison
- [ ] Graph built for rd-logger
- [ ] Benchmark results documented

---

## Expected Outcome

| Scenario             | Result               | Action                      |
| -------------------- | -------------------- | --------------------------- |
| Graph 5x+ faster     | ✅ Build full system | Prioritize #394             |
| Graph 2-5x faster    | ⚠️ Consider scope    | Build for key packages only |
| Graph similar/slower | ❌ Don't invest      | Focus on other approaches   |

---

## Commands Reference

```bash
# Build graph for rd-logger
bun scripts/graph/parse-package.ts packages/rd-logger/src | \
  bun scripts/graph/store-graph.ts

# Query graph
bun cli graph what-calls createLogger
bun cli graph what-depends-on Logger
bun cli graph blast-radius format.ts
bun cli graph summary rd-logger

# Benchmark
bun scripts/graph/benchmark.ts
```

---

_Plan for Issue #431 Experiment 3. See also: issue-431-context-research.md_
