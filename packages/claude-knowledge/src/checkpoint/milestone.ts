import { getDatabase } from "../db/sqlite";
import type {
  Milestone,
  MilestonePhase,
  Baseline,
  MilestoneCheckpointData,
  WorkflowStatus,
  Workflow,
  WorkflowPhase,
} from "../types";
import { generateMilestoneId, now } from "./utils";

/**
 * Create a new milestone checkpoint
 */
function createMilestone(
  name: string,
  githubMilestoneNumber?: number,
): Milestone {
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
}

/**
 * Load milestone state by ID
 */
function getMilestone(id: string): MilestoneCheckpointData | null {
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
}

/**
 * Find milestone by name (most recent)
 */
function findMilestoneByName(name: string): MilestoneCheckpointData | null {
  const db = getDatabase();

  const row = db
    .query<{ id: string }, [string]>(
      `
      SELECT id FROM milestones WHERE name = ? ORDER BY created_at DESC, rowid DESC LIMIT 1
    `,
    )
    .get(name);

  if (!row) return null;
  return getMilestone(row.id);
}

/**
 * Update milestone phase
 * @throws Error if milestone doesn't exist
 */
function setMilestonePhase(id: string, phase: MilestonePhase): void {
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
}

/**
 * Update milestone status
 * @throws Error if milestone doesn't exist
 */
function setMilestoneStatus(id: string, status: WorkflowStatus): void {
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
}

/**
 * Save baseline snapshot (replaces existing if present)
 * Uses a transaction to ensure atomicity - if INSERT fails, DELETE is rolled back.
 */
function saveBaseline(
  milestoneId: string,
  baselineData: Omit<Baseline, "id" | "milestoneId">,
): void {
  const db = getDatabase();

  // Create a transaction to ensure atomicity
  const upsertBaseline = db.transaction(() => {
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
  });

  try {
    upsertBaseline();
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
}

/**
 * List all active (non-completed) milestones
 */
function listActiveMilestones(): Milestone[] {
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
}

/**
 * Delete a milestone and all its data
 * Note: Silently succeeds if milestone doesn't exist (idempotent delete)
 */
function deleteMilestone(id: string): void {
  const db = getDatabase();
  db.run(`DELETE FROM milestones WHERE id = ?`, [id]);
}

export const milestone = {
  createMilestone,
  getMilestone,
  findMilestoneByName,
  setMilestonePhase,
  setMilestoneStatus,
  saveBaseline,
  listActiveMilestones,
  deleteMilestone,
};
