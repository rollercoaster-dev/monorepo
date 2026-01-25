import type { Database } from "bun:sqlite";
import type { EntityType, RelationshipType } from "../types";
// Buffer import needed for ESLint - it's also global in Bun runtime
import type { Buffer } from "buffer";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { getDefaultEmbedder, floatArrayToBuffer } from "../embeddings";

/**
 * Create or merge an entity in the knowledge graph.
 * If entity with same ID exists, updates it. Otherwise creates new.
 *
 * @param db - Database handle (passed for transaction consistency)
 * @param type - Entity type
 * @param id - Entity ID
 * @param data - Entity data
 * @param embedding - Optional embedding vector for semantic search
 * @param contentHash - Optional content hash for duplicate detection (Learning entities only)
 * @returns The entity ID (existing or new)
 */
export function createOrMergeEntity(
  db: Database,
  type: EntityType,
  id: string,
  data: unknown,
  embedding?: Buffer,
  contentHash?: string,
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
    // Update existing entity (including embedding and content_hash if provided)
    if (embedding && contentHash) {
      db.run(
        "UPDATE entities SET data = ?, embedding = ?, content_hash = ?, updated_at = ? WHERE id = ?",
        [JSON.stringify(data), embedding, contentHash, now, id],
      );
    } else if (embedding) {
      db.run(
        "UPDATE entities SET data = ?, embedding = ?, updated_at = ? WHERE id = ?",
        [JSON.stringify(data), embedding, now, id],
      );
    } else if (contentHash) {
      db.run(
        "UPDATE entities SET data = ?, content_hash = ?, updated_at = ? WHERE id = ?",
        [JSON.stringify(data), contentHash, now, id],
      );
    } else {
      db.run("UPDATE entities SET data = ?, updated_at = ? WHERE id = ?", [
        JSON.stringify(data),
        now,
        id,
      ]);
    }
    return existing.id;
  }

  // Insert new entity (with or without embedding and content_hash)
  if (embedding && contentHash) {
    db.run(
      "INSERT INTO entities (id, type, data, embedding, content_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, type, JSON.stringify(data), embedding, contentHash, now, now],
    );
  } else if (embedding) {
    db.run(
      "INSERT INTO entities (id, type, data, embedding, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, type, JSON.stringify(data), embedding, now, now],
    );
  } else if (contentHash) {
    db.run(
      "INSERT INTO entities (id, type, data, content_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, type, JSON.stringify(data), contentHash, now, now],
    );
  } else {
    db.run(
      "INSERT INTO entities (id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, type, JSON.stringify(data), now, now],
    );
  }

  return id;
}

/**
 * Generate an embedding for text content.
 * Returns undefined if embedding generation fails (non-blocking).
 *
 * @param content - The text content to embed
 * @returns Buffer containing the embedding, or undefined if generation fails
 */
export async function generateEmbedding(
  content: string,
): Promise<Buffer | undefined> {
  if (!content || content.trim().length === 0) {
    return undefined;
  }

  try {
    const embedder = await getDefaultEmbedder();
    const embedding = await embedder.generate(content);
    return floatArrayToBuffer(embedding);
  } catch (error) {
    logger.warn("Failed to generate embedding, storing entity without it", {
      error: error instanceof Error ? error.message : String(error),
      contentLength: content.length,
      context: "knowledge.generateEmbedding",
    });
    return undefined;
  }
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
export function createRelationship(
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
