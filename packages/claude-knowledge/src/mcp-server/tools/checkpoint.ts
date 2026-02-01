/**
 * Checkpoint Workflow MCP Tools
 *
 * Provides tools for managing workflow checkpoints during issue execution.
 * These tools wrap the checkpoint module's core functionality for MCP access.
 *
 * Consolidated from 4 tools to 2:
 * - `wf` (absorbs wf/wfnew/wfupdate via action param)
 * - `recover` (unchanged — different interface)
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { checkpoint } from "../../checkpoint/index.js";
import type {
  TaskRecoveryPlan,
  WorkflowPhase,
  WorkflowStatus,
} from "../../types.js";

/**
 * Tool definitions for checkpoint workflow operations.
 */
export const checkpointTools: Tool[] = [
  {
    name: "wf",
    description:
      "Manage workflow checkpoints. " +
      "action=find (default): find workflow by issue number. " +
      "action=create: start tracking a new workflow (requires issueNumber, branch). " +
      "action=update: update phase/status (requires workflowId, plus phase/status/taskId).",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["find", "create", "update"],
          description: "Which workflow operation to perform (default: find)",
        },
        issueNumber: {
          type: "number",
          description:
            "GitHub issue number (required for find and create actions)",
        },
        branch: {
          type: "string",
          description: "Git branch name (required for create action)",
        },
        worktree: {
          type: "string",
          description:
            "Optional worktree path if using git worktrees (create action)",
        },
        taskId: {
          type: "string",
          description:
            "Optional native task ID (create action) or link to task (update action)",
        },
        workflowId: {
          type: "string",
          description: "Workflow ID to update (required for update action)",
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
          description: "New workflow phase (update action)",
        },
        status: {
          type: "string",
          enum: ["running", "paused", "completed", "failed"],
          description: "New workflow status (update action)",
        },
      },
      required: [],
    },
  },
  {
    name: "recover",
    description:
      "Rebuilds the task tree from checkpoint state after interruption. " +
      "Tasks, their statuses, and dependencies are restored so work can continue with accurate progress tracking. " +
      "Returns a plan of TaskCreate/TaskUpdate calls to execute.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueNumber: {
          type: "number",
          description:
            "GitHub issue number to recover tasks for (for single-issue workflows)",
        },
        milestoneName: {
          type: "string",
          description:
            "Milestone name to recover tasks for (for /auto-milestone workflows)",
        },
        workflowType: {
          type: "string",
          enum: ["work-on-issue", "auto-issue"],
          description:
            "Force workflow type detection (optional, auto-detected if omitted)",
        },
      },
      // Neither is required - at least one must be provided
      required: [],
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
      case "wf": {
        // Default action to "find" for backward compatibility
        const action = (args.action as string) ?? "find";

        switch (action) {
          case "find": {
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

          case "create": {
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

          case "update": {
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
                    error: `Unknown wf action: ${action}`,
                  }),
                },
              ],
              isError: true,
            };
        }
      }

      // Backward compatibility aliases
      case "wfnew":
        return handleCheckpointToolCall("wf", {
          ...args,
          action: "create",
        });
      case "wfupdate":
        return handleCheckpointToolCall("wf", {
          ...args,
          action: "update",
        });

      case "recover": {
        const issueNumber = args.issueNumber as number | undefined;
        const milestoneName = args.milestoneName as string | undefined;
        const workflowType = args.workflowType as
          | "work-on-issue"
          | "auto-issue"
          | undefined;

        // Validate exactly one identifier is provided
        if (issueNumber === undefined && !milestoneName) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Either issueNumber or milestoneName must be provided",
                }),
              },
            ],
            isError: true,
          };
        }

        if (issueNumber !== undefined && milestoneName) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error:
                    "Provide either issueNumber or milestoneName, not both",
                }),
              },
            ],
            isError: true,
          };
        }

        // Recover by milestone if milestoneName provided
        if (milestoneName) {
          const plan = checkpoint.recoverTasksByMilestone(milestoneName);
          if (!plan) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    found: false,
                    message: `No milestone found with name "${milestoneName}"`,
                    milestoneName,
                  }),
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
                    recoveryPlan: plan,
                    instructions: formatRecoveryInstructions(plan),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Recover by issue number
        const plan = checkpoint.recoverTasksByIssue(issueNumber!, workflowType);
        if (!plan) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  found: false,
                  message: `No workflow found for issue #${issueNumber}`,
                  issueNumber,
                }),
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
                  recoveryPlan: plan,
                  instructions: formatRecoveryInstructions(plan),
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

/**
 * Format recovery instructions for Claude to execute.
 * Returns a string with TaskCreate/TaskUpdate pseudocode.
 */
function formatRecoveryInstructions(plan: TaskRecoveryPlan): string {
  const lines: string[] = [
    `# Task Recovery for ${plan.workflowType}`,
    `# ${plan.summary}`,
    "",
    "# Execute these TaskCreate/TaskUpdate calls in order:",
    "",
  ];

  // Track task variable names for blockedBy references
  const taskVars: string[] = [];

  for (let i = 0; i < plan.tasks.length; i++) {
    const task = plan.tasks[i];
    const varName = `task${i}`;
    taskVars.push(varName);

    // TaskCreate call (use JSON.stringify for safe string escaping)
    lines.push(`${varName} = TaskCreate({`);
    lines.push(`  subject: ${JSON.stringify(task.subject)},`);
    lines.push(`  description: ${JSON.stringify(task.description)},`);
    lines.push(`  activeForm: ${JSON.stringify(task.activeForm)},`);
    lines.push(`  metadata: ${JSON.stringify(task.metadata)}`);
    lines.push(`})`);

    // Set blockedBy if needed
    if (task.blockedByIndices.length > 0) {
      const blockers = task.blockedByIndices.map((idx) => taskVars[idx]);
      lines.push(
        `TaskUpdate(${varName}, { addBlockedBy: [${blockers.join(", ")}] })`,
      );
    }

    // Set status if not pending (default)
    if (task.status === "completed") {
      lines.push(`TaskUpdate(${varName}, { status: "completed" })`);
    } else if (task.status === "in_progress") {
      lines.push(`TaskUpdate(${varName}, { status: "in_progress" })`);
    }

    lines.push("");
  }

  lines.push("# Show recovered task tree");
  lines.push("TaskList()");

  return lines.join("\n");
}
