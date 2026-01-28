/**
 * Planning Stack Operations
 *
 * High-level stack management: push goals/interrupts, pop completed items,
 * and peek at current state. Wraps store operations with relationship tracking.
 */

import {
  createGoal,
  createInterrupt,
  getStack,
  getStackTop,
  getStackDepth,
  popStack as storePopStack,
} from "./store";
import type { Goal, Interrupt, PlanningEntity, PlanningStack } from "../types";

/**
 * Push a new goal onto the planning stack.
 * The current top item (if any) becomes paused.
 */
export function pushGoal(opts: {
  title: string;
  description?: string;
  issueNumber?: number;
  metadata?: Record<string, unknown>;
}): { goal: Goal; stack: PlanningStack } {
  const goal = createGoal(opts);
  const stack = peekStack();
  return { goal, stack };
}

/**
 * Push a new interrupt onto the planning stack.
 * The current top item (if any) becomes paused and linked via INTERRUPTED_BY.
 */
export function pushInterrupt(opts: {
  title: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): {
  interrupt: Interrupt;
  interruptedItem?: PlanningEntity;
  stack: PlanningStack;
} {
  const { interrupt, interruptedItem } = createInterrupt(opts);
  const stack = peekStack();
  return { interrupt, interruptedItem, stack };
}

/**
 * Pop the top item from the stack (mark as completed).
 * Returns the completed item and the item that resumes (if any).
 */
export function popStack(): {
  completed: PlanningEntity | null;
  resumed: PlanningEntity | null;
  stack: PlanningStack;
} {
  const completed = storePopStack();
  const stack = peekStack();
  const resumed = stack.topItem ?? null;
  return { completed, resumed, stack };
}

/**
 * Get the current stack state without modification.
 */
export function peekStack(): PlanningStack {
  const items = getStack();
  const depth = items.length;
  const topItem = items.find((i) => i.status === "active");

  return { items, depth, topItem };
}

/**
 * Get just the stack depth.
 */
export { getStackDepth };

/**
 * Get just the top item.
 */
export { getStackTop };
