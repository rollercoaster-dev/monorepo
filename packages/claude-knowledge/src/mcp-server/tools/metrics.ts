/**
 * Metrics MCP Tools
 *
 * Provides tools for logging and querying tool usage metrics.
 * Used by PreToolUse hook to track Claude's tool selection patterns.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { metrics } from "../../checkpoint/metrics.js";

/**
 * Tool definitions for metrics operations.
 */
export const metricsTools: Tool[] = [
  {
    name: "metrics_log_tool_usage",
    description:
      "Log a tool usage event for metrics tracking. " +
      "Called by PreToolUse hook to track all tool calls. " +
      "Categories: graph, search, read, write, other.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "Session identifier for grouping tool usage",
        },
        toolName: {
          type: "string",
          description:
            "Name of the tool being used (e.g., 'Grep', 'graph_find')",
        },
      },
      required: ["sessionId", "toolName"],
    },
  },
  {
    name: "metrics_get_tool_usage",
    description:
      "Get tool usage summary for a session. " +
      "Returns counts by category and graph/search ratio.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "Session identifier to get stats for",
        },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "metrics_get_tool_usage_aggregate",
    description:
      "Get aggregate tool usage stats across all sessions. " +
      "Useful for analyzing overall tool selection patterns.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

/**
 * Handle metrics tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool result with content
 */
export async function handleMetricsToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    switch (name) {
      case "metrics_log_tool_usage": {
        const sessionId = args.sessionId as string;
        const toolName = args.toolName as string;

        if (!sessionId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "sessionId is required" }),
              },
            ],
            isError: true,
          };
        }

        if (!toolName) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "toolName is required" }),
              },
            ],
            isError: true,
          };
        }

        metrics.logToolUsage(sessionId, toolName);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                logged: true,
                sessionId,
                toolName,
                category: metrics.categorizeToolName(toolName),
              }),
            },
          ],
        };
      }

      case "metrics_get_tool_usage": {
        const sessionId = args.sessionId as string;

        if (!sessionId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "sessionId is required" }),
              },
            ],
            isError: true,
          };
        }

        const summary = metrics.getToolUsageSummary(sessionId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case "metrics_get_tool_usage_aggregate": {
        const aggregate = metrics.getToolUsageAggregate();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(aggregate, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Unknown metrics tool: ${name}` }),
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
