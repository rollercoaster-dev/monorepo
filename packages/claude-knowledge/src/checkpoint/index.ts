import { workflow } from "./workflow";
import { milestone } from "./milestone";
import { metrics } from "./metrics";

/**
 * Unified checkpoint API for workflow execution state management.
 *
 * This object combines operations from three focused modules:
 * - workflow: Workflow CRUD, state management, action/commit logging
 * - milestone: Milestone CRUD, state management, baseline snapshots
 * - metrics: Context metrics and graph query metrics for dogfooding validation
 *
 * Graph query metrics (added in #440):
 * - logGraphQuery: Record a graph query execution with timing
 * - getGraphQueries: Query graph metrics with optional filters
 * - getGraphQuerySummary: Get aggregated graph usage statistics
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
};

// Export metrics separately for direct access to tool usage functions
export { metrics };
