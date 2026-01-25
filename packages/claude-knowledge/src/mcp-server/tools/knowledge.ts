/**
 * Knowledge MCP Tools
 *
 * Provides tools for querying and storing learnings in the knowledge graph.
 * These tools wrap the knowledge module's core functionality for MCP access.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { knowledge } from "../../knowledge/index.js";
import type { Learning, QueryContext } from "../../types.js";
import type { SearchSimilarOptions } from "../../knowledge/semantic.js";

/**
 * Tool definitions for knowledge operations.
 */
export const knowledgeTools: Tool[] = [
  {
    name: "knowledge_query",
    description:
      "Structured lookup of learnings by code area, file, or issue number. " +
      "When working in a specific area (auth, database, API), learnings tagged to that area contain hard-won insights. " +
      "When touching a file, past mistakes on that file are exactly what you need to avoid repeating.",
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
      "Learnings captured now persist for future work. Gotchas that cost you time, non-obvious solutions, patterns that worked well - " +
      "these become searchable knowledge. What you learn today helps tomorrow. Capture immediately while context is fresh.",
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
  {
    name: "knowledge_search_similar",
    description:
      "You have accumulated learnings from past work. This searches them semantically - " +
      "'auth validation' finds 'credential verification' even without exact words. " +
      "Checking here first surfaces solutions, gotchas, and patterns already discovered, saving you from re-solving problems or repeating past mistakes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Natural language query to find similar learnings",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10)",
          default: 10,
        },
        threshold: {
          type: "number",
          description: "Minimum similarity score 0.0-1.0 (default: 0.3)",
          default: 0.3,
        },
        includeRelated: {
          type: "boolean",
          description: "Include related patterns and mistakes (default: false)",
          default: false,
        },
      },
      required: ["query"],
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

      case "knowledge_search_similar": {
        const query = args.query as string;
        if (!query) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "query is required" }),
              },
            ],
            isError: true,
          };
        }

        const options: SearchSimilarOptions = {
          limit: (args.limit as number) || 10,
          threshold: (args.threshold as number) || 0.3,
          includeRelated: (args.includeRelated as boolean) || false,
        };

        const results = await knowledge.searchSimilar(query, options);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    message: "No similar learnings found",
                    query,
                    threshold: options.threshold,
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
                  query,
                  results: results.map((r) => ({
                    similarity: r.relevanceScore?.toFixed(3),
                    learning: {
                      id: r.learning.id,
                      content: r.learning.content,
                      codeArea: r.learning.codeArea,
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
