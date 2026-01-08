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

  // Boost for matching issue (both must be defined)
  if (
    context?.issueNumber !== undefined &&
    learning.learning.sourceIssue !== undefined &&
    context.issueNumber === learning.learning.sourceIssue
  ) {
    score += 0.3;
  }

  // Boost for matching file (both must be defined)
  if (
    learning.learning.filePath &&
    context?.modifiedFiles?.includes(learning.learning.filePath)
  ) {
    score += 0.2;
  }

  // Boost for recency (last 30 days)
  if (learning.learning.metadata?.createdAt) {
    const parsedDate = new Date(learning.learning.metadata.createdAt as string);
    if (!isNaN(parsedDate.getTime())) {
      const age = Date.now() - parsedDate.getTime();
      const daysAgo = age / (1000 * 60 * 60 * 24);
      if (daysAgo < 30) {
        score += 0.1;
      }
    }
  }

  return score;
}

/**
 * Section for token budget enforcement.
 */
interface Section {
  type: string;
  content: string;
  priority: number;
}

/**
 * Enforce token budget by selecting highest priority sections.
 *
 * @param sections - Sections to enforce budget on
 * @param maxTokens - Maximum token budget
 * @returns Content strings that fit within budget
 */
function enforceTokenBudget(sections: Section[], maxTokens: number): string[] {
  let currentTokens = 0;
  const included: string[] = [];

  // Sort sections by priority (highest first)
  sections.sort((a, b) => b.priority - a.priority);

  for (const section of sections) {
    const tokens = estimateTokens(section.content);
    if (currentTokens + tokens <= maxTokens) {
      included.push(section.content);
      currentTokens += tokens;
    } else {
      break; // Budget exhausted
    }
  }

  return included;
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
  const maxTokens = options.maxTokens || 2000;
  const showFilePaths = options.showFilePaths ?? true;
  const context = options.context;

  const lines: string[] = [];
  const sections: Section[] = [];

  // Header with context
  lines.push("## Relevant Knowledge");
  lines.push("");

  if (context?.issueNumber || context?.primaryCodeArea) {
    const contextParts = [
      context.issueNumber ? `Issue #${context.issueNumber}` : null,
      context.primaryCodeArea ? `Area: ${context.primaryCodeArea}` : null,
    ].filter(Boolean);
    lines.push(`Context: ${contextParts.join(", ")}`);
  }

  // Empty state
  if (
    learnings.length === 0 &&
    patterns.length === 0 &&
    mistakes.length === 0
  ) {
    lines.push("*No relevant knowledge found for this context.*");
    lines.push("");
    return lines.join("\n");
  }

  // Group and sort learnings
  const sortedLearnings = sortByRelevance(learnings, context);
  const grouped = groupByCodeArea(sortedLearnings);

  // Build sections for each code area
  for (const [area, areaLearnings] of grouped) {
    const sectionLines: string[] = [];
    sectionLines.push(`### Code Area: ${area}`);

    for (const result of areaLearnings) {
      const { learning } = result;
      const prefix = learning.sourceIssue ? `[#${learning.sourceIssue}]` : "";
      const confidence = learning.confidence
        ? ` (confidence: ${learning.confidence.toFixed(2)})`
        : "";
      sectionLines.push(`- ${prefix} ${learning.content}${confidence}`);
    }
    sectionLines.push("");

    const avgPriority =
      areaLearnings.length > 0
        ? areaLearnings.reduce(
            (sum, l) => sum + calculatePriority(l, context),
            0,
          ) / areaLearnings.length
        : 0;

    sections.push({
      type: "learning",
      content: sectionLines.join("\n"),
      priority: avgPriority,
    });
  }

  // Build patterns section
  if (patterns.length > 0) {
    const patternLines: string[] = [];
    patternLines.push("### Patterns");
    for (const pattern of patterns) {
      patternLines.push(`- **${pattern.name}**: ${pattern.description}`);
    }
    patternLines.push("");

    sections.push({
      type: "patterns",
      content: patternLines.join("\n"),
      priority: 0.7, // Medium-high priority
    });
  }

  // Build mistakes section (highest priority if in modified files)
  if (mistakes.length > 0) {
    const mistakeLines: string[] = [];
    const currentFileMistakes = mistakes.filter((m) =>
      context?.modifiedFiles?.includes(m.filePath || ""),
    );

    if (currentFileMistakes.length > 0) {
      mistakeLines.push("### Past Mistakes in Current Files");
      for (const mistake of currentFileMistakes) {
        const location =
          showFilePaths && mistake.filePath ? `\`${mistake.filePath}\`: ` : "";
        mistakeLines.push(`- ${location}${mistake.description}`);
        mistakeLines.push(`  Fixed: ${mistake.howFixed}`);
      }
      mistakeLines.push("");

      sections.push({
        type: "mistakes-current",
        content: mistakeLines.join("\n"),
        priority: 1.0, // Highest priority
      });
    }

    // Other mistakes (lower priority)
    const otherMistakes = mistakes.filter(
      (m) => !context?.modifiedFiles?.includes(m.filePath || ""),
    );
    if (otherMistakes.length > 0) {
      const otherLines: string[] = [];
      otherLines.push("### Mistakes to Avoid");
      for (const mistake of otherMistakes) {
        const location =
          showFilePaths && mistake.filePath ? `\`${mistake.filePath}\`: ` : "";
        otherLines.push(
          `- ${location}${mistake.description} (Fixed: ${mistake.howFixed})`,
        );
      }
      otherLines.push("");

      sections.push({
        type: "mistakes-other",
        content: otherLines.join("\n"),
        priority: 0.6,
      });
    }
  }

  // Enforce token budget
  const budgetedSections = enforceTokenBudget(
    sections,
    maxTokens - estimateTokens(lines.join("\n")),
  );

  // Calculate actual token usage
  const headerTokens = estimateTokens(lines.join("\n"));
  const contentTokens = budgetedSections.reduce(
    (sum, section) => sum + estimateTokens(section),
    0,
  );
  const totalTokens = headerTokens + contentTokens;

  // Add token usage line
  lines.push(`Token usage: ~${totalTokens} / ${maxTokens}`);
  lines.push("");

  // Add budgeted content
  lines.push(...budgetedSections);

  // Footer if content was trimmed
  if (budgetedSections.length < sections.length) {
    const shown = budgetedSections.length;
    const total = sections.length;
    lines.push("---");
    lines.push(
      `*Showing ${shown} of ${total} sections (token budget: ${totalTokens}/${maxTokens})*`,
    );
    lines.push("");
  }

  return lines.join("\n");
}
