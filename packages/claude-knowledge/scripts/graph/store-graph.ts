#!/usr/bin/env bun
/**
 * Store parsed graph data in SQLite.
 * Part of Issue #431 Experiment 3: Code Graph Prototype.
 *
 * Usage: bun parse-package.ts packages/rd-logger/src | bun store-graph.ts rd-logger
 *        Or: bun store-graph.ts rd-logger < graph.json
 */

import { getDatabase } from "../../src/db/sqlite";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

interface Entity {
  id: string;
  type: "function" | "class" | "type" | "interface" | "variable" | "file";
  name: string;
  filePath: string;
  lineNumber: number;
  exported: boolean;
}

interface Relationship {
  from: string;
  to: string;
  type: "calls" | "imports" | "exports" | "extends" | "implements" | "defines";
}

interface GraphData {
  entities: Entity[];
  relationships: Relationship[];
  stats?: {
    filesScanned: number;
    filesSkipped: number;
    entitiesByType: Record<string, number>;
    relationshipsByType: Record<string, number>;
  };
}

function storeGraph(data: GraphData, packageName: string): void {
  const db = getDatabase();

  logger.info(`Storing graph for package: ${packageName}`);

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

    logger.info(`  Cleared existing data for package: ${packageName}`);

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
        logger.warn(`  Failed to insert entity ${entity.id}: ${error}`);
      }
    }
    logger.info(`  Inserted ${entitiesCount} entities`);

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
      } catch (error) {
        logger.warn(
          `  Failed to insert relationship ${rel.from} -> ${rel.to}: ${error}`,
        );
      }
    }
    logger.info(`  Inserted ${relsCount} relationships`);

    return { entitiesCount, relsCount };
  });

  // Execute the transaction
  const result = storeTransaction();

  // Verify storage (outside transaction - read-only)
  const entityCount = db
    .query(`SELECT COUNT(*) as count FROM graph_entities WHERE package = ?`)
    .get(packageName) as { count: number };
  const relCount = db
    .query(
      `SELECT COUNT(*) as count FROM graph_relationships WHERE from_entity IN (SELECT id FROM graph_entities WHERE package = ?)`,
    )
    .get(packageName) as { count: number };

  logger.info("=== Storage Complete ===");
  logger.info(`Package: ${packageName}`);
  logger.info(`Entities in DB: ${entityCount.count}`);
  logger.info(`Relationships in DB: ${relCount.count}`);
  logger.debug(
    `Transaction: ${result.entitiesCount} entities, ${result.relsCount} relationships`,
  );

  // Output summary as JSON (program output)
  process.stdout.write(
    JSON.stringify(
      {
        success: true,
        package: packageName,
        entitiesStored: entityCount.count,
        relationshipsStored: relCount.count,
      },
      null,
      2,
    ) + "\n",
  );
}

// Main
const packageName = process.argv[2];
if (!packageName) {
  logger.info("Usage: bun store-graph.ts <package-name>");
  logger.info("Reads graph JSON from stdin and stores in SQLite.");
  logger.info(
    "Example: bun parse-package.ts packages/rd-logger/src | bun store-graph.ts rd-logger",
  );
  process.exit(1);
}

// Read from stdin
const input = await Bun.stdin.text();
if (!input.trim()) {
  logger.error("No input received. Pipe graph JSON to stdin.");
  process.exit(1);
}

try {
  const data: GraphData = JSON.parse(input);
  storeGraph(data, packageName);
} catch (error) {
  logger.error(`Error parsing input JSON: ${error}`);
  process.exit(1);
}
