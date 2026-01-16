/**
 * Knowledge MCP Tools
 *
 * Provides tools for querying and storing learnings in the knowledge graph.
 * These tools wrap the knowledge module's core functionality for MCP access.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { knowledge } from "../../knowledge/index.js";
import type { Learning, QueryContext } from "../../types.js";

/**
 * Tool definitions for knowledge operations.
 */
export const knowledgeTools: Tool[] = [
  {
    name: "knowledge_query",
    description:
      "Query the knowledge graph for learnings, patterns, and mistakes. " +
      "Use to find relevant past learnings before implementing features or fixing bugs. " +
      "Returns learnings with related patterns and mistakes via graph traversal.",
    inputSchema: {
      type: "object" as const,
      properties: {
        codeArea: {
          type: "string",
          description:
            "Filter by code area (e.g., 'authentication', 'database', 'API')",
        },
        filePath: {
          type: "string",
          description: "Filter by file path (e.g., 'src/utils/auth.ts')",
        },
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "Keywords to search in learning content",
        },
        issueNumber: {
          type: "number",
          description: "Filter by source issue number",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10)",
          default: 10,
        },
      },
    },
  },
  {
    name: "knowledge_store",
    description:
      "Store a new learning in the knowledge graph. " +
      "Use to capture insights, patterns discovered, or lessons learned during development. " +
      "Learnings are automatically linked to code areas and files.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "The learning content to store",
        },
        codeArea: {
          type: "string",
          description: "Code area this learning relates to",
        },
        filePath: {
          type: "string",
          description: "File path this learning relates to",
        },
        sourceIssue: {
          type: "number",
          description: "Issue number this learning came from",
        },
        confidence: {
          type: "number",
          description: "Confidence level (0.0-1.0)",
          minimum: 0,
          maximum: 1,
        },
      },
      required: ["content"],
    },
  },
];

/**
 * Handle knowledge tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool result with content
 */
export async function handleKnowledgeToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    switch (name) {
      case "knowledge_query": {
        const context: QueryContext = {
          codeArea: args.codeArea as string | undefined,
          filePath: args.filePath as string | undefined,
          keywords: args.keywords as string[] | undefined,
          issueNumber: args.issueNumber as number | undefined,
          limit: (args.limit as number) || 10,
        };

        const results = await knowledge.query(context);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    message: "No learnings found matching the query",
                    query: context,
                    results: [],
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: results.length,
                  results: results.map((r) => ({
                    learning: {
                      id: r.learning.id,
                      content: r.learning.content,
                      codeArea: r.learning.codeArea,
                      filePath: r.learning.filePath,
                      confidence: r.learning.confidence,
                      sourceIssue: r.learning.sourceIssue,
                    },
                    relatedPatterns: r.relatedPatterns?.map((p) => ({
                      id: p.id,
                      name: p.name,
                      description: p.description,
                    })),
                    relatedMistakes: r.relatedMistakes?.map((m) => ({
                      id: m.id,
                      description: m.description,
                      howFixed: m.howFixed,
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

      case "knowledge_store": {
        const content = args.content as string;
        if (!content) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "content is required" }),
              },
            ],
            isError: true,
          };
        }

        const learning: Learning = {
          id: `learning-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          content,
          codeArea: args.codeArea as string | undefined,
          filePath: args.filePath as string | undefined,
          sourceIssue: args.sourceIssue as number | undefined,
          confidence: args.confidence as number | undefined,
        };

        await knowledge.store([learning]);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Learning stored successfully",
                  learning: {
                    id: learning.id,
                    content: learning.content,
                    codeArea: learning.codeArea,
                    filePath: learning.filePath,
                  },
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
              text: JSON.stringify({
                error: `Unknown knowledge tool: ${name}`,
              }),
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
