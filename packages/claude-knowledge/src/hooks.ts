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
  Topic,
  ContextMetrics,
  DocSearchResult,
} from "./types";
import { knowledge, searchSimilarTopics } from "./knowledge/index";
import { searchDocs } from "./docs/search";
import { checkpoint, metrics } from "./checkpoint";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  parseIssueNumber,
  parseConventionalCommit,
  inferCodeAreasFromFiles,
  formatCommitContent,
  fetchIssueContext,
  extractBranchKeywords,
  extractLearningsFromTranscript,
  type IssueContext,
} from "./utils";
import type { Learning } from "./types";
import { randomUUID } from "crypto";
import { formatWorkflowState } from "./formatter";
import {
  importFromJSONL,
  exportToJSONL,
  getFileModificationTime,
} from "./knowledge/sync";
import {
  importPlanningFromJSONL,
  exportPlanningToJSONL,
  getPlanningFileModificationTime,
} from "./planning/sync";

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

/** Maximum number of topics to return at session start */
const MAX_TOPICS = 5;

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
  const topics: Topic[] = [];
  const docs: DocSearchResult[] = [];

  // Parse issue number from branch if not provided
  const issueNumber =
    context.issueNumber ??
    (context.branch ? parseIssueNumber(context.branch) : undefined);

  // Fetch issue context for enhanced doc discovery
  let issueContext: IssueContext | undefined;
  if (issueNumber) {
    try {
      issueContext = await fetchIssueContext(issueNumber);
      if (issueContext) {
        logger.debug("Issue context fetched for doc discovery", {
          issueNumber,
          keywordCount: issueContext.keywords.length,
          labelCount: issueContext.labels.length,
          context: "onSessionStart",
        });
      }
    } catch (error) {
      // Log but don't fail session - issue context is optional enhancement
      logger.warn("Failed to fetch issue context", {
        error: error instanceof Error ? error.message : String(error),
        issueNumber,
        context: "onSessionStart",
      });
    }
  }

  // Auto-import knowledge from JSONL if file is newer than database
  try {
    const jsonlPath = ".claude/knowledge.jsonl";
    const dbPath = ".claude/execution-state.db";

    const jsonlMtime = getFileModificationTime(jsonlPath);
    const dbMtime = getFileModificationTime(dbPath);

    if (jsonlMtime > 0 && jsonlMtime > dbMtime) {
      const result = await importFromJSONL(jsonlPath);
      logger.debug("Auto-imported knowledge from JSONL", {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        context: "onSessionStart",
      });
    }
  } catch (error) {
    // Log but don't fail session - import is optional enhancement
    logger.warn("Failed to auto-import JSONL", {
      error: error instanceof Error ? error.message : String(error),
      context: "onSessionStart",
    });
  }

  // Auto-import planning state from JSONL if file is newer than database
  try {
    const planningJsonlPath = ".claude/planning.jsonl";
    const dbPath = ".claude/execution-state.db";

    const planningMtime = getPlanningFileModificationTime(planningJsonlPath);
    const dbMtime = getFileModificationTime(dbPath);

    if (planningMtime > 0 && planningMtime > dbMtime) {
      const result = await importPlanningFromJSONL(planningJsonlPath);
      logger.debug("Auto-imported planning from JSONL", {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        context: "onSessionStart",
      });
    }
  } catch (error) {
    logger.warn("Failed to auto-import planning JSONL", {
      error: error instanceof Error ? error.message : String(error),
      context: "onSessionStart",
    });
  }

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

    // Get relevant conversation topics using semantic search
    // Build query text from code areas and branch name for conceptual matching
    const topicKeywords = [...codeAreas, context.branch].filter(
      (k): k is string => Boolean(k),
    );

    if (topicKeywords.length > 0) {
      // Use semantic search for conceptual matching
      // This enables "auth validation" to match "credential verification"
      const queryText = topicKeywords.join(" ");
      const topicResults = await searchSimilarTopics(queryText, {
        limit: MAX_TOPICS,
        threshold: 0.3,
      });
      topics.push(...topicResults.map((r) => r.topic));
    } else {
      // If no keywords, get most recent topics (fallback to keyword query)
      const recentTopics = await knowledge.queryTopics({
        limit: MAX_TOPICS,
      });
      topics.push(...recentTopics);
    }

    // Search for relevant documentation based on multiple context signals:
    // - Code areas from modified files
    // - File basenames from modified files
    // - Issue keywords from title/body (via gh CLI)
    // - Issue labels (e.g., pkg:claude-knowledge → claude-knowledge)
    // - Branch name keywords (e.g., feat/issue-476-session-context → session, context)

    // Extract file basenames if modified files exist
    const fileBasenames = context.modifiedFiles
      ? context.modifiedFiles.map((f) => {
          const parts = f.split("/");
          const filename = parts[parts.length - 1];
          return filename.replace(/\.[^.]+$/, ""); // Remove extension
        })
      : [];

    // Get keywords from issue context if available
    const issueKeywords = issueContext?.keywords ?? [];
    const labelKeywords = issueContext?.labels ?? [];

    // Extract keywords from branch name (e.g., feat/issue-476-doc-search → doc, search)
    const branchKeywords = extractBranchKeywords(context.branch);

    // Combine all search terms
    const searchTerms = [
      ...codeAreas,
      ...fileBasenames,
      ...issueKeywords,
      ...labelKeywords,
      ...branchKeywords,
    ]
      .filter((term) => term && term.length > 0)
      .join(" ");

    // Run doc search if we have any search terms (not just when files are modified)
    if (searchTerms.length > 0) {
      try {
        const docResults = await searchDocs(searchTerms, {
          limit: 5,
          threshold: 0.4,
        });
        docs.push(...docResults);

        logger.debug("Doc search completed", {
          searchTerms,
          resultsCount: docResults.length,
          context: "onSessionStart",
        });
      } catch (error) {
        // Log but don't fail the session
        logger.warn("Failed to search documentation", {
          error: error instanceof Error ? error.message : String(error),
          context: "onSessionStart",
        });
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

  // Query workflow state from checkpoint DB if available
  let workflowState: KnowledgeContext["_workflowState"];
  try {
    let checkpointData = null;

    // Try by issue number first (most specific)
    if (issueNumber) {
      checkpointData = checkpoint.findByIssue(issueNumber);
    }

    // Fall back to any active workflow
    if (!checkpointData) {
      const active = checkpoint.listActive();
      if (active.length > 0) {
        // Get full data for most recent active workflow
        checkpointData = checkpoint.load(active[0].id);
      }
    }

    if (checkpointData) {
      workflowState = {
        issueNumber: checkpointData.workflow.issueNumber,
        branch: checkpointData.workflow.branch,
        phase: checkpointData.workflow.phase,
        status: checkpointData.workflow.status,
        recentActions: checkpointData.actions.slice(-5),
      };
      logger.debug("Loaded workflow state", {
        workflowId: checkpointData.workflow.id,
        phase: checkpointData.workflow.phase,
        context: "onSessionStart",
      });
    }
  } catch (error) {
    // Non-fatal: workflow state is optional enhancement
    logger.warn("Failed to load workflow state", {
      error: error instanceof Error ? error.message : String(error),
      context: "onSessionStart",
    });
  }

  // Format workflow state for injection (only checkpoint info, guidance is in CLAUDE.md)
  const summary = formatWorkflowState(workflowState);

  // Generate session ID and track metrics for dogfooding
  const sessionId = randomUUID();
  const learningsInjected =
    learnings.length +
    patterns.length +
    mistakes.length +
    topics.length +
    docs.length;
  const startTime = new Date().toISOString();

  // Log session start with metrics
  logger.debug("Session started with metrics tracking", {
    sessionId,
    learningsInjected,
    issueNumber,
    docsFound: docs.length,
    context: "onSessionStart",
  });

  return {
    learnings,
    patterns,
    mistakes,
    topics,
    docs,
    summary,
    // Include session metadata in result for CLI to capture
    _sessionMetadata: {
      sessionId,
      learningsInjected,
      startTime,
      issueNumber,
    },
    // Include workflow state if available
    _workflowState: workflowState,
  };
}

/** Confidence level for auto-extracted learnings (lower than manual) */
const AUTO_EXTRACT_CONFIDENCE = 0.6;

/**
 * Extract keywords from commit messages for topic tagging.
 * Filters out common words and returns unique significant words.
 */
function extractKeywordsFromMessages(messages: string[]): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "add",
    "update",
    "fix",
    "remove",
    "change",
    "make",
    "use",
    "new",
    "into",
  ]);

  const words = messages
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  // Return unique words, max 5
  return [...new Set(words)].slice(0, 5);
}

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
 * Extracts learnings from two sources:
 * 1. LLM analysis of conversation transcripts (high confidence: 0.8)
 * 2. Conventional commit messages (medium confidence: 0.6)
 *
 * Also tracks context metrics for dogfooding validation.
 *
 * @param session - Session summary with commits and optional session timing
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

  // 1. LLM-based extraction (high confidence: 0.8)
  // Extract technical insights from conversation that aren't in commits
  if (session.startTime) {
    try {
      const startTime = new Date(session.startTime);
      const endTime = new Date(); // Session end is now

      const llmLearnings = await extractLearningsFromTranscript(
        startTime,
        endTime,
      );
      learnings.push(...llmLearnings);

      logger.debug("LLM extraction completed", {
        count: llmLearnings.length,
        timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
        context: "onSessionEnd",
      });
    } catch (error) {
      // Log but don't fail - fallback to commit-based extraction
      logger.warn("LLM extraction failed, using commit-based only", {
        error: error instanceof Error ? error.message : String(error),
        startTime: session.startTime,
        context: "onSessionEnd",
      });
    }
  }

  // 2. Extract learnings from commits (medium confidence: 0.6)
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

  // Extract conversation topics from commits (group by scope)
  const topics: Topic[] = [];
  const scopeCounts = new Map<string, { count: number; messages: string[] }>();

  for (const commit of session.commits) {
    const parsed = parseConventionalCommit(commit.message);
    if (parsed?.scope) {
      const existing = scopeCounts.get(parsed.scope) || {
        count: 0,
        messages: [],
      };
      existing.count++;
      existing.messages.push(parsed.description);
      scopeCounts.set(parsed.scope, existing);
    }
  }

  // Create topics for scopes with >= 2 commits (lowered threshold for MVP)
  // Sort by commit count and cap to MAX_TOPICS to control DB growth
  const TOPIC_THRESHOLD = 2;
  const sortedScopes = [...scopeCounts.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );

  for (const [scope, data] of sortedScopes.slice(0, MAX_TOPICS)) {
    if (data.count >= TOPIC_THRESHOLD) {
      const topicId = `topic-${randomUUID()}`;
      const topic: Topic = {
        id: topicId,
        content: `Worked on ${scope}: ${data.messages.slice(0, 2).join("; ")}`,
        keywords: [scope, ...extractKeywordsFromMessages(data.messages)],
        sourceSession: session.sessionId,
        confidence: AUTO_EXTRACT_CONFIDENCE,
        timestamp: new Date().toISOString(),
        metadata: {
          source: "auto-extracted",
          commitCount: data.count,
        },
      };
      topics.push(topic);
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

  // Store extracted topics (handle each independently for partial success)
  if (topics.length > 0) {
    let storedCount = 0;
    const failures: Array<{ topicId: string; error: string }> = [];

    for (const topic of topics) {
      try {
        await knowledge.storeTopic(topic);
        storedCount++;
      } catch (error) {
        failures.push({
          topicId: topic.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (failures.length > 0) {
      logger.warn("Some session topics failed to store", {
        storedCount,
        failedCount: failures.length,
        failures,
        context: "onSessionEnd",
      });
    } else {
      logger.debug("Session topics stored", {
        topicsCount: storedCount,
        context: "onSessionEnd",
      });
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

      const contextMetricsData: Omit<ContextMetrics, "id"> = {
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

      checkpoint.saveContextMetrics(contextMetricsData);

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

  // Query and log tool usage metrics for this session
  // Uses date-based session ID to match PreToolUse hook
  let toolUsageSummary: ReturnType<typeof metrics.getToolUsageSummary> | null =
    null;
  try {
    const today = new Date();
    const dailySessionId = `daily-${today.toISOString().split("T")[0]}`;
    toolUsageSummary = metrics.getToolUsageSummary(dailySessionId);

    if (toolUsageSummary.totalCalls > 0) {
      const { byCategory, graphSearchRatio } = toolUsageSummary;

      logger.info("Tool Usage This Session", {
        graph: byCategory.graph,
        search: byCategory.search,
        read: byCategory.read,
        write: byCategory.write,
        other: byCategory.other,
        total: toolUsageSummary.totalCalls,
        graphSearchRatio:
          graphSearchRatio !== null ? graphSearchRatio.toFixed(2) : "N/A",
        context: "onSessionEnd",
      });

      // Log guidance if graph/search ratio is low
      if (graphSearchRatio !== null && graphSearchRatio < 1.0) {
        logger.info(
          "Consider using graph tools (graph_find, graph_what_calls) before Grep/Glob for better context efficiency",
          { context: "onSessionEnd" },
        );
      }
    }
  } catch (error) {
    // Non-critical - don't fail session end
    logger.debug("Could not retrieve tool usage metrics", {
      error: error instanceof Error ? error.message : String(error),
      context: "onSessionEnd",
    });
  }

  // Auto-export knowledge to JSONL on session end
  try {
    const result = await exportToJSONL(".claude/knowledge.jsonl");
    logger.debug("Exported knowledge to JSONL", {
      exported: result.exported,
      filePath: result.filePath,
      context: "onSessionEnd",
    });
  } catch (error) {
    // Log but don't fail session end - export is optional enhancement
    logger.warn("Failed to export knowledge to JSONL", {
      error: error instanceof Error ? error.message : String(error),
      context: "onSessionEnd",
    });
  }

  // Auto-export planning state to JSONL on session end
  try {
    const planningResult = await exportPlanningToJSONL(
      ".claude/planning.jsonl",
    );
    logger.debug("Exported planning to JSONL", {
      exported: planningResult.exported,
      filePath: planningResult.filePath,
      context: "onSessionEnd",
    });
  } catch (error) {
    logger.warn("Failed to export planning to JSONL", {
      error: error instanceof Error ? error.message : String(error),
      context: "onSessionEnd",
    });
  }

  return {
    learningsStored: learnings.length,
    learningIds,
    toolUsage: toolUsageSummary
      ? {
          graph: toolUsageSummary.byCategory.graph,
          search: toolUsageSummary.byCategory.search,
          ratio: toolUsageSummary.graphSearchRatio,
        }
      : undefined,
  };
}

/**
 * Session lifecycle hooks for automatic knowledge capture and loading.
 */
export const hooks = {
  onSessionStart,
  onSessionEnd,
};
