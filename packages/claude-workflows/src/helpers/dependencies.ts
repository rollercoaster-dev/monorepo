/**
 * Dependency checking helpers
 *
 * Provides functions for detecting and validating issue dependencies.
 */

import type { Dependency, DependencyCheckResult } from "../types";
import { ghNoThrow } from "../utils/exec";

// Regex patterns for dependency detection
const BLOCKER_REGEX = /blocked by #(\d+)/gi;
const DEPENDS_REGEX = /depends on #(\d+)/gi;
const AFTER_REGEX = /after #(\d+)/gi;
const CHECKBOX_REGEX = /- \[ \] #(\d+)/gi;

/**
 * Extract all dependencies from issue body
 */
export function extractDependencies(body: string): {
  blockers: number[];
  softDeps: number[];
} {
  const blockers = [...body.matchAll(BLOCKER_REGEX)].map((m) =>
    parseInt(m[1], 10),
  );

  const softDeps = [
    ...body.matchAll(DEPENDS_REGEX),
    ...body.matchAll(AFTER_REGEX),
    ...body.matchAll(CHECKBOX_REGEX),
  ].map((m) => parseInt(m[1], 10));

  // Remove duplicates
  return {
    blockers: [...new Set(blockers)],
    softDeps: [...new Set(softDeps)],
  };
}

/**
 * Get the state of an issue
 */
export async function getIssueState(
  issueNumber: number,
): Promise<"OPEN" | "CLOSED" | null> {
  const result = await ghNoThrow([
    "issue",
    "view",
    String(issueNumber),
    "--json",
    "state",
    "-q",
    ".state",
  ]);

  if (result.status !== 0) {
    console.error(`Failed to get state for issue #${issueNumber}`);
    return null;
  }

  const state = result.stdout.trim().toUpperCase();
  return state === "OPEN" || state === "CLOSED" ? state : null;
}

/**
 * Check all dependencies for an issue
 */
export async function checkDependencies(
  issueBody: string,
  context: string,
): Promise<DependencyCheckResult> {
  const { blockers, softDeps } = extractDependencies(issueBody);

  const resolvedBlockers: Dependency[] = [];
  const resolvedSoftDeps: Dependency[] = [];

  // Check blockers
  for (const issueNumber of blockers) {
    const state = await getIssueState(issueNumber);
    if (state) {
      resolvedBlockers.push({
        issueNumber,
        type: "blocker",
        state,
      });

      if (state === "OPEN") {
        console.log(
          `[${context}] BLOCKER: Issue #${issueNumber} is still open`,
        );
      }
    }
  }

  // Check soft dependencies
  for (const issueNumber of softDeps) {
    const state = await getIssueState(issueNumber);
    if (state) {
      resolvedSoftDeps.push({
        issueNumber,
        type: "depends",
        state,
      });

      if (state === "OPEN") {
        console.log(
          `[${context}] WARNING: Dependency #${issueNumber} is still open`,
        );
      }
    }
  }

  // Can proceed if no open blockers
  const canProceed = !resolvedBlockers.some((b) => b.state === "OPEN");

  return {
    blockers: resolvedBlockers,
    softDeps: resolvedSoftDeps,
    canProceed,
  };
}

/**
 * Check if an issue has open blockers
 */
export async function hasOpenBlockers(issueBody: string): Promise<boolean> {
  const { blockers } = extractDependencies(issueBody);

  for (const issueNumber of blockers) {
    const state = await getIssueState(issueNumber);
    if (state === "OPEN") {
      return true;
    }
  }

  return false;
}

/**
 * Get a formatted dependency report
 */
export function formatDependencyReport(result: DependencyCheckResult): string {
  const lines: string[] = ["## Dependencies"];

  if (result.blockers.length === 0 && result.softDeps.length === 0) {
    lines.push("\nNo dependencies found.");
    return lines.join("\n");
  }

  lines.push("\n| Issue | Type | Status | Impact |");
  lines.push("| ----- | ---- | ------ | ------ |");

  for (const dep of result.blockers) {
    const impact = dep.state === "OPEN" ? "**BLOCKING**" : "OK to proceed";
    lines.push(
      `| #${dep.issueNumber} | Blocked by | ${dep.state} | ${impact} |`,
    );
  }

  for (const dep of result.softDeps) {
    const impact = dep.state === "OPEN" ? "Warning" : "OK";
    lines.push(
      `| #${dep.issueNumber} | Depends on | ${dep.state} | ${impact} |`,
    );
  }

  if (!result.canProceed) {
    lines.push(
      "\n**Decision:** Cannot proceed - blockers must be closed first.",
    );
  } else {
    lines.push("\n**Decision:** Can proceed.");
  }

  return lines.join("\n");
}
