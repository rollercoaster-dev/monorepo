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
  ContextMetrics,
} from "./types";
import { knowledge } from "./knowledge";
import { checkpoint } from "./checkpoint";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  parseIssueNumber,
  parseConventionalCommit,
  inferCodeAreasFromFiles,
  inferCodeArea,
  formatCommitContent,
} from "./utils";
import type { Learning } from "./types";
import { randomUUID } from "crypto";
import { formatKnowledgeContext } from "./formatter";

/**
 * Extended session context that includes metrics tracking.
 * Used internally to pass metrics data between session start and end.
 */
export interface ExtendedSessionContext extends SessionContext {
  /** Unique session identifier for metrics tracking */
  sessionId?: string;
  /** Number of learnings injected at session start */
  learningsInjected?: number;
  /** Session start timestamp for duration calculation */
  startTime?: string;
  /** Number of files read during the session (user-reported) */
  filesRead?: number;
}

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
  } catch (error) {
    // Log the error so failures are visible, but allow session to continue
    logger.error("Failed to load session knowledge", {
      error,
      context: "onSessionStart",
    });
    // Return empty context to allow session to continue
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

  // Generate session ID and track metrics for dogfooding
  const sessionId = randomUUID();
  const learningsInjected =
    learnings.length + patterns.length + mistakes.length;
  const startTime = new Date().toISOString();

  // Log session start with metrics
  logger.debug("Session started with metrics tracking", {
    sessionId,
    learningsInjected,
    issueNumber,
    context: "onSessionStart",
  });

  return {
    learnings,
    patterns,
    mistakes,
    summary,
    // Include session metadata in result for CLI to capture
    _sessionMetadata: {
      sessionId,
      learningsInjected,
      startTime,
      issueNumber,
    },
  };
}

/** Confidence level for auto-extracted learnings (lower than manual) */
const AUTO_EXTRACT_CONFIDENCE = 0.6;

/**
 * Extended session summary with optional metrics tracking data.
 */
export interface ExtendedSessionSummary extends SessionSummary {
  /** Session ID from session-start for metrics correlation */
  sessionId?: string;
  /** Number of learnings injected at session start */
  learningsInjected?: number;
  /** Session start timestamp for duration calculation */
  startTime?: string;
  /** Whether compaction occurred (user-reported or detected) */
  compacted?: boolean;
  /** Number of review findings from CodeRabbit/Claude */
  reviewFindings?: number;
  /** Number of files read during the session (user-reported) */
  filesRead?: number;
  /** Whether this session was interrupted (e.g., by compaction) */
  interrupted?: boolean;
}

/**
 * Extract and store learnings from the session.
 *
 * Analyzes commits made during the session to extract learnings:
 * - Parses conventional commit messages for type and scope
 * - Infers code areas from modified files
 * - Stores learnings with lower confidence for auto-extracted content
 * - Saves context metrics for dogfooding validation if session ID provided
 *
 * @param session - Session summary with commits and modified files
 * @returns Result indicating learnings stored
 */
async function onSessionEnd(
  session: ExtendedSessionSummary,
): Promise<SessionEndResult> {
  // Log session interruption if this session was interrupted (e.g., by compaction)
  if (session.interrupted && session.workflowId) {
    try {
      checkpoint.logAction(
        session.workflowId,
        "session_interrupted",
        "pending",
        {
          reason: "Session ended before workflow completion",
          sessionId: session.sessionId,
          compacted: session.compacted,
        },
      );
      logger.info("Logged session interruption", {
        workflowId: session.workflowId,
        context: "onSessionEnd",
      });
    } catch (error) {
      // Non-fatal: warn but continue with learning extraction
      logger.warn("Failed to log session interruption", {
        error: error instanceof Error ? error.message : String(error),
        workflowId: session.workflowId,
        context: "onSessionEnd",
      });
    }
  }

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
        content: formatCommitContent(parsed.type, parsed.description),
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
    } catch (error) {
      // Log storage failure so it's visible
      logger.error("Failed to store session learnings", {
        error,
        context: "onSessionEnd",
        learningsCount: learnings.length,
      });
      return {
        learningsStored: 0,
        learningIds: [],
      };
    }
  }

  // Save context metrics for dogfooding validation if session ID provided
  if (session.sessionId) {
    try {
      // Calculate duration if start time was provided
      let durationMinutes: number | undefined;
      if (session.startTime) {
        const startMs = new Date(session.startTime).getTime();
        const endMs = Date.now();
        durationMinutes = Math.round((endMs - startMs) / 60000);
      }

      // Parse issue number from workflow ID if available
      let issueNumber: number | undefined;
      if (session.workflowId) {
        const match = session.workflowId.match(/workflow-(\d+)-/);
        if (match) {
          issueNumber = parseInt(match[1], 10);
        }
      }

      const metrics: Omit<ContextMetrics, "id"> = {
        sessionId: session.sessionId,
        issueNumber,
        filesRead: session.filesRead ?? 0,
        compacted: session.compacted ?? false,
        durationMinutes,
        reviewFindings: session.reviewFindings ?? 0,
        learningsInjected: session.learningsInjected ?? 0,
        learningsCaptured: learnings.length,
        createdAt: new Date().toISOString(),
      };

      checkpoint.saveContextMetrics(metrics);

      logger.debug("Session metrics saved", {
        sessionId: session.sessionId,
        learningsCaptured: learnings.length,
        durationMinutes,
        context: "onSessionEnd",
      });
    } catch (error) {
      // Log but don't fail the session end
      logger.warn("Failed to save context metrics", {
        error,
        sessionId: session.sessionId,
        context: "onSessionEnd",
      });
    }
  }

  return {
    learningsStored: learnings.length,
    learningIds,
  };
}

/**
 * Session lifecycle hooks for automatic knowledge capture and loading.
 */
export const hooks = {
  onSessionStart,
  onSessionEnd,
};
