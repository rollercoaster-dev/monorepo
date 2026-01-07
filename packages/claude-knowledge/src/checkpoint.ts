import { Logger } from "@rollercoaster-dev/rd-logger";
import { getDatabase } from "./db/sqlite";
import type {
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

const logger = new Logger();

function generateWorkflowId(issueNumber: number): string {
  return `workflow-${issueNumber}-${Date.now()}`;
}

function generateMilestoneId(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `milestone-${sanitized}-${Date.now()}`;
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
    logger.warn("Failed to parse metadata, treating as null", {
      module: "claude-knowledge",
      context,
      rawValue: json.substring(0, 100) + (json.length > 100 ? "..." : ""),
      error: error instanceof Error ? error.message : String(error),
    });
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

  /**
   * Create a new milestone checkpoint
   */
  createMilestone(name: string, githubMilestoneNumber?: number): Milestone {
    const db = getDatabase();
    const id = generateMilestoneId(name);
    const timestamp = now();

    const milestone: Milestone = {
      id,
      name,
      githubMilestoneNumber: githubMilestoneNumber ?? null,
      phase: "planning",
      status: "running",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.run(
      `
      INSERT INTO milestones (id, name, github_milestone_number, phase, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        milestone.id,
        milestone.name,
        milestone.githubMilestoneNumber,
        milestone.phase,
        milestone.status,
        milestone.createdAt,
        milestone.updatedAt,
      ],
    );

    return milestone;
  },

  /**
   * Load milestone state by ID
   */
  getMilestone(id: string): MilestoneCheckpointData | null {
    const db = getDatabase();

    const milestoneRow = db
      .query<
        {
          id: string;
          name: string;
          github_milestone_number: number | null;
          phase: MilestonePhase;
          status: WorkflowStatus;
          created_at: string;
          updated_at: string;
        },
        [string]
      >(
        `
      SELECT id, name, github_milestone_number, phase, status, created_at, updated_at
      FROM milestones WHERE id = ?
    `,
      )
      .get(id);

    if (!milestoneRow) return null;

    const milestone: Milestone = {
      id: milestoneRow.id,
      name: milestoneRow.name,
      githubMilestoneNumber: milestoneRow.github_milestone_number,
      phase: milestoneRow.phase,
      status: milestoneRow.status,
      createdAt: milestoneRow.created_at,
      updatedAt: milestoneRow.updated_at,
    };

    // Load baseline if exists
    const baselineRow = db
      .query<
        {
          id: number;
          milestone_id: string;
          captured_at: string;
          lint_exit_code: number;
          lint_warnings: number;
          lint_errors: number;
          typecheck_exit_code: number;
          typecheck_errors: number;
        },
        [string]
      >(
        `
      SELECT id, milestone_id, captured_at, lint_exit_code, lint_warnings, lint_errors,
             typecheck_exit_code, typecheck_errors
      FROM baselines WHERE milestone_id = ?
    `,
      )
      .get(id);

    const baseline: Baseline | null = baselineRow
      ? {
          id: baselineRow.id,
          milestoneId: baselineRow.milestone_id,
          capturedAt: baselineRow.captured_at,
          lintExitCode: baselineRow.lint_exit_code,
          lintWarnings: baselineRow.lint_warnings,
          lintErrors: baselineRow.lint_errors,
          typecheckExitCode: baselineRow.typecheck_exit_code,
          typecheckErrors: baselineRow.typecheck_errors,
        }
      : null;

    // Load linked workflows
    const workflowRows = db
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
      .all(id);

    const workflows: Workflow[] = workflowRows.map((row) => ({
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

    return { milestone, baseline, workflows };
  },

  /**
   * Find milestone by name (most recent)
   */
  findMilestoneByName(name: string): MilestoneCheckpointData | null {
    const db = getDatabase();

    const row = db
      .query<{ id: string }, [string]>(
        `
      SELECT id FROM milestones WHERE name = ? ORDER BY created_at DESC LIMIT 1
    `,
      )
      .get(name);

    if (!row) return null;
    return this.getMilestone(row.id);
  },

  /**
   * Update milestone phase
   * @throws Error if milestone doesn't exist
   */
  setMilestonePhase(id: string, phase: MilestonePhase): void {
    const db = getDatabase();
    const result = db.run(
      `UPDATE milestones SET phase = ?, updated_at = ? WHERE id = ?`,
      [phase, now(), id],
    );

    if (result.changes === 0) {
      throw new Error(
        `Failed to update milestone phase: No milestone found with ID "${id}". ` +
          `The milestone may have been deleted or the ID is incorrect.`,
      );
    }
  },

  /**
   * Update milestone status
   * @throws Error if milestone doesn't exist
   */
  setMilestoneStatus(id: string, status: WorkflowStatus): void {
    const db = getDatabase();
    const result = db.run(
      `UPDATE milestones SET status = ?, updated_at = ? WHERE id = ?`,
      [status, now(), id],
    );

    if (result.changes === 0) {
      throw new Error(
        `Failed to update milestone status: No milestone found with ID "${id}". ` +
          `The milestone may have been deleted or the ID is incorrect.`,
      );
    }
  },

  /**
   * Save baseline snapshot (replaces existing if present)
   */
  saveBaseline(
    milestoneId: string,
    baselineData: Omit<Baseline, "id" | "milestoneId">,
  ): void {
    const db = getDatabase();

    try {
      // Delete existing baseline first (upsert behavior)
      db.run(`DELETE FROM baselines WHERE milestone_id = ?`, [milestoneId]);

      // Insert new baseline
      db.run(
        `
        INSERT INTO baselines (milestone_id, captured_at, lint_exit_code, lint_warnings,
                               lint_errors, typecheck_exit_code, typecheck_errors)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          milestoneId,
          baselineData.capturedAt,
          baselineData.lintExitCode,
          baselineData.lintWarnings,
          baselineData.lintErrors,
          baselineData.typecheckExitCode,
          baselineData.typecheckErrors,
        ],
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("FOREIGN KEY constraint failed")
      ) {
        throw new Error(
          `Failed to save baseline: No milestone found with ID "${milestoneId}". ` +
            `Create the milestone first with checkpoint.createMilestone().`,
        );
      }
      throw error;
    }
  },

  /**
   * Link workflow to milestone
   * @throws Error if workflow or milestone doesn't exist (foreign key constraint)
   */
  linkWorkflowToMilestone(
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
  },

  /**
   * List all workflows for a milestone
   */
  listMilestoneWorkflows(milestoneId: string): Workflow[] {
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
  },

  /**
   * List all active (non-completed) milestones
   */
  listActiveMilestones(): Milestone[] {
    const db = getDatabase();

    const rows = db
      .query<
        {
          id: string;
          name: string;
          github_milestone_number: number | null;
          phase: MilestonePhase;
          status: WorkflowStatus;
          created_at: string;
          updated_at: string;
        },
        []
      >(
        `
      SELECT id, name, github_milestone_number, phase, status, created_at, updated_at
      FROM milestones WHERE status IN ('running', 'paused') ORDER BY updated_at DESC
    `,
      )
      .all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      githubMilestoneNumber: row.github_milestone_number,
      phase: row.phase,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * Delete a milestone and all its data
   * Note: Silently succeeds if milestone doesn't exist (idempotent delete)
   */
  deleteMilestone(id: string): void {
    const db = getDatabase();
    db.run(`DELETE FROM milestones WHERE id = ?`, [id]);
  },
};
