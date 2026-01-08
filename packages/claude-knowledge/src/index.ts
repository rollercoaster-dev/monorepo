// Phase 1: Execution State
export { checkpoint } from "./checkpoint";
export { getDatabase, closeDatabase, resetDatabase } from "./db/sqlite";
export type {
  Workflow,
  Action,
  Commit,
  CheckpointData,
  WorkflowPhase,
  WorkflowStatus,
  Milestone,
  MilestonePhase,
  Baseline,
  MilestoneCheckpointData,
} from "./types";

// Phase 2: Knowledge Graph
export { knowledge } from "./knowledge";
export { hooks } from "./hooks";
export {
  formatKnowledgeContext,
  estimateTokens,
  groupByCodeArea,
  sortByRelevance,
  calculatePriority,
  type FormatOptions,
} from "./formatter";
export type {
  Learning,
  Pattern,
  Mistake,
  Entity,
  Relationship,
  EntityType,
  RelationshipType,
  CodeAreaData,
  FileData,
  QueryContext,
  QueryResult,
  // Session hook types
  SessionContext,
  KnowledgeContext,
  SessionSummary,
  SessionEndResult,
} from "./types";
