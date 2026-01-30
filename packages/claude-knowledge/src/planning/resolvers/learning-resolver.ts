/**
 * Learning Resolver (Stub)
 *
 * Stub interface for badge backpack query. Will be implemented when
 * learning graph ships.
 *
 * Part of Planning Graph Phase 2 (epic #635).
 */

import type {
  CompletionResolver,
  CompletionStatus,
} from "../completion-resolver";
import type { PlanStep } from "../../types";

/**
 * Learning resolver stub.
 * Always returns "not-started" until badge backpack integration is implemented.
 */
export class LearningResolver implements CompletionResolver {
  async resolve(_step: PlanStep): Promise<CompletionStatus> {
    // TODO: Implement badge backpack query when learning graph ships
    // Will check if user has earned the badge specified in externalRef.criteria
    return "not-started";
  }
}
