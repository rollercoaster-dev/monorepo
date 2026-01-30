/**
 * Completion Resolver System
 *
 * Pluggable resolver system that determines plan step completion status
 * from external sources at query time (never stored).
 *
 * Part of Planning Graph Phase 2 (epic #635).
 */

import type { PlanStep } from "../types";

/**
 * Completion status for a plan step.
 * Resolved from external source at query time.
 */
export type CompletionStatus = "done" | "in-progress" | "not-started";

/**
 * Pluggable resolver interface for determining step completion.
 * Each resolver type knows how to check status from a specific source.
 */
export interface CompletionResolver {
  /**
   * Resolve the completion status of a plan step from its external source.
   *
   * @param step - The plan step to check
   * @returns Promise resolving to the current completion status
   */
  resolve(step: PlanStep): Promise<CompletionStatus>;
}
