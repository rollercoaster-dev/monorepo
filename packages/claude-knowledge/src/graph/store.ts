/**
 * Graph storage operations for SQLite.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * Productionized from prototype in scripts/graph/store-graph.ts (#431).
 */

import { getDatabase } from "../db/sqlite";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { createOrMergeEntity, generateEmbedding } from "../knowledge/helpers";
import type { CodeDoc } from "../types";
import type { ParseResult, StoreResult, Entity } from "./types";

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
    // Clear existing data for this package (inside transaction for atomicity)
    clearPackageInternal(db, packageName);

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
    logger.warn(`${entityErrors.length} entity insert error(s)`, {
      errors: entityErrors.slice(0, 5),
    });
  }
  if (relErrors.length > 0) {
    logger.warn(`${relErrors.length} relationship insert error(s)`, {
      errors: relErrors.slice(0, 5),
    });
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
    logger.warn("Entity count mismatch", {
      inserted: insertedEntities,
      verified: entityCount.count,
    });
  }
  if (relCount.count !== insertedRels) {
    logger.warn("Relationship count mismatch", {
      inserted: insertedRels,
      verified: relCount.count,
    });
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
 * Internal helper to clear package data within an existing transaction.
 * Used by storeGraph() for atomic clear+insert operations.
 *
 * @param db - Database instance (from within transaction)
 * @param packageName - Package name to clear
 */
function clearPackageInternal(
  db: ReturnType<typeof getDatabase>,
  packageName: string,
): void {
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
}

/**
 * Clear all graph data for a specific package.
 *
 * @param packageName - Package name to clear
 */
export function clearPackage(packageName: string): void {
  const db = getDatabase();

  const clearTransaction = db.transaction(() => {
    clearPackageInternal(db, packageName);
  });

  clearTransaction();
}

/** Result from storing CodeDoc entities */
export interface CodeDocStoreResult {
  /** Number of CodeDoc entities created */
  codeDocsCreated: number;
  /** Number of DOCUMENTS relationships created */
  relationshipsCreated: number;
}

/**
 * Create CodeDoc entities from parsed code entities with JSDoc content.
 * Generates embeddings for semantic search and creates DOCUMENTS relationships.
 *
 * This should be called after storeGraph() to create searchable documentation
 * entities linked to code entities.
 *
 * @param data - ParseResult from parsePackage() containing entities with jsDocContent
 * @returns CodeDocStoreResult with counts
 */
export async function storeCodeDocs(
  data: ParseResult,
): Promise<CodeDocStoreResult> {
  const db = getDatabase();

  // Filter entities that have JSDoc content
  const entitiesWithJsDoc = data.entities.filter(
    (e): e is Entity & { jsDocContent: string } =>
      e.jsDocContent !== undefined && e.jsDocContent.length > 0,
  );

  if (entitiesWithJsDoc.length === 0) {
    return { codeDocsCreated: 0, relationshipsCreated: 0 };
  }

  logger.debug(
    `Creating CodeDoc entities for ${entitiesWithJsDoc.length} code entities`,
  );

  // Generate embeddings in parallel for all JSDoc content
  const embeddings = await Promise.all(
    entitiesWithJsDoc.map((e) => generateEmbedding(e.jsDocContent)),
  );

  let codeDocsCreated = 0;

  // Use transaction for atomicity
  db.run("BEGIN TRANSACTION");

  try {
    for (let i = 0; i < entitiesWithJsDoc.length; i++) {
      const entity = entitiesWithJsDoc[i];
      const embedding = embeddings[i];

      // Create CodeDoc entity ID
      const codeDocId = `codedoc-${entity.id}`;

      // Parse description and tags from jsDocContent
      const lines = entity.jsDocContent.split("\n");
      const tagLines = lines.filter((l) => l.trim().startsWith("@"));
      const descriptionLines = lines.filter((l) => !l.trim().startsWith("@"));

      const tags: Record<string, string> = {};
      for (const tagLine of tagLines) {
        // Parse @tagName value - avoid regex backtracking by using indexOf
        const trimmed = tagLine.trim();
        if (!trimmed.startsWith("@")) continue;

        const withoutAt = trimmed.slice(1);
        const spaceIdx = withoutAt.search(/\s/);

        if (spaceIdx === -1) {
          // Tag with no value, e.g., "@deprecated"
          tags[withoutAt] = "";
        } else {
          const tagName = withoutAt.slice(0, spaceIdx);
          const tagValue = withoutAt.slice(spaceIdx + 1).trim();
          tags[tagName] = tagValue;
        }
      }

      const codeDocData: CodeDoc = {
        id: codeDocId,
        entityId: entity.id,
        content: entity.jsDocContent,
        description: descriptionLines.join("\n").trim() || undefined,
        tags: Object.keys(tags).length > 0 ? tags : undefined,
      };

      // Create CodeDoc entity with embedding
      // Note: The entityId field in codeDocData links to the graph_entities table,
      // so we don't create a DOCUMENTS relationship (which would require both IDs
      // in the entities table). The entityId provides the cross-table link.
      createOrMergeEntity(db, "CodeDoc", codeDocId, codeDocData, embedding);
      codeDocsCreated++;
    }

    db.run("COMMIT");

    logger.info(`Created ${codeDocsCreated} CodeDoc entities with embeddings`);

    // relationshipsCreated is always 0 now since we use entityId field instead
    // of DOCUMENTS relationships (which would require both IDs in same table)
    return { codeDocsCreated, relationshipsCreated: 0 };
  } catch (error) {
    db.run("ROLLBACK");
    logger.error("Failed to store CodeDoc entities", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
