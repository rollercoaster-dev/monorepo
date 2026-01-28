/**
 * Planning Entity Store
 *
 * CRUD operations for planning entities (Goals, Interrupts).
 * Manages stack ordering via the stack_order field.
 */

import { getDatabase } from "../db/sqlite";
import { randomUUID } from "crypto";
import type {
  Goal,
  Interrupt,
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
  metadata?: Record<string, unknown>;
}): Goal {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `goal-${randomUUID()}`;

  const data = JSON.stringify({
    description: opts.description,
    issueNumber: opts.issueNumber,
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

  // Get current top item before pushing
  const currentTop = getStackTop();

  const data = JSON.stringify({
    reason: opts.reason,
    interruptedId: currentTop?.id,
    metadata: opts.metadata,
  });

  db.run("BEGIN TRANSACTION");
  try {
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
  const top = getStackTop();
  if (!top) return null;

  const now = new Date().toISOString();

  db.run("BEGIN TRANSACTION");
  try {
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
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }

  return { ...top, status: "completed", stackOrder: null, updatedAt: now };
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
