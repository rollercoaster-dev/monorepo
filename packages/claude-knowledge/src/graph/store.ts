/**
 * Graph storage operations for SQLite.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * Productionized from prototype in scripts/graph/store-graph.ts (#431).
 */

import { getDatabase } from "../db/sqlite";
import type { ParseResult, StoreResult } from "./types";

/** Error information for failed insert operations */
interface InsertError {
  id: string;
  error: string;
}

/**
 * Store parsed graph data in SQLite.
 * Uses a transaction for atomic writes - all or nothing.
 *
 * @param data - ParseResult from parsePackage()
 * @param packageName - Package name for the graph data
 * @returns StoreResult with success status and counts
 */
export function storeGraph(
  data: ParseResult,
  packageName: string,
): StoreResult {
  const db = getDatabase();

  // Track failures for reporting
  const entityErrors: InsertError[] = [];
  const relErrors: InsertError[] = [];

  // Use transaction for atomic writes - all or nothing
  const storeTransaction = db.transaction(() => {
    // Clear existing data for this package
    // Delete relationships where this package's entities are the source
    db.prepare(
      `
      DELETE FROM graph_relationships WHERE from_entity IN
      (SELECT id FROM graph_entities WHERE package = ?)
    `,
    ).run(packageName);

    // Delete relationships where this package's entities are the target
    db.prepare(
      `
      DELETE FROM graph_relationships WHERE to_entity IN
      (SELECT id FROM graph_entities WHERE package = ?)
    `,
    ).run(packageName);

    // Delete entities for this package
    db.prepare(
      `
      DELETE FROM graph_entities WHERE package = ?
    `,
    ).run(packageName);

    // Insert entities
    const insertEntity = db.prepare(`
      INSERT OR REPLACE INTO graph_entities (id, type, name, file_path, line_number, exported, package)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let entitiesCount = 0;
    for (const entity of data.entities) {
      try {
        insertEntity.run(
          entity.id,
          entity.type,
          entity.name,
          entity.filePath,
          entity.lineNumber,
          entity.exported ? 1 : 0,
          packageName,
        );
        entitiesCount++;
      } catch (error) {
        entityErrors.push({
          id: entity.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Insert relationships (OR IGNORE to skip duplicates from unique index)
    const insertRel = db.prepare(`
      INSERT OR IGNORE INTO graph_relationships (from_entity, to_entity, type)
      VALUES (?, ?, ?)
    `);

    let relsCount = 0;
    for (const rel of data.relationships) {
      try {
        const result = insertRel.run(rel.from, rel.to, rel.type);
        // Only count if row was actually inserted (not ignored as duplicate)
        if (result.changes > 0) {
          relsCount++;
        }
      } catch (error) {
        relErrors.push({
          id: `${rel.from} -> ${rel.to}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { entitiesCount, relsCount };
  });

  // Execute the transaction and capture return value
  const { entitiesCount: insertedEntities, relsCount: insertedRels } =
    storeTransaction();

  // Log errors if any occurred (for debugging)
  if (entityErrors.length > 0) {
    console.warn(
      `[graph-store] ${entityErrors.length} entity insert error(s):`,
      entityErrors.slice(0, 5).map((e) => `${e.id}: ${e.error}`),
    );
  }
  if (relErrors.length > 0) {
    console.warn(
      `[graph-store] ${relErrors.length} relationship insert error(s):`,
      relErrors.slice(0, 5).map((e) => `${e.id}: ${e.error}`),
    );
  }

  // Verify storage (outside transaction - read-only)
  const entityCount = db
    .query(`SELECT COUNT(*) as count FROM graph_entities WHERE package = ?`)
    .get(packageName) as { count: number };
  const relCount = db
    .query(
      `SELECT COUNT(*) as count FROM graph_relationships WHERE from_entity IN (SELECT id FROM graph_entities WHERE package = ?)`,
    )
    .get(packageName) as { count: number };

  // Log if verification differs from transaction counts (should rarely happen)
  if (entityCount.count !== insertedEntities) {
    console.warn(
      `[graph-store] Entity count mismatch: inserted ${insertedEntities}, verified ${entityCount.count}`,
    );
  }
  if (relCount.count !== insertedRels) {
    console.warn(
      `[graph-store] Relationship count mismatch: inserted ${insertedRels}, verified ${relCount.count}`,
    );
  }

  // Success is based on whether we had critical failures
  const hasFailures = entityErrors.length > 0 || relErrors.length > 0;

  return {
    success: !hasFailures,
    package: packageName,
    entitiesStored: entityCount.count,
    relationshipsStored: relCount.count,
  };
}

/**
 * Clear all graph data for a specific package.
 *
 * @param packageName - Package name to clear
 */
export function clearPackage(packageName: string): void {
  const db = getDatabase();

  const clearTransaction = db.transaction(() => {
    // Delete relationships where this package's entities are the source
    db.prepare(
      `
      DELETE FROM graph_relationships WHERE from_entity IN
      (SELECT id FROM graph_entities WHERE package = ?)
    `,
    ).run(packageName);

    // Delete relationships where this package's entities are the target
    db.prepare(
      `
      DELETE FROM graph_relationships WHERE to_entity IN
      (SELECT id FROM graph_entities WHERE package = ?)
    `,
    ).run(packageName);

    // Delete entities for this package
    db.prepare(
      `
      DELETE FROM graph_entities WHERE package = ?
    `,
    ).run(packageName);
  });

  clearTransaction();
}
