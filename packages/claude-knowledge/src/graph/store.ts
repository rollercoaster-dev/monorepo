/**
 * Graph storage operations for SQLite.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * Productionized from prototype in scripts/graph/store-graph.ts (#431).
 */

import { getDatabase } from "../db/sqlite";
import type { ParseResult, StoreResult } from "./types";

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
      } catch {
        // Skip entity on error (e.g., constraint violation)
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
        insertRel.run(rel.from, rel.to, rel.type);
        relsCount++;
      } catch {
        // Skip relationship on error
      }
    }

    return { entitiesCount, relsCount };
  });

  // Execute the transaction
  storeTransaction();

  // Verify storage (outside transaction - read-only)
  const entityCount = db
    .query(`SELECT COUNT(*) as count FROM graph_entities WHERE package = ?`)
    .get(packageName) as { count: number };
  const relCount = db
    .query(
      `SELECT COUNT(*) as count FROM graph_relationships WHERE from_entity IN (SELECT id FROM graph_entities WHERE package = ?)`,
    )
    .get(packageName) as { count: number };

  return {
    success: true,
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
