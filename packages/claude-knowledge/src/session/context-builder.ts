/**
 * Session Context Builder
 *
 * Builds a concise context block at session start that primes Claude with:
 * 1. Planning stack — current goals, progress, next steps
 * 2. Graph summary + live queries — demonstrates graph tools on relevant code
 * 3. Focused learnings — relevant knowledge based on current goal
 *
 * Each section is independent and wrapped in try/catch + timeout so failures
 * in one section don't break others.
 */

import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { peekStack } from "../planning/stack";
import { getPlanByGoal } from "../planning/store";
import { computePlanProgress } from "../planning/progress";
import { discoverPackages, parsePackage, findTsFiles } from "../graph/parser";
import {
  storeGraph,
  getStoredFileMetadata,
  updateFileMetadata,
  deleteFileMetadata,
} from "../graph/store";
import { findEntities, whatCalls, getSummary } from "../graph/query";
import { searchSimilar } from "../knowledge/semantic";
import { query as queryKnowledge } from "../knowledge/query";
import { extractKeywords } from "../utils/issue-fetcher";
import { statSync } from "fs";
import { relative } from "path";
import type { PlanningEntity, Goal } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface SessionContextBlock {
  /** Formatted output string ready for console.log */
  output: string;
  /** Timing breakdown per section */
  timings: {
    planningMs: number;
    graphMs: number;
    learningsMs: number;
    totalMs: number;
  };
  /** Which sections were successfully built */
  sections: { planning: boolean; graph: boolean; learnings: boolean };
}

interface PlanningSection {
  lines: string[];
  keywords: string[];
}

interface GraphSection {
  lines: string[];
}

interface LearningsSection {
  lines: string[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Run a function with a timeout. Rejects if the function doesn't complete
 * within the specified time.
 */
function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Format a relative time duration as a human-readable string.
 */
function formatAge(updatedAt: string): string {
  const age = Date.now() - new Date(updatedAt).getTime();
  const hours = Math.floor(age / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(age / (1000 * 60));
  return `${minutes}m`;
}

/**
 * Extract keywords from the current context.
 * Tries planning stack goal title first, falls back to git branch name.
 */
function extractContextKeywords(topItem: PlanningEntity | undefined): string[] {
  if (topItem) {
    return extractKeywords(topItem.title, 5);
  }

  // Fallback: extract from git branch name
  try {
    const result = Bun.spawnSync(["git", "branch", "--show-current"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const branch = new TextDecoder().decode(result.stdout).trim();
    if (branch && branch !== "main" && branch !== "master") {
      // Convert branch name to keywords: "feat/issue-84-proof-verification" → ["proof", "verification"]
      return extractKeywords(branch.replace(/[/\-_]/g, " "), 5);
    }
  } catch {
    // Ignore - no git available
  }

  return [];
}

// ============================================================================
// Section Builders
// ============================================================================

/**
 * Build the planning stack section.
 * Sync operation (~1ms) except for plan progress computation.
 */
async function buildPlanningSection(): Promise<PlanningSection> {
  const stack = peekStack();
  const lines: string[] = [];

  if (stack.depth === 0) {
    return { lines: [], keywords: [] };
  }

  lines.push(`▸ Stack (depth: ${stack.depth})`);

  for (let i = 0; i < stack.items.length; i++) {
    const item = stack.items[i];
    const type = item.type;
    const status = item.status;
    const issueRef =
      item.type === "Goal" && item.issueNumber ? ` #${item.issueNumber}` : "";

    let progressStr = "";

    // Try to get plan progress for Goals
    if (item.type === "Goal" && status === "active") {
      const plan = getPlanByGoal(item.id);
      if (plan) {
        try {
          const progress = await withTimeout(
            () => computePlanProgress(plan),
            5000,
            "planProgress",
          );
          progressStr = `, ${progress.percentage}%`;

          // Show next step if available
          if (progress.nextSteps.length > 0) {
            const next = progress.nextSteps[0];
            const nextTitle =
              next.step.title.length > 40
                ? next.step.title.slice(0, 37) + "..."
                : next.step.title;
            lines.push(
              `  ${i + 1}. [${type}] ${item.title}${issueRef} (${status}${progressStr})`,
            );
            lines.push(`     Next: ${nextTitle}`);
            continue;
          }
        } catch {
          // Progress computation timed out or failed — show without percentage
        }
      }
    }

    const ageStr = status === "paused" ? `, ${formatAge(item.updatedAt)}` : "";
    lines.push(
      `  ${i + 1}. [${type}] ${item.title}${issueRef} (${status}${progressStr}${ageStr})`,
    );
  }

  // Extract keywords from the top item
  const keywords = extractContextKeywords(stack.topItem);

  return { lines, keywords };
}

/**
 * Build the graph section with incremental parsing and live demo queries.
 */
async function buildGraphSection(
  keywords: string[],
  rootPath: string,
): Promise<GraphSection> {
  const lines: string[] = [];

  // Step 1: Incremental parse
  const parseStart = performance.now();
  const parseResult = await parsePackagesIncremental(rootPath);
  const parseMs = Math.round(performance.now() - parseStart);

  // Step 2: Get summary stats
  const summary = getSummary();
  const pkgCount = summary.packages.length;
  const entityCount = summary.totalEntities;

  if (entityCount === 0) {
    return { lines: [] };
  }

  const updateNote =
    parseResult.filesChanged > 0
      ? `updated ${parseResult.filesChanged} files`
      : `indexed ${parseMs}ms ago`;

  lines.push(
    `▸ Graph (${pkgCount} pkgs, ${entityCount} entities — ${updateNote})`,
  );

  // Step 3: Live demo queries using planning keywords
  if (keywords.length > 0) {
    // Pick up to 2 keywords for find queries
    const findKeywords = keywords.slice(0, 2);

    for (const keyword of findKeywords) {
      const results = findEntities(keyword, undefined, 3);
      if (results.length > 0) {
        const formatted = results
          .slice(0, 2)
          .map((r) => `${r.name} (${r.filePath}:${r.lineNumber})`)
          .join(", ");
        lines.push(`  graph_find("${keyword}") → ${formatted}`);
      }
    }

    // Pick first keyword for what_calls query
    const callKeyword = findKeywords[0];
    const callers = whatCalls(callKeyword);
    if (callers.length > 0) {
      const formatted = callers
        .slice(0, 2)
        .map((c) => `${c.name} (${c.file_path}:${c.line_number})`)
        .join(", ");
      lines.push(`  graph_what_calls("${callKeyword}") → ${formatted}`);
    }
  }

  return { lines };
}

/**
 * Build the learnings section with semantic search.
 */
async function buildLearningsSection(
  keywords: string[],
  issueNumber?: number,
  maxLearnings: number = 3,
): Promise<LearningsSection> {
  const lines: string[] = [];

  if (keywords.length === 0 && !issueNumber) {
    return { lines: [] };
  }

  // Try semantic search first
  let results: Array<{ content: string }> = [];

  if (keywords.length > 0) {
    try {
      const searchResults = await searchSimilar(keywords.join(" "), {
        limit: maxLearnings,
        threshold: 0.3,
      });
      results = searchResults.map((r) => ({
        content: r.learning.content,
      }));
    } catch {
      // Semantic search failed (no embedder?) — fall back to keyword query
    }
  }

  // Fallback to issue-based query
  if (results.length === 0 && issueNumber) {
    try {
      const queryResults = await queryKnowledge({
        issueNumber,
        limit: maxLearnings,
      });
      results = queryResults.map((r) => ({
        content: r.learning.content,
      }));
    } catch {
      // Query failed — skip learnings section
    }
  }

  // Fallback to keyword-based query
  if (results.length === 0 && keywords.length > 0) {
    try {
      const queryResults = await queryKnowledge({
        keywords,
        limit: maxLearnings,
      });
      results = queryResults.map((r) => ({
        content: r.learning.content,
      }));
    } catch {
      // Query failed — skip learnings section
    }
  }

  if (results.length === 0) {
    return { lines: [] };
  }

  lines.push(`▸ Learnings (${results.length} relevant)`);
  for (const result of results) {
    // Truncate to ~80 chars
    const content =
      result.content.length > 80
        ? result.content.slice(0, 77) + "..."
        : result.content;
    lines.push(`  • ${content}`);
  }

  return { lines };
}

// ============================================================================
// Incremental Graph Parse
// ============================================================================

interface IncrementalParseResult {
  packagesUpdated: number;
  filesChanged: number;
  elapsedMs: number;
}

/**
 * Incrementally parse all packages in the monorepo.
 * Only reparses files that have changed since the last parse (mtime check).
 */
async function parsePackagesIncremental(
  rootPath: string,
): Promise<IncrementalParseResult> {
  const start = performance.now();
  let totalFilesChanged = 0;
  let packagesUpdated = 0;

  const packages = discoverPackages(rootPath);

  for (const pkg of packages) {
    const storedMetadata = getStoredFileMetadata(pkg.name);
    const currentFiles = findTsFiles(pkg.path);
    const currentFilesSet = new Set(currentFiles);

    // Determine changed files
    const changedFiles = currentFiles.filter((file) => {
      const relativePath = relative(pkg.path, file);
      const stored = storedMetadata.get(relativePath);
      if (!stored) return true; // New file
      try {
        const currentMtime = statSync(file).mtimeMs;
        return currentMtime !== stored.mtimeMs;
      } catch {
        return true; // File read error - reparse
      }
    });

    // Determine deleted files
    const deletedFiles = Array.from(storedMetadata.keys()).filter(
      (filePath) => {
        const absolutePath = `${pkg.path}/${filePath}`;
        return !currentFilesSet.has(absolutePath);
      },
    );

    // Skip if nothing changed
    if (changedFiles.length === 0 && deletedFiles.length === 0) {
      continue;
    }

    // Parse changed files
    const parseResult = parsePackage(pkg.path, pkg.name, {
      files: changedFiles,
    });

    // Store incrementally
    storeGraph(parseResult, pkg.name, {
      incremental: true,
      deletedFiles: deletedFiles.length > 0 ? deletedFiles : undefined,
    });

    // Delete metadata for deleted files
    if (deletedFiles.length > 0) {
      deleteFileMetadata(pkg.name, deletedFiles);
    }

    // Update file metadata for changed files
    for (const file of changedFiles) {
      const relativePath = relative(pkg.path, file);
      try {
        const mtime = statSync(file).mtimeMs;
        const entityCount = parseResult.entities.filter(
          (e) => e.filePath === relativePath,
        ).length;
        updateFileMetadata(pkg.name, relativePath, mtime, entityCount);
      } catch {
        // Non-fatal — metadata won't be updated for this file
      }
    }

    totalFilesChanged += changedFiles.length;
    packagesUpdated++;
  }

  return {
    packagesUpdated,
    filesChanged: totalFilesChanged,
    elapsedMs: Math.round(performance.now() - start),
  };
}

// ============================================================================
// Main Builder
// ============================================================================

/**
 * Build the full session context block.
 *
 * Sections run sequentially (graph needs keywords from planning).
 * Each section is independently wrapped in try/catch + timeout.
 */
export async function buildSessionContext(options?: {
  sectionTimeoutMs?: number;
  maxLearnings?: number;
  rootPath?: string;
}): Promise<SessionContextBlock> {
  const sectionTimeoutMs = options?.sectionTimeoutMs ?? 10000;
  const maxLearnings = options?.maxLearnings ?? 3;
  const rootPath = options?.rootPath ?? process.cwd();
  const totalStart = performance.now();

  const sections = { planning: false, graph: false, learnings: false };
  const timings = { planningMs: 0, graphMs: 0, learningsMs: 0, totalMs: 0 };
  const outputLines: string[] = [];

  // --- Planning Section ---
  let keywords: string[] = [];
  let issueNumber: number | undefined;
  const planningStart = performance.now();

  try {
    const planning = await withTimeout(
      () => buildPlanningSection(),
      sectionTimeoutMs,
      "planning",
    );

    if (planning.lines.length > 0) {
      outputLines.push(...planning.lines);
      sections.planning = true;
    }
    keywords = planning.keywords;

    // Extract issue number from top item if available
    const stack = peekStack();
    if (stack.topItem?.type === "Goal") {
      issueNumber = (stack.topItem as Goal).issueNumber;
    }
  } catch (error) {
    logger.debug("Planning section failed", {
      error: error instanceof Error ? error.message : String(error),
      context: "context-builder",
    });
    // Still try to get keywords from branch name
    keywords = extractContextKeywords(undefined);
  }
  timings.planningMs = Math.round(performance.now() - planningStart);

  // --- Graph Section ---
  const graphStart = performance.now();
  try {
    const graphSection = await withTimeout(
      () => buildGraphSection(keywords, rootPath),
      sectionTimeoutMs,
      "graph",
    );

    if (graphSection.lines.length > 0) {
      if (outputLines.length > 0) outputLines.push("");
      outputLines.push(...graphSection.lines);
      sections.graph = true;
    }
  } catch (error) {
    logger.debug("Graph section failed", {
      error: error instanceof Error ? error.message : String(error),
      context: "context-builder",
    });
  }
  timings.graphMs = Math.round(performance.now() - graphStart);

  // --- Learnings Section ---
  const learningsStart = performance.now();
  try {
    const learningsSection = await withTimeout(
      () => buildLearningsSection(keywords, issueNumber, maxLearnings),
      sectionTimeoutMs,
      "learnings",
    );

    if (learningsSection.lines.length > 0) {
      if (outputLines.length > 0) outputLines.push("");
      outputLines.push(...learningsSection.lines);
      sections.learnings = true;
    }
  } catch (error) {
    logger.debug("Learnings section failed", {
      error: error instanceof Error ? error.message : String(error),
      context: "context-builder",
    });
  }
  timings.learningsMs = Math.round(performance.now() - learningsStart);

  // --- Format output ---
  timings.totalMs = Math.round(performance.now() - totalStart);

  let output = "";
  if (outputLines.length > 0) {
    output = [
      "═══ Session Context ═══",
      "",
      ...outputLines,
      "",
      "═══════════════════════",
    ].join("\n");
  }

  return { output, timings, sections };
}
