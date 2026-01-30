/**
 * Manual Resolver
 *
 * Resolves completion status from local planning database.
 * Checks if a manual completion flag is set for the step.
 *
 * Part of Planning Graph Phase 2 (epic #635).
 */

import type {
  CompletionResolver,
  CompletionStatus,
} from "../completion-resolver";
import type { PlanStep } from "../../types";
import { getCachedStatus, setCachedStatus } from "../completion-cache";
import { getDatabase } from "../../db/sqlite";

/**
 * Manual resolver implementation.
 * Checks local database for manual completion flags.
 */
export class ManualResolver implements CompletionResolver {
  async resolve(step: PlanStep): Promise<CompletionStatus> {
    // Only handle manual-type external refs
    if (step.externalRef.type !== "manual") {
      return "not-started";
    }

    const externalRefKey = "manual";

    // Check cache first
    const cached = getCachedStatus(step.id, externalRefKey);
    if (cached) {
      return cached;
    }

    // Query local database for manual completion flag
    // The manual completion criteria is stored in externalRef.criteria
    // For now, we check if there's a relationship indicating completion
    const db = getDatabase();
    const result = db
      .query<{ count: number }, [string]>(
        `
      SELECT COUNT(*) as count
      FROM planning_relationships
      WHERE from_id = ? AND type = 'COMPLETED_AS'
    `,
      )
      .get(step.id);

    let status: CompletionStatus;
    if (result && result.count > 0) {
      status = "done";
    } else {
      // Check if there's an active goal linked to this step
      const activeGoal = db
        .query<{ count: number }, [string]>(
          `
        SELECT COUNT(*) as count
        FROM planning_entities e
        JOIN planning_relationships r ON r.from_id = e.id
        WHERE r.to_id = ? AND r.type = 'PART_OF' AND e.status = 'active'
      `,
        )
        .get(step.id);

      if (activeGoal && activeGoal.count > 0) {
        status = "in-progress";
      } else {
        status = "not-started";
      }
    }

    // Cache the result
    setCachedStatus(step.id, externalRefKey, status);

    return status;
  }
}
