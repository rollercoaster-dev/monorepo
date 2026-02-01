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
    name: "mlog",
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
          description: "Name of the tool being used (e.g., 'Grep', 'defs')",
        },
      },
      required: ["sessionId", "toolName"],
    },
  },
  {
    name: "mstats",
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
    name: "magg",
    description:
      "Get aggregate tool usage stats across all sessions. " +
      "Useful for analyzing overall tool selection patterns.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "snaps",
    description:
      "Get task snapshots for a workflow (or all workflows). " +
      "Returns task state captured at workflow phase boundaries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflowId: {
          type: "string",
          description:
            "Optional workflow ID to filter by. Omit to get all snapshots.",
        },
      },
      required: [],
    },
  },
  {
    name: "tasks",
    description:
      "Get aggregated task metrics across all workflows. " +
      "Returns completion rates, duration statistics, and breakdown by phase/workflow.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "tree",
    description:
      "Get hierarchical task tree for a workflow. " +
      "Returns tasks with their children nested and progress aggregated. " +
      "Use to visualize task hierarchy in complex workflows.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflowId: {
          type: "string",
          description:
            "Optional workflow ID to filter by. Omit to get all tasks.",
        },
      },
      required: [],
    },
  },
  {
    name: "progress",
    description:
      "Get progress for a specific task, including child task aggregation. " +
      "Returns total, completed, in-progress, pending counts and percentage. " +
      "Progress rolls up from children for parent tasks.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "Task ID to get progress for",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "children",
    description:
      "Get child tasks for a parent task. " +
      "Returns the most recent snapshot for each child. " +
      "Use to explore task hierarchy.",
    inputSchema: {
      type: "object" as const,
      properties: {
        parentTaskId: {
          type: "string",
          description: "Parent task ID to get children for",
        },
      },
      required: ["parentTaskId"],
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
      case "mlog": {
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

      case "mstats": {
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

      case "magg": {
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

      case "snaps": {
        const workflowId = args.workflowId as string | undefined;
        const snapshots = metrics.getTaskSnapshots(workflowId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(snapshots, null, 2),
            },
          ],
        };
      }

      case "tasks": {
        const taskMetrics = metrics.getTaskMetrics();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(taskMetrics, null, 2),
            },
          ],
        };
      }

      case "tree": {
        const workflowId = args.workflowId as string | undefined;
        const tree = metrics.getTaskTree(workflowId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tree, null, 2),
            },
          ],
        };
      }

      case "progress": {
        const taskId = args.taskId as string;

        if (!taskId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "taskId is required" }),
              },
            ],
            isError: true,
          };
        }

        const progress = metrics.getTaskProgress(taskId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(progress, null, 2),
            },
          ],
        };
      }

      case "children": {
        const parentTaskId = args.parentTaskId as string;

        if (!parentTaskId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "parentTaskId is required" }),
              },
            ],
            isError: true,
          };
        }

        const children = metrics.getChildTasks(parentTaskId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(children, null, 2),
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
