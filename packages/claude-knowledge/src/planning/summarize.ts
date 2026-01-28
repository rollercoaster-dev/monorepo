/**
 * Planning Graph Summarization
 *
 * Beads-style semantic compaction for completed planning entities.
 * Generates concise summaries and stores them as Learning entities
 * in the knowledge graph.
 */

import { spawnSync } from "bun";
import { randomUUID } from "crypto";
import { knowledge } from "../knowledge/index";
import { createRelationship } from "./store";
import type {
  Goal,
  Interrupt,
  PlanningEntity,
  StackCompletionSummary,
  Learning,
} from "../types";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

/**
 * Git context gathered for summarization.
 */
export interface GitContext {
  commitCount: number;
  commitMessages: string[];
  prNumber?: number;
  prMerged?: boolean;
  issueClosed?: boolean;
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

/**
 * Gather git context for a planning entity.
 * Uses git log and gh CLI to get recent activity.
 */
export function getGitContext(entity: PlanningEntity): GitContext {
  const context: GitContext = {
    commitCount: 0,
    commitMessages: [],
  };

  try {
    // Get commits since entity was created
    const logResult = spawnSync([
      "git",
      "log",
      "--oneline",
      `--since=${entity.createdAt}`,
      "--format=%s",
    ]);

    if (logResult.success) {
      const messages = logResult.stdout
        .toString()
        .trim()
        .split("\n")
        .filter((m) => m.length > 0);
      context.commitCount = messages.length;
      context.commitMessages = messages.slice(0, 5); // Keep top 5
    }
  } catch {
    // Git not available, skip
  }

  // Check issue state if this is a Goal with an issue number
  if (entity.type === "Goal" && (entity as Goal).issueNumber) {
    const issueNumber = (entity as Goal).issueNumber!;
    try {
      const issueResult = spawnSync([
        "gh",
        "issue",
        "view",
        String(issueNumber),
        "--json",
        "state,closedAt",
      ]);

      if (issueResult.success) {
        const issueData = JSON.parse(issueResult.stdout.toString()) as {
          state: string;
          closedAt: string | null;
        };
        context.issueClosed = issueData.state === "CLOSED";
      }
    } catch {
      // gh not available, skip
    }

    // Check for related PRs
    try {
      const prResult = spawnSync([
        "gh",
        "pr",
        "list",
        "--search",
        `#${issueNumber}`,
        "--json",
        "number,state",
        "--limit",
        "1",
      ]);

      if (prResult.success) {
        const prs = JSON.parse(prResult.stdout.toString()) as Array<{
          number: number;
          state: string;
        }>;
        if (prs.length > 0) {
          context.prNumber = prs[0].number;
          context.prMerged = prs[0].state === "MERGED";
        }
      }
    } catch {
      // gh not available, skip
    }
  }

  return context;
}

/**
 * Generate a summary for a completed planning entity.
 * Uses template-based approach (no LLM needed).
 */
export function generateSummary(
  entity: PlanningEntity,
  gitContext?: GitContext,
): string {
  const duration = formatDuration(
    Date.now() - new Date(entity.createdAt).getTime(),
  );

  const prefix = entity.type === "Goal" ? "Completed" : "Resolved";
  let summary = `${prefix}: "${entity.title}"`;

  if (gitContext?.commitCount) {
    summary += `. ${gitContext.commitCount} commits`;
  }

  if (gitContext?.prMerged && gitContext.prNumber) {
    summary += `. PR #${gitContext.prNumber} merged`;
  } else if (gitContext?.prNumber) {
    summary += `. PR #${gitContext.prNumber}`;
  }

  if (entity.type === "Goal") {
    const goal = entity as Goal;
    if (goal.issueNumber && gitContext?.issueClosed) {
      summary += `. Issue #${goal.issueNumber} closed`;
    }
  }

  if (entity.type === "Interrupt") {
    const interrupt = entity as Interrupt;
    if (interrupt.reason) {
      summary += `. Reason: ${interrupt.reason}`;
    }
  }

  summary += `. Duration: ${duration}.`;
  return summary;
}

/**
 * Summarize a completed entity and store the result as a Learning.
 * Returns the completion summary with all gathered context.
 */
export async function summarizeCompletion(
  entity: PlanningEntity,
): Promise<StackCompletionSummary> {
  const gitContext = getGitContext(entity);
  const summary = generateSummary(entity, gitContext);
  const durationMs = Date.now() - new Date(entity.createdAt).getTime();

  // Store as Learning in the knowledge graph
  try {
    const learning: Learning = {
      id: `learning-planning-${randomUUID()}`,
      content: summary,
      codeArea:
        entity.type === "Goal"
          ? ((entity as Goal).metadata?.codeArea as string | undefined)
          : undefined,
      confidence: 0.7, // Template-generated
      metadata: {
        source: "planning-graph",
        planningEntityId: entity.id,
        planningEntityType: entity.type,
        durationMs,
      },
    };

    await knowledge.store([learning]);

    // Create COMPLETED_AS relationship
    createRelationship(entity.id, learning.id, "COMPLETED_AS");

    logger.debug("Planning completion stored as learning", {
      entityId: entity.id,
      learningId: learning.id,
      context: "summarize.summarizeCompletion",
    });
  } catch (error) {
    // Non-fatal: summary is still returned even if learning storage fails
    logger.warn("Failed to store planning completion as learning", {
      entityId: entity.id,
      error: error instanceof Error ? error.message : String(error),
      context: "summarize.summarizeCompletion",
    });
  }

  return {
    item: entity,
    summary,
    durationMs,
    artifacts: {
      commitCount: gitContext.commitCount || undefined,
      prNumber: gitContext.prNumber,
      prMerged: gitContext.prMerged,
      issueClosed: gitContext.issueClosed,
    },
  };
}
