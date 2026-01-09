/**
 * Commit Formatting Utility
 *
 * Shared utility for formatting conventional commit types into human-readable descriptions.
 * Used by both PR mining and session hooks for consistent learning content formatting.
 */

/**
 * Descriptions for conventional commit types.
 * Maps commit type prefixes to human-readable action descriptions.
 */
export const COMMIT_TYPE_DESCRIPTIONS: Record<string, string> = {
  feat: "Added feature",
  fix: "Fixed issue",
  refactor: "Refactored",
  test: "Added tests for",
  docs: "Documented",
  chore: "Maintenance",
  build: "Build configuration",
  ci: "CI/CD update",
  perf: "Performance improvement",
  style: "Code style update",
};

/**
 * Format a commit type and description into a learning content string.
 *
 * @param type - The conventional commit type (feat, fix, etc.)
 * @param description - The commit description or summary
 * @returns Formatted string like "Added feature: implement user auth"
 */
export function formatCommitContent(type: string, description: string): string {
  const prefix = COMMIT_TYPE_DESCRIPTIONS[type] || "Completed";
  return `${prefix}: ${description}`;
}
