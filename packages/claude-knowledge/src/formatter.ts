/**
 * Knowledge Formatter
 *
 * Token-aware formatting of knowledge graph results for Claude context injection.
 * Handles grouping, prioritization, and token budget management.
 */

import type { QueryResult, Pattern, Mistake } from "./types";

/**
 * Options for formatting knowledge context.
 */
export interface FormatOptions {
  /** Maximum token budget for the formatted output (default: 2000) */
  maxTokens?: number;
  /** Estimated tokens per learning entry (default: 75) */
  estimatedTokensPerLearning?: number;
  /** Prioritize learnings by recency (default: true) */
  prioritizeByRecency?: boolean;
  /** Show file paths in the output (default: true) */
  showFilePaths?: boolean;
  /** Context for prioritization and filtering */
  context?: {
    issueNumber?: number;
    primaryCodeArea?: string;
    modifiedFiles?: string[];
  };
}

/**
 * Estimate token count for a given text.
 * Uses a rough heuristic of ~4 characters per token.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  // Rough heuristic: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Group learnings by code area and sort groups by relevance.
 * Groups are sorted by number of learnings (most relevant areas first).
 *
 * @param learnings - Query results to group
 * @returns Map of code area to learnings, sorted by group size
 */
export function groupByCodeArea(
  learnings: QueryResult[],
): Map<string, QueryResult[]> {
  const groups = new Map<string, QueryResult[]>();

  // Group learnings by code area
  for (const result of learnings) {
    const area = result.learning.codeArea || "General";
    const existing = groups.get(area) || [];
    existing.push(result);
    groups.set(area, existing);
  }

  // Sort groups by size (most learnings first)
  const sortedEntries = Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );

  return new Map(sortedEntries);
}

/**
 * Sort learnings by relevance based on confidence, recency, and context matching.
 *
 * @param learnings - Query results to sort
 * @param context - Optional context for priority boosts
 * @returns Sorted learnings (highest priority first)
 */
export function sortByRelevance(
  learnings: QueryResult[],
  context?: FormatOptions["context"],
): QueryResult[] {
  // Calculate priority for each learning
  const withPriority = learnings.map((learning) => ({
    learning,
    priority: calculatePriority(learning, context),
  }));

  // Sort by priority (highest first)
  withPriority.sort((a, b) => b.priority - a.priority);

  return withPriority.map((item) => item.learning);
}

/**
 * Calculate priority score for a learning.
 * Priority is based on confidence, context matching, and recency.
 *
 * @param learning - The query result to score
 * @param context - Optional context for boosts
 * @returns Priority score (higher = more relevant)
 */
export function calculatePriority(
  learning: QueryResult,
  context?: FormatOptions["context"],
): number {
  let score = learning.learning.confidence || 0.5;

  // Boost for matching issue
  if (context?.issueNumber === learning.learning.sourceIssue) {
    score += 0.3;
  }

  // Boost for matching file
  if (context?.modifiedFiles?.includes(learning.learning.filePath || "")) {
    score += 0.2;
  }

  // Boost for recency (last 30 days)
  if (learning.learning.metadata?.createdAt) {
    const age =
      Date.now() -
      new Date(learning.learning.metadata.createdAt as string).getTime();
    const daysAgo = age / (1000 * 60 * 60 * 24);
    if (daysAgo < 30) {
      score += 0.1;
    }
  }

  return score;
}

/**
 * Format knowledge context for injection into Claude's context window.
 * Handles grouping, prioritization, and token budget management.
 *
 * @param learnings - Query results to format
 * @param patterns - Applicable patterns
 * @param mistakes - Mistakes to avoid
 * @param options - Formatting options
 * @returns Formatted markdown string
 */
export function formatKnowledgeContext(
  learnings: QueryResult[],
  patterns: Pattern[] = [],
  mistakes: Mistake[] = [],
  options: FormatOptions = {},
): string {
  // Default options
  const _maxTokens = options.maxTokens || 2000;
  const _showFilePaths = options.showFilePaths ?? true;
  const _context = options.context;

  // TODO: Implement full formatting with grouping and token budget
  // This is a scaffold for Step 1
  const lines: string[] = [];

  lines.push("## Relevant Knowledge");
  lines.push("");

  // Placeholder - will be implemented in subsequent commits
  if (
    learnings.length === 0 &&
    patterns.length === 0 &&
    mistakes.length === 0
  ) {
    lines.push("*No relevant knowledge found for this context.*");
    lines.push("");
  }

  return lines.join("\n");
}
