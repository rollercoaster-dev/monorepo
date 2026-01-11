/**
 * Graph query CLI commands.
 * Part of Issue #431 Experiment 3: Code Graph Prototype.
 */

import { getDatabase } from "../db/sqlite";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

interface QueryResult {
  name: string;
  file_path: string;
  line_number?: number;
  type?: string;
  depth?: number;
}

export async function handleGraphCommands(
  command: string,
  args: string[],
): Promise<void> {
  const db = getDatabase();

  if (command === "what-calls") {
    // Usage: graph what-calls <name>
    // Returns all entities that call the specified function/method
    const name = args[0];
    if (!name) {
      throw new Error("Usage: graph what-calls <name>");
    }

    // JOIN to target entity by name instead of LIKE on ID (more precise, uses indexes)
    const results = db
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

    logger.info(
      JSON.stringify(
        { query: "what-calls", name, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "what-depends-on") {
    // Usage: graph what-depends-on <name>
    // Returns all entities that depend on (import, extend, implement) the specified entity
    const name = args[0];
    if (!name) {
      throw new Error("Usage: graph what-depends-on <name>");
    }

    // JOIN to target entity by name instead of LIKE on ID (more precise, uses indexes)
    const results = db
      .query<QueryResult & { relationship_type: string }, [string]>(
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

    logger.info(
      JSON.stringify(
        { query: "what-depends-on", name, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "blast-radius") {
    // Usage: graph blast-radius <file>
    // Returns all entities that could be affected by changes to this file
    // Uses recursive CTE to traverse dependency graph
    const file = args[0];
    if (!file) {
      throw new Error("Usage: graph blast-radius <file>");
    }

    const results = db
      .query<QueryResult, [string]>(
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
        WHERE d.depth < 5  -- limit traversal depth
          AND gr.type IN ('imports', 'calls', 'extends', 'implements')
      )
      SELECT DISTINCT name, file_path, type, depth
      FROM dependents
      ORDER BY depth, file_path
    `,
      )
      .all(`%${file}%`);

    logger.info(
      JSON.stringify(
        { query: "blast-radius", file, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "find") {
    // Usage: graph find <name> [type]
    // Find entities by name, optionally filtered by type
    const name = args[0];
    const type = args[1];
    if (!name) {
      throw new Error("Usage: graph find <name> [type]");
    }

    let query = `
      SELECT id, name, type, file_path, line_number, exported
      FROM graph_entities
      WHERE name LIKE ?
    `;
    const params: string[] = [`%${name}%`];

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY file_path, line_number LIMIT 50`;

    const results = db
      .query<QueryResult & { id: string; exported: number }, string[]>(query)
      .all(...params);

    logger.info(
      JSON.stringify(
        { query: "find", name, type, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "exports") {
    // Usage: graph exports [package]
    // List all exported entities
    const pkg = args[0] || "%";

    const results = db
      .query<QueryResult & { id: string }, [string]>(
        `
      SELECT id, name, type, file_path, line_number
      FROM graph_entities
      WHERE exported = 1 AND package LIKE ?
      ORDER BY type, name
    `,
      )
      .all(pkg);

    logger.info(
      JSON.stringify(
        { query: "exports", package: pkg, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "summary") {
    // Usage: graph summary [package]
    // Get statistics about the graph
    const pkg = args[0] || "%";

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
      .query<{ package: string; count: number }, []>(
        `
      SELECT package, COUNT(*) as count
      FROM graph_entities
      GROUP BY package
    `,
      )
      .all();

    logger.info(
      JSON.stringify(
        {
          query: "summary",
          package: pkg === "%" ? "all" : pkg,
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
        },
        null,
        2,
      ),
    );
  } else if (command === "callers") {
    // Usage: graph callers <function-name>
    // Find direct callers of a function (simpler than what-calls)
    const name = args[0];
    if (!name) {
      throw new Error("Usage: graph callers <function-name>");
    }

    // JOIN to target entity by name and type instead of LIKE on ID
    const results = db
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
      .all(name);

    logger.info(
      JSON.stringify(
        { query: "callers", name, results, count: results.length },
        null,
        2,
      ),
    );
  } else {
    throw new Error(
      `Unknown graph command: ${command}\n` +
        `Available commands:\n` +
        `  what-calls <name>     - Find what calls the specified function\n` +
        `  what-depends-on <name> - Find dependencies on an entity\n` +
        `  blast-radius <file>   - Find entities affected by changes to a file\n` +
        `  find <name> [type]    - Search for entities by name\n` +
        `  exports [package]     - List exported entities\n` +
        `  callers <function>    - Find direct callers of a function\n` +
        `  summary [package]     - Show graph statistics`,
    );
  }
}
