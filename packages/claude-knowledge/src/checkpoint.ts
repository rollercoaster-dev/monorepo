import { getDatabase } from "./db/sqlite";
import type {
  Workflow,
  Action,
  Commit,
  CheckpointData,
  WorkflowPhase,
  WorkflowStatus,
} from "./types";

function generateWorkflowId(issueNumber: number): string {
  return `workflow-${issueNumber}-${Date.now()}`;
}

function now(): string {
  return new Date().toISOString();
}

function safeJsonParse(
  json: string,
  context: string,
): Record<string, unknown> | null {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error(
      `[claude-knowledge] Warning: Failed to parse metadata for ${context}. ` +
        `Raw value: "${json.substring(0, 100)}${json.length > 100 ? "..." : ""}". ` +
        `Treating as null.`,
    );
    return null;
  }
}

export const checkpoint = {
  /**
   * Create a new workflow checkpoint
   */
  create(issueNumber: number, branch: string, worktree?: string): Workflow {
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
  },

  /**
   * Save/update workflow state
   * @throws Error if workflow doesn't exist
   */
  save(workflow: Workflow): void {
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
  },

  /**
   * Load workflow state by ID
   */
  load(workflowId: string): CheckpointData | null {
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
  },

  /**
   * Find workflow by issue number (most recent)
   */
  findByIssue(issueNumber: number): CheckpointData | null {
    const db = getDatabase();

    const row = db
      .query<{ id: string }, [number]>(
        `
      SELECT id FROM workflows WHERE issue_number = ? ORDER BY created_at DESC LIMIT 1
    `,
      )
      .get(issueNumber);

    if (!row) return null;
    return this.load(row.id);
  },

  /**
   * Log an action
   * @throws Error if workflow doesn't exist (foreign key constraint)
   */
  logAction(
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
          metadata ? JSON.stringify(metadata) : null,
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
  },

  /**
   * Log a commit
   * @throws Error if workflow doesn't exist (foreign key constraint)
   */
  logCommit(workflowId: string, sha: string, message: string): void {
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
  },

  /**
   * Update workflow phase
   * @throws Error if workflow doesn't exist
   */
  setPhase(workflowId: string, phase: WorkflowPhase): void {
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
  },

  /**
   * Update workflow status
   * @throws Error if workflow doesn't exist
   */
  setStatus(workflowId: string, status: WorkflowStatus): void {
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
  },

  /**
   * Increment retry count
   * @throws Error if workflow doesn't exist
   */
  incrementRetry(workflowId: string): number {
    const db = getDatabase();
    const updateResult = db.run(
      `UPDATE workflows SET retry_count = retry_count + 1, updated_at = ? WHERE id = ?`,
      [now(), workflowId],
    );

    if (updateResult.changes === 0) {
      throw new Error(
        `Failed to increment retry count: No workflow found with ID "${workflowId}". ` +
          `Cannot track retry attempts for non-existent workflow.`,
      );
    }

    const result = db
      .query<{ retry_count: number }, [string]>(
        `
      SELECT retry_count FROM workflows WHERE id = ?
    `,
      )
      .get(workflowId);

    // Defensive: should never happen after successful update
    if (!result) {
      throw new Error(
        `Unexpected state: Workflow "${workflowId}" disappeared between UPDATE and SELECT. ` +
          `Possible database corruption or race condition.`,
      );
    }

    return result.retry_count;
  },

  /**
   * List all active (non-completed) workflows
   */
  listActive(): Workflow[] {
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
  },

  /**
   * Delete a workflow and all its data
   * Note: Silently succeeds if workflow doesn't exist (idempotent delete)
   */
  delete(workflowId: string): void {
    const db = getDatabase();
    db.run(`DELETE FROM workflows WHERE id = ?`, [workflowId]);
  },
};
