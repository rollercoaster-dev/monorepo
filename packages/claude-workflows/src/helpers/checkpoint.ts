/**
 * Checkpoint helpers for workflow state persistence
 *
 * Wraps the claude-knowledge checkpoint API for workflow state management.
 */

import type { PhaseMetadata } from "../types";
import type { WorkflowPhase, WorkflowStatus } from "claude-knowledge";

// Re-export types from claude-knowledge for convenience
export type { WorkflowPhase, WorkflowStatus } from "claude-knowledge";

// Action result type matching claude-knowledge
type ActionResult = "success" | "failed" | "pending";

// Lazy import of claude-knowledge to handle when it's not available
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type ClaudeKnowledgeModule = typeof import("claude-knowledge");
let checkpointModule: ClaudeKnowledgeModule | null = null;
let checkpointWarningShown = false;

async function getCheckpoint() {
  if (!checkpointModule) {
    try {
      checkpointModule = await import("claude-knowledge");
    } catch (error) {
      if (!checkpointWarningShown) {
        console.warn(
          "[checkpoint] Failed to import claude-knowledge - checkpoint persistence disabled:",
          error instanceof Error ? error.message : String(error),
        );
        checkpointWarningShown = true;
      }
      return null;
    }
  }
  return checkpointModule.checkpoint;
}

/**
 * Log when checkpoint is unavailable (only once per session)
 */
function logCheckpointUnavailable(operation: string): void {
  if (!checkpointWarningShown) {
    console.warn(
      `[checkpoint] Checkpoint unavailable - ${operation} will not be persisted`,
    );
    checkpointWarningShown = true;
  }
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
    logCheckpointUnavailable("workflow creation");
    return null;
  }

  try {
    return checkpoint.create(issueNumber, branch, worktree);
  } catch (error) {
    console.error(
      `[checkpoint] Failed to create workflow for issue #${issueNumber}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
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

  try {
    checkpoint.setPhase(workflowId, to);
    checkpoint.logAction(workflowId, "phase_transition", "success", {
      from,
      to,
      ...metadata,
    });
    console.log(`[${context}] Phase: ${from} → ${to}`);
  } catch (error) {
    console.error(
      `[${context}] Failed to persist phase transition ${from} → ${to}:`,
      error instanceof Error ? error.message : String(error),
    );
    // Still log the transition even if persistence failed
    console.log(`[${context}] Phase: ${from} → ${to} (persistence failed)`);
  }
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
  if (!checkpoint) {
    logCheckpointUnavailable("agent spawn logging");
    return;
  }

  try {
    checkpoint.logAction(workflowId, "spawned_agent", "success", {
      agent,
      task,
      ...metadata,
    });
  } catch (error) {
    console.error(
      `[checkpoint] Failed to log agent spawn (${agent}):`,
      error instanceof Error ? error.message : String(error),
    );
  }
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
  if (!checkpoint) {
    logCheckpointUnavailable("commit logging");
    return;
  }

  try {
    checkpoint.logCommit(workflowId, sha, message);
  } catch (error) {
    console.error(
      `[checkpoint] Failed to log commit (${sha.substring(0, 7)}):`,
      error instanceof Error ? error.message : String(error),
    );
  }
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
  if (!checkpoint) {
    logCheckpointUnavailable("action logging");
    return;
  }

  try {
    checkpoint.logAction(workflowId, action, status, metadata);
  } catch (error) {
    console.error(
      `[checkpoint] Failed to log action (${action}):`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Set workflow status
 */
export async function setWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus,
): Promise<void> {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) {
    logCheckpointUnavailable("status update");
    return;
  }

  try {
    checkpoint.setStatus(workflowId, status);
  } catch (error) {
    console.error(
      `[checkpoint] Failed to set workflow status (${status}):`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Load workflow checkpoint data
 */
export async function loadWorkflow(workflowId: string) {
  const checkpoint = await getCheckpoint();
  if (!checkpoint) {
    logCheckpointUnavailable("workflow loading");
    return null;
  }

  try {
    return checkpoint.load(workflowId);
  } catch (error) {
    console.error(
      `[checkpoint] Failed to load workflow (${workflowId}):`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
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
