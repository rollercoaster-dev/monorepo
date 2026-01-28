/**
 * Stale Item Detection
 *
 * Detects planning stack items that may be stale based on git/GitHub activity.
 * Caches GitHub API results for 5 minutes to avoid rate limiting.
 */

import { spawnSync } from "bun";
import { getStack } from "./store";
import type { Goal, StaleItem } from "../types";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

/** Cache for GitHub issue state checks (5-minute TTL) */
const issueStateCache = new Map<
  number,
  { state: string; closedAt: string | null; fetchedAt: number }
>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a GitHub issue is closed (with caching).
 */
function checkIssueClosed(
  issueNumber: number,
): { closed: boolean; closedAt: string | null } | null {
  // Check cache first
  const cached = issueStateCache.get(issueNumber);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      closed: cached.state === "CLOSED",
      closedAt: cached.closedAt,
    };
  }

  try {
    const result = spawnSync([
      "gh",
      "issue",
      "view",
      String(issueNumber),
      "--json",
      "state,closedAt",
    ]);

    if (result.success) {
      const data = JSON.parse(result.stdout.toString()) as {
        state: string;
        closedAt: string | null;
      };

      // Update cache
      issueStateCache.set(issueNumber, {
        state: data.state,
        closedAt: data.closedAt,
        fetchedAt: Date.now(),
      });

      return {
        closed: data.state === "CLOSED",
        closedAt: data.closedAt,
      };
    }
  } catch (error) {
    logger.debug("Failed to check issue state", {
      issueNumber,
      error: error instanceof Error ? error.message : String(error),
      context: "stale.checkIssueClosed",
    });
  }

  return null;
}

/**
 * Format a relative time string (e.g., "2 days ago").
 */
function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));

  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "recently";
}

/**
 * Detect stale items on the planning stack.
 *
 * An item is considered stale if:
 * - It's a Goal with a linked issue that has been closed
 * - It's been on the stack with no activity for an extended period
 */
export function detectStaleItems(): StaleItem[] {
  const stack = getStack();
  const staleItems: StaleItem[] = [];

  for (const item of stack) {
    // Check Goals with linked issues
    if (item.type === "Goal") {
      const goal = item as Goal;
      if (goal.issueNumber) {
        const issueState = checkIssueClosed(goal.issueNumber);
        if (issueState?.closed) {
          staleItems.push({
            item,
            staleSince: issueState.closedAt || new Date().toISOString(),
            reason: `Issue #${goal.issueNumber} closed ${issueState.closedAt ? formatRelativeTime(issueState.closedAt) : ""}. Run /done to summarize.`,
          });
          continue;
        }
      }
    }

    // Check for items with no recent activity (> 7 days since last update)
    const ageMs = Date.now() - new Date(item.updatedAt).getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);

    if (ageDays > 7 && item.status === "paused") {
      staleItems.push({
        item,
        staleSince: item.updatedAt,
        reason: `No activity for ${Math.floor(ageDays)} days while paused.`,
      });
    }
  }

  return staleItems;
}

/**
 * Clear the issue state cache (useful for testing).
 */
export function clearStaleCache(): void {
  issueStateCache.clear();
}
