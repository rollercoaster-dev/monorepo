export type WorkflowPhase = "research" | "implement" | "review" | "finalize";
export type WorkflowStatus = "running" | "paused" | "completed" | "failed";

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
