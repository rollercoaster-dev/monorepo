/**
 * Checkpoint Workflow MCP Tools
 *
 * Provides tools for managing workflow checkpoints during issue execution.
 * These tools wrap the checkpoint module's core functionality for MCP access.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { checkpoint } from "../../checkpoint/index.js";
import type { WorkflowPhase, WorkflowStatus } from "../../types.js";

/**
 * Tool definitions for checkpoint workflow operations.
 */
export const checkpointTools: Tool[] = [
  {
    name: "checkpoint_workflow_find",
    description:
      "Find an existing workflow checkpoint by issue number. " +
      "Returns the most recent workflow for the issue with its actions and commits. " +
      "Use to check if work has already started on an issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueNumber: {
          type: "number",
          description: "GitHub issue number to find workflow for",
        },
      },
      required: ["issueNumber"],
    },
  },
  {
    name: "checkpoint_workflow_create",
    description:
      "Create a new workflow checkpoint for an issue. " +
      "Initializes the workflow in 'research' phase with 'running' status. " +
      "Use at the start of /work-on-issue or /auto-issue workflows.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueNumber: {
          type: "number",
          description: "GitHub issue number",
        },
        branch: {
          type: "string",
          description: "Git branch name for this workflow",
        },
        worktree: {
          type: "string",
          description: "Optional worktree path if using git worktrees",
        },
        taskId: {
          type: "string",
          description: "Optional native task ID for task system integration",
        },
      },
      required: ["issueNumber", "branch"],
    },
  },
  {
    name: "checkpoint_workflow_update",
    description:
      "Update workflow phase and/or status. " +
      "Use to track progress through workflow phases (research → implement → review → finalize). " +
      "Also use to mark workflow as paused, completed, or failed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflowId: {
          type: "string",
          description: "Workflow ID to update",
        },
        phase: {
          type: "string",
          enum: [
            "research",
            "implement",
            "review",
            "finalize",
            "planning",
            "execute",
            "merge",
            "cleanup",
          ],
          description: "New workflow phase",
        },
        status: {
          type: "string",
          enum: ["running", "paused", "completed", "failed"],
          description: "New workflow status",
        },
        taskId: {
          type: "string",
          description: "Link workflow to a native task ID",
        },
      },
      required: ["workflowId"],
    },
  },
];

/**
 * Handle checkpoint tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool result with content
 */
export async function handleCheckpointToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    switch (name) {
      case "checkpoint_workflow_find": {
        const issueNumber = args.issueNumber as number;
        if (issueNumber === undefined) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "issueNumber is required" }),
              },
            ],
            isError: true,
          };
        }

        const data = checkpoint.findByIssue(issueNumber);

        if (!data) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    found: false,
                    message: `No workflow found for issue #${issueNumber}`,
                    issueNumber,
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
                  found: true,
                  workflow: {
                    id: data.workflow.id,
                    issueNumber: data.workflow.issueNumber,
                    branch: data.workflow.branch,
                    worktree: data.workflow.worktree,
                    phase: data.workflow.phase,
                    status: data.workflow.status,
                    retryCount: data.workflow.retryCount,
                    taskId: data.workflow.taskId ?? null,
                    createdAt: data.workflow.createdAt,
                    updatedAt: data.workflow.updatedAt,
                  },
                  actionCount: data.actions.length,
                  commitCount: data.commits.length,
                  recentActions: data.actions.slice(-5).map((a) => ({
                    action: a.action,
                    result: a.result,
                    createdAt: a.createdAt,
                  })),
                  commits: data.commits.map((c) => ({
                    sha: c.sha.slice(0, 7),
                    message: c.message,
                    createdAt: c.createdAt,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "checkpoint_workflow_create": {
        const issueNumber = args.issueNumber as number;
        const branch = args.branch as string;

        if (issueNumber === undefined) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "issueNumber is required" }),
              },
            ],
            isError: true,
          };
        }

        if (!branch) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "branch is required" }),
              },
            ],
            isError: true,
          };
        }

        const worktree = args.worktree as string | undefined;
        const taskId = args.taskId as string | undefined;
        const workflow = checkpoint.create(
          issueNumber,
          branch,
          worktree,
          taskId,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Workflow created successfully",
                  workflow: {
                    id: workflow.id,
                    issueNumber: workflow.issueNumber,
                    branch: workflow.branch,
                    worktree: workflow.worktree,
                    phase: workflow.phase,
                    status: workflow.status,
                    taskId: workflow.taskId ?? null,
                    createdAt: workflow.createdAt,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "checkpoint_workflow_update": {
        const workflowId = args.workflowId as string;
        if (!workflowId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "workflowId is required" }),
              },
            ],
            isError: true,
          };
        }

        const phase = args.phase as WorkflowPhase | undefined;
        const status = args.status as WorkflowStatus | undefined;
        const taskId = args.taskId as string | undefined;

        if (!phase && !status && !taskId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error:
                    "At least one of phase, status, or taskId must be provided",
                }),
              },
            ],
            isError: true,
          };
        }

        const updates: string[] = [];

        if (phase) {
          checkpoint.setPhase(workflowId, phase);
          updates.push(`phase → ${phase}`);
        }

        if (status) {
          checkpoint.setStatus(workflowId, status);
          updates.push(`status → ${status}`);
        }

        if (taskId) {
          const data = checkpoint.load(workflowId);
          if (!data) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: `Workflow not found: ${workflowId}`,
                  }),
                },
              ],
              isError: true,
            };
          }
          data.workflow.taskId = taskId;
          checkpoint.save(data.workflow);
          updates.push(`taskId → ${taskId}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  workflowId,
                  updates,
                  message: `Workflow updated: ${updates.join(", ")}`,
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
                error: `Unknown checkpoint tool: ${name}`,
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
