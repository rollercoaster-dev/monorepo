/**
 * Graph query CLI commands.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * Refactored from prototype (#431) to use graph API instead of inline SQL.
 */

import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  parsePackage,
  storeGraph,
  storeCodeDocs,
  whatCalls,
  whatDependsOn,
  blastRadius,
  findEntities,
  getExports,
  getCallers,
  getSummary,
} from "../graph";
import { metrics } from "../checkpoint/metrics";

/**
 * Log a graph query for metrics tracking.
 * Wrapped in try/catch to ensure logging failures don't break queries.
 */
function logQuery(
  queryType: string,
  queryParams: string,
  resultCount: number,
  durationMs: number,
): void {
  try {
    metrics.logGraphQuery({
      source: metrics.determineQuerySource(),
      sessionId: process.env.CLAUDE_SESSION_ID,
      workflowId: process.env.WORKFLOW_ID,
      queryType,
      queryParams,
      resultCount,
      durationMs,
    });
  } catch (error) {
    // Log warning but don't break the query - metrics are non-critical
    logger.warn(
      `Failed to log graph query metrics: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function handleGraphCommands(
  command: string,
  args: string[],
): Promise<void> {
  // Parse --quiet flag for suppressing verbose output (useful for hooks)
  const quiet = args.includes("--quiet");
  const filteredArgs = args.filter((arg) => arg !== "--quiet");

  if (command === "parse") {
    // Usage: graph parse <package-path> [package-name] [--quiet]
    const packagePath = filteredArgs[0];
    const packageName = filteredArgs[1];
    if (!packagePath) {
      throw new Error(
        "Usage: graph parse <package-path> [package-name] [--quiet]",
      );
    }

    if (!quiet) logger.info(`Parsing package: ${packagePath}`);
    const parseResult = parsePackage(packagePath, packageName);

    if (!quiet) {
      logger.info(`Found ${parseResult.entities.length} entities`);
      logger.info(`Found ${parseResult.relationships.length} relationships`);
      logger.info(`Storing graph data for package: ${parseResult.package}`);
    }
    const storeResult = storeGraph(parseResult, parseResult.package);

    // Create CodeDoc entities with embeddings for semantic search
    // This enables "what does this function do?" queries
    const codeDocResult = await storeCodeDocs(parseResult);

    // Always output final JSON (allows hooks to detect success/failure)
    // Use stdout.write to avoid logger formatting that would corrupt JSON
    process.stdout.write(
      JSON.stringify(
        {
          command: "parse",
          packagePath,
          packageName: parseResult.package,
          ...parseResult.stats,
          stored: {
            entities: storeResult.entitiesStored,
            relationships: storeResult.relationshipsStored,
            codeDocs: codeDocResult.codeDocsCreated,
          },
        },
        null,
        2,
      ) + "\n",
    );
  } else if (command === "what-calls") {
    // Usage: graph what-calls <name>
    const name = filteredArgs[0];
    if (!name) {
      throw new Error("Usage: graph what-calls <name>");
    }

    const startTime = performance.now();
    const results = whatCalls(name);
    const durationMs = Math.round(performance.now() - startTime);
    logQuery(
      "what-calls",
      JSON.stringify({ name }),
      results.length,
      durationMs,
    );

    process.stdout.write(
      JSON.stringify(
        { query: "what-calls", name, results, count: results.length },
        null,
        2,
      ) + "\n",
    );
  } else if (command === "what-depends-on") {
    // Usage: graph what-depends-on <name>
    const name = filteredArgs[0];
    if (!name) {
      throw new Error("Usage: graph what-depends-on <name>");
    }

    const startTime = performance.now();
    const results = whatDependsOn(name);
    const durationMs = Math.round(performance.now() - startTime);
    logQuery(
      "what-depends-on",
      JSON.stringify({ name }),
      results.length,
      durationMs,
    );

    process.stdout.write(
      JSON.stringify(
        { query: "what-depends-on", name, results, count: results.length },
        null,
        2,
      ) + "\n",
    );
  } else if (command === "blast-radius") {
    // Usage: graph blast-radius <file>
    const file = filteredArgs[0];
    if (!file) {
      throw new Error("Usage: graph blast-radius <file>");
    }

    const startTime = performance.now();
    const results = blastRadius(file);
    const durationMs = Math.round(performance.now() - startTime);
    logQuery(
      "blast-radius",
      JSON.stringify({ file }),
      results.length,
      durationMs,
    );

    process.stdout.write(
      JSON.stringify(
        { query: "blast-radius", file, results, count: results.length },
        null,
        2,
      ) + "\n",
    );
  } else if (command === "find") {
    // Usage: graph find <name> [type]
    const name = filteredArgs[0];
    const type = filteredArgs[1];
    if (!name) {
      throw new Error("Usage: graph find <name> [type]");
    }

    const validTypes = [
      "function",
      "class",
      "type",
      "interface",
      "variable",
      "file",
    ];
    if (type && !validTypes.includes(type)) {
      throw new Error(
        `Invalid type "${type}". Valid types: ${validTypes.join(", ")}`,
      );
    }

    const startTime = performance.now();
    const results = findEntities(name, type);
    const durationMs = Math.round(performance.now() - startTime);
    logQuery(
      "find",
      JSON.stringify({ name, type }),
      results.length,
      durationMs,
    );

    process.stdout.write(
      JSON.stringify(
        { query: "find", name, type, results, count: results.length },
        null,
        2,
      ) + "\n",
    );
  } else if (command === "exports") {
    // Usage: graph exports [package]
    const pkg = filteredArgs[0];

    const startTime = performance.now();
    const results = getExports(pkg);
    const durationMs = Math.round(performance.now() - startTime);
    logQuery(
      "exports",
      JSON.stringify({ package: pkg || "all" }),
      results.length,
      durationMs,
    );

    process.stdout.write(
      JSON.stringify(
        {
          query: "exports",
          package: pkg || "all",
          results,
          count: results.length,
        },
        null,
        2,
      ) + "\n",
    );
  } else if (command === "summary") {
    // Usage: graph summary [package]
    const pkg = filteredArgs[0];

    const summary = getSummary(pkg);
    process.stdout.write(
      JSON.stringify(
        {
          query: "summary",
          package: pkg || "all",
          ...summary,
        },
        null,
        2,
      ) + "\n",
    );
  } else if (command === "callers") {
    // Usage: graph callers <function-name>
    const name = filteredArgs[0];
    if (!name) {
      throw new Error("Usage: graph callers <function-name>");
    }

    const startTime = performance.now();
    const results = getCallers(name);
    const durationMs = Math.round(performance.now() - startTime);
    logQuery("callers", JSON.stringify({ name }), results.length, durationMs);

    process.stdout.write(
      JSON.stringify(
        { query: "callers", name, results, count: results.length },
        null,
        2,
      ) + "\n",
    );
  } else {
    throw new Error(
      `Unknown graph command: ${command}\n` +
        `Available commands:\n` +
        `  parse <path> [name]    - Parse a package and store graph data\n` +
        `  what-calls <name>      - Find what calls the specified function\n` +
        `  what-depends-on <name> - Find dependencies on an entity\n` +
        `  blast-radius <file>    - Find entities affected by changes to a file\n` +
        `  find <name> [type]     - Search for entities by name\n` +
        `  exports [package]      - List exported entities\n` +
        `  callers <function>     - Find direct callers of a function\n` +
        `  summary [package]      - Show graph statistics`,
    );
  }
}
