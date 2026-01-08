/**
 * Checkpoint helpers for workflow state persistence
 *
 * Wraps the claude-knowledge checkpoint API for workflow state management.
 */

import type { PhaseMetadata } from "../types";

// Re-export types from claude-knowledge for convenience
export type { WorkflowPhase, WorkflowStatus } from "claude-knowledge";

// Types from claude-knowledge
type WorkflowPhase =
  | "research"
  | "implement"
  | "review"
  | "finalize"
  | "planning"
  | "execute"
  | "merge"
  | "cleanup";

type WorkflowStatus = "running" | "paused" | "completed" | "failed";
type ActionResult = "success" | "failed" | "pending";

// Lazy import of claude-knowledge to handle when it's not available
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type ClaudeKnowledgeModule = typeof import("claude-knowledge");
let checkpointModule: ClaudeKnowledgeModule | null = null;

async function getCheckpoint() {
  if (!checkpointModule) {
    try {
      checkpointModule = await import("claude-knowledge");
    } catch {
      return null;
    }
  }
  return checkpointModule.checkpoint;
}

/**
 * Create a new workflow checkpoint
 */
export async function createWorkflow(
  issueNumber: number,
  branch: string,
  worktree?: string,
) {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) {
    console.log("[checkpoint] claude-knowledge not available");
    return null;
  }

  return checkpoint.create(issueNumber, branch, worktree);
}

/**
 * Transition between workflow phases
 */
export async function transitionPhase(
  workflowId: string,
  from: string,
  to: WorkflowPhase,
  metadata: PhaseMetadata = {},
  context: string,
): Promise<void> {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) {
    console.log(`[${context}] Phase: ${from} → ${to} (not persisted)`);
    return;
  }

  checkpoint.setPhase(workflowId, to);
  checkpoint.logAction(workflowId, "phase_transition", "success", {
    from,
    to,
    ...metadata,
  });

  console.log(`[${context}] Phase: ${from} → ${to}`);
}

/**
 * Log an agent spawn
 */
export async function logAgentSpawn(
  workflowId: string,
  agent: string,
  task: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) return;

  checkpoint.logAction(workflowId, "spawned_agent", "success", {
    agent,
    task,
    ...metadata,
  });
}

/**
 * Log a commit
 */
export async function logCommit(
  workflowId: string,
  sha: string,
  message: string,
): Promise<void> {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) return;

  checkpoint.logCommit(workflowId, sha, message);
}

/**
 * Log an action with status
 */
export async function logAction(
  workflowId: string,
  action: string,
  status: ActionResult,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) return;

  checkpoint.logAction(workflowId, action, status, metadata);
}

/**
 * Set workflow status
 */
export async function setWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus,
): Promise<void> {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) return;

  checkpoint.setStatus(workflowId, status);
}

/**
 * Load workflow checkpoint data
 */
export async function loadWorkflow(workflowId: string) {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) return null;

  return checkpoint.load(workflowId);
}

/**
 * Generate a workflow ID from issue number
 */
export function generateWorkflowId(
  command: string,
  issueNumber: number,
): string {
  return `${command}-${issueNumber}`;
}
