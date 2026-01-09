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

// Phase 3: Workflow Retrospective
export { analyzeWorkflow, storeWorkflowLearning } from "./retrospective";
export {
  formatKnowledgeContext,
  formatAsBullets,
  formatAsXml,
  formatByType,
  estimateTokens,
  groupByCodeArea,
  sortByRelevance,
  calculatePriority,
  type FormatOptions,
} from "./formatter";

// Phase 4: Dogfooding & Validation
export { mineMergedPRs } from "./utils";

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
  // Context injection types
  PrioritizationContext,
  ContextFormat,
  ContextInjectionOptions,
  ContextInjectionResult,
  // Workflow retrospective types
  Deviation,
  ReviewFinding,
  AppliedFix,
  ExtractedPattern,
  ExtractedMistake,
  WorkflowLearning,
  // Context metrics types (dogfooding)
  ContextMetrics,
} from "./types";
