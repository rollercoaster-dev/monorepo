/**
 * Graph query API for code analysis.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * Extracted from CLI commands in src/cli/graph-commands.ts (#431).
 * Provides programmatic access to graph queries.
 */

import { withDatabase } from "../db/sqlite";
import type {
  Entity,
  QueryResult,
  DependencyResult,
  BlastRadiusResult,
  GraphSummary,
} from "./types";

/**
 * Find all entities that call the specified function/method.
 *
 * @param name - Function or method name to search for (supports LIKE patterns)
 * @returns Array of callers with file and line information
 */
export function whatCalls(name: string): QueryResult[] {
  return withDatabase((db) => {
    try {
      return db
        .query<QueryResult, [string]>(
          `
          SELECT DISTINCT caller.name, caller.file_path, caller.line_number, caller.type
          FROM graph_relationships gr
          JOIN graph_entities caller ON gr.from_entity = caller.id
          JOIN graph_entities target ON gr.to_entity = target.id
          WHERE target.name LIKE ? AND gr.type = 'calls'
          ORDER BY caller.file_path, caller.line_number
        `,
        )
        .all(`%${name}%`);
    } catch (error) {
      throw new Error(
        `[graph-query] whatCalls("${name}") failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}

/**
 * Find all entities that depend on (import, extend, implement, call) the specified entity.
 *
 * @param name - Entity name to search for (supports LIKE patterns)
 * @returns Array of dependents with relationship type
 */
export function whatDependsOn(name: string): DependencyResult[] {
  return withDatabase((db) => {
    try {
      return db
        .query<DependencyResult, [string]>(
          `
          SELECT DISTINCT dependent.name, dependent.file_path, gr.type as relationship_type
          FROM graph_relationships gr
          JOIN graph_entities dependent ON gr.from_entity = dependent.id
          JOIN graph_entities target ON gr.to_entity = target.id
          WHERE target.name LIKE ?
            AND gr.type IN ('imports', 'extends', 'implements', 'calls')
          ORDER BY gr.type, dependent.file_path
        `,
        )
        .all(`%${name}%`);
    } catch (error) {
      throw new Error(
        `[graph-query] whatDependsOn("${name}") failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}

/**
 * Find all entities that could be affected by changes to a file.
 * Uses recursive CTE to traverse dependency graph transitively.
 *
 * @param file - File path to analyze (supports LIKE patterns)
 * @param maxDepth - Maximum traversal depth (default: 5)
 * @returns Array of affected entities with depth information
 */
export function blastRadius(
  file: string,
  maxDepth: number = 5,
): BlastRadiusResult[] {
  return withDatabase((db) => {
    try {
      return db
        .query<BlastRadiusResult, [string, number]>(
          `
          WITH RECURSIVE dependents AS (
            -- Start with entities in the target file
            SELECT id, name, file_path, type, 0 as depth
            FROM graph_entities
            WHERE file_path LIKE ?

            UNION

            -- Find things that depend on those (transitively)
            SELECT ge.id, ge.name, ge.file_path, ge.type, d.depth + 1
            FROM graph_entities ge
            JOIN graph_relationships gr ON gr.from_entity = ge.id
            JOIN dependents d ON gr.to_entity = d.id
            WHERE d.depth < ?
              AND gr.type IN ('imports', 'calls', 'extends', 'implements')
          )
          SELECT DISTINCT name, file_path, type, depth
          FROM dependents
          ORDER BY depth, file_path
        `,
        )
        .all(`%${file}%`, maxDepth);
    } catch (error) {
      throw new Error(
        `[graph-query] blastRadius("${file}", ${maxDepth}) failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}

/**
 * Find entities by name, optionally filtered by type.
 *
 * @param name - Entity name to search for (supports LIKE patterns)
 * @param type - Optional entity type filter
 * @param limit - Maximum results to return (default: 50)
 * @returns Array of matching entities
 */
export function findEntities(
  name: string,
  type?: string,
  limit: number = 50,
): (Entity & { id: string })[] {
  return withDatabase((db) => {
    try {
      let query = `
        SELECT id, name, type, file_path as filePath, line_number as lineNumber, exported
        FROM graph_entities
        WHERE name LIKE ?
      `;
      const params: (string | number)[] = [`%${name}%`];

      if (type) {
        query += ` AND type = ?`;
        params.push(type);
      }

      query += ` ORDER BY file_path, line_number LIMIT ?`;
      params.push(limit);

      const results = db
        .query<
          {
            id: string;
            name: string;
            type: string;
            filePath: string;
            lineNumber: number;
            exported: number;
          },
          (string | number)[]
        >(query)
        .all(...params);

      return results.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type as Entity["type"],
        filePath: r.filePath,
        lineNumber: r.lineNumber,
        exported: r.exported === 1,
      }));
    } catch (error) {
      throw new Error(
        `[graph-query] findEntities("${name}", "${type || "any"}") failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}

/**
 * Get all exported entities, optionally filtered by package.
 *
 * @param packageName - Optional package filter (supports LIKE patterns)
 * @returns Array of exported entities
 */
export function getExports(packageName?: string): (Entity & { id: string })[] {
  return withDatabase((db) => {
    const pkg = packageName || "%";

    try {
      const results = db
        .query<
          {
            id: string;
            name: string;
            type: string;
            filePath: string;
            lineNumber: number;
          },
          [string]
        >(
          `
          SELECT id, name, type, file_path as filePath, line_number as lineNumber
          FROM graph_entities
          WHERE exported = 1 AND package LIKE ?
          ORDER BY type, name
        `,
        )
        .all(pkg);

      return results.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type as Entity["type"],
        filePath: r.filePath,
        lineNumber: r.lineNumber,
        exported: true,
      }));
    } catch (error) {
      throw new Error(
        `[graph-query] getExports("${packageName || "*"}") failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}

/**
 * Find direct callers of a specific function (exact match).
 *
 * @param functionName - Exact function name to search for
 * @returns Array of callers
 */
export function getCallers(functionName: string): QueryResult[] {
  return withDatabase((db) => {
    try {
      return db
        .query<QueryResult, [string]>(
          `
          SELECT caller.name, caller.file_path, caller.line_number, caller.type
          FROM graph_relationships gr
          JOIN graph_entities caller ON gr.from_entity = caller.id
          JOIN graph_entities target ON gr.to_entity = target.id
          WHERE target.name = ? AND target.type = 'function' AND gr.type = 'calls'
          ORDER BY caller.file_path
        `,
        )
        .all(functionName);
    } catch (error) {
      throw new Error(
        `[graph-query] getCallers("${functionName}") failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}

/**
 * Get summary statistics for the code graph.
 *
 * @param packageName - Optional package filter (supports LIKE patterns)
 * @returns GraphSummary with counts and package information
 */
export function getSummary(packageName?: string): GraphSummary {
  return withDatabase((db) => {
    const pkg = packageName || "%";

    try {
      const entityCounts = db
        .query<{ type: string; count: number }, [string]>(
          `
          SELECT type, COUNT(*) as count
          FROM graph_entities
          WHERE package LIKE ?
          GROUP BY type
        `,
        )
        .all(pkg);

      const relationshipCounts = db
        .query<{ type: string; count: number }, [string]>(
          `
          SELECT type, COUNT(*) as count
          FROM graph_relationships
          WHERE from_entity IN (SELECT id FROM graph_entities WHERE package LIKE ?)
          GROUP BY type
        `,
        )
        .all(pkg);

      const totalEntities = entityCounts.reduce((sum, e) => sum + e.count, 0);
      const totalRelationships = relationshipCounts.reduce(
        (sum, r) => sum + r.count,
        0,
      );

      const packages = db
        .query<{ package: string; count: number }, [string]>(
          `
          SELECT package, COUNT(*) as count
          FROM graph_entities
          WHERE package LIKE ?
          GROUP BY package
        `,
        )
        .all(pkg);

      return {
        totalEntities,
        totalRelationships,
        entitiesByType: Object.fromEntries(
          entityCounts.map((e) => [e.type, e.count]),
        ),
        relationshipsByType: Object.fromEntries(
          relationshipCounts.map((r) => [r.type, r.count]),
        ),
        packages: packages.map((p) => ({
          name: p.package,
          entityCount: p.count,
        })),
      };
    } catch (error) {
      throw new Error(
        `[graph-query] getSummary("${packageName || "*"}") failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}
