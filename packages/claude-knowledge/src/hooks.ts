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
import {
  parseIssueNumber,
  parseConventionalCommit,
  inferCodeAreasFromFiles,
  inferCodeArea,
} from "./utils";
import type { Learning } from "./types";
import { randomUUID } from "crypto";
import { formatKnowledgeContext } from "./formatter";

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

  // Format summary for injection using new formatter
  const summary = formatKnowledgeContext(learnings, patterns, mistakes, {
    maxTokens: 2000,
    context: {
      issueNumber,
      primaryCodeArea,
      modifiedFiles: context.modifiedFiles,
    },
  });

  return {
    learnings,
    patterns,
    mistakes,
    summary,
  };
}

/** Confidence level for auto-extracted learnings (lower than manual) */
const AUTO_EXTRACT_CONFIDENCE = 0.6;

/**
 * Extract and store learnings from the session.
 *
 * Analyzes commits made during the session to extract learnings:
 * - Parses conventional commit messages for type and scope
 * - Infers code areas from modified files
 * - Stores learnings with lower confidence for auto-extracted content
 *
 * @param session - Session summary with commits and modified files
 * @returns Result indicating learnings stored
 */
async function onSessionEnd(
  session: SessionSummary,
): Promise<SessionEndResult> {
  const learnings: Learning[] = [];
  const learningIds: string[] = [];

  // Extract learnings from commits
  for (const commit of session.commits) {
    const parsed = parseConventionalCommit(commit.message);

    if (parsed) {
      // Create learning from conventional commit
      const learningId = `learning-auto-${randomUUID()}`;
      learningIds.push(learningId);

      const learning: Learning = {
        id: learningId,
        content: formatCommitLearning(parsed.type, parsed.description),
        codeArea: parsed.scope || undefined,
        confidence: AUTO_EXTRACT_CONFIDENCE,
        metadata: {
          source: "auto-extracted",
          commitSha: commit.sha,
          commitType: parsed.type,
        },
      };

      learnings.push(learning);
    }
  }

  // Extract learnings from modified files (grouped by code area)
  if (session.modifiedFiles && session.modifiedFiles.length > 0) {
    const areaFiles = new Map<string, string[]>();

    for (const filePath of session.modifiedFiles) {
      const area = inferCodeArea(filePath);
      if (area) {
        const files = areaFiles.get(area) || [];
        files.push(filePath);
        areaFiles.set(area, files);
      }
    }

    // Create one learning per code area worked on
    for (const [area, files] of areaFiles) {
      // Skip if we already have a learning for this area from commits
      if (learnings.some((l) => l.codeArea === area)) {
        continue;
      }

      const learningId = `learning-auto-${randomUUID()}`;
      learningIds.push(learningId);

      const learning: Learning = {
        id: learningId,
        content: `Worked on ${area}: modified ${files.length} file(s)`,
        codeArea: area,
        confidence: AUTO_EXTRACT_CONFIDENCE * 0.8, // Even lower for file-based
        metadata: {
          source: "auto-extracted",
          fileCount: files.length,
          files: files.slice(0, 5), // Store first 5 files
        },
      };

      learnings.push(learning);
    }
  }

  // Store all extracted learnings
  if (learnings.length > 0) {
    try {
      await knowledge.store(learnings);
    } catch {
      // If storage fails, return empty result
      return {
        learningsStored: 0,
        learningIds: [],
      };
    }
  }

  return {
    learningsStored: learnings.length,
    learningIds,
  };
}

/**
 * Format a commit into a learning content string.
 */
function formatCommitLearning(type: string, description: string): string {
  const typeDescriptions: Record<string, string> = {
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

  const prefix = typeDescriptions[type] || "Completed";
  return `${prefix}: ${description}`;
}

/**
 * Session lifecycle hooks for automatic knowledge capture and loading.
 */
export const hooks = {
  onSessionStart,
  onSessionEnd,
};
