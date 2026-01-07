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
   */
  save(workflow: Workflow): void {
    const db = getDatabase();
    workflow.updatedAt = now();

    db.run(
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
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
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
   */
  logAction(
    workflowId: string,
    action: string,
    result: "success" | "failed" | "pending",
    metadata?: Record<string, unknown>,
  ): void {
    const db = getDatabase();

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
  },

  /**
   * Log a commit
   */
  logCommit(workflowId: string, sha: string, message: string): void {
    const db = getDatabase();

    db.run(
      `
      INSERT INTO commits (workflow_id, sha, message, created_at)
      VALUES (?, ?, ?, ?)
    `,
      [workflowId, sha, message, now()],
    );
  },

  /**
   * Update workflow phase
   */
  setPhase(workflowId: string, phase: WorkflowPhase): void {
    const db = getDatabase();
    db.run(`UPDATE workflows SET phase = ?, updated_at = ? WHERE id = ?`, [
      phase,
      now(),
      workflowId,
    ]);
  },

  /**
   * Update workflow status
   */
  setStatus(workflowId: string, status: WorkflowStatus): void {
    const db = getDatabase();
    db.run(`UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?`, [
      status,
      now(),
      workflowId,
    ]);
  },

  /**
   * Increment retry count
   */
  incrementRetry(workflowId: string): number {
    const db = getDatabase();
    db.run(
      `UPDATE workflows SET retry_count = retry_count + 1, updated_at = ? WHERE id = ?`,
      [now(), workflowId],
    );

    const result = db
      .query<{ retry_count: number }, [string]>(
        `
      SELECT retry_count FROM workflows WHERE id = ?
    `,
      )
      .get(workflowId);

    return result?.retry_count ?? 0;
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
   */
  delete(workflowId: string): void {
    const db = getDatabase();
    db.run(`DELETE FROM workflows WHERE id = ?`, [workflowId]);
  },
};
