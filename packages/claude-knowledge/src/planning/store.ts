/**
 * Planning Entity Store
 *
 * CRUD operations for planning entities (Goals, Interrupts).
 * Manages stack ordering via the stack_order field.
 */

import { getDatabase } from "../db/sqlite";
import { randomUUID } from "crypto";
import type {
  ExternalRef,
  ExternalRefType,
  Goal,
  Interrupt,
  Plan,
  PlanSourceType,
  PlanStep,
  PlanningEntity,
  PlanningEntityStatus,
  PlanningRelationship,
  PlanningRelationshipType,
} from "../types";

/** Row shape from SQLite planning_entities table */
interface PlanningEntityRow {
  id: string;
  type: string;
  title: string;
  data: string;
  stack_order: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Row shape from SQLite planning_relationships table */
interface PlanningRelationshipRow {
  id: number;
  from_id: string;
  to_id: string;
  type: string;
  data: string | null;
  created_at: string;
}

/**
 * Convert a database row to a typed PlanningEntity.
 */
function rowToEntity(row: PlanningEntityRow): PlanningEntity {
  const data = JSON.parse(row.data) as Record<string, unknown>;
  const base = {
    id: row.id,
    title: row.title,
    stackOrder: row.stack_order,
    status: row.status as PlanningEntityStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.type === "Goal") {
    return {
      ...base,
      type: "Goal" as const,
      description: data.description as string | undefined,
      issueNumber: data.issueNumber as number | undefined,
      planStepId: data.planStepId as string | undefined,
      metadata: data.metadata as Record<string, unknown> | undefined,
    };
  }

  return {
    ...base,
    type: "Interrupt" as const,
    reason: (data.reason as string) || "",
    interruptedId: data.interruptedId as string | undefined,
    metadata: data.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Convert a database row to a typed PlanningRelationship.
 */
function rowToRelationship(row: PlanningRelationshipRow): PlanningRelationship {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    type: row.type as PlanningRelationshipType,
    data: row.data
      ? (JSON.parse(row.data) as Record<string, unknown>)
      : undefined,
    createdAt: row.created_at,
  };
}

/**
 * Create a Goal entity and push it onto the stack.
 */
export function createGoal(opts: {
  title: string;
  description?: string;
  issueNumber?: number;
  planStepId?: string;
  metadata?: Record<string, unknown>;
}): Goal {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `goal-${randomUUID()}`;

  const data = JSON.stringify({
    description: opts.description,
    issueNumber: opts.issueNumber,
    planStepId: opts.planStepId,
    metadata: opts.metadata,
  });

  db.run("BEGIN TRANSACTION");
  try {
    // Shift existing active/paused items down (increment stack_order)
    db.run(
      `UPDATE planning_entities SET stack_order = stack_order + 1, updated_at = ?
       WHERE stack_order IS NOT NULL AND status IN ('active', 'paused')`,
      [now],
    );

    // Pause the current top item (if any)
    db.run(
      `UPDATE planning_entities SET status = 'paused', updated_at = ?
       WHERE stack_order = 1 AND status = 'active'`,
      [now],
    );

    // Insert new goal at top of stack (stack_order = 0)
    db.run(
      `INSERT INTO planning_entities (id, type, title, data, stack_order, status, created_at, updated_at)
       VALUES (?, 'Goal', ?, ?, 0, 'active', ?, ?)`,
      [id, opts.title, data, now, now],
    );

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }

  return {
    id,
    type: "Goal",
    title: opts.title,
    description: opts.description,
    issueNumber: opts.issueNumber,
    planStepId: opts.planStepId,
    metadata: opts.metadata,
    stackOrder: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create an Interrupt entity and push it onto the stack.
 * Automatically links to the current top item via INTERRUPTED_BY relationship.
 */
export function createInterrupt(opts: {
  title: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): { interrupt: Interrupt; interruptedItem?: PlanningEntity } {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `interrupt-${randomUUID()}`;
  let currentTop: PlanningEntity | null = null;

  db.run("BEGIN TRANSACTION");
  try {
    // Get current top item inside transaction for consistency
    currentTop = getStackTop();

    const data = JSON.stringify({
      reason: opts.reason,
      interruptedId: currentTop?.id,
      metadata: opts.metadata,
    });

    // Shift existing active/paused items down
    db.run(
      `UPDATE planning_entities SET stack_order = stack_order + 1, updated_at = ?
       WHERE stack_order IS NOT NULL AND status IN ('active', 'paused')`,
      [now],
    );

    // Pause the current top item (if any)
    db.run(
      `UPDATE planning_entities SET status = 'paused', updated_at = ?
       WHERE stack_order = 1 AND status = 'active'`,
      [now],
    );

    // Insert new interrupt at top of stack
    db.run(
      `INSERT INTO planning_entities (id, type, title, data, stack_order, status, created_at, updated_at)
       VALUES (?, 'Interrupt', ?, ?, 0, 'active', ?, ?)`,
      [id, opts.title, data, now, now],
    );

    // Create INTERRUPTED_BY relationship if there was a top item
    if (currentTop) {
      db.run(
        `INSERT INTO planning_relationships (from_id, to_id, type, created_at)
         VALUES (?, ?, 'INTERRUPTED_BY', ?)`,
        [currentTop.id, id, now],
      );
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }

  const interrupt: Interrupt = {
    id,
    type: "Interrupt",
    title: opts.title,
    reason: opts.reason,
    interruptedId: currentTop?.id,
    metadata: opts.metadata,
    stackOrder: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  return { interrupt, interruptedItem: currentTop ?? undefined };
}

/**
 * Get the top item on the stack (stack_order = 0, active).
 */
export function getStackTop(): PlanningEntity | null {
  const db = getDatabase();
  const row = db
    .query<PlanningEntityRow, []>(
      `SELECT * FROM planning_entities
       WHERE stack_order = 0 AND status = 'active'
       LIMIT 1`,
    )
    .get();

  return row ? rowToEntity(row) : null;
}

/**
 * Get all items on the stack, ordered by stack position.
 */
export function getStack(): PlanningEntity[] {
  const db = getDatabase();
  const rows = db
    .query<PlanningEntityRow, []>(
      `SELECT * FROM planning_entities
       WHERE stack_order IS NOT NULL AND status IN ('active', 'paused')
       ORDER BY stack_order ASC`,
    )
    .all();

  return rows.map(rowToEntity);
}

/**
 * Get the current stack depth.
 */
export function getStackDepth(): number {
  const db = getDatabase();
  const result = db
    .query<{ count: number }, []>(
      `SELECT COUNT(*) as count FROM planning_entities
       WHERE stack_order IS NOT NULL AND status IN ('active', 'paused')`,
    )
    .get();

  return result?.count ?? 0;
}

/**
 * Pop the top item from the stack and mark it as completed.
 * Returns the completed item, or null if stack is empty.
 */
export function popStack(): PlanningEntity | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.run("BEGIN TRANSACTION");
  try {
    // Get top item inside transaction for consistency
    const top = getStackTop();
    if (!top) {
      db.run("ROLLBACK");
      return null;
    }

    // Mark the top item as completed and remove from stack
    db.run(
      `UPDATE planning_entities SET status = 'completed', stack_order = NULL, updated_at = ?
       WHERE id = ?`,
      [now, top.id],
    );

    // Promote the next item to active (was paused at stack_order = 1, now becomes 0)
    db.run(
      `UPDATE planning_entities SET status = 'active', updated_at = ?
       WHERE stack_order = 1 AND status = 'paused'`,
      [now],
    );

    // Reorder remaining items to close the gap
    db.run(
      `UPDATE planning_entities SET stack_order = stack_order - 1, updated_at = ?
       WHERE stack_order IS NOT NULL AND stack_order > 0 AND status IN ('active', 'paused')`,
      [now],
    );

    db.run("COMMIT");

    return { ...top, status: "completed", stackOrder: null, updatedAt: now };
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Get an entity by its ID.
 */
export function getEntity(id: string): PlanningEntity | null {
  const db = getDatabase();
  const row = db
    .query<
      PlanningEntityRow,
      [string]
    >(`SELECT * FROM planning_entities WHERE id = ?`)
    .get(id);

  return row ? rowToEntity(row) : null;
}

/**
 * Update the status of an entity.
 */
export function updateStatus(id: string, status: PlanningEntityStatus): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.run(
    `UPDATE planning_entities SET status = ?, updated_at = ? WHERE id = ?`,
    [status, now, id],
  );
}

/**
 * Delete an entity (hard delete, for mistakes).
 */
export function deleteEntity(id: string): void {
  const db = getDatabase();
  db.run("BEGIN TRANSACTION");
  try {
    db.run(
      `DELETE FROM planning_relationships WHERE from_id = ? OR to_id = ?`,
      [id, id],
    );
    db.run(`DELETE FROM planning_entities WHERE id = ?`, [id]);
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Get all completed entities (for history/summarization).
 */
export function getCompleted(limit: number = 20): PlanningEntity[] {
  const db = getDatabase();
  const rows = db
    .query<PlanningEntityRow, [number]>(
      `SELECT * FROM planning_entities
       WHERE status = 'completed'
       ORDER BY updated_at DESC
       LIMIT ?`,
    )
    .all(limit);

  return rows.map(rowToEntity);
}

/**
 * Get all entities (active, paused, and completed).
 */
export function getAllEntities(): PlanningEntity[] {
  const db = getDatabase();
  const rows = db
    .query<
      PlanningEntityRow,
      []
    >(`SELECT * FROM planning_entities ORDER BY created_at ASC`)
    .all();

  return rows.map(rowToEntity);
}

/**
 * Get relationships for an entity.
 */
export function getRelationships(entityId: string): PlanningRelationship[] {
  const db = getDatabase();
  const rows = db
    .query<PlanningRelationshipRow, [string, string]>(
      `SELECT * FROM planning_relationships
       WHERE from_id = ? OR to_id = ?
       ORDER BY created_at ASC`,
    )
    .all(entityId, entityId);

  return rows.map(rowToRelationship);
}

/**
 * Create a relationship between two planning entities.
 */
export function createRelationship(
  fromId: string,
  toId: string,
  type: PlanningRelationshipType,
  data?: Record<string, unknown>,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.run(
    `INSERT OR IGNORE INTO planning_relationships (from_id, to_id, type, data, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [fromId, toId, type, data ? JSON.stringify(data) : null, now],
  );
}

// ============================================================================
// Plan CRUD Operations
// ============================================================================

/** Row shape from SQLite planning_plans table */
interface PlanRow {
  id: string;
  title: string;
  goal_id: string;
  source_type: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a database row to a typed Plan.
 */
function rowToPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    title: row.title,
    goalId: row.goal_id,
    sourceType: row.source_type as PlanSourceType,
    sourceRef: row.source_ref ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a Plan linked to a Goal.
 */
export function createPlan(opts: {
  title: string;
  goalId: string;
  sourceType: PlanSourceType;
  sourceRef?: string;
}): Plan {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `plan-${randomUUID()}`;

  db.run(
    `INSERT INTO planning_plans (id, title, goal_id, source_type, source_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      opts.title,
      opts.goalId,
      opts.sourceType,
      opts.sourceRef ?? null,
      now,
      now,
    ],
  );

  return {
    id,
    title: opts.title,
    goalId: opts.goalId,
    sourceType: opts.sourceType,
    sourceRef: opts.sourceRef,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get a Plan by its ID.
 */
export function getPlan(id: string): Plan | null {
  const db = getDatabase();
  const row = db
    .query<PlanRow, [string]>(`SELECT * FROM planning_plans WHERE id = ?`)
    .get(id);

  return row ? rowToPlan(row) : null;
}

/**
 * Get a Plan by its Goal ID.
 */
export function getPlanByGoal(goalId: string): Plan | null {
  const db = getDatabase();
  const row = db
    .query<PlanRow, [string]>(`SELECT * FROM planning_plans WHERE goal_id = ?`)
    .get(goalId);

  return row ? rowToPlan(row) : null;
}

/**
 * Update a Plan.
 */
export function updatePlan(
  id: string,
  updates: Partial<Pick<Plan, "title" | "sourceRef">>,
): void {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.title !== undefined) {
    fields.push("title = ?");
    values.push(updates.title);
  }
  if (updates.sourceRef !== undefined) {
    fields.push("source_ref = ?");
    values.push(updates.sourceRef ?? null);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());

  values.push(id);
  db.run(`UPDATE planning_plans SET ${fields.join(", ")} WHERE id = ?`, values);
}

/**
 * Delete a Plan (cascades to PlanSteps via foreign key).
 */
export function deletePlan(id: string): void {
  const db = getDatabase();
  db.run(`DELETE FROM planning_plans WHERE id = ?`, [id]);
}

/**
 * Get all Plans.
 */
export function getAllPlans(): Plan[] {
  const db = getDatabase();
  const rows = db
    .query<PlanRow, []>(`SELECT * FROM planning_plans ORDER BY created_at ASC`)
    .all();

  return rows.map(rowToPlan);
}

// ============================================================================
// PlanStep CRUD Operations
// ============================================================================

/** Row shape from SQLite planning_steps table */
interface PlanStepRow {
  id: string;
  plan_id: string;
  title: string;
  ordinal: number;
  wave: number;
  external_ref_type: string;
  external_ref_number: number | null;
  external_ref_criteria: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape from SQLite planning_step_dependencies table */
interface StepDependencyRow {
  step_id: string;
  depends_on_step_id: string;
  created_at: string;
}

/**
 * Convert a database row to a typed PlanStep.
 */
function rowToPlanStep(row: PlanStepRow, dependsOn: string[] = []): PlanStep {
  const externalRef: ExternalRef = {
    type: row.external_ref_type as ExternalRefType,
    number: row.external_ref_number ?? undefined,
    criteria: row.external_ref_criteria ?? undefined,
  };

  return {
    id: row.id,
    planId: row.plan_id,
    title: row.title,
    ordinal: row.ordinal,
    wave: row.wave,
    externalRef,
    dependsOn,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a PlanStep within a Plan.
 */
export function createPlanStep(opts: {
  planId: string;
  title: string;
  ordinal: number;
  wave: number;
  externalRef: ExternalRef;
}): PlanStep {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `step-${randomUUID()}`;

  db.run(
    `INSERT INTO planning_steps (id, plan_id, title, ordinal, wave, external_ref_type, external_ref_number, external_ref_criteria, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      opts.planId,
      opts.title,
      opts.ordinal,
      opts.wave,
      opts.externalRef.type,
      opts.externalRef.number ?? null,
      opts.externalRef.criteria ?? null,
      now,
      now,
    ],
  );

  return {
    id,
    planId: opts.planId,
    title: opts.title,
    ordinal: opts.ordinal,
    wave: opts.wave,
    externalRef: opts.externalRef,
    dependsOn: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get a PlanStep by its ID.
 */
export function getPlanStep(id: string): PlanStep | null {
  const db = getDatabase();
  const row = db
    .query<PlanStepRow, [string]>(`SELECT * FROM planning_steps WHERE id = ?`)
    .get(id);

  if (!row) return null;

  const dependsOn = getStepDependencies(id);
  return rowToPlanStep(row, dependsOn);
}

/**
 * Get all PlanSteps for a Plan.
 */
export function getStepsByPlan(planId: string): PlanStep[] {
  const db = getDatabase();
  const rows = db
    .query<
      PlanStepRow,
      [string]
    >(`SELECT * FROM planning_steps WHERE plan_id = ? ORDER BY ordinal ASC`)
    .all(planId);

  if (rows.length === 0) return [];

  // Batch-fetch all dependencies in one query to avoid N+1
  const stepIds = rows.map((r) => r.id);
  const placeholders = stepIds.map(() => "?").join(",");
  const deps = db
    .query<
      StepDependencyRow,
      string[]
    >(`SELECT * FROM planning_step_dependencies WHERE step_id IN (${placeholders})`)
    .all(...stepIds);

  // Group dependencies by step ID
  const depsByStep = new Map<string, string[]>();
  for (const dep of deps) {
    const existing = depsByStep.get(dep.step_id);
    if (existing) {
      existing.push(dep.depends_on_step_id);
    } else {
      depsByStep.set(dep.step_id, [dep.depends_on_step_id]);
    }
  }

  return rows.map((row) => rowToPlanStep(row, depsByStep.get(row.id) ?? []));
}

/**
 * Update a PlanStep.
 */
export function updatePlanStep(
  id: string,
  updates: Partial<
    Pick<PlanStep, "title" | "ordinal" | "wave" | "externalRef">
  >,
): void {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.title !== undefined) {
    fields.push("title = ?");
    values.push(updates.title);
  }
  if (updates.ordinal !== undefined) {
    fields.push("ordinal = ?");
    values.push(updates.ordinal);
  }
  if (updates.wave !== undefined) {
    fields.push("wave = ?");
    values.push(updates.wave);
  }
  if (updates.externalRef !== undefined) {
    fields.push("external_ref_type = ?");
    values.push(updates.externalRef.type);
    fields.push("external_ref_number = ?");
    values.push(updates.externalRef.number ?? null);
    fields.push("external_ref_criteria = ?");
    values.push(updates.externalRef.criteria ?? null);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());

  values.push(id);
  db.run(`UPDATE planning_steps SET ${fields.join(", ")} WHERE id = ?`, values);
}

/**
 * Delete a PlanStep (cascades to dependencies via foreign key).
 */
export function deletePlanStep(id: string): void {
  const db = getDatabase();
  db.run(`DELETE FROM planning_steps WHERE id = ?`, [id]);
}

/**
 * Add a dependency between two PlanSteps.
 */
export function addStepDependency(
  stepId: string,
  dependsOnStepId: string,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.run(
    `INSERT OR IGNORE INTO planning_step_dependencies (step_id, depends_on_step_id, created_at)
     VALUES (?, ?, ?)`,
    [stepId, dependsOnStepId, now],
  );
}

/**
 * Get the IDs of all steps that a given step depends on.
 */
export function getStepDependencies(stepId: string): string[] {
  const db = getDatabase();
  const rows = db
    .query<
      StepDependencyRow,
      [string]
    >(`SELECT * FROM planning_step_dependencies WHERE step_id = ?`)
    .all(stepId);

  return rows.map((row) => row.depends_on_step_id);
}

/**
 * Find a PlanStep by issue number from active/paused goals.
 *
 * Use case: /plan start needs to look up if an issue is part of any active plan
 * before pushing a goal. This enables linking Goals to PlanSteps for planning-driven
 * workflow orchestration.
 *
 * @param issueNumber - GitHub issue number to search for
 * @returns { plan, step, goal } if found, null otherwise
 */
export function findStepByIssueNumber(issueNumber: number): {
  plan: Plan;
  step: PlanStep;
  goal: Goal;
} | null {
  // Get all active/paused goals on the stack
  const goals = getStack().filter((item) => item.type === "Goal") as Goal[];

  for (const goal of goals) {
    // Get the plan linked to this goal (if any)
    const plan = getPlanByGoal(goal.id);
    if (!plan) continue;

    // Get all steps for this plan
    const steps = getStepsByPlan(plan.id);

    // Search for a step with matching issue number
    for (const step of steps) {
      if (
        step.externalRef.type === "issue" &&
        step.externalRef.number === issueNumber
      ) {
        return { plan, step, goal };
      }
    }
  }

  return null;
}
