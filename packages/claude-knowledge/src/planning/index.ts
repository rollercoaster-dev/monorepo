/**
 * Planning Graph Module
 *
 * Goal/Interrupt stack for project management assistance.
 * Tracks active work, detects staleness, and converts completions to learnings.
 *
 * @module planning
 */

// Stack operations (primary API)
export {
  pushGoal,
  pushInterrupt,
  popStack,
  peekStack,
  getStackDepth,
  getStackTop,
} from "./stack";

// Store operations (lower-level CRUD)
export {
  createGoal,
  createInterrupt,
  getStack,
  getEntity,
  updateStatus,
  deleteEntity,
  getCompleted,
  getAllEntities,
  getRelationships,
  createRelationship,
  // Plan CRUD
  createPlan,
  getPlan,
  getPlanByGoal,
  updatePlan,
  deletePlan,
  getAllPlans,
  // PlanStep CRUD
  createPlanStep,
  getPlanStep,
  getStepsByPlan,
  updatePlanStep,
  deletePlanStep,
  addStepDependency,
  getStepDependencies,
} from "./store";

// Summarization
export {
  summarizeCompletion,
  generateSummary,
  getGitContext,
} from "./summarize";
export type { GitContext } from "./summarize";

// Stale detection
export { detectStaleItems, clearStaleCache } from "./stale";

// JSONL sync
export {
  exportPlanningToJSONL,
  importPlanningFromJSONL,
  getPlanningFileModificationTime,
} from "./sync";
export type { PlanningExportResult, PlanningImportResult } from "./sync";

// Completion resolver system
export {
  type CompletionResolver,
  type CompletionStatus,
} from "./completion-resolver";
export {
  getCachedStatus,
  setCachedStatus,
  clearCompletionCache,
} from "./completion-cache";
export { getResolver } from "./resolvers/factory";
export { MilestoneResolver } from "./resolvers/milestone-resolver";
export { ManualResolver } from "./resolvers/manual-resolver";
export { LearningResolver } from "./resolvers/learning-resolver";

// Plan progress computation
export { computePlanProgress } from "./progress";
