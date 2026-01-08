import { getDatabase } from "./db/sqlite";
import type {
  Learning,
  Pattern,
  Mistake,
  EntityType,
  RelationshipType,
} from "./types";
import { randomUUID } from "crypto";
import { Buffer } from "buffer";

/**
 * Create or merge an entity in the knowledge graph.
 * If entity with same ID exists, updates it. Otherwise creates new.
 * @returns The entity ID (existing or new)
 */
function createOrMergeEntity(
  type: EntityType,
  id: string,
  data: unknown,
): string {
  const db = getDatabase();
  const now = new Date().toISOString();

  const existing = db
    .query<{ id: string }, [string]>("SELECT id FROM entities WHERE id = ?")
    .get(id);

  if (existing) {
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
 */
function createRelationship(
  fromId: string,
  toId: string,
  type: RelationshipType,
  data?: Record<string, unknown>,
): void {
  const db = getDatabase();
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
      createOrMergeEntity("Learning", learningId, {
        ...learning,
        id: learningId,
      });

      // Auto-create/merge CodeArea entity if specified
      if (learning.codeArea) {
        const codeAreaId = `codearea-${learning.codeArea.toLowerCase().replace(/\s+/g, "-")}`;
        createOrMergeEntity("CodeArea", codeAreaId, {
          name: learning.codeArea,
        });

        // Create ABOUT relationship
        createRelationship(learningId, codeAreaId, "ABOUT");
      }

      // Auto-create/merge File entity if specified
      if (learning.filePath) {
        const fileId = `file-${Buffer.from(learning.filePath).toString("base64url")}`;
        createOrMergeEntity("File", fileId, {
          path: learning.filePath,
        });

        // Create IN_FILE relationship
        createRelationship(learningId, fileId, "IN_FILE");
      }
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw new Error(
      `Failed to store learnings: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Store a pattern in the knowledge graph.
 * Placeholder - will be implemented in next commit.
 */
export async function storePattern(
  _pattern: Pattern,
  _learningIds?: string[],
): Promise<void> {
  throw new Error("storePattern not implemented yet");
}

/**
 * Store a mistake in the knowledge graph.
 * Placeholder - will be implemented in next commit.
 */
export async function storeMistake(
  _mistake: Mistake,
  _learningId?: string,
): Promise<void> {
  throw new Error("storeMistake not implemented yet");
}

/**
 * Knowledge graph API for storing and querying learnings, patterns, and mistakes.
 */
export const knowledge = {
  store,
  storePattern,
  storeMistake,
};
