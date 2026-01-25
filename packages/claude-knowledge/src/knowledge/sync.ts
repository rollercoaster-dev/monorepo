/**
 * JSONL Export/Import for Git Sync
 *
 * Enables knowledge synchronization across machines via git-tracked JSONL files.
 * Exports all learnings from SQLite to `.claude/knowledge.jsonl` on session end.
 * Imports with deduplication via content_hash on session start if JSONL is newer than database.
 */

import { getDatabase } from "../db/sqlite";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { statSync, readFileSync, writeFileSync, existsSync } from "fs";

/**
 * Result from exportToJSONL operation.
 */
export interface ExportResult {
  /** Number of entities exported */
  exported: number;
  /** Path to the exported file */
  filePath: string;
}

/**
 * Result from importFromJSONL operation.
 */
export interface ImportResult {
  /** Number of new entities imported */
  imported: number;
  /** Number of existing entities updated */
  updated: number;
  /** Number of entities skipped (duplicates) */
  skipped: number;
  /** Number of errors encountered */
  errors: number;
}

/**
 * Get file modification time in milliseconds.
 *
 * @param filePath - Path to the file
 * @returns Modification time in milliseconds, or 0 if file doesn't exist
 */
export function getFileModificationTime(filePath: string): number {
  try {
    if (!existsSync(filePath)) {
      return 0;
    }
    const stats = statSync(filePath);
    return stats.mtimeMs;
  } catch (error) {
    logger.warn("Failed to get file modification time", {
      filePath,
      error: error instanceof Error ? error.message : String(error),
      context: "sync.getFileModificationTime",
    });
    return 0;
  }
}

/**
 * Export all entities to JSONL format for git sync.
 *
 * Exports all learnings, patterns, mistakes, and topics from the entities table.
 * Each entity is written as a single-line JSON object for git-friendly diffs.
 *
 * @param outputPath - Path to write JSONL file (default: .claude/knowledge.jsonl)
 * @returns Export result with count and file path
 */
export async function exportToJSONL(
  outputPath: string = ".claude/knowledge.jsonl",
): Promise<ExportResult> {
  const db = getDatabase();

  // Define database row shape (snake_case from SQLite)
  interface EntityRow {
    id: string;
    type: string;
    data: string; // JSON string
    created_at: string;
    updated_at: string;
    content_hash: string | null;
  }

  // Query all entities (excluding internal ones like CodeArea, File)
  // Export Learning, Pattern, Mistake, Topic for cross-machine sync
  const entities = db
    .query<EntityRow, []>(
      `
      SELECT id, type, data, created_at, updated_at, content_hash
      FROM entities
      WHERE type IN ('Learning', 'Pattern', 'Mistake', 'Topic')
      ORDER BY created_at ASC
    `,
    )
    .all();

  // Convert to JSONL format (one JSON object per line)
  const lines: string[] = [];
  for (const entity of entities) {
    try {
      // Parse data field (stored as JSON string)
      const data = JSON.parse(entity.data);

      // Create portable entity record
      const record = {
        id: entity.id,
        type: entity.type,
        data,
        content_hash: entity.content_hash,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
      };

      // Serialize to single line (no newlines in JSON)
      lines.push(JSON.stringify(record));
    } catch (error) {
      logger.warn("Failed to serialize entity for export", {
        entityId: entity.id,
        entityType: entity.type,
        error: error instanceof Error ? error.message : String(error),
        context: "sync.exportToJSONL",
      });
    }
  }

  // Write to file
  try {
    const content = lines.join("\n");
    writeFileSync(outputPath, content, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write JSONL to ${outputPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.debug("Exported knowledge to JSONL", {
    exported: lines.length,
    filePath: outputPath,
    context: "sync.exportToJSONL",
  });

  return {
    exported: lines.length,
    filePath: outputPath,
  };
}

/**
 * Import entities from JSONL format with deduplication.
 *
 * Reads JSONL file line by line and imports entities.
 * Uses content_hash for deduplication - keeps newer entity by createdAt timestamp.
 * Skips invalid JSON lines with warnings.
 *
 * @param inputPath - Path to read JSONL file (default: .claude/knowledge.jsonl)
 * @returns Import result with counts
 */
export async function importFromJSONL(
  inputPath: string = ".claude/knowledge.jsonl",
): Promise<ImportResult> {
  const db = getDatabase();

  // Read file
  let content: string;
  try {
    content = readFileSync(inputPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read JSONL from ${inputPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Split into lines
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Start transaction for batch import
  db.run("BEGIN TRANSACTION");

  try {
    for (const line of lines) {
      try {
        // Parse JSON line
        const record = JSON.parse(line);

        // Validate required fields
        if (
          !record.id ||
          !record.type ||
          !record.data ||
          !record.created_at ||
          !record.updated_at
        ) {
          logger.warn("Invalid JSONL record, skipping", {
            recordId: record.id,
            context: "sync.importFromJSONL",
          });
          errors++;
          continue;
        }

        // Check for existing entity by content_hash (if available)
        if (record.content_hash) {
          const existing = db
            .query<
              { id: string; created_at: string },
              [string]
            >("SELECT id, created_at FROM entities WHERE content_hash = ?")
            .get(record.content_hash);

          if (existing) {
            // Compare timestamps - keep newer entity
            const existingDate = new Date(existing.created_at);
            const recordDate = new Date(record.created_at);

            if (recordDate <= existingDate) {
              // Existing is newer or same age, skip import
              skipped++;
              continue;
            }

            // Record is newer, update existing entity
            db.run(
              `
              UPDATE entities
              SET data = ?, updated_at = ?, content_hash = ?
              WHERE id = ?
            `,
              [
                JSON.stringify(record.data),
                record.updated_at,
                record.content_hash,
                existing.id,
              ],
            );
            updated++;
            continue;
          }
        }

        // No duplicate found, insert new entity
        db.run(
          `
          INSERT INTO entities (id, type, data, created_at, updated_at, content_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            record.id,
            record.type,
            JSON.stringify(record.data),
            record.created_at,
            record.updated_at,
            record.content_hash || null,
          ],
        );
        imported++;
      } catch (error) {
        logger.warn("Failed to import JSONL line", {
          error: error instanceof Error ? error.message : String(error),
          context: "sync.importFromJSONL",
        });
        errors++;
      }
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw new Error(
      `Failed to import JSONL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.debug("Imported knowledge from JSONL", {
    imported,
    updated,
    skipped,
    errors,
    filePath: inputPath,
    context: "sync.importFromJSONL",
  });

  return {
    imported,
    updated,
    skipped,
    errors,
  };
}
