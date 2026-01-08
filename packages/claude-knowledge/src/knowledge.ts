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
 *
 * Creates Pattern entity and optionally links to Learning entities.
 * Establishes APPLIES_TO relationship to CodeArea if specified.
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
    createOrMergeEntity("Pattern", patternId, {
      ...pattern,
      id: patternId,
    });

    // Link to CodeArea if specified
    if (pattern.codeArea) {
      const codeAreaId = `codearea-${pattern.codeArea.toLowerCase().replace(/\s+/g, "-")}`;
      createOrMergeEntity("CodeArea", codeAreaId, {
        name: pattern.codeArea,
      });

      createRelationship(patternId, codeAreaId, "APPLIES_TO");
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

        createRelationship(patternId, learningId, "LED_TO");
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
    createOrMergeEntity("Mistake", mistakeId, {
      ...mistake,
      id: mistakeId,
    });

    // Link to File if specified
    if (mistake.filePath) {
      const fileId = `file-${Buffer.from(mistake.filePath).toString("base64url")}`;
      createOrMergeEntity("File", fileId, {
        path: mistake.filePath,
      });

      createRelationship(mistakeId, fileId, "IN_FILE");
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

      createRelationship(mistakeId, learningId, "LED_TO");
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw new Error(
      `Failed to store mistake: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Knowledge graph API for storing and querying learnings, patterns, and mistakes.
 */
export const knowledge = {
  store,
  storePattern,
  storeMistake,
};
