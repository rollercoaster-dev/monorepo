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
