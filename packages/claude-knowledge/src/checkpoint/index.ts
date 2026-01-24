import { workflow } from "./workflow";
import { milestone } from "./milestone";
import { metrics } from "./metrics";
import { taskRecovery } from "./task-recovery";

/**
 * Unified checkpoint API for workflow execution state management.
 *
 * This object combines operations from four focused modules:
 * - workflow: Workflow CRUD, state management, action/commit logging
 * - milestone: Milestone CRUD, state management, baseline snapshots
 * - metrics: Context metrics and graph query metrics for dogfooding validation
 * - taskRecovery: Task recovery for session resume (#579)
 *
 * Graph query metrics (added in #440):
 * - logGraphQuery: Record a graph query execution with timing
 * - getGraphQueries: Query graph metrics with optional filters
 * - getGraphQuerySummary: Get aggregated graph usage statistics
 *
 * Task recovery (added in #579):
 * - recoverTasksByIssue: Recover tasks for single-issue workflows
 * - recoverTasksByMilestone: Recover tasks for milestone workflows
 *
 * All consumers import { checkpoint } and call methods on this object.
 * Example: checkpoint.create(123, "feat/my-branch")
 */
export const checkpoint = {
  // Workflow operations
  ...workflow,
  // Milestone operations
  ...milestone,
  // Metrics operations
  ...metrics,
  // Task recovery operations
  ...taskRecovery,
};

// Export metrics separately for direct access to tool usage functions
export { metrics };

// Export task recovery for direct imports
export { taskRecovery };
