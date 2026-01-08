/**
 * Checkpoint helpers for workflow state persistence
 *
 * Wraps the claude-knowledge checkpoint API for workflow state management.
 */

import type { PhaseMetadata } from "../types";
import type {
  WorkflowPhase,
  WorkflowStatus,
  Workflow,
  Action,
  CheckpointData,
} from "claude-knowledge";

// Re-export types from claude-knowledge for convenience
export type { WorkflowPhase, WorkflowStatus } from "claude-knowledge";

// Use Action's result type for consistency with claude-knowledge
type ActionResult = Action["result"];

// Lazy import of claude-knowledge to handle when it's not available
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type ClaudeKnowledgeModule = typeof import("claude-knowledge");

// Promise-based singleton to prevent race conditions on concurrent imports
let checkpointPromise: Promise<
  ClaudeKnowledgeModule["checkpoint"] | null
> | null = null;
let checkpointWarningShown = false;

async function getCheckpoint(): Promise<
  ClaudeKnowledgeModule["checkpoint"] | null
> {
  if (!checkpointPromise) {
    checkpointPromise = import("claude-knowledge")
      .then((mod) => mod.checkpoint)
      .catch((error) => {
        if (!checkpointWarningShown) {
          console.warn(
            "[checkpoint] Failed to import claude-knowledge - checkpoint persistence disabled:",
            error instanceof Error ? error.message : String(error),
          );
          checkpointWarningShown = true;
        }
        return null;
      });
  }
  return checkpointPromise;
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
 *
 * @param issueNumber - The GitHub issue number
 * @param branch - The git branch name
 * @param worktree - Optional worktree path
 * @returns The created workflow or null if checkpoint unavailable
 */
export async function createWorkflow(
  issueNumber: number,
  branch: string,
  worktree?: string,
): Promise<Workflow | null> {
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
 *
 * @param workflowId - The workflow identifier
 * @param from - The current phase (for logging)
 * @param to - The target phase
 * @param context - Context string for logging (e.g., "AUTO-ISSUE #123")
 * @param metadata - Optional metadata to include in the action log
 */
export async function transitionPhase(
  workflowId: string,
  from: WorkflowPhase,
  to: WorkflowPhase,
  context: string,
  metadata: PhaseMetadata = {},
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
 *
 * @param workflowId - The workflow identifier
 * @param agent - The agent name
 * @param task - Description of the task
 * @param metadata - Optional additional metadata
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
 *
 * @param workflowId - The workflow identifier
 * @param sha - The commit SHA
 * @param message - The commit message
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
      `[checkpoint] Failed to log commit (${sha.slice(0, 7)}):`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Log an action with status
 *
 * @param workflowId - The workflow identifier
 * @param action - The action name
 * @param status - The action result status
 * @param metadata - Optional additional metadata
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
 *
 * @param workflowId - The workflow identifier
 * @param status - The new workflow status
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
 *
 * @param workflowId - The workflow identifier
 * @returns The checkpoint data (workflow + actions + commits) or null if not found/unavailable
 */
export async function loadWorkflow(
  workflowId: string,
): Promise<CheckpointData | null> {
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
 *
 * @param command - The command name (e.g., "auto-issue")
 * @param issueNumber - The GitHub issue number
 * @returns A unique workflow identifier
 */
export function generateWorkflowId(
  command: string,
  issueNumber: number,
): string {
  return `${command}-${issueNumber}`;
}
