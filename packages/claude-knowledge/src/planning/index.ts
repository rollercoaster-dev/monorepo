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
