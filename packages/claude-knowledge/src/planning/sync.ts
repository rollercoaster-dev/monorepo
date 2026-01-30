/**
 * Planning Graph JSONL Sync
 *
 * Export/import planning entities to `.claude/planning.jsonl` for git-tracked
 * cross-machine synchronization. Follows the same pattern as knowledge sync.
 */

import { getDatabase } from "../db/sqlite";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { spawnSync } from "bun";
import { join, isAbsolute, dirname } from "path";

/** Default path for planning JSONL file */
const DEFAULT_PATH = ".claude/planning.jsonl";

/**
 * Get the git repository root directory.
 */
function getGitRoot(): string {
  const result = spawnSync(["git", "rev-parse", "--show-toplevel"]);
  if (result.success) {
    return result.stdout.toString().trim();
  }
  return process.cwd();
}

/**
 * Resolve a path relative to the git repository root.
 */
function resolveFromGitRoot(relativePath: string): string {
  if (isAbsolute(relativePath)) {
    return relativePath;
  }
  return join(getGitRoot(), relativePath);
}

/** Result from export operation */
export interface PlanningExportResult {
  exported: number;
  filePath: string;
}

/** Result from import operation */
export interface PlanningImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
}

/** Shape of a JSONL record for planning entities */
interface PlanningJSONLRecord {
  id: string;
  type: string;
  title: string;
  data: unknown;
  stack_order: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Shape of a JSONL record for planning relationships */
interface RelationshipJSONLRecord {
  _type: "relationship";
  from_id: string;
  to_id: string;
  type: string;
  data?: unknown;
  created_at: string;
}

/** Shape of a JSONL record for plans */
interface PlanJSONLRecord {
  _type: "plan";
  id: string;
  title: string;
  goal_id: string;
  source_type: string;
  source_ref?: string;
  created_at: string;
  updated_at: string;
}

/** Shape of a JSONL record for plan steps */
interface PlanStepJSONLRecord {
  _type: "plan_step";
  id: string;
  plan_id: string;
  title: string;
  ordinal: number;
  wave: number;
  external_ref_type: string;
  external_ref_number?: number;
  external_ref_criteria?: string;
  created_at: string;
  updated_at: string;
}

/** Shape of a JSONL record for step dependencies */
interface StepDependencyJSONLRecord {
  _type: "step_dependency";
  step_id: string;
  depends_on_step_id: string;
  created_at: string;
}

/** Row shape from SQLite */
interface EntityRow {
  id: string;
  type: string;
  title: string;
  data: string;
  stack_order: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RelationshipRow {
  from_id: string;
  to_id: string;
  type: string;
  data: string | null;
  created_at: string;
}

interface PlanRow {
  id: string;
  title: string;
  goal_id: string;
  source_type: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

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

interface StepDependencyRow {
  step_id: string;
  depends_on_step_id: string;
  created_at: string;
}

function isPlanningEntityRecord(value: unknown): value is PlanningJSONLRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.type === "string" &&
    typeof v.title === "string" &&
    "data" in v &&
    typeof v.status === "string" &&
    typeof v.created_at === "string" &&
    typeof v.updated_at === "string" &&
    !("_type" in v)
  );
}

function isRelationshipRecord(
  value: unknown,
): value is RelationshipJSONLRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v._type === "relationship";
}

function isPlanRecord(value: unknown): value is PlanJSONLRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v._type === "plan";
}

function isPlanStepRecord(value: unknown): value is PlanStepJSONLRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v._type === "plan_step";
}

function isStepDependencyRecord(
  value: unknown,
): value is StepDependencyJSONLRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v._type === "step_dependency";
}

/**
 * Export planning entities and relationships to JSONL.
 * Only exports active/paused items (not completed).
 */
export async function exportPlanningToJSONL(
  outputPath: string = DEFAULT_PATH,
): Promise<PlanningExportResult> {
  const resolvedPath = resolveFromGitRoot(outputPath);
  const db = getDatabase();

  // Query active/paused entities
  const entities = db
    .query<EntityRow, []>(
      `SELECT id, type, title, data, stack_order, status, created_at, updated_at
       FROM planning_entities
       WHERE status IN ('active', 'paused')
       ORDER BY stack_order ASC`,
    )
    .all();

  // Query relationships for active entities
  const entityIds = entities.map((e) => e.id);
  const relationships: RelationshipRow[] = [];

  if (entityIds.length > 0) {
    const placeholders = entityIds.map(() => "?").join(",");
    const rels = db
      .query<RelationshipRow, string[]>(
        `SELECT from_id, to_id, type, data, created_at
         FROM planning_relationships
         WHERE from_id IN (${placeholders}) OR to_id IN (${placeholders})`,
      )
      .all(...entityIds, ...entityIds);
    relationships.push(...rels);
  }

  // Query plans for active entities (Goals)
  const plans: PlanRow[] = [];
  if (entityIds.length > 0) {
    const placeholders = entityIds.map(() => "?").join(",");
    const plansQuery = db
      .query<PlanRow, string[]>(
        `SELECT id, title, goal_id, source_type, source_ref, created_at, updated_at
         FROM planning_plans
         WHERE goal_id IN (${placeholders})`,
      )
      .all(...entityIds);
    plans.push(...plansQuery);
  }

  // Query plan steps for active plans
  const planIds = plans.map((p) => p.id);
  const planSteps: PlanStepRow[] = [];
  const stepDependencies: StepDependencyRow[] = [];

  if (planIds.length > 0) {
    const placeholders = planIds.map(() => "?").join(",");
    const stepsQuery = db
      .query<PlanStepRow, string[]>(
        `SELECT id, plan_id, title, ordinal, wave, external_ref_type, external_ref_number, external_ref_criteria, created_at, updated_at
         FROM planning_steps
         WHERE plan_id IN (${placeholders})
         ORDER BY ordinal ASC`,
      )
      .all(...planIds);
    planSteps.push(...stepsQuery);

    // Query dependencies for plan steps
    const stepIds = planSteps.map((s) => s.id);
    if (stepIds.length > 0) {
      const stepPlaceholders = stepIds.map(() => "?").join(",");
      const depsQuery = db
        .query<StepDependencyRow, string[]>(
          `SELECT step_id, depends_on_step_id, created_at
           FROM planning_step_dependencies
           WHERE step_id IN (${stepPlaceholders})`,
        )
        .all(...stepIds);
      stepDependencies.push(...depsQuery);
    }
  }

  const lines: string[] = [];

  // Export entities
  for (const entity of entities) {
    try {
      const data = JSON.parse(entity.data);
      const record: PlanningJSONLRecord = {
        id: entity.id,
        type: entity.type,
        title: entity.title,
        data,
        stack_order: entity.stack_order,
        status: entity.status,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
      };
      lines.push(JSON.stringify(record));
    } catch (error) {
      logger.warn("Failed to serialize planning entity for export", {
        entityId: entity.id,
        error: error instanceof Error ? error.message : String(error),
        context: "planning-sync.exportPlanningToJSONL",
      });
    }
  }

  // Export relationships
  for (const rel of relationships) {
    try {
      const record: RelationshipJSONLRecord = {
        _type: "relationship",
        from_id: rel.from_id,
        to_id: rel.to_id,
        type: rel.type,
        data: rel.data ? JSON.parse(rel.data) : undefined,
        created_at: rel.created_at,
      };
      lines.push(JSON.stringify(record));
    } catch (error) {
      logger.warn("Failed to serialize planning relationship for export", {
        error: error instanceof Error ? error.message : String(error),
        context: "planning-sync.exportPlanningToJSONL",
      });
    }
  }

  // Export plans
  for (const plan of plans) {
    try {
      const record: PlanJSONLRecord = {
        _type: "plan",
        id: plan.id,
        title: plan.title,
        goal_id: plan.goal_id,
        source_type: plan.source_type,
        source_ref: plan.source_ref ?? undefined,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      };
      lines.push(JSON.stringify(record));
    } catch (error) {
      logger.warn("Failed to serialize plan for export", {
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error),
        context: "planning-sync.exportPlanningToJSONL",
      });
    }
  }

  // Export plan steps
  for (const step of planSteps) {
    try {
      const record: PlanStepJSONLRecord = {
        _type: "plan_step",
        id: step.id,
        plan_id: step.plan_id,
        title: step.title,
        ordinal: step.ordinal,
        wave: step.wave,
        external_ref_type: step.external_ref_type,
        external_ref_number: step.external_ref_number ?? undefined,
        external_ref_criteria: step.external_ref_criteria ?? undefined,
        created_at: step.created_at,
        updated_at: step.updated_at,
      };
      lines.push(JSON.stringify(record));
    } catch (error) {
      logger.warn("Failed to serialize plan step for export", {
        stepId: step.id,
        error: error instanceof Error ? error.message : String(error),
        context: "planning-sync.exportPlanningToJSONL",
      });
    }
  }

  // Export step dependencies
  for (const dep of stepDependencies) {
    try {
      const record: StepDependencyJSONLRecord = {
        _type: "step_dependency",
        step_id: dep.step_id,
        depends_on_step_id: dep.depends_on_step_id,
        created_at: dep.created_at,
      };
      lines.push(JSON.stringify(record));
    } catch (error) {
      logger.warn("Failed to serialize step dependency for export", {
        error: error instanceof Error ? error.message : String(error),
        context: "planning-sync.exportPlanningToJSONL",
      });
    }
  }

  // Ensure directory exists
  const dir = dirname(resolvedPath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write file
  try {
    writeFileSync(resolvedPath, lines.join("\n"), "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write planning JSONL to ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.debug("Exported planning to JSONL", {
    exported: entities.length,
    relationships: relationships.length,
    filePath: resolvedPath,
    context: "planning-sync.exportPlanningToJSONL",
  });

  return {
    exported: entities.length,
    filePath: resolvedPath,
  };
}

/**
 * Import planning entities and relationships from JSONL with deduplication.
 */
export async function importPlanningFromJSONL(
  inputPath: string = DEFAULT_PATH,
): Promise<PlanningImportResult> {
  const resolvedPath = resolveFromGitRoot(inputPath);
  const db = getDatabase();

  let content: string;
  try {
    content = readFileSync(resolvedPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read planning JSONL from ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const lines = content.split("\n").filter((line) => line.trim() !== "");

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  db.run("BEGIN TRANSACTION");

  try {
    for (const line of lines) {
      try {
        const parsed: unknown = JSON.parse(line);

        // Handle relationship records
        if (isRelationshipRecord(parsed)) {
          db.run(
            `INSERT OR IGNORE INTO planning_relationships (from_id, to_id, type, data, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              parsed.from_id,
              parsed.to_id,
              parsed.type,
              parsed.data ? JSON.stringify(parsed.data) : null,
              parsed.created_at,
            ],
          );
          continue;
        }

        // Handle plan records (newer wins)
        if (isPlanRecord(parsed)) {
          const planUpdatedAt = parsed.updated_at ?? parsed.created_at;
          const existingPlan = db
            .query<
              { id: string; updated_at: string },
              [string]
            >("SELECT id, updated_at FROM planning_plans WHERE id = ?")
            .get(parsed.id);

          if (existingPlan) {
            const existingDate = new Date(existingPlan.updated_at);
            const recordDate = new Date(planUpdatedAt);
            if (recordDate <= existingDate) {
              skipped++;
              continue;
            }
            db.run(
              `UPDATE planning_plans SET title = ?, goal_id = ?, source_type = ?, source_ref = ?, created_at = ?, updated_at = ? WHERE id = ?`,
              [
                parsed.title,
                parsed.goal_id,
                parsed.source_type,
                parsed.source_ref ?? null,
                parsed.created_at,
                planUpdatedAt,
                parsed.id,
              ],
            );
            updated++;
          } else {
            db.run(
              `INSERT INTO planning_plans (id, title, goal_id, source_type, source_ref, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                parsed.id,
                parsed.title,
                parsed.goal_id,
                parsed.source_type,
                parsed.source_ref ?? null,
                parsed.created_at,
                planUpdatedAt,
              ],
            );
            imported++;
          }
          continue;
        }

        // Handle plan step records (newer wins)
        if (isPlanStepRecord(parsed)) {
          const stepUpdatedAt = parsed.updated_at ?? parsed.created_at;
          const existingStep = db
            .query<
              { id: string; updated_at: string },
              [string]
            >("SELECT id, updated_at FROM planning_steps WHERE id = ?")
            .get(parsed.id);

          if (existingStep) {
            const existingDate = new Date(existingStep.updated_at);
            const recordDate = new Date(stepUpdatedAt);
            if (recordDate <= existingDate) {
              skipped++;
              continue;
            }
            db.run(
              `UPDATE planning_steps SET plan_id = ?, title = ?, ordinal = ?, wave = ?, external_ref_type = ?, external_ref_number = ?, external_ref_criteria = ?, created_at = ?, updated_at = ? WHERE id = ?`,
              [
                parsed.plan_id,
                parsed.title,
                parsed.ordinal,
                parsed.wave,
                parsed.external_ref_type,
                parsed.external_ref_number ?? null,
                parsed.external_ref_criteria ?? null,
                parsed.created_at,
                stepUpdatedAt,
                parsed.id,
              ],
            );
            updated++;
          } else {
            db.run(
              `INSERT INTO planning_steps (id, plan_id, title, ordinal, wave, external_ref_type, external_ref_number, external_ref_criteria, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                parsed.id,
                parsed.plan_id,
                parsed.title,
                parsed.ordinal,
                parsed.wave,
                parsed.external_ref_type,
                parsed.external_ref_number ?? null,
                parsed.external_ref_criteria ?? null,
                parsed.created_at,
                stepUpdatedAt,
              ],
            );
            imported++;
          }
          continue;
        }

        // Handle step dependency records
        if (isStepDependencyRecord(parsed)) {
          db.run(
            `INSERT OR IGNORE INTO planning_step_dependencies (step_id, depends_on_step_id, created_at)
             VALUES (?, ?, ?)`,
            [parsed.step_id, parsed.depends_on_step_id, parsed.created_at],
          );
          continue;
        }

        // Handle entity records
        if (!isPlanningEntityRecord(parsed)) {
          errors++;
          continue;
        }

        const record = parsed;

        // Check for existing entity by ID
        const existing = db
          .query<
            { id: string; updated_at: string },
            [string]
          >("SELECT id, updated_at FROM planning_entities WHERE id = ?")
          .get(record.id);

        if (existing) {
          // Compare timestamps - keep newer
          const existingDate = new Date(existing.updated_at);
          const recordDate = new Date(record.updated_at);

          if (recordDate <= existingDate) {
            skipped++;
            continue;
          }

          // Record is newer, update
          db.run(
            `UPDATE planning_entities
             SET type = ?, title = ?, data = ?, stack_order = ?, status = ?,
                 created_at = ?, updated_at = ?
             WHERE id = ?`,
            [
              record.type,
              record.title,
              JSON.stringify(record.data),
              record.stack_order,
              record.status,
              record.created_at,
              record.updated_at,
              record.id,
            ],
          );
          updated++;
          continue;
        }

        // New entity, insert
        db.run(
          `INSERT INTO planning_entities (id, type, title, data, stack_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            record.type,
            record.title,
            JSON.stringify(record.data),
            record.stack_order,
            record.status,
            record.created_at,
            record.updated_at,
          ],
        );
        imported++;
      } catch (error) {
        logger.warn("Failed to import planning JSONL line", {
          error: error instanceof Error ? error.message : String(error),
          context: "planning-sync.importPlanningFromJSONL",
        });
        errors++;
      }
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw new Error(
      `Failed to import planning JSONL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logger.debug("Imported planning from JSONL", {
    imported,
    updated,
    skipped,
    errors,
    filePath: resolvedPath,
    context: "planning-sync.importPlanningFromJSONL",
  });

  return { imported, updated, skipped, errors };
}

/**
 * Get file modification time in milliseconds.
 */
export function getPlanningFileModificationTime(
  filePath: string = DEFAULT_PATH,
): number {
  const resolvedPath = resolveFromGitRoot(filePath);
  try {
    if (!existsSync(resolvedPath)) return 0;
    return statSync(resolvedPath).mtimeMs;
  } catch {
    return 0;
  }
}
