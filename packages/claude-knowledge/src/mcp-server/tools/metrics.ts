/**
 * Metrics MCP Tools
 *
 * Provides tools for logging and querying tool usage metrics.
 * Used by PreToolUse hook to track Claude's tool selection patterns.
 *
 * Consolidated from 8 tools to 2:
 * - `metrics` (absorbs mlog/mstats/magg)
 * - `taskinfo` (absorbs snaps/tasks/tree/progress/children)
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { metrics } from "../../checkpoint/metrics.js";

/**
 * Tool definitions for metrics operations.
 */
export const metricsTools: Tool[] = [
  {
    name: "metrics",
    description:
      "Log tool usage or query usage stats. " +
      "action=log: log a tool call (requires sessionId, toolName). " +
      "action=summary: get session stats (requires sessionId). " +
      "action=aggregate: get stats across all sessions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["log", "summary", "aggregate"],
          description: "Which metrics operation to perform",
        },
        sessionId: {
          type: "string",
          description:
            "Session identifier (required for log and summary actions)",
        },
        toolName: {
          type: "string",
          description:
            "Name of the tool being used (required for log action, e.g., 'Grep', 'defs')",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "taskinfo",
    description:
      "Query task snapshots, metrics, tree, progress, or children. " +
      "query=snapshots: get task snapshots (optional workflowId). " +
      "query=metrics: get aggregated task metrics. " +
      "query=tree: get hierarchical task tree (optional workflowId). " +
      "query=progress: get task progress (requires taskId). " +
      "query=children: get child tasks (requires parentTaskId).",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          enum: ["snapshots", "metrics", "tree", "progress", "children"],
          description: "Which task info query to run",
        },
        workflowId: {
          type: "string",
          description:
            "Optional workflow ID to filter by (for snapshots and tree queries)",
        },
        taskId: {
          type: "string",
          description:
            "Task ID to get progress for (required for progress query)",
        },
        parentTaskId: {
          type: "string",
          description:
            "Parent task ID to get children for (required for children query)",
        },
      },
      required: ["query"],
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
      case "metrics": {
        const action = args.action as string;

        switch (action) {
          case "log": {
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

          case "summary": {
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

          case "aggregate": {
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
                  text: JSON.stringify({
                    error: `Unknown metrics action: ${action}`,
                  }),
                },
              ],
              isError: true,
            };
        }
      }

      case "taskinfo": {
        const query = args.query as string;

        switch (query) {
          case "snapshots": {
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

          case "metrics": {
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
                    text: JSON.stringify({
                      error: "parentTaskId is required",
                    }),
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
                  text: JSON.stringify({
                    error: `Unknown taskinfo query: ${query}`,
                  }),
                },
              ],
              isError: true,
            };
        }
      }

      // Backward compatibility aliases
      case "mlog":
        return handleMetricsToolCall("metrics", {
          ...args,
          action: "log",
        });
      case "mstats":
        return handleMetricsToolCall("metrics", {
          ...args,
          action: "summary",
        });
      case "magg":
        return handleMetricsToolCall("metrics", {
          ...args,
          action: "aggregate",
        });
      case "snaps":
        return handleMetricsToolCall("taskinfo", {
          ...args,
          query: "snapshots",
        });
      case "tasks":
        return handleMetricsToolCall("taskinfo", {
          ...args,
          query: "metrics",
        });
      case "tree":
        return handleMetricsToolCall("taskinfo", {
          ...args,
          query: "tree",
        });
      case "progress":
        return handleMetricsToolCall("taskinfo", {
          ...args,
          query: "progress",
        });
      case "children":
        return handleMetricsToolCall("taskinfo", {
          ...args,
          query: "children",
        });

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
