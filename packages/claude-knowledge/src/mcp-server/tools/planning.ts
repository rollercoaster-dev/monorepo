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
import {
  createPlan,
  getPlanByGoal,
  getEntity,
  getPlan,
  createPlanStep,
  addStepDependency,
  getStepsByPlan,
} from "../../planning/store.js";
import { computePlanProgress } from "../../planning/progress.js";
import type {
  Goal,
  Interrupt,
  PlanSourceType,
  ExternalRef,
} from "../../types.js";

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
      "Get the current planning stack state with stale item detection and plan progress. " +
      "Shows what you're working on, what's paused, items that may need attention, " +
      "and step-level progress for active Goals with Plans (done count, percentage, current wave, next steps).",
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
  {
    name: "planning_plan_add_steps",
    description:
      "Add multiple PlanSteps to a Plan in a batch operation. " +
      "Steps define concrete units of work with wave-based parallelization and dependency tracking. " +
      "Dependencies must reference already-created steps (use ordinal order).",
    inputSchema: {
      type: "object" as const,
      properties: {
        planId: {
          type: "string",
          description: "ID of the Plan to add steps to",
        },
        steps: {
          type: "array",
          description: "Array of steps to add",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Step title (e.g., 'Issue #123: Add auth')",
              },
              ordinal: {
                type: "number",
                description: "Global execution order (0-based)",
              },
              wave: {
                type: "number",
                description: "Parallelization group (0-based)",
              },
              externalRef: {
                type: "object",
                description: "External reference for completion tracking",
                properties: {
                  type: {
                    type: "string",
                    enum: ["issue", "badge", "manual"],
                    description: "Type of external reference",
                  },
                  number: {
                    type: "number",
                    description: "GitHub issue number (for type=issue)",
                  },
                  criteria: {
                    type: "string",
                    description: "Badge criteria or manual completion criteria",
                  },
                },
                required: ["type"],
              },
              dependsOn: {
                type: "array",
                description:
                  "Array of step ordinals this step depends on (must be created first)",
                items: { type: "number" },
              },
            },
            required: ["title", "ordinal", "wave", "externalRef"],
          },
        },
      },
      required: ["planId", "steps"],
    },
  },
  {
    name: "planning_plan_get",
    description:
      "Get a Plan and all its PlanSteps for a Goal. " +
      "Returns the plan with embedded steps array including dependencies.",
    inputSchema: {
      type: "object" as const,
      properties: {
        goalId: {
          type: "string",
          description: "ID of the Goal to get the plan for",
        },
      },
      required: ["goalId"],
    },
  },
  {
    name: "planning_plan_list_steps",
    description:
      "List PlanSteps for a Plan with optional filtering by wave number. " +
      "Returns steps ordered by ordinal with dependencies included. " +
      "Note: Completion status filtering is not yet implemented (requires external API integration).",
    inputSchema: {
      type: "object" as const,
      properties: {
        planId: {
          type: "string",
          description: "ID of the Plan to list steps for",
        },
        wave: {
          type: "number",
          description: "Optional wave number to filter by (0-based)",
        },
      },
      required: ["planId"],
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

        // Enhance active Goals with plan progress
        const enhancedItems: Array<Record<string, unknown>> = [];
        for (const [index, item] of stack.items.entries()) {
          const entry: Record<string, unknown> = {
            position: index + 1,
            type: item.type,
            title: item.title,
            status: item.status,
            createdAt: item.createdAt,
          };

          // Add plan progress for active Goals
          if (item.type === "Goal" && item.status === "active") {
            const plan = getPlanByGoal(item.id);
            if (plan) {
              const progress = await computePlanProgress(plan);
              entry.plan = {
                id: plan.id,
                title: plan.title,
              };
              entry.progress = progress;
            }
          }

          if (item.type === "Goal" && (item as Goal).issueNumber) {
            entry.issueNumber = (item as Goal).issueNumber;
          }

          if (item.type === "Interrupt") {
            entry.reason = (item as Interrupt).reason;
          }

          const stale = staleItems.find((s) => s.item.id === item.id);
          if (stale) {
            entry.staleWarning = stale.reason;
          }

          enhancedItems.push(entry);
        }

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
                  items: enhancedItems,
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
        const validSourceTypes = [
          "milestone",
          "epic",
          "learning-path",
          "manual",
        ];
        if (!sourceType || !validSourceTypes.includes(sourceType)) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `sourceType must be one of: ${validSourceTypes.join(", ")}`,
                }),
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

      case "planning_plan_add_steps": {
        const planId = args.planId as string;
        const stepsInput = args.steps as Array<{
          title: string;
          ordinal: number;
          wave: number;
          externalRef: ExternalRef;
          dependsOn?: number[];
        }>;

        // Validate required fields
        if (!planId || planId.trim().length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "planId is required" }),
              },
            ],
            isError: true,
          };
        }
        if (!stepsInput || !Array.isArray(stepsInput)) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "steps must be an array",
                }),
              },
            ],
            isError: true,
          };
        }
        if (stepsInput.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "steps array cannot be empty",
                }),
              },
            ],
            isError: true,
          };
        }

        // Validate planId exists
        const plan = getPlan(planId);
        if (!plan) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Plan with id "${planId}" not found`,
                }),
              },
            ],
            isError: true,
          };
        }

        // Validate each step input
        for (const step of stepsInput) {
          if (!step.title || step.title.trim().length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "All steps must have a title",
                  }),
                },
              ],
              isError: true,
            };
          }
          if (
            typeof step.ordinal !== "number" ||
            step.ordinal < 0 ||
            !Number.isInteger(step.ordinal)
          ) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "ordinal must be a non-negative integer",
                  }),
                },
              ],
              isError: true,
            };
          }
          if (
            typeof step.wave !== "number" ||
            step.wave < 0 ||
            !Number.isInteger(step.wave)
          ) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "wave must be a non-negative integer",
                  }),
                },
              ],
              isError: true,
            };
          }
          if (!step.externalRef || !step.externalRef.type) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "externalRef with type is required for each step",
                  }),
                },
              ],
              isError: true,
            };
          }
          if (!["issue", "badge", "manual"].includes(step.externalRef.type)) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: `Invalid externalRef.type: ${step.externalRef.type}. Must be "issue", "badge", or "manual"`,
                  }),
                },
              ],
              isError: true,
            };
          }
        }

        // Pre-flight: validate no duplicate ordinals
        const ordinals = stepsInput.map((s) => s.ordinal);
        const uniqueOrdinals = new Set(ordinals);
        if (uniqueOrdinals.size !== ordinals.length) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error:
                    "Duplicate ordinal values detected. Each step must have a unique ordinal.",
                }),
              },
            ],
            isError: true,
          };
        }

        // Pre-flight: validate all dependsOn ordinals reference ordinals in this batch
        for (const step of stepsInput) {
          if (step.dependsOn) {
            for (const depOrdinal of step.dependsOn) {
              if (
                typeof depOrdinal !== "number" ||
                !Number.isInteger(depOrdinal) ||
                depOrdinal < 0
              ) {
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        error: `dependsOn values must be non-negative integers, got: ${JSON.stringify(depOrdinal)}`,
                      }),
                    },
                  ],
                  isError: true,
                };
              }
              if (depOrdinal >= step.ordinal) {
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        error: `Step with ordinal ${step.ordinal} cannot depend on ordinal ${depOrdinal} (must depend on earlier ordinals only)`,
                      }),
                    },
                  ],
                  isError: true,
                };
              }
              if (!uniqueOrdinals.has(depOrdinal)) {
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        error: `Step ordinal ${step.ordinal} depends on ordinal ${depOrdinal}, which is not in the batch`,
                      }),
                    },
                  ],
                  isError: true,
                };
              }
            }
          }
        }

        // Sort steps by ordinal to ensure dependencies are created before dependents
        const sortedSteps = [...stepsInput].sort(
          (a, b) => a.ordinal - b.ordinal,
        );

        // Create steps and track created step IDs by ordinal
        const createdSteps: Array<{
          id: string;
          ordinal: number;
          title: string;
        }> = [];
        const ordinalToId = new Map<number, string>();

        for (const step of sortedSteps) {
          const createdStep = createPlanStep({
            planId,
            title: step.title.trim(),
            ordinal: step.ordinal,
            wave: step.wave,
            externalRef: step.externalRef,
          });

          createdSteps.push({
            id: createdStep.id,
            ordinal: createdStep.ordinal,
            title: createdStep.title,
          });
          ordinalToId.set(step.ordinal, createdStep.id);
        }

        // Add dependencies in a second pass (all steps now exist)
        for (const step of sortedSteps) {
          if (step.dependsOn && step.dependsOn.length > 0) {
            const stepId = ordinalToId.get(step.ordinal);
            if (!stepId) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      error: `Internal error: step with ordinal ${step.ordinal} not found`,
                    }),
                  },
                ],
                isError: true,
              };
            }

            for (const depOrdinal of step.dependsOn) {
              const depId = ordinalToId.get(depOrdinal);
              if (!depId) {
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        error: `Step with ordinal ${step.ordinal} depends on ordinal ${depOrdinal}, but that step was not created`,
                      }),
                    },
                  ],
                  isError: true,
                };
              }
              addStepDependency(stepId, depId);
            }
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Added ${createdSteps.length} steps to plan "${plan.title}"`,
                  steps: createdSteps,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "planning_plan_get": {
        const goalId = args.goalId as string;

        // Validate required fields
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

        // Validate goal exists
        const goalEntity = getEntity(goalId);
        if (!goalEntity) {
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

        // Get plan by goal
        const plan = getPlanByGoal(goalId);
        if (!plan) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  plan: null,
                  steps: [],
                  message: `Goal "${goalId}" exists but has no plan yet`,
                }),
              },
            ],
          };
        }

        // Get all steps for this plan
        const steps = getStepsByPlan(plan.id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  plan: {
                    id: plan.id,
                    title: plan.title,
                    goalId: plan.goalId,
                    sourceType: plan.sourceType,
                    sourceRef: plan.sourceRef,
                    createdAt: plan.createdAt,
                    updatedAt: plan.updatedAt,
                  },
                  steps: steps.map((step) => ({
                    id: step.id,
                    title: step.title,
                    ordinal: step.ordinal,
                    wave: step.wave,
                    externalRef: step.externalRef,
                    dependsOn: step.dependsOn,
                    createdAt: step.createdAt,
                    updatedAt: step.updatedAt,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "planning_plan_list_steps": {
        const planId = args.planId as string;
        const waveFilter = args.wave as number | undefined;

        // Validate required fields
        if (!planId || planId.trim().length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "planId is required" }),
              },
            ],
            isError: true,
          };
        }

        // Validate wave if provided
        if (
          waveFilter !== undefined &&
          (typeof waveFilter !== "number" ||
            waveFilter < 0 ||
            !Number.isInteger(waveFilter))
        ) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "wave must be a non-negative integer",
                }),
              },
            ],
            isError: true,
          };
        }

        // Get plan to verify it exists
        const plan = getPlan(planId);
        if (!plan) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Plan with id "${planId}" not found`,
                }),
              },
            ],
            isError: true,
          };
        }

        // Get all steps for the plan
        let steps = getStepsByPlan(planId);

        // Filter by wave if specified
        if (waveFilter !== undefined) {
          steps = steps.filter((step) => step.wave === waveFilter);
        }

        // TODO: Add completion status filtering when external ref resolution is implemented
        // For now, we only support wave filtering. Completion status requires GitHub API
        // integration to check issue status.

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  planId: plan.id,
                  planTitle: plan.title,
                  wave: waveFilter,
                  steps: steps.map((step) => ({
                    id: step.id,
                    title: step.title,
                    ordinal: step.ordinal,
                    wave: step.wave,
                    externalRef: step.externalRef,
                    dependsOn: step.dependsOn,
                    createdAt: step.createdAt,
                    updatedAt: step.updatedAt,
                  })),
                  totalSteps: steps.length,
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
