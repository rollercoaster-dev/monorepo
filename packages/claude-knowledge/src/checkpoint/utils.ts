import { Logger } from "@rollercoaster-dev/rd-logger";

const logger = new Logger();

/**
 * Generate a random suffix to ensure uniqueness even when called in rapid succession.
 * Uses Math.random() which provides sufficient entropy for ID uniqueness.
 */
function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function generateWorkflowId(issueNumber: number): string {
  return `workflow-${issueNumber}-${Date.now()}-${randomSuffix()}`;
}

export function generateMilestoneId(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `milestone-${sanitized}-${Date.now()}-${randomSuffix()}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function safeJsonParse(
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

/**
 * Safely stringify an object to JSON, handling circular references and BigInts.
 * Returns null if serialization fails.
 */
export function safeJsonStringify(
  obj: Record<string, unknown> | undefined,
  context: string,
): string | null {
  if (!obj) return null;

  try {
    return JSON.stringify(obj);
  } catch (error) {
    logger.warn("Failed to stringify metadata, treating as null", {
      module: "claude-knowledge",
      context,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
