/**
 * Planning Graph JSONL Sync
 *
 * Export/import planning entities to `.claude/planning.jsonl` for git-tracked
 * cross-machine synchronization. Follows the same pattern as knowledge sync.
 */

import { getDatabase } from "../db/sqlite";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { spawnSync } from "bun";
import { join, isAbsolute, dirname } from "path";

/** Default path for planning JSONL file */
const DEFAULT_PATH = ".claude/planning.jsonl";

/**
 * Get the git repository root directory.
 */
function getGitRoot(): string {
  const result = spawnSync(["git", "rev-parse", "--show-toplevel"]);
  if (result.success) {
    return result.stdout.toString().trim();
  }
  return process.cwd();
}

/**
 * Resolve a path relative to the git repository root.
 */
function resolveFromGitRoot(relativePath: string): string {
  if (isAbsolute(relativePath)) {
    return relativePath;
  }
  return join(getGitRoot(), relativePath);
}

/** Result from export operation */
export interface PlanningExportResult {
  exported: number;
  filePath: string;
}

/** Result from import operation */
export interface PlanningImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
}

/** Shape of a JSONL record for planning entities */
interface PlanningJSONLRecord {
  id: string;
  type: string;
  title: string;
  data: unknown;
  stack_order: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Shape of a JSONL record for planning relationships */
interface RelationshipJSONLRecord {
  _type: "relationship";
  from_id: string;
  to_id: string;
  type: string;
  data?: unknown;
  created_at: string;
}

/** Row shape from SQLite */
interface EntityRow {
  id: string;
  type: string;
  title: string;
  data: string;
  stack_order: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RelationshipRow {
  from_id: string;
  to_id: string;
  type: string;
  data: string | null;
  created_at: string;
}

function isPlanningEntityRecord(value: unknown): value is PlanningJSONLRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.type === "string" &&
    typeof v.title === "string" &&
    "data" in v &&
    typeof v.status === "string" &&
    typeof v.created_at === "string" &&
    typeof v.updated_at === "string" &&
    !("_type" in v)
  );
}

function isRelationshipRecord(
  value: unknown,
): value is RelationshipJSONLRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v._type === "relationship";
}

/**
 * Export planning entities and relationships to JSONL.
 * Only exports active/paused items (not completed).
 */
export async function exportPlanningToJSONL(
  outputPath: string = DEFAULT_PATH,
): Promise<PlanningExportResult> {
  const resolvedPath = resolveFromGitRoot(outputPath);
  const db = getDatabase();

  // Query active/paused entities
  const entities = db
    .query<EntityRow, []>(
      `SELECT id, type, title, data, stack_order, status, created_at, updated_at
       FROM planning_entities
       WHERE status IN ('active', 'paused')
       ORDER BY stack_order ASC`,
    )
    .all();

  // Query relationships for active entities
  const entityIds = entities.map((e) => e.id);
  const relationships: RelationshipRow[] = [];

  if (entityIds.length > 0) {
    const placeholders = entityIds.map(() => "?").join(",");
    const rels = db
      .query<RelationshipRow, string[]>(
        `SELECT from_id, to_id, type, data, created_at
         FROM planning_relationships
         WHERE from_id IN (${placeholders}) OR to_id IN (${placeholders})`,
      )
      .all(...entityIds, ...entityIds);
    relationships.push(...rels);
  }

  const lines: string[] = [];

  // Export entities
  for (const entity of entities) {
    try {
      const data = JSON.parse(entity.data);
      const record: PlanningJSONLRecord = {
        id: entity.id,
        type: entity.type,
        title: entity.title,
        data,
        stack_order: entity.stack_order,
        status: entity.status,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
      };
      lines.push(JSON.stringify(record));
    } catch (error) {
      logger.warn("Failed to serialize planning entity for export", {
        entityId: entity.id,
        error: error instanceof Error ? error.message : String(error),
        context: "planning-sync.exportPlanningToJSONL",
      });
    }
  }

  // Export relationships
  for (const rel of relationships) {
    try {
      const record: RelationshipJSONLRecord = {
        _type: "relationship",
        from_id: rel.from_id,
        to_id: rel.to_id,
        type: rel.type,
        data: rel.data ? JSON.parse(rel.data) : undefined,
        created_at: rel.created_at,
      };
      lines.push(JSON.stringify(record));
    } catch (error) {
      logger.warn("Failed to serialize planning relationship for export", {
        error: error instanceof Error ? error.message : String(error),
        context: "planning-sync.exportPlanningToJSONL",
      });
    }
  }

  // Ensure directory exists
  const dir = dirname(resolvedPath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write file
  try {
    writeFileSync(resolvedPath, lines.join("\n"), "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write planning JSONL to ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.debug("Exported planning to JSONL", {
    exported: entities.length,
    relationships: relationships.length,
    filePath: resolvedPath,
    context: "planning-sync.exportPlanningToJSONL",
  });

  return {
    exported: entities.length,
    filePath: resolvedPath,
  };
}

/**
 * Import planning entities and relationships from JSONL with deduplication.
 */
export async function importPlanningFromJSONL(
  inputPath: string = DEFAULT_PATH,
): Promise<PlanningImportResult> {
  const resolvedPath = resolveFromGitRoot(inputPath);
  const db = getDatabase();

  let content: string;
  try {
    content = readFileSync(resolvedPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read planning JSONL from ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const lines = content.split("\n").filter((line) => line.trim() !== "");

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  db.run("BEGIN TRANSACTION");

  try {
    for (const line of lines) {
      try {
        const parsed: unknown = JSON.parse(line);

        // Handle relationship records
        if (isRelationshipRecord(parsed)) {
          db.run(
            `INSERT OR IGNORE INTO planning_relationships (from_id, to_id, type, data, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              parsed.from_id,
              parsed.to_id,
              parsed.type,
              parsed.data ? JSON.stringify(parsed.data) : null,
              parsed.created_at,
            ],
          );
          continue;
        }

        // Handle entity records
        if (!isPlanningEntityRecord(parsed)) {
          errors++;
          continue;
        }

        const record = parsed;

        // Check for existing entity by ID
        const existing = db
          .query<
            { id: string; updated_at: string },
            [string]
          >("SELECT id, updated_at FROM planning_entities WHERE id = ?")
          .get(record.id);

        if (existing) {
          // Compare timestamps - keep newer
          const existingDate = new Date(existing.updated_at);
          const recordDate = new Date(record.updated_at);

          if (recordDate <= existingDate) {
            skipped++;
            continue;
          }

          // Record is newer, update
          db.run(
            `UPDATE planning_entities
             SET type = ?, title = ?, data = ?, stack_order = ?, status = ?,
                 created_at = ?, updated_at = ?
             WHERE id = ?`,
            [
              record.type,
              record.title,
              JSON.stringify(record.data),
              record.stack_order,
              record.status,
              record.created_at,
              record.updated_at,
              record.id,
            ],
          );
          updated++;
          continue;
        }

        // New entity, insert
        db.run(
          `INSERT INTO planning_entities (id, type, title, data, stack_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            record.type,
            record.title,
            JSON.stringify(record.data),
            record.stack_order,
            record.status,
            record.created_at,
            record.updated_at,
          ],
        );
        imported++;
      } catch (error) {
        logger.warn("Failed to import planning JSONL line", {
          error: error instanceof Error ? error.message : String(error),
          context: "planning-sync.importPlanningFromJSONL",
        });
        errors++;
      }
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw new Error(
      `Failed to import planning JSONL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.debug("Imported planning from JSONL", {
    imported,
    updated,
    skipped,
    errors,
    filePath: resolvedPath,
    context: "planning-sync.importPlanningFromJSONL",
  });

  return { imported, updated, skipped, errors };
}

/**
 * Get file modification time in milliseconds.
 */
export function getPlanningFileModificationTime(
  filePath: string = DEFAULT_PATH,
): number {
  const resolvedPath = resolveFromGitRoot(filePath);
  try {
    if (!existsSync(resolvedPath)) return 0;
    return statSync(resolvedPath).mtimeMs;
  } catch {
    return 0;
  }
}
