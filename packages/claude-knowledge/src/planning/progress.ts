/**
 * Plan Progress Computation
 *
 * Computes progress metrics for a plan by resolving step completion status.
 * Part of Planning Graph Phase 2 (issue #639).
 */

import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import type { Plan, PlanProgress, NextStep } from "../types";
import { getStepsByPlan } from "./store";
import { getResolver } from "./resolvers/factory";
import type { CompletionStatus } from "./completion-resolver";

/**
 * Compute plan progress by resolving step completion status.
 *
 * @param plan - The plan to compute progress for
 * @returns Promise resolving to progress metrics
 */
export async function computePlanProgress(plan: Plan): Promise<PlanProgress> {
  logger.debug("Computing plan progress", {
    planId: plan.id,
    context: "computePlanProgress",
  });

  const steps = getStepsByPlan(plan.id);

  // Handle empty plan
  if (steps.length === 0) {
    logger.debug("Plan has no steps", { planId: plan.id });
    return {
      total: 0,
      done: 0,
      inProgress: 0,
      notStarted: 0,
      blocked: 0,
      percentage: 0,
      currentWave: null,
      nextSteps: [],
    };
  }

  // Resolve all step statuses
  const statusMap = new Map<string, CompletionStatus>();
  for (const step of steps) {
    try {
      const resolver = getResolver(step.externalRef.type);
      const status = await resolver.resolve(step);
      statusMap.set(step.id, status);
    } catch (error) {
      logger.warn("Failed to resolve step status, defaulting to not-started", {
        stepId: step.id,
        externalRef: step.externalRef,
        error: error instanceof Error ? error.message : String(error),
        context: "computePlanProgress",
      });
      statusMap.set(step.id, "not-started");
    }
  }

  // Compute current wave (first wave with non-done steps)
  const currentWave =
    steps.find((s) => statusMap.get(s.id) !== "done")?.wave ?? null;

  // Build blocked set and next steps in one pass
  const blockedStepIds = new Set<string>();
  const nextSteps: NextStep[] = [];

  for (const step of steps) {
    const status = statusMap.get(step.id);
    if (!status) {
      logger.warn("Step has no resolved status, skipping", {
        stepId: step.id,
        context: "computePlanProgress",
      });
      continue;
    }
    if (status === "done") continue;

    // Check if dependencies are met
    const blockedBy = step.dependsOn.filter((depId) => {
      const depStatus = statusMap.get(depId);
      return !depStatus || depStatus !== "done";
    });

    if (blockedBy.length > 0) {
      blockedStepIds.add(step.id);
      continue;
    }

    // If in current wave, it's a next step
    if (step.wave === currentWave) {
      nextSteps.push({
        step,
        status,
        blockedBy,
        wave: step.wave,
      });
    }
  }

  // Count statuses (after we know which steps are blocked)
  let done = 0;
  let inProgress = 0;
  let notStarted = 0;
  let blocked = 0;

  for (const step of steps) {
    const status = statusMap.get(step.id);
    if (!status) continue;

    if (status === "done") {
      done++;
    } else if (status === "in-progress") {
      inProgress++;
    } else if (blockedStepIds.has(step.id)) {
      blocked++;
    } else {
      notStarted++;
    }
  }

  const percentage =
    steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;

  logger.debug("Plan progress computed", {
    planId: plan.id,
    total: steps.length,
    done,
    inProgress,
    notStarted,
    blocked,
    percentage,
    currentWave,
    nextStepsCount: nextSteps.length,
  });

  return {
    total: steps.length,
    done,
    inProgress,
    notStarted,
    blocked,
    percentage,
    currentWave,
    nextSteps: nextSteps.slice(0, 3), // Limit to top 3
  };
}
