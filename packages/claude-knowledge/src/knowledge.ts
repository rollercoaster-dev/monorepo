import { getDatabase } from "./db/sqlite";
import type { Database } from "bun:sqlite";
import type {
  Learning,
  Pattern,
  Mistake,
  EntityType,
  RelationshipType,
  QueryContext,
  QueryResult,
} from "./types";
import { randomUUID } from "crypto";
// Buffer import needed for ESLint - it's also global in Bun runtime
import { Buffer } from "buffer";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

/**
 * Create or merge an entity in the knowledge graph.
 * If entity with same ID exists, updates it. Otherwise creates new.
 *
 * @param db - Database handle (passed for transaction consistency)
 * @param type - Entity type
 * @param id - Entity ID
 * @param data - Entity data
 * @returns The entity ID (existing or new)
 */
function createOrMergeEntity(
  db: Database,
  type: EntityType,
  id: string,
  data: unknown,
): string {
  const now = new Date().toISOString();

  const existing = db
    .query<
      { id: string; type: string },
      [string]
    >("SELECT id, type FROM entities WHERE id = ?")
    .get(id);

  if (existing) {
    if (existing.type !== type) {
      throw new Error(
        `Entity "${id}" already exists with type "${existing.type}", cannot update as "${type}"`,
      );
    }
    // Update existing entity
    db.run("UPDATE entities SET data = ?, updated_at = ? WHERE id = ?", [
      JSON.stringify(data),
      now,
      id,
    ]);
    return existing.id;
  }

  // Insert new entity
  db.run(
    "INSERT INTO entities (id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [id, type, JSON.stringify(data), now, now],
  );

  return id;
}

/**
 * Create a relationship between two entities.
 * Idempotent - no-op if relationship already exists.
 *
 * @param db - Database handle (passed for transaction consistency)
 * @param fromId - Source entity ID
 * @param toId - Target entity ID
 * @param type - Relationship type
 * @param data - Optional relationship metadata
 */
function createRelationship(
  db: Database,
  fromId: string,
  toId: string,
  type: RelationshipType,
  data?: Record<string, unknown>,
): void {
  const now = new Date().toISOString();

  const existing = db
    .query<
      { id: number },
      [string, string, string]
    >("SELECT id FROM relationships WHERE from_id = ? AND to_id = ? AND type = ?")
    .get(fromId, toId, type);

  if (existing) {
    // Relationship already exists - idempotent
    return;
  }

  db.run(
    "INSERT INTO relationships (from_id, to_id, type, data, created_at) VALUES (?, ?, ?, ?, ?)",
    [fromId, toId, type, data ? JSON.stringify(data) : null, now],
  );
}

/**
 * Store learnings in the knowledge graph.
 *
 * Creates Learning entities and auto-creates/merges related CodeArea and File entities.
 * Establishes ABOUT and IN_FILE relationships.
 *
 * @remarks
 * This function is async to support future async operations (e.g., embedding generation).
 * Current implementation uses synchronous bun:sqlite operations.
 *
 * @param learnings - Array of learnings to store
 * @throws Error if storage fails (transaction is rolled back)
 */
export async function store(learnings: Learning[]): Promise<void> {
  if (learnings.length === 0) {
    return;
  }

  const db = getDatabase();

  // Use transaction for batch insert efficiency and atomicity
  db.run("BEGIN TRANSACTION");

  try {
    for (const learning of learnings) {
      // Ensure learning has an ID
      const learningId = learning.id || `learning-${randomUUID()}`;

      // Create Learning entity
      createOrMergeEntity(db, "Learning", learningId, {
        ...learning,
        id: learningId,
      });

      // Auto-create/merge CodeArea entity if specified
      if (learning.codeArea) {
        const codeAreaId = `codearea-${learning.codeArea.toLowerCase().replace(/\s+/g, "-")}`;
        createOrMergeEntity(db, "CodeArea", codeAreaId, {
          name: learning.codeArea,
        });

        // Create ABOUT relationship
        createRelationship(db, learningId, codeAreaId, "ABOUT");
      }

      // Auto-create/merge File entity if specified
      if (learning.filePath) {
        // Buffer is global in Bun
        const fileId = `file-${Buffer.from(learning.filePath).toString("base64url")}`;
        createOrMergeEntity(db, "File", fileId, {
          path: learning.filePath,
        });

        // Create IN_FILE relationship
        createRelationship(db, learningId, fileId, "IN_FILE");
      }
    }

    db.run("COMMIT");
  } catch (error) {
    try {
      db.run("ROLLBACK");
    } catch (rollbackError) {
      logger.error("CRITICAL: ROLLBACK failed after transaction error", {
        originalError: error instanceof Error ? error.message : String(error),
        rollbackError:
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
        context: "knowledge.store",
      });
    }
    throw new Error(
      `Failed to store learnings: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Store a pattern in the knowledge graph.
 *
 * Creates Pattern entity and optionally links to Learning entities.
 * Establishes APPLIES_TO relationship to CodeArea if specified.
 *
 * @remarks
 * This function is async to support future async operations (e.g., embedding generation).
 * Current implementation uses synchronous bun:sqlite operations.
 *
 * @param pattern - The pattern to store
 * @param learningIds - Optional array of learning IDs this pattern is derived from
 * @throws Error if storage fails or referenced learnings don't exist
 */
export async function storePattern(
  pattern: Pattern,
  learningIds?: string[],
): Promise<void> {
  const db = getDatabase();

  db.run("BEGIN TRANSACTION");

  try {
    // Ensure pattern has an ID
    const patternId = pattern.id || `pattern-${randomUUID()}`;

    // Create Pattern entity
    createOrMergeEntity(db, "Pattern", patternId, {
      ...pattern,
      id: patternId,
    });

    // Link to CodeArea if specified
    if (pattern.codeArea) {
      const codeAreaId = `codearea-${pattern.codeArea.toLowerCase().replace(/\s+/g, "-")}`;
      createOrMergeEntity(db, "CodeArea", codeAreaId, {
        name: pattern.codeArea,
      });

      createRelationship(db, patternId, codeAreaId, "APPLIES_TO");
    }

    // Link to related learnings (LED_TO: pattern derived from learnings)
    if (learningIds && learningIds.length > 0) {
      for (const learningId of learningIds) {
        // Verify learning exists
        const exists = db
          .query<
            { id: string },
            [string]
          >("SELECT id FROM entities WHERE id = ? AND type = 'Learning'")
          .get(learningId);

        if (!exists) {
          throw new Error(`Learning with ID "${learningId}" does not exist`);
        }

        createRelationship(db, patternId, learningId, "LED_TO");
      }
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw new Error(
      `Failed to store pattern: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Store a mistake in the knowledge graph.
 *
 * Creates Mistake entity and optionally links to Learning that resolved it.
 * Establishes IN_FILE relationship if filePath specified.
 * Establishes LED_TO relationship to the Learning (mistake led to learning).
 *
 * @remarks
 * This function is async to support future async operations (e.g., embedding generation).
 * Current implementation uses synchronous bun:sqlite operations.
 *
 * @param mistake - The mistake to store
 * @param learningId - Optional ID of the learning that fixed this mistake
 * @throws Error if storage fails or referenced learning doesn't exist
 */
export async function storeMistake(
  mistake: Mistake,
  learningId?: string,
): Promise<void> {
  const db = getDatabase();

  db.run("BEGIN TRANSACTION");

  try {
    // Ensure mistake has an ID
    const mistakeId = mistake.id || `mistake-${randomUUID()}`;

    // Create Mistake entity
    createOrMergeEntity(db, "Mistake", mistakeId, {
      ...mistake,
      id: mistakeId,
    });

    // Link to File if specified
    if (mistake.filePath) {
      // Buffer is global in Bun
      const fileId = `file-${Buffer.from(mistake.filePath).toString("base64url")}`;
      createOrMergeEntity(db, "File", fileId, {
        path: mistake.filePath,
      });

      createRelationship(db, mistakeId, fileId, "IN_FILE");
    }

    // Link to learning (LED_TO: mistake led to learning that fixed it)
    if (learningId) {
      const exists = db
        .query<
          { id: string },
          [string]
        >("SELECT id FROM entities WHERE id = ? AND type = 'Learning'")
        .get(learningId);

      if (!exists) {
        throw new Error(`Learning with ID "${learningId}" does not exist`);
      }

      createRelationship(db, mistakeId, learningId, "LED_TO");
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw new Error(
      `Failed to store mistake: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ============================================================================
// Query API
// ============================================================================

/**
 * Row type returned from the query SQL.
 */
interface QueryRow {
  id: string;
  data: string;
  created_at: string;
  patterns: string | null;
  mistakes: string | null;
}

/**
 * Query the knowledge graph for learnings based on context filters.
 *
 * Supports filtering by:
 * - codeArea: Learnings related to a specific code area (1-hop via ABOUT)
 * - filePath: Learnings related to a specific file (1-hop via IN_FILE)
 * - keywords: Content search across learning content
 * - issueNumber: Filter by source issue number
 *
 * Results include related patterns and mistakes via 2-hop traversal (LED_TO).
 *
 * @param context - Query filters (at least one should be provided)
 * @returns Array of QueryResult with learnings and related entities
 */
export async function query(context: QueryContext): Promise<QueryResult[]> {
  const db = getDatabase();
  const { codeArea, filePath, keywords, issueNumber, limit = 50 } = context;

  // Build dynamic WHERE conditions and parameters
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Base CTE to find target learnings
  let baseCte = `
    SELECT DISTINCT e.id, e.data, e.created_at
    FROM entities e
  `;

  // Join for code area filter (1-hop)
  if (codeArea) {
    baseCte += `
      JOIN relationships r_ca ON r_ca.from_id = e.id AND r_ca.type = 'ABOUT'
      JOIN entities ca ON ca.id = r_ca.to_id AND ca.type = 'CodeArea'
    `;
    conditions.push(`json_extract(ca.data, '$.name') = ?`);
    params.push(codeArea);
  }

  // Join for file path filter (1-hop)
  if (filePath) {
    baseCte += `
      JOIN relationships r_f ON r_f.from_id = e.id AND r_f.type = 'IN_FILE'
      JOIN entities f ON f.id = r_f.to_id AND f.type = 'File'
    `;
    conditions.push(`json_extract(f.data, '$.path') = ?`);
    params.push(filePath);
  }

  // Base condition: must be a Learning
  baseCte += ` WHERE e.type = 'Learning'`;

  // Add keyword search conditions
  if (keywords && keywords.length > 0) {
    for (const keyword of keywords) {
      conditions.push(`json_extract(e.data, '$.content') LIKE ? ESCAPE '\\'`);
      // Escape SQL LIKE special characters to prevent injection
      const escapedKeyword = keyword.replace(/[%_\\]/g, "\\$&");
      params.push(`%${escapedKeyword}%`);
    }
  }

  // Add issue number filter
  if (issueNumber !== undefined) {
    conditions.push(`json_extract(e.data, '$.sourceIssue') = ?`);
    params.push(issueNumber);
  }

  // Combine conditions with AND
  if (conditions.length > 0) {
    baseCte += ` AND ${conditions.join(" AND ")}`;
  }

  // Full query with 2-hop traversal for related patterns and mistakes
  const sql = `
    WITH target_learnings AS (
      ${baseCte}
    ),
    related_patterns AS (
      SELECT
        tl.id as learning_id,
        GROUP_CONCAT(p.data, '|||') as pattern_data
      FROM target_learnings tl
      JOIN relationships r ON r.to_id = tl.id AND r.type = 'LED_TO'
      JOIN entities p ON p.id = r.from_id AND p.type = 'Pattern'
      GROUP BY tl.id
    ),
    related_mistakes AS (
      SELECT
        tl.id as learning_id,
        GROUP_CONCAT(m.data, '|||') as mistake_data
      FROM target_learnings tl
      JOIN relationships r ON r.to_id = tl.id AND r.type = 'LED_TO'
      JOIN entities m ON m.id = r.from_id AND m.type = 'Mistake'
      GROUP BY tl.id
    )
    SELECT
      tl.id,
      tl.data,
      tl.created_at,
      rp.pattern_data as patterns,
      rm.mistake_data as mistakes
    FROM target_learnings tl
    LEFT JOIN related_patterns rp ON rp.learning_id = tl.id
    LEFT JOIN related_mistakes rm ON rm.learning_id = tl.id
    ORDER BY tl.created_at DESC
    LIMIT ?
  `;

  params.push(limit);

  const rows = db.query<QueryRow, (string | number)[]>(sql).all(...params);

  // Transform rows to QueryResult, skipping corrupted entries
  const results: QueryResult[] = [];
  for (const row of rows) {
    try {
      const learning = JSON.parse(row.data) as Learning;

      const result: QueryResult = { learning };

      // Parse related patterns (separated by |||)
      if (row.patterns) {
        result.relatedPatterns = row.patterns
          .split("|||")
          .map((p) => JSON.parse(p) as Pattern);
      }

      // Parse related mistakes (separated by |||)
      if (row.mistakes) {
        result.relatedMistakes = row.mistakes
          .split("|||")
          .map((m) => JSON.parse(m) as Mistake);
      }

      results.push(result);
    } catch (error) {
      logger.warn("Skipping corrupted learning data", {
        id: row.id,
        error: error instanceof Error ? error.message : String(error),
        context: "knowledge.query",
      });
      continue;
    }
  }
  return results;
}

/**
 * Get all mistakes associated with a specific file path.
 *
 * Useful for pre-commit checks to warn about past mistakes in files being modified.
 *
 * @param filePath - The file path to query mistakes for
 * @returns Array of Mistake objects (empty if none found)
 */
export async function getMistakesForFile(filePath: string): Promise<Mistake[]> {
  const db = getDatabase();

  const sql = `
    SELECT m.data
    FROM entities m
    JOIN relationships r ON r.from_id = m.id AND r.type = 'IN_FILE'
    JOIN entities f ON f.id = r.to_id AND f.type = 'File'
    WHERE m.type = 'Mistake'
      AND json_extract(f.data, '$.path') = ?
    ORDER BY m.created_at DESC
  `;

  const rows = db.query<{ data: string }, [string]>(sql).all(filePath);

  return rows.map((row) => JSON.parse(row.data) as Mistake);
}

/**
 * Get all patterns that apply to a specific code area.
 *
 * Useful for scaffolding and code generation to apply known patterns.
 *
 * @param codeArea - The code area name to query patterns for
 * @returns Array of Pattern objects (empty if none found)
 */
export async function getPatternsForArea(codeArea: string): Promise<Pattern[]> {
  const db = getDatabase();

  const sql = `
    SELECT p.data
    FROM entities p
    JOIN relationships r ON r.from_id = p.id AND r.type = 'APPLIES_TO'
    JOIN entities ca ON ca.id = r.to_id AND ca.type = 'CodeArea'
    WHERE p.type = 'Pattern'
      AND json_extract(ca.data, '$.name') = ?
    ORDER BY p.created_at DESC
  `;

  const rows = db.query<{ data: string }, [string]>(sql).all(codeArea);

  return rows.map((row) => JSON.parse(row.data) as Pattern);
}

/**
 * Knowledge graph API for storing and querying learnings, patterns, and mistakes.
 */
export const knowledge = {
  store,
  storePattern,
  storeMistake,
  query,
  getMistakesForFile,
  getPatternsForArea,
};
