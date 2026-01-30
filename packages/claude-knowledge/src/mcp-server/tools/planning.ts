/**
 * Planning MCP Tools
 *
 * Provides tools for managing the planning stack: push goals/interrupts,
 * pop completed items, and query stack status with stale detection.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  pushGoal,
  pushInterrupt,
  popStack,
  peekStack,
} from "../../planning/stack.js";
import { summarizeCompletion } from "../../planning/summarize.js";
import { detectStaleItems } from "../../planning/stale.js";
import { createPlan, getPlanByGoal, getEntity } from "../../planning/store.js";
import type { Goal, PlanSourceType } from "../../types.js";

/**
 * Tool definitions for planning operations.
 */
export const planningTools: Tool[] = [
  {
    name: "planning_goal_push",
    description:
      "Push a new goal onto the planning stack. Goals represent high-level work objectives. " +
      "The current focus (if any) becomes paused. Use when starting new work.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description:
            "Short title for the goal (e.g., 'Implement badge generator')",
        },
        description: {
          type: "string",
          description: "Optional longer description",
        },
        issueNumber: {
          type: "number",
          description: "Optional linked GitHub issue number",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "planning_interrupt_push",
    description:
      "Push an interrupt onto the planning stack. Interrupts represent unplanned context switches " +
      "(bugs, urgent reviews, etc.). Automatically links to what was interrupted.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short title for the interrupt (e.g., 'Fix CI failure')",
        },
        reason: {
          type: "string",
          description:
            "Why this interrupt happened (e.g., 'Tests breaking on main')",
        },
      },
      required: ["title", "reason"],
    },
  },
  {
    name: "planning_stack_pop",
    description:
      "Pop the top item from the planning stack (mark as completed). " +
      "Generates a summary, stores it as a learning, and resumes the previous item.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "planning_stack_status",
    description:
      "Get the current planning stack state with stale item detection. " +
      "Shows what you're working on, what's paused, and items that may need attention.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "planning_plan_create",
    description:
      "Create a Plan linked to a Goal on the planning stack. " +
      "Plans define structured execution steps for achieving a Goal. " +
      "Must validate that the goalId exists before creating the plan.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short title for the plan (e.g., 'Milestone 1.0')",
        },
        goalId: {
          type: "string",
          description: "ID of the Goal this plan belongs to",
        },
        sourceType: {
          type: "string",
          enum: ["milestone", "epic", "learning-path", "manual"],
          description: "Type of source for this plan",
        },
        sourceRef: {
          type: "string",
          description:
            "Optional reference identifier (milestone number, epic issue number, etc.)",
        },
      },
      required: ["title", "goalId", "sourceType"],
    },
  },
];

/**
 * Handle planning tool calls.
 */
export async function handlePlanningToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    switch (name) {
      case "planning_goal_push": {
        const title = args.title as string;
        if (!title || title.trim().length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "title is required" }),
              },
            ],
            isError: true,
          };
        }
        if (title.length > 200) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "title must be 200 characters or fewer",
                }),
              },
            ],
            isError: true,
          };
        }

        const issueNumber = args.issueNumber as number | undefined;
        if (
          issueNumber !== undefined &&
          (!Number.isInteger(issueNumber) || issueNumber < 1)
        ) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "issueNumber must be a positive integer",
                }),
              },
            ],
            isError: true,
          };
        }

        const { goal, stack } = pushGoal({
          title: title.trim(),
          description: args.description as string | undefined,
          issueNumber,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Goal pushed: "${goal.title}"`,
                  goal: {
                    id: goal.id,
                    title: goal.title,
                    issueNumber: goal.issueNumber,
                  },
                  stack: {
                    depth: stack.depth,
                    items: stack.items.map((i) => ({
                      type: i.type,
                      title: i.title,
                      status: i.status,
                    })),
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "planning_interrupt_push": {
        const title = args.title as string;
        const reason = args.reason as string;
        if (
          !title ||
          title.trim().length === 0 ||
          !reason ||
          reason.trim().length === 0
        ) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "title and reason are required",
                }),
              },
            ],
            isError: true,
          };
        }
        if (title.length > 200) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "title must be 200 characters or fewer",
                }),
              },
            ],
            isError: true,
          };
        }
        if (reason.length > 500) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "reason must be 500 characters or fewer",
                }),
              },
            ],
            isError: true,
          };
        }

        const { interrupt, interruptedItem, stack } = pushInterrupt({
          title: title.trim(),
          reason: reason.trim(),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Interrupt pushed: "${interrupt.title}"`,
                  interrupt: {
                    id: interrupt.id,
                    title: interrupt.title,
                    reason: interrupt.reason,
                  },
                  interrupted: interruptedItem
                    ? {
                        type: interruptedItem.type,
                        title: interruptedItem.title,
                      }
                    : null,
                  stack: {
                    depth: stack.depth,
                    items: stack.items.map((i) => ({
                      type: i.type,
                      title: i.title,
                      status: i.status,
                    })),
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "planning_stack_pop": {
        const { completed, resumed, stack } = popStack();

        if (!completed) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  message: "Stack is empty. Nothing to pop.",
                  stack: { depth: 0, items: [] },
                }),
              },
            ],
          };
        }

        // Generate summary and store as learning
        const summary = await summarizeCompletion(completed);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Completed: "${completed.title}"`,
                  completed: {
                    type: completed.type,
                    title: completed.title,
                    summary: summary.summary,
                    durationMs: summary.durationMs,
                    artifacts: summary.artifacts,
                  },
                  resumed: resumed
                    ? { type: resumed.type, title: resumed.title }
                    : null,
                  stack: {
                    depth: stack.depth,
                    items: stack.items.map((i) => ({
                      type: i.type,
                      title: i.title,
                      status: i.status,
                    })),
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "planning_stack_status": {
        const stack = peekStack();
        const staleItems = detectStaleItems();

        // Format stack for display
        const stackDisplay = stack.items.map((item, index) => {
          const stale = staleItems.find((s) => s.item.id === item.id);
          const entry: Record<string, unknown> = {
            position: index + 1,
            type: item.type,
            title: item.title,
            status: item.status,
            createdAt: item.createdAt,
          };

          if (item.type === "Goal" && (item as Goal).issueNumber) {
            entry.issueNumber = (item as Goal).issueNumber;
          }

          if (stale) {
            entry.staleWarning = stale.reason;
          }

          return entry;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  depth: stack.depth,
                  topItem: stack.topItem
                    ? {
                        type: stack.topItem.type,
                        title: stack.topItem.title,
                        status: stack.topItem.status,
                      }
                    : null,
                  items: stackDisplay,
                  staleCount: staleItems.length,
                  staleItems: staleItems.map((s) => ({
                    title: s.item.title,
                    reason: s.reason,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "planning_plan_create": {
        const title = args.title as string;
        const goalId = args.goalId as string;
        const sourceType = args.sourceType as PlanSourceType;
        const sourceRef = args.sourceRef as string | undefined;

        // Validate required fields
        if (!title || title.trim().length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "title is required" }),
              },
            ],
            isError: true,
          };
        }
        if (!goalId || goalId.trim().length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "goalId is required" }),
              },
            ],
            isError: true,
          };
        }
        if (!sourceType) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "sourceType is required" }),
              },
            ],
            isError: true,
          };
        }

        // Validate goalId exists
        const goal = getEntity(goalId);
        if (!goal) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Goal with id "${goalId}" not found`,
                }),
              },
            ],
            isError: true,
          };
        }

        // Check if goal already has a plan
        const existingPlan = getPlanByGoal(goalId);
        if (existingPlan) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Goal "${goalId}" already has a plan (id: ${existingPlan.id})`,
                }),
              },
            ],
            isError: true,
          };
        }

        // Create the plan
        const plan = createPlan({
          title: title.trim(),
          goalId,
          sourceType,
          sourceRef: sourceRef?.trim(),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Plan created: "${plan.title}"`,
                  plan: {
                    id: plan.id,
                    title: plan.title,
                    goalId: plan.goalId,
                    sourceType: plan.sourceType,
                    sourceRef: plan.sourceRef,
                    createdAt: plan.createdAt,
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
              text: JSON.stringify({ error: `Unknown planning tool: ${name}` }),
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
