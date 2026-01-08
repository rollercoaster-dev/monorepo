/**
 * Session Lifecycle Hooks
 *
 * Hooks for automatic knowledge capture and loading.
 * - onSessionStart: Load relevant knowledge based on git context
 * - onSessionEnd: Extract and store learnings from session
 */

import type {
  SessionContext,
  KnowledgeContext,
  SessionSummary,
  SessionEndResult,
  QueryResult,
  Pattern,
  Mistake,
} from "./types";
import { knowledge } from "./knowledge";
import { parseIssueNumber, inferCodeAreasFromFiles } from "./utils";

/** Maximum number of learnings to return at session start */
const MAX_LEARNINGS = 10;

/** Maximum number of patterns to return per code area */
const MAX_PATTERNS_PER_AREA = 5;

/** Maximum number of mistakes to return per file */
const MAX_MISTAKES_PER_FILE = 3;

/**
 * Load relevant knowledge for the current session context.
 *
 * @param context - Session context with working directory, branch, and modified files
 * @returns Knowledge context with relevant learnings, patterns, mistakes, and summary
 */
async function onSessionStart(
  context: SessionContext,
): Promise<KnowledgeContext> {
  const learnings: QueryResult[] = [];
  const patterns: Pattern[] = [];
  const mistakes: Mistake[] = [];

  // Parse issue number from branch if not provided
  const issueNumber =
    context.issueNumber ??
    (context.branch ? parseIssueNumber(context.branch) : undefined);

  // Infer code areas from modified files
  const codeAreas = context.modifiedFiles
    ? inferCodeAreasFromFiles(context.modifiedFiles)
    : [];
  const primaryCodeArea = codeAreas[0];

  // Query learnings based on available context
  try {
    // Query by issue number if available
    if (issueNumber) {
      const issueResults = await knowledge.query({
        issueNumber,
        limit: MAX_LEARNINGS,
      });
      learnings.push(...issueResults);
    }

    // Query by primary code area if available and we haven't hit limit
    if (primaryCodeArea && learnings.length < MAX_LEARNINGS) {
      const areaResults = await knowledge.query({
        codeArea: primaryCodeArea,
        limit: MAX_LEARNINGS - learnings.length,
      });
      // Dedupe by learning ID
      for (const result of areaResults) {
        if (!learnings.some((l) => l.learning.id === result.learning.id)) {
          learnings.push(result);
        }
      }
    }

    // Query by file paths if available
    if (context.modifiedFiles && learnings.length < MAX_LEARNINGS) {
      for (const filePath of context.modifiedFiles.slice(0, 5)) {
        if (learnings.length >= MAX_LEARNINGS) break;

        const fileResults = await knowledge.query({
          filePath,
          limit: 2,
        });
        for (const result of fileResults) {
          if (!learnings.some((l) => l.learning.id === result.learning.id)) {
            learnings.push(result);
            if (learnings.length >= MAX_LEARNINGS) break;
          }
        }
      }
    }

    // Get patterns for code areas
    for (const area of codeAreas.slice(0, 3)) {
      const areaPatterns = await knowledge.getPatternsForArea(area);
      for (const pattern of areaPatterns.slice(0, MAX_PATTERNS_PER_AREA)) {
        if (!patterns.some((p) => p.id === pattern.id)) {
          patterns.push(pattern);
        }
      }
    }

    // Get mistakes for modified files
    if (context.modifiedFiles) {
      for (const filePath of context.modifiedFiles.slice(0, 5)) {
        const fileMistakes = await knowledge.getMistakesForFile(filePath);
        for (const mistake of fileMistakes.slice(0, MAX_MISTAKES_PER_FILE)) {
          if (!mistakes.some((m) => m.id === mistake.id)) {
            mistakes.push(mistake);
          }
        }
      }
    }
  } catch {
    // If knowledge queries fail, return empty context
    // This allows session to continue even if knowledge graph is unavailable
  }

  // Format summary for injection
  const summary = formatKnowledgeSummary(learnings, patterns, mistakes, {
    issueNumber,
    primaryCodeArea,
  });

  return {
    learnings,
    patterns,
    mistakes,
    summary,
  };
}

/**
 * Format knowledge context into a markdown summary for injection.
 */
function formatKnowledgeSummary(
  learnings: QueryResult[],
  patterns: Pattern[],
  mistakes: Mistake[],
  context: { issueNumber?: number; primaryCodeArea?: string },
): string {
  const lines: string[] = [];

  // Header with context
  lines.push("## Relevant Knowledge");
  lines.push("");

  if (context.issueNumber || context.primaryCodeArea) {
    lines.push(
      `Context: ${[
        context.issueNumber ? `Issue #${context.issueNumber}` : null,
        context.primaryCodeArea ? `Area: ${context.primaryCodeArea}` : null,
      ]
        .filter(Boolean)
        .join(", ")}`,
    );
    lines.push("");
  }

  // Learnings section
  if (learnings.length > 0) {
    lines.push(`### Learnings (${learnings.length})`);
    for (const { learning } of learnings) {
      const prefix = learning.sourceIssue
        ? `[#${learning.sourceIssue}]`
        : learning.codeArea
          ? `[${learning.codeArea}]`
          : "[-]";
      lines.push(`- ${prefix} ${learning.content}`);
    }
    lines.push("");
  }

  // Patterns section
  if (patterns.length > 0) {
    lines.push(`### Patterns (${patterns.length})`);
    for (const pattern of patterns) {
      lines.push(`- **${pattern.name}**: ${pattern.description}`);
    }
    lines.push("");
  }

  // Mistakes section
  if (mistakes.length > 0) {
    lines.push(`### Mistakes to Avoid (${mistakes.length})`);
    for (const mistake of mistakes) {
      const location = mistake.filePath ? `${mistake.filePath}: ` : "";
      lines.push(
        `- ${location}${mistake.description} (Fixed: ${mistake.howFixed})`,
      );
    }
    lines.push("");
  }

  // Empty state
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

/**
 * Extract and store learnings from the session.
 * Placeholder for Phase 2 - onSessionEnd implementation.
 *
 * @param _session - Session summary with commits and modified files
 * @returns Result indicating learnings stored
 */
async function onSessionEnd(
  _session: SessionSummary,
): Promise<SessionEndResult> {
  // TODO: Implement in next commit
  return {
    learningsStored: 0,
    learningIds: [],
  };
}

/**
 * Session lifecycle hooks for automatic knowledge capture and loading.
 */
export const hooks = {
  onSessionStart,
  onSessionEnd,
};
