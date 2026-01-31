/**
 * Graph MCP Tools
 *
 * Provides tools for querying the code graph (callers, dependencies, blast radius).
 * These tools wrap the graph module's core functionality for MCP access.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { graph } from "../../graph/index.js";

/**
 * Tool definitions for graph operations.
 */
export const graphTools: Tool[] = [
  {
    name: "callers",
    description:
      "Shows every function that calls a given function, with exact file:line. " +
      "When changing a function's behavior or signature, these are the places that will be affected. " +
      "String search finds mentions; this finds actual call sites in the AST.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description:
            "Function or method name to search for (supports partial matches)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "blast",
    description:
      "Maps all files that depend on a given file, transitively. " +
      "Before modifying shared code, this shows the full impact - files 3 imports away that will break. " +
      "Prevents surprise failures in distant parts of the codebase.",
    inputSchema: {
      type: "object" as const,
      properties: {
        file: {
          type: "string",
          description: "File path to analyze (supports partial matches)",
        },
        maxDepth: {
          type: "number",
          description: "Maximum traversal depth (default: 5)",
          default: 5,
        },
      },
      required: ["file"],
    },
  },
  {
    name: "defs",
    description:
      "The code graph indexes all definitions (functions, classes, types) with file:line locations. " +
      "Returns precise matches - asking for 'store' finds the definition, not every usage of the word. " +
      "Grep returns hundreds of string matches; this returns the 5 declarations you actually need.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Entity name to search for (supports partial matches)",
        },
        type: {
          type: "string",
          enum: ["function", "class", "type", "interface", "variable", "file"],
          description: "Optional filter by entity type",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 20)",
          default: 20,
        },
      },
      required: ["name"],
    },
  },
];

/**
 * Handle graph tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool result with content
 */
export async function handleGraphToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    switch (name) {
      case "callers": {
        const fnName = args.name as string;
        if (!fnName) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "name is required" }),
              },
            ],
            isError: true,
          };
        }

        const callers = graph.whatCalls(fnName);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: fnName,
                  count: callers.length,
                  callers: callers.map((c) => ({
                    name: c.name,
                    file: c.file_path,
                    line: c.line_number,
                    type: c.type,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "blast": {
        const file = args.file as string;
        if (!file) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "file is required" }),
              },
            ],
            isError: true,
          };
        }

        const maxDepth = (args.maxDepth as number) || 5;
        const affected = graph.blastRadius(file, maxDepth);

        // Group by depth for clearer output
        const byDepth: Record<number, typeof affected> = {};
        for (const entity of affected) {
          const depth = entity.depth;
          if (!byDepth[depth]) byDepth[depth] = [];
          byDepth[depth].push(entity);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  file,
                  maxDepth,
                  totalAffected: affected.length,
                  byDepth: Object.entries(byDepth).map(([depth, entities]) => ({
                    depth: parseInt(depth),
                    count: entities.length,
                    entities: entities.map((e) => ({
                      name: e.name,
                      file: e.file_path,
                      type: e.type,
                    })),
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "defs": {
        const entityName = args.name as string;
        if (!entityName) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "name is required" }),
              },
            ],
            isError: true,
          };
        }

        const entityType = args.type as string | undefined;
        const limit = (args.limit as number) || 20;

        const entities = graph.findEntities(entityName, entityType, limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: entityName,
                  type: entityType || "any",
                  count: entities.length,
                  entities: entities.map((e) => ({
                    id: e.id,
                    name: e.name,
                    type: e.type,
                    file: e.filePath,
                    line: e.lineNumber,
                    exported: e.exported,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Unknown graph tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
}
