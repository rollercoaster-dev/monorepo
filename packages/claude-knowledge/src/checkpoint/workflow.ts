import { getDatabase } from "../db/sqlite";
import type {
  Workflow,
  Action,
  Commit,
  CheckpointData,
  WorkflowPhase,
  WorkflowStatus,
} from "../types";
import {
  generateWorkflowId,
  now,
  safeJsonParse,
  safeJsonStringify,
} from "./utils";
import { Logger } from "@rollercoaster-dev/rd-logger";

const logger = new Logger();

/**
 * Create a new workflow checkpoint
 */
function create(
  issueNumber: number,
  branch: string,
  worktree?: string,
): Workflow {
  const db = getDatabase();
  const id = generateWorkflowId(issueNumber);
  const timestamp = now();

  const workflow: Workflow = {
    id,
    issueNumber,
    branch,
    worktree: worktree ?? null,
    phase: "research",
    status: "running",
    retryCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.run(
    `
      INSERT INTO workflows (id, issue_number, branch, worktree, phase, status, retry_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      workflow.id,
      workflow.issueNumber,
      workflow.branch,
      workflow.worktree,
      workflow.phase,
      workflow.status,
      workflow.retryCount,
      workflow.createdAt,
      workflow.updatedAt,
    ],
  );

  return workflow;
}

/**
 * Save/update workflow state
 * @throws Error if workflow doesn't exist
 */
function save(workflow: Workflow): void {
  const db = getDatabase();
  workflow.updatedAt = now();

  const result = db.run(
    `
      UPDATE workflows
      SET phase = ?, status = ?, retry_count = ?, worktree = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      workflow.phase,
      workflow.status,
      workflow.retryCount,
      workflow.worktree,
      workflow.updatedAt,
      workflow.id,
    ],
  );

  if (result.changes === 0) {
    throw new Error(
      `Failed to save workflow: No workflow found with ID "${workflow.id}". ` +
        `The workflow may have been deleted or never created.`,
    );
  }
}

/**
 * Load workflow state by ID
 */
function load(workflowId: string): CheckpointData | null {
  const db = getDatabase();

  const workflowRow = db
    .query<
      {
        id: string;
        issue_number: number;
        branch: string;
        worktree: string | null;
        phase: WorkflowPhase;
        status: WorkflowStatus;
        retry_count: number;
        created_at: string;
        updated_at: string;
      },
      [string]
    >(
      `
      SELECT id, issue_number, branch, worktree, phase, status,
             retry_count, created_at, updated_at
      FROM workflows WHERE id = ?
    `,
    )
    .get(workflowId);

  if (!workflowRow) return null;

  const workflow: Workflow = {
    id: workflowRow.id,
    issueNumber: workflowRow.issue_number,
    branch: workflowRow.branch,
    worktree: workflowRow.worktree,
    phase: workflowRow.phase,
    status: workflowRow.status,
    retryCount: workflowRow.retry_count,
    createdAt: workflowRow.created_at,
    updatedAt: workflowRow.updated_at,
  };

  const actionRows = db
    .query<
      {
        id: number;
        workflow_id: string;
        action: string;
        result: "success" | "failed" | "pending";
        metadata: string | null;
        created_at: string;
      },
      [string]
    >(
      `
      SELECT id, workflow_id, action, result, metadata, created_at
      FROM actions WHERE workflow_id = ? ORDER BY created_at ASC
    `,
    )
    .all(workflowId);

  const actions: Action[] = actionRows.map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    action: row.action,
    result: row.result,
    metadata: row.metadata
      ? safeJsonParse(row.metadata, `action ${row.id}`)
      : null,
    createdAt: row.created_at,
  }));

  const commitRows = db
    .query<
      {
        id: number;
        workflow_id: string;
        sha: string;
        message: string;
        created_at: string;
      },
      [string]
    >(
      `
      SELECT id, workflow_id, sha, message, created_at
      FROM commits WHERE workflow_id = ? ORDER BY created_at ASC
    `,
    )
    .all(workflowId);

  const commits: Commit[] = commitRows.map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    sha: row.sha,
    message: row.message,
    createdAt: row.created_at,
  }));

  return { workflow, actions, commits };
}

/**
 * Find workflow by issue number (most recent)
 */
function findByIssue(issueNumber: number): CheckpointData | null {
  const db = getDatabase();

  const row = db
    .query<{ id: string }, [number]>(
      `
      SELECT id FROM workflows WHERE issue_number = ? ORDER BY created_at DESC, rowid DESC LIMIT 1
    `,
    )
    .get(issueNumber);

  if (!row) return null;
  return load(row.id);
}

/**
 * Log an action
 * @throws Error if workflow doesn't exist (foreign key constraint)
 */
function logAction(
  workflowId: string,
  action: string,
  result: "success" | "failed" | "pending",
  metadata?: Record<string, unknown>,
): void {
  const db = getDatabase();

  try {
    db.run(
      `
        INSERT INTO actions (workflow_id, action, result, metadata, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        workflowId,
        action,
        result,
        safeJsonStringify(metadata, `logAction:${action}`),
        now(),
      ],
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("FOREIGN KEY constraint failed")
    ) {
      throw new Error(
        `Failed to log action: No workflow found with ID "${workflowId}". ` +
          `Create the workflow first with checkpoint.create().`,
      );
    }
    throw error;
  }
}

/**
 * Log an action with automatic failure recording on error.
 * Wraps logAction with try/catch to ensure failures are logged.
 *
 * @param workflowId - Workflow ID
 * @param action - Action name
 * @param result - Expected result (success/failed/pending)
 * @param metadata - Optional metadata
 * @returns true if logged successfully, false if failed
 */
function logActionSafe(
  workflowId: string,
  action: string,
  result: "success" | "failed" | "pending",
  metadata?: Record<string, unknown>,
): boolean {
  try {
    logAction(workflowId, action, result, metadata);
    return true;
  } catch (error) {
    // Action logging failed - log the error
    logger.error("Failed to log action", {
      workflowId,
      action,
      result,
      error: error instanceof Error ? error.message : String(error),
      context: "logActionSafe",
    });

    // Attempt to log the failure itself (if workflow still exists)
    // Note: Don't include originalMetadata - it may be what caused JSON.stringify to fail
    try {
      const failureMetadata = {
        originalAction: action,
        originalResult: result,
        originalMetadata: metadata
          ? "[omitted: potentially unserializable]"
          : null,
        error: error instanceof Error ? error.message : String(error),
      };
      logAction(workflowId, `${action}_failed`, "failed", failureMetadata);
    } catch (nestedError) {
      // Complete failure - can't log at all (workflow likely deleted)
      // Log the double failure so it's visible in logs
      logger.error("Failed to log failure action (double failure)", {
        workflowId,
        originalAction: action,
        nestedError:
          nestedError instanceof Error
            ? nestedError.message
            : String(nestedError),
        context: "logActionSafe.nestedFailure",
      });
    }

    return false;
  }
}

/**
 * Log a commit
 * @throws Error if workflow doesn't exist (foreign key constraint)
 */
function logCommit(workflowId: string, sha: string, message: string): void {
  const db = getDatabase();

  try {
    db.run(
      `
        INSERT INTO commits (workflow_id, sha, message, created_at)
        VALUES (?, ?, ?, ?)
      `,
      [workflowId, sha, message, now()],
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("FOREIGN KEY constraint failed")
    ) {
      throw new Error(
        `Failed to log commit: No workflow found with ID "${workflowId}". ` +
          `Create the workflow first with checkpoint.create().`,
      );
    }
    throw error;
  }
}

/**
 * Update workflow phase
 * @throws Error if workflow doesn't exist
 */
function setPhase(workflowId: string, phase: WorkflowPhase): void {
  const db = getDatabase();
  const result = db.run(
    `UPDATE workflows SET phase = ?, updated_at = ? WHERE id = ?`,
    [phase, now(), workflowId],
  );

  if (result.changes === 0) {
    throw new Error(
      `Failed to update workflow phase: No workflow found with ID "${workflowId}". ` +
        `The workflow may have been deleted or the ID is incorrect.`,
    );
  }
}

/**
 * Update workflow status
 * @throws Error if workflow doesn't exist
 */
function setStatus(workflowId: string, status: WorkflowStatus): void {
  const db = getDatabase();
  const result = db.run(
    `UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?`,
    [status, now(), workflowId],
  );

  if (result.changes === 0) {
    throw new Error(
      `Failed to update workflow status: No workflow found with ID "${workflowId}". ` +
        `The workflow may have been deleted or the ID is incorrect.`,
    );
  }
}

/**
 * Increment retry count
 * @throws Error if workflow doesn't exist
 */
function incrementRetry(workflowId: string): number {
  const db = getDatabase();

  // Use RETURNING clause to get updated value in single query (SQLite 3.35+)
  const result = db
    .query<
      { retry_count: number },
      [string, string]
    >(`UPDATE workflows SET retry_count = retry_count + 1, updated_at = ? WHERE id = ? RETURNING retry_count`)
    .get(now(), workflowId);

  if (!result) {
    throw new Error(
      `Failed to increment retry count: No workflow found with ID "${workflowId}". ` +
        `Cannot track retry attempts for non-existent workflow.`,
    );
  }

  return result.retry_count;
}

/**
 * List all active (non-completed) workflows
 */
function listActive(): Workflow[] {
  const db = getDatabase();
  const rows = db
    .query<
      {
        id: string;
        issue_number: number;
        branch: string;
        worktree: string | null;
        phase: WorkflowPhase;
        status: WorkflowStatus;
        retry_count: number;
        created_at: string;
        updated_at: string;
      },
      []
    >(
      `
      SELECT id, issue_number, branch, worktree, phase, status,
             retry_count, created_at, updated_at
      FROM workflows WHERE status IN ('running', 'paused') ORDER BY updated_at DESC
    `,
    )
    .all();

  return rows.map((row) => ({
    id: row.id,
    issueNumber: row.issue_number,
    branch: row.branch,
    worktree: row.worktree,
    phase: row.phase,
    status: row.status,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Delete a workflow and all its data
 * Note: Silently succeeds if workflow doesn't exist (idempotent delete)
 */
function deleteWorkflow(workflowId: string): void {
  const db = getDatabase();
  db.run(`DELETE FROM workflows WHERE id = ?`, [workflowId]);
}

/**
 * Mark stale workflows as failed and log abandonment.
 * Stale = status is 'running' but updated_at is older than threshold.
 *
 * @param thresholdHours - Hours of inactivity before marking stale (default: 24)
 * @returns Number of workflows successfully cleaned up
 */
function cleanupStaleWorkflows(thresholdHours: number = 24): number {
  const db = getDatabase();
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  const cutoffTime = new Date(Date.now() - thresholdMs).toISOString();

  // Find stale workflows
  const staleWorkflows = db
    .query<{ id: string; issue_number: number; updated_at: string }, [string]>(
      `
        SELECT id, issue_number, updated_at
        FROM workflows
        WHERE status = 'running' AND updated_at < ?
      `,
    )
    .all(cutoffTime);

  if (staleWorkflows.length === 0) {
    return 0;
  }

  // Mark each as failed, track successful cleanups
  let successCount = 0;
  for (const wf of staleWorkflows) {
    try {
      setStatus(wf.id, "failed");
      logAction(wf.id, "workflow_stale_cleanup", "failed", {
        reason: `Workflow inactive for more than ${thresholdHours} hours`,
        lastUpdate: wf.updated_at,
      });
      successCount++;

      logger.info("Marked stale workflow as failed", {
        workflowId: wf.id,
        issueNumber: wf.issue_number,
        lastUpdate: wf.updated_at,
        context: "cleanupStaleWorkflows",
      });
    } catch (error) {
      logger.warn("Failed to cleanup stale workflow", {
        workflowId: wf.id,
        error: error instanceof Error ? error.message : String(error),
        context: "cleanupStaleWorkflows",
      });
    }
  }

  return successCount;
}

/**
 * Link workflow to milestone
 * @throws Error if workflow or milestone doesn't exist (foreign key constraint)
 */
function linkWorkflowToMilestone(
  workflowId: string,
  milestoneId: string,
  waveNumber?: number,
): void {
  const db = getDatabase();

  try {
    db.run(
      `
        INSERT INTO milestone_workflows (milestone_id, workflow_id, wave_number)
        VALUES (?, ?, ?)
      `,
      [milestoneId, workflowId, waveNumber ?? null],
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("FOREIGN KEY constraint failed")
    ) {
      throw new Error(
        `Failed to link workflow to milestone: Either workflow "${workflowId}" or milestone "${milestoneId}" does not exist. ` +
          `Create them first before linking.`,
      );
    }
    throw error;
  }
}

/**
 * List all workflows for a milestone
 */
function listMilestoneWorkflows(milestoneId: string): Workflow[] {
  const db = getDatabase();

  const rows = db
    .query<
      {
        id: string;
        issue_number: number;
        branch: string;
        worktree: string | null;
        phase: WorkflowPhase;
        status: WorkflowStatus;
        retry_count: number;
        created_at: string;
        updated_at: string;
      },
      [string]
    >(
      `
      SELECT w.id, w.issue_number, w.branch, w.worktree, w.phase, w.status,
             w.retry_count, w.created_at, w.updated_at
      FROM workflows w
      JOIN milestone_workflows mw ON w.id = mw.workflow_id
      WHERE mw.milestone_id = ?
      ORDER BY mw.wave_number ASC, w.created_at ASC
    `,
    )
    .all(milestoneId);

  return rows.map((row) => ({
    id: row.id,
    issueNumber: row.issue_number,
    branch: row.branch,
    worktree: row.worktree,
    phase: row.phase,
    status: row.status,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export const workflow = {
  create,
  save,
  load,
  findByIssue,
  setPhase,
  setStatus,
  incrementRetry,
  logAction,
  logActionSafe,
  logCommit,
  listActive,
  delete: deleteWorkflow,
  cleanupStaleWorkflows,
  linkWorkflowToMilestone,
  listMilestoneWorkflows,
};
