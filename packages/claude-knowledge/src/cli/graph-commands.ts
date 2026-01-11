/**
 * Graph query CLI commands.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * Refactored from prototype (#431) to use graph API instead of inline SQL.
 */

import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  whatCalls,
  whatDependsOn,
  blastRadius,
  findEntities,
  getExports,
  getCallers,
  getSummary,
} from "../graph";

export async function handleGraphCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "what-calls") {
    // Usage: graph what-calls <name>
    const name = args[0];
    if (!name) {
      throw new Error("Usage: graph what-calls <name>");
    }

    const results = whatCalls(name);
    logger.info(
      JSON.stringify(
        { query: "what-calls", name, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "what-depends-on") {
    // Usage: graph what-depends-on <name>
    const name = args[0];
    if (!name) {
      throw new Error("Usage: graph what-depends-on <name>");
    }

    const results = whatDependsOn(name);
    logger.info(
      JSON.stringify(
        { query: "what-depends-on", name, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "blast-radius") {
    // Usage: graph blast-radius <file>
    const file = args[0];
    if (!file) {
      throw new Error("Usage: graph blast-radius <file>");
    }

    const results = blastRadius(file);
    logger.info(
      JSON.stringify(
        { query: "blast-radius", file, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "find") {
    // Usage: graph find <name> [type]
    const name = args[0];
    const type = args[1];
    if (!name) {
      throw new Error("Usage: graph find <name> [type]");
    }

    const results = findEntities(name, type);
    logger.info(
      JSON.stringify(
        { query: "find", name, type, results, count: results.length },
        null,
        2,
      ),
    );
  } else if (command === "exports") {
    // Usage: graph exports [package]
    const pkg = args[0];

    const results = getExports(pkg);
    logger.info(
      JSON.stringify(
        {
          query: "exports",
          package: pkg || "all",
          results,
          count: results.length,
        },
        null,
        2,
      ),
    );
  } else if (command === "summary") {
    // Usage: graph summary [package]
    const pkg = args[0];

    const summary = getSummary(pkg);
    logger.info(
      JSON.stringify(
        {
          query: "summary",
          package: pkg || "all",
          ...summary,
        },
        null,
        2,
      ),
    );
  } else if (command === "callers") {
    // Usage: graph callers <function-name>
    const name = args[0];
    if (!name) {
      throw new Error("Usage: graph callers <function-name>");
    }

    const results = getCallers(name);
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
