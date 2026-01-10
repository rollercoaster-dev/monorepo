import type {
  MilestonePhase,
  WorkflowPhase,
  WorkflowStatus,
} from "../../types";

// Valid enum values for validation
export const VALID_MILESTONE_PHASES: MilestonePhase[] = [
  "planning",
  "execute",
  "review",
  "merge",
  "cleanup",
];
export const VALID_WORKFLOW_PHASES: WorkflowPhase[] = [
  "research",
  "implement",
  "review",
  "finalize",
  "planning",
  "execute",
  "merge",
  "cleanup",
];
export const VALID_STATUSES: WorkflowStatus[] = [
  "running",
  "paused",
  "completed",
  "failed",
];
export const VALID_ACTION_RESULTS = ["success", "failed", "pending"] as const;

/**
 * Parse integer with strict validation.
 * Rejects strings with trailing non-numeric characters like "12abc".
 */
export function parseIntSafe(value: string, name: string): number {
  const trimmed = value.trim();
  // Use Number() for strict parsing - it returns NaN for "12abc"
  // while parseInt("12abc") would return 12
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid integer`);
  }
  return parsed;
}

/**
 * Validate enum value.
 */
export function validateEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  name: string,
): T {
  if (!validValues.includes(value as T)) {
    throw new Error(
      `Invalid ${name}: "${value}". Valid values: ${validValues.join(", ")}`,
    );
  }
  return value as T;
}

/**
 * Parse JSON safely with helpful error.
 */
export function parseJsonSafe(
  value: string,
  name: string,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("must be a JSON object, not an array or primitive");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid ${name}: ${error.message}. Example: '{"key": "value"}'`,
      );
    }
    throw new Error(
      `Invalid ${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
