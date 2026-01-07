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

// Phase 2: Knowledge Graph (stubs)
export { knowledge } from "./db/neo4j";
export { hooks } from "./hooks";
