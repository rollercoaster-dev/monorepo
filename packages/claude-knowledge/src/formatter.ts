/**
 * Knowledge Formatter
 *
 * Token-aware formatting of knowledge graph results for Claude context injection.
 * Handles grouping, prioritization, and token budget management.
 */

import type {
  QueryResult,
  Pattern,
  Mistake,
  Topic,
  ContextFormat,
  DocSearchResult,
  DocSection,
  CodeDoc,
} from "./types";

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

  // Sort sections by priority (highest first) - clone to avoid mutating input
  const sortedSections = [...sections].sort((a, b) => b.priority - a.priority);

  for (const section of sortedSections) {
    const tokens = estimateTokens(section.content);
    if (currentTokens + tokens <= maxTokens) {
      included.push(section.content);
      currentTokens += tokens;
    }
    // Skip oversized section but continue to try smaller/lower-priority ones
  }

  return included;
}

/**
 * Prepare knowledge data for formatting.
 * Handles sorting and option extraction shared across all format functions.
 *
 * @param learnings - Query results to format
 * @param options - Formatting options
 * @returns Prepared data with sorted learnings and extracted options
 */
function prepareKnowledge(
  learnings: QueryResult[],
  options: FormatOptions = {},
): {
  sortedLearnings: QueryResult[];
  maxTokens: number;
  showFilePaths: boolean;
  context: FormatOptions["context"];
} {
  const maxTokens = options.maxTokens || 2000;
  const showFilePaths = options.showFilePaths ?? true;
  const context = options.context;
  const sortedLearnings = sortByRelevance(learnings, context);

  return { sortedLearnings, maxTokens, showFilePaths, context };
}

/**
 * Get a human-readable relative time string from an ISO timestamp.
 *
 * @param timestamp - ISO timestamp string
 * @returns Relative time string (e.g., "2 days ago", "1 hour ago")
 */
function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();

  // Handle invalid timestamps
  if (isNaN(then)) {
    return "unknown time";
  }

  const diffMs = now - then;
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const minutes = Math.floor(absMs / (1000 * 60));
  const hours = Math.floor(absMs / (1000 * 60 * 60));
  const days = Math.floor(absMs / (1000 * 60 * 60 * 24));

  const suffix = future ? "from now" : "ago";
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ${suffix}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ${suffix}`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? "s" : ""} ${suffix}`;
  return "just now";
}

/**
 * Format knowledge context for injection into Claude's context window.
 * Handles grouping, prioritization, and token budget management.
 *
 * @param learnings - Query results to format
 * @param patterns - Applicable patterns
 * @param mistakes - Mistakes to avoid
 * @param topics - Conversation topics from previous sessions
 * @param docs - Relevant documentation from indexed docs
 * @param options - Formatting options
 * @returns Formatted markdown string
 */
export function formatKnowledgeContext(
  learnings: QueryResult[],
  patterns: Pattern[] = [],
  mistakes: Mistake[] = [],
  topics: Topic[] = [],
  docs: DocSearchResult[] = [],
  options: FormatOptions = {},
): string {
  // Prepare knowledge with shared initialization logic
  const { sortedLearnings, maxTokens, showFilePaths, context } =
    prepareKnowledge(learnings, options);

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
    mistakes.length === 0 &&
    topics.length === 0 &&
    docs.length === 0
  ) {
    lines.push("*No relevant knowledge found for this context.*");
    lines.push("");
    return lines.join("\n");
  }

  // Group sorted learnings by code area
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

  // Build topics section (conversation memory)
  if (topics.length > 0) {
    const topicLines: string[] = [];
    topicLines.push("### Recent Conversation Topics");
    for (const topic of topics) {
      const keywords = topic.keywords.slice(0, 3).join(", ");
      const age = getRelativeTime(topic.timestamp);
      topicLines.push(`- **[${keywords}]** ${topic.content} (${age})`);
    }
    topicLines.push("");

    sections.push({
      type: "topics",
      content: topicLines.join("\n"),
      priority: 0.75, // Slightly higher than patterns
    });
  }

  // Build docs section (relevant documentation)
  if (docs.length > 0) {
    const docLines: string[] = [];
    docLines.push("### Relevant Documentation");

    for (const doc of docs) {
      const { section, location, entityType, similarity } = doc;

      if (entityType === "DocSection") {
        const docSection = section as DocSection;
        docLines.push(
          `- **${docSection.heading || "Documentation"}** (${(similarity * 100).toFixed(0)}% match)`,
        );
        docLines.push(`  *Location: ${location}*`);
        // Show first 200 chars as preview
        const preview = docSection.content.slice(0, 200);
        docLines.push(
          `  ${preview}${docSection.content.length > 200 ? "..." : ""}`,
        );
      } else {
        const codeDoc = section as CodeDoc;
        const name = codeDoc.entityId.split(":").pop() || "unknown";
        docLines.push(
          `- **JSDoc: ${name}** (${(similarity * 100).toFixed(0)}% match)`,
        );
        docLines.push(`  *Location: ${location}*`);
        docLines.push(`  ${codeDoc.description || codeDoc.content}`);
      }
    }
    docLines.push("");

    sections.push({
      type: "docs",
      content: docLines.join("\n"),
      priority: 0.65, // Medium priority
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

/**
 * Format knowledge as a simple bullet list (compact format).
 * No headers or grouping - just a flat list optimized for token efficiency.
 *
 * @param learnings - Query results to format
 * @param patterns - Applicable patterns
 * @param mistakes - Mistakes to avoid
 * @param topics - Conversation topics from previous sessions
 * @param options - Formatting options
 * @returns Formatted bullet list string
 */
export function formatAsBullets(
  learnings: QueryResult[],
  patterns: Pattern[] = [],
  mistakes: Mistake[] = [],
  topics: Topic[] = [],
  options: FormatOptions = {},
): string {
  // Prepare knowledge with shared initialization logic
  const { sortedLearnings, maxTokens, showFilePaths } = prepareKnowledge(
    learnings,
    options,
  );

  const lines: string[] = [];
  let currentTokens = 0;

  // Format learnings as bullets
  for (const result of sortedLearnings) {
    const { learning } = result;
    const prefix = learning.sourceIssue ? `[#${learning.sourceIssue}] ` : "";
    const confidence = learning.confidence
      ? ` (confidence: ${learning.confidence.toFixed(2)})`
      : "";
    const filePath =
      showFilePaths && learning.filePath ? ` [${learning.filePath}]` : "";
    const line = `- ${prefix}${learning.content}${confidence}${filePath}`;

    const lineTokens = estimateTokens(line);
    if (currentTokens + lineTokens > maxTokens) break;

    lines.push(line);
    currentTokens += lineTokens;
  }

  // Format patterns as bullets
  for (const pattern of patterns) {
    const line = `- Pattern: ${pattern.name} - ${pattern.description}`;
    const lineTokens = estimateTokens(line);
    if (currentTokens + lineTokens > maxTokens) break;

    lines.push(line);
    currentTokens += lineTokens;
  }

  // Format mistakes as bullets
  for (const mistake of mistakes) {
    const location =
      showFilePaths && mistake.filePath ? `in ${mistake.filePath}: ` : "";
    const line = `- Mistake ${location}${mistake.description} (Fixed: ${mistake.howFixed})`;
    const lineTokens = estimateTokens(line);
    if (currentTokens + lineTokens > maxTokens) break;

    lines.push(line);
    currentTokens += lineTokens;
  }

  // Format topics as bullets
  for (const topic of topics) {
    const keywords = topic.keywords.slice(0, 3).join(", ");
    const line = `- Topic [${keywords}]: ${topic.content}`;
    const lineTokens = estimateTokens(line);
    if (currentTokens + lineTokens > maxTokens) break;

    lines.push(line);
    currentTokens += lineTokens;
  }

  return lines.join("\n");
}

/**
 * Escape XML special characters in a string.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format knowledge as XML (structured format for machine parsing).
 * Provides tagged structure for agents that need to parse the output.
 *
 * @param learnings - Query results to format
 * @param patterns - Applicable patterns
 * @param mistakes - Mistakes to avoid
 * @param topics - Conversation topics from previous sessions
 * @param options - Formatting options
 * @returns Formatted XML string
 */
export function formatAsXml(
  learnings: QueryResult[],
  patterns: Pattern[] = [],
  mistakes: Mistake[] = [],
  topics: Topic[] = [],
  options: FormatOptions = {},
): string {
  // Prepare knowledge with shared initialization logic
  const { sortedLearnings, maxTokens, showFilePaths } = prepareKnowledge(
    learnings,
    options,
  );

  const lines: string[] = [];
  let currentTokens = 0;

  lines.push("<knowledge>");
  currentTokens += estimateTokens("<knowledge>");

  // Format learnings
  if (sortedLearnings.length > 0) {
    lines.push("  <learnings>");
    currentTokens += estimateTokens("  <learnings>");

    for (const result of sortedLearnings) {
      const { learning } = result;
      const attrs: string[] = [`id="${escapeXml(learning.id)}"`];

      if (learning.confidence !== undefined) {
        attrs.push(`confidence="${learning.confidence.toFixed(2)}"`);
      }
      if (learning.codeArea) {
        attrs.push(`codeArea="${escapeXml(learning.codeArea)}"`);
      }
      if (showFilePaths && learning.filePath) {
        attrs.push(`filePath="${escapeXml(learning.filePath)}"`);
      }
      if (learning.sourceIssue !== undefined) {
        attrs.push(`issue="${learning.sourceIssue}"`);
      }

      const content = escapeXml(learning.content);
      const line = `    <learning ${attrs.join(" ")}>${content}</learning>`;

      const lineTokens = estimateTokens(line);
      if (currentTokens + lineTokens > maxTokens - 50) break; // Reserve space for closing tags

      lines.push(line);
      currentTokens += lineTokens;
    }

    lines.push("  </learnings>");
    currentTokens += estimateTokens("  </learnings>");
  }

  // Format patterns
  if (patterns.length > 0) {
    lines.push("  <patterns>");
    currentTokens += estimateTokens("  <patterns>");

    for (const pattern of patterns) {
      const attrs: string[] = [`id="${escapeXml(pattern.id)}"`];
      if (pattern.codeArea) {
        attrs.push(`codeArea="${escapeXml(pattern.codeArea)}"`);
      }

      const name = escapeXml(pattern.name);
      const desc = escapeXml(pattern.description);
      const line = `    <pattern ${attrs.join(" ")} name="${name}">${desc}</pattern>`;

      const lineTokens = estimateTokens(line);
      if (currentTokens + lineTokens > maxTokens - 30) break;

      lines.push(line);
      currentTokens += lineTokens;
    }

    lines.push("  </patterns>");
    currentTokens += estimateTokens("  </patterns>");
  }

  // Format mistakes
  if (mistakes.length > 0) {
    lines.push("  <mistakes>");
    currentTokens += estimateTokens("  <mistakes>");

    for (const mistake of mistakes) {
      const attrs: string[] = [`id="${escapeXml(mistake.id)}"`];
      if (showFilePaths && mistake.filePath) {
        attrs.push(`filePath="${escapeXml(mistake.filePath)}"`);
      }

      const desc = escapeXml(mistake.description);
      const fix = escapeXml(mistake.howFixed);
      const line = `    <mistake ${attrs.join(" ")} fixed="${fix}">${desc}</mistake>`;

      const lineTokens = estimateTokens(line);
      if (currentTokens + lineTokens > maxTokens - 20) break;

      lines.push(line);
      currentTokens += lineTokens;
    }

    lines.push("  </mistakes>");
    currentTokens += estimateTokens("  </mistakes>");
  }

  // Format topics
  if (topics.length > 0) {
    lines.push("  <topics>");
    currentTokens += estimateTokens("  <topics>");

    for (const topic of topics) {
      const attrs: string[] = [`id="${escapeXml(topic.id)}"`];
      if (topic.sourceSession) {
        attrs.push(`session="${escapeXml(topic.sourceSession)}"`);
      }
      if (topic.confidence !== undefined) {
        attrs.push(`confidence="${topic.confidence.toFixed(2)}"`);
      }

      const keywords = topic.keywords.map(escapeXml).join(",");
      const content = escapeXml(topic.content);
      const line = `    <topic ${attrs.join(" ")} keywords="${keywords}">${content}</topic>`;

      const lineTokens = estimateTokens(line);
      if (currentTokens + lineTokens > maxTokens - 20) break;

      lines.push(line);
      currentTokens += lineTokens;
    }

    lines.push("  </topics>");
    currentTokens += estimateTokens("  </topics>");
  }

  lines.push("</knowledge>");

  return lines.join("\n");
}

/**
 * Format knowledge using the specified format type.
 * Convenience wrapper that delegates to the appropriate formatter.
 *
 * @param format - Output format (markdown, bullets, xml)
 * @param learnings - Query results to format
 * @param patterns - Applicable patterns
 * @param mistakes - Mistakes to avoid
 * @param topics - Conversation topics from previous sessions
 * @param docs - Relevant documentation from indexed docs (only included in markdown format)
 * @param options - Formatting options
 * @returns Formatted string in the requested format
 *
 * @note The `docs` parameter is only supported in the markdown format.
 * Bullets and XML formats do not include documentation sections.
 */
export function formatByType(
  format: ContextFormat,
  learnings: QueryResult[],
  patterns: Pattern[] = [],
  mistakes: Mistake[] = [],
  topics: Topic[] = [],
  docs: DocSearchResult[] = [],
  options: FormatOptions = {},
): string {
  switch (format) {
    case "bullets":
      return formatAsBullets(learnings, patterns, mistakes, topics, options);
    case "xml":
      return formatAsXml(learnings, patterns, mistakes, topics, options);
    case "markdown":
    default:
      return formatKnowledgeContext(
        learnings,
        patterns,
        mistakes,
        topics,
        docs,
        options,
      );
  }
}
