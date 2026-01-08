// Auto-issue phases: research → implement → review → finalize
// Auto-milestone phases: planning → execute → review → merge → cleanup
export type WorkflowPhase =
  | "research"
  | "implement"
  | "review"
  | "finalize"
  | "planning"
  | "execute"
  | "merge"
  | "cleanup";
export type WorkflowStatus = "running" | "paused" | "completed" | "failed";

export type MilestonePhase =
  | "planning"
  | "execute"
  | "review"
  | "merge"
  | "cleanup";

export interface Workflow {
  id: string;
  issueNumber: number;
  branch: string;
  worktree: string | null;
  phase: WorkflowPhase;
  status: WorkflowStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Action {
  id?: number;
  workflowId: string;
  action: string;
  result: "success" | "failed" | "pending";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Commit {
  id?: number;
  workflowId: string;
  sha: string;
  message: string;
  createdAt: string;
}

export interface CheckpointData {
  workflow: Workflow;
  actions: Action[];
  commits: Commit[];
}

export interface Milestone {
  id: string;
  name: string;
  githubMilestoneNumber: number | null;
  phase: MilestonePhase;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Baseline {
  id?: number;
  milestoneId: string;
  capturedAt: string;
  lintExitCode: number;
  lintWarnings: number;
  lintErrors: number;
  typecheckExitCode: number;
  typecheckErrors: number;
}

export interface MilestoneCheckpointData {
  milestone: Milestone;
  baseline: Baseline | null;
  workflows: Workflow[];
}

// ============================================================================
// Knowledge Graph Types
// ============================================================================

/**
 * A learning captured during a workflow session.
 * Learnings are the primary knowledge units in the graph.
 */
export interface Learning {
  id: string;
  content: string;
  sourceIssue?: number;
  codeArea?: string;
  filePath?: string;
  confidence?: number; // 0.0-1.0
  metadata?: Record<string, unknown>;
}

/**
 * A recognized pattern derived from learnings.
 * Patterns represent reusable knowledge applicable to code areas.
 */
export interface Pattern {
  id: string;
  name: string;
  description: string;
  codeArea?: string;
}

/**
 * A mistake made during development and how it was fixed.
 * Mistakes help prevent repeating the same errors.
 */
export interface Mistake {
  id: string;
  description: string;
  howFixed: string;
  filePath?: string;
}

/**
 * Entity types in the knowledge graph.
 */
export type EntityType =
  | "Learning"
  | "CodeArea"
  | "File"
  | "Pattern"
  | "Mistake";

/**
 * Relationship types in the knowledge graph.
 * - ABOUT: Learning → CodeArea (learning relates to a code area)
 * - IN_FILE: Learning/Mistake → File (located in a file)
 * - LED_TO: Pattern/Mistake → Learning (derived from / fixed by)
 * - APPLIES_TO: Pattern → CodeArea (pattern applies to area)
 * - SUPERSEDES: Learning → Learning (for updates)
 */
export type RelationshipType =
  | "ABOUT"
  | "IN_FILE"
  | "LED_TO"
  | "APPLIES_TO"
  | "SUPERSEDES";

/**
 * Data for a CodeArea entity.
 */
export interface CodeAreaData {
  name: string;
  description?: string;
}

/**
 * Data for a File entity.
 */
export interface FileData {
  path: string;
  packageName?: string;
}

/**
 * A generic entity in the knowledge graph.
 */
export interface Entity {
  id: string;
  type: EntityType;
  data: Learning | Pattern | Mistake | CodeAreaData | FileData;
  embedding?: Uint8Array;
  createdAt: string;
  updatedAt: string;
}

/**
 * A relationship (edge) between two entities in the knowledge graph.
 */
export interface Relationship {
  id?: number;
  fromId: string;
  toId: string;
  type: RelationshipType;
  data?: Record<string, unknown>;
  createdAt: string;
}
