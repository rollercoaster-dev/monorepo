import { workflow } from "./workflow";
import { milestone } from "./milestone";
import { metrics } from "./metrics";

/**
 * Unified checkpoint API for workflow execution state management.
 *
 * This object combines operations from three focused modules:
 * - workflow: Workflow CRUD, state management, action/commit logging
 * - milestone: Milestone CRUD, state management, baseline snapshots
 * - metrics: Context metrics for dogfooding validation
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
