/**
 * Dependency checking helpers
 *
 * Provides functions for detecting and validating issue dependencies.
 */

import type {
  Dependency,
  DependencyCheckResult,
  DependencyType,
} from "../types";
import { ghNoThrow } from "../utils/exec";

// Regex patterns for dependency detection
const BLOCKER_REGEX = /blocked by #(\d+)/gi;
const DEPENDS_REGEX = /depends on #(\d+)/gi;
const AFTER_REGEX = /after #(\d+)/gi;
const CHECKBOX_REGEX = /- \[ \] #(\d+)/gi;

interface ExtractedDependency {
  issueNumber: number;
  type: DependencyType;
}

/**
 * Extract all dependencies from issue body with their types
 */
export function extractDependenciesWithTypes(body: string): {
  blockers: ExtractedDependency[];
  softDeps: ExtractedDependency[];
} {
  const blockers: ExtractedDependency[] = [...body.matchAll(BLOCKER_REGEX)].map(
    (m) => ({
      issueNumber: parseInt(m[1], 10),
      type: "blocker" as const,
    }),
  );

  const softDeps: ExtractedDependency[] = [
    ...[...body.matchAll(DEPENDS_REGEX)].map((m) => ({
      issueNumber: parseInt(m[1], 10),
      type: "depends" as const,
    })),
    ...[...body.matchAll(AFTER_REGEX)].map((m) => ({
      issueNumber: parseInt(m[1], 10),
      type: "after" as const,
    })),
    ...[...body.matchAll(CHECKBOX_REGEX)].map((m) => ({
      issueNumber: parseInt(m[1], 10),
      type: "checkbox" as const,
    })),
  ];

  // Remove duplicates by issue number, keeping first occurrence
  const seenBlockers = new Set<number>();
  const seenSoftDeps = new Set<number>();

  return {
    blockers: blockers.filter((d) => {
      if (seenBlockers.has(d.issueNumber)) return false;
      seenBlockers.add(d.issueNumber);
      return true;
    }),
    softDeps: softDeps.filter((d) => {
      if (seenSoftDeps.has(d.issueNumber)) return false;
      seenSoftDeps.add(d.issueNumber);
      return true;
    }),
  };
}

/**
 * Extract all dependencies from issue body (simplified version)
 */
export function extractDependencies(body: string): {
  blockers: number[];
  softDeps: number[];
} {
  const result = extractDependenciesWithTypes(body);
  return {
    blockers: result.blockers.map((d) => d.issueNumber),
    softDeps: result.softDeps.map((d) => d.issueNumber),
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
  if (state === "OPEN" || state === "CLOSED") {
    return state;
  }

  // Log unexpected state values
  console.warn(
    `[dependencies] Unexpected issue state for #${issueNumber}: "${state}" (expected OPEN or CLOSED)`,
  );
  return null;
}

/**
 * Check all dependencies for an issue (parallel execution)
 */
export async function checkDependencies(
  issueBody: string,
  context: string,
): Promise<DependencyCheckResult> {
  const { blockers, softDeps } = extractDependenciesWithTypes(issueBody);

  // Check all dependencies in parallel
  const [resolvedBlockers, resolvedSoftDeps] = await Promise.all([
    // Check blockers in parallel
    Promise.all(
      blockers.map(async (dep) => {
        const state = await getIssueState(dep.issueNumber);
        if (!state) return null;

        if (state === "OPEN") {
          console.log(
            `[${context}] BLOCKER: Issue #${dep.issueNumber} is still open`,
          );
        }

        return {
          issueNumber: dep.issueNumber,
          type: dep.type,
          state,
        } as Dependency;
      }),
    ),
    // Check soft deps in parallel
    Promise.all(
      softDeps.map(async (dep) => {
        const state = await getIssueState(dep.issueNumber);
        if (!state) return null;

        if (state === "OPEN") {
          console.log(
            `[${context}] WARNING: Dependency #${dep.issueNumber} is still open`,
          );
        }

        return {
          issueNumber: dep.issueNumber,
          type: dep.type,
          state,
        } as Dependency;
      }),
    ),
  ]);

  // Filter out nulls (failed state lookups)
  const filteredBlockers = resolvedBlockers.filter(
    (d): d is Dependency => d !== null,
  );
  const filteredSoftDeps = resolvedSoftDeps.filter(
    (d): d is Dependency => d !== null,
  );

  // Can proceed if no open blockers
  const canProceed = !filteredBlockers.some((b) => b.state === "OPEN");

  return {
    blockers: filteredBlockers,
    softDeps: filteredSoftDeps,
    canProceed,
  };
}

/**
 * Check if an issue has open blockers (parallel execution)
 */
export async function hasOpenBlockers(issueBody: string): Promise<boolean> {
  const { blockers } = extractDependencies(issueBody);

  // Check all blockers in parallel
  const states = await Promise.all(
    blockers.map((issueNumber) => getIssueState(issueNumber)),
  );

  return states.some((state) => state === "OPEN");
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
    // Use the actual type for display
    const typeDisplay =
      dep.type === "depends"
        ? "Depends on"
        : dep.type === "after"
          ? "After"
          : dep.type === "checkbox"
            ? "Checkbox"
            : "Depends on";
    lines.push(
      `| #${dep.issueNumber} | ${typeDisplay} | ${dep.state} | ${impact} |`,
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
