/**
 * Milestone Resolver
 *
 * Resolves completion status from GitHub issue state via `gh` CLI.
 * Maps GitHub states to completion statuses:
 * - closed = done
 * - open + has PR/branch = in-progress
 * - open = not-started
 *
 * Part of Planning Graph Phase 2 (epic #635).
 */

import { spawnSync } from "bun";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import type {
  CompletionResolver,
  CompletionStatus,
} from "../completion-resolver";
import type { PlanStep } from "../../types";
import { getCachedStatus, setCachedStatus } from "../completion-cache";

/**
 * GitHub issue state from `gh issue view`.
 */
interface GitHubIssueState {
  state: "OPEN" | "CLOSED";
  /** Pull request number if linked */
  linkedPRNumber?: number;
}

/**
 * Check GitHub issue state via `gh` CLI.
 *
 * @param issueNumber - GitHub issue number
 * @returns Issue state or null on error
 */
function checkIssueState(issueNumber: number): GitHubIssueState | null {
  try {
    const result = spawnSync([
      "gh",
      "issue",
      "view",
      String(issueNumber),
      "--json",
      "state,linkedBranches",
    ]);

    if (result.success) {
      const data = JSON.parse(result.stdout.toString()) as {
        state: "OPEN" | "CLOSED";
        linkedBranches?: Array<{ name: string }>;
      };

      // Check for linked PR (indicates in-progress)
      let linkedPRNumber: number | undefined;
      if (data.linkedBranches && data.linkedBranches.length > 0) {
        // If there are linked branches, check for a PR
        const branchName = data.linkedBranches[0].name;
        const prResult = spawnSync([
          "gh",
          "pr",
          "list",
          "--head",
          branchName,
          "--json",
          "number",
          "--limit",
          "1",
        ]);

        if (prResult.success) {
          const prData = JSON.parse(prResult.stdout.toString()) as Array<{
            number: number;
          }>;
          if (prData.length > 0) {
            linkedPRNumber = prData[0].number;
          }
        }
      }

      return {
        state: data.state,
        linkedPRNumber,
      };
    }
  } catch (error) {
    logger.warn("Failed to check GitHub issue state", {
      issueNumber,
      error: error instanceof Error ? error.message : String(error),
      context: "milestone-resolver.checkIssueState",
    });
  }

  return null;
}

/**
 * Milestone resolver implementation.
 * Checks GitHub issue state to determine completion status.
 */
export class MilestoneResolver implements CompletionResolver {
  async resolve(step: PlanStep): Promise<CompletionStatus> {
    // Only handle issue-type external refs
    if (step.externalRef.type !== "issue" || !step.externalRef.number) {
      logger.warn("MilestoneResolver called with non-issue external ref", {
        stepId: step.id,
        externalRefType: step.externalRef.type,
        context: "milestone-resolver.resolve",
      });
      return "not-started";
    }

    const issueNumber = step.externalRef.number;
    const externalRefKey = `issue:${issueNumber}`;

    // Check cache first
    const cached = getCachedStatus(step.id, externalRefKey);
    if (cached) {
      return cached;
    }

    // Fetch from GitHub
    const issueState = checkIssueState(issueNumber);
    if (!issueState) {
      logger.warn("Failed to fetch GitHub issue state, returning not-started", {
        stepId: step.id,
        issueNumber,
        context: "milestone-resolver.resolve",
      });
      return "not-started";
    }

    // Map GitHub state to completion status
    let status: CompletionStatus;
    if (issueState.state === "CLOSED") {
      status = "done";
    } else if (issueState.linkedPRNumber) {
      status = "in-progress";
    } else {
      status = "not-started";
    }

    // Cache the result
    setCachedStatus(step.id, externalRefKey, status);

    return status;
  }
}
