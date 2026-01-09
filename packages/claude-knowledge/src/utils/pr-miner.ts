/**
 * PR Mining Utility
 *
 * Extracts learnings from merged PRs to bootstrap the knowledge graph.
 * Uses GitHub CLI to fetch PR data and parses conventional commits.
 */

import { $ } from "bun";
import { parseConventionalCommit } from "./git-parser";
import { inferCodeArea } from "./file-analyzer";
import type { Learning } from "../types";
import { randomUUID } from "crypto";

/** Confidence level for PR-mined learnings (lower than auto-extracted) */
const PR_MINED_CONFIDENCE = 0.7;

/** GitHub PR data structure from gh CLI */
interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  files: Array<{ path: string; additions: number; deletions: number }>;
}

/**
 * Mine merged PRs to extract learnings for bootstrapping the knowledge graph.
 *
 * @param limit - Maximum number of PRs to fetch (default: 50)
 * @returns Array of learnings extracted from merged PRs
 */
export async function mineMergedPRs(limit: number = 50): Promise<Learning[]> {
  const learnings: Learning[] = [];

  // Fetch merged PRs from GitHub
  let prs: GitHubPR[];
  try {
    const result =
      await $`gh pr list --state merged --limit ${limit} --json number,title,body,files`.quiet();
    prs = JSON.parse(result.text()) as GitHubPR[];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch merged PRs: ${errorMsg}`);
  }

  for (const pr of prs) {
    // Parse title for conventional commit type/scope
    const parsed = parseConventionalCommit(pr.title);
    if (!parsed) {
      // Skip PRs without conventional commit titles
      continue;
    }

    // Infer code area from scope or first file changed
    let codeArea: string | undefined = parsed.scope;
    if (!codeArea && pr.files && pr.files.length > 0) {
      codeArea = inferCodeArea(pr.files[0].path);
    }

    // Extract learning content from PR body
    const summary = extractSummary(pr.body);
    if (!summary) {
      // Skip PRs without useful content
      continue;
    }

    // Extract issue number if referenced
    const sourceIssue = extractIssueNumber(pr.body);

    // Create learning
    const learningId = `learning-pr-${pr.number}-${randomUUID().slice(0, 8)}`;

    learnings.push({
      id: learningId,
      content: formatLearningContent(parsed.type, summary),
      sourceIssue,
      codeArea,
      confidence: PR_MINED_CONFIDENCE,
      metadata: {
        source: "pr-mined",
        prNumber: pr.number,
        commitType: parsed.type,
        filesChanged: pr.files?.length ?? 0,
      },
    });
  }

  return learnings;
}

/**
 * Extract a summary from PR body.
 * Looks for "## Summary" section or falls back to first paragraph.
 */
function extractSummary(body: string | null): string | null {
  if (!body) return null;

  // Look for "## Summary" section (common in PR templates)
  const summaryMatch = body.match(/##\s*Summary\s*\n+([^\n#]+)/i);
  if (summaryMatch && summaryMatch[1]) {
    return summaryMatch[1].trim();
  }

  // Look for bullet points after Summary header
  const bulletMatch = body.match(/##\s*Summary\s*\n+[-*]\s*([^\n]+)/i);
  if (bulletMatch && bulletMatch[1]) {
    return bulletMatch[1].trim();
  }

  // Fallback: first non-empty, non-header line
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines, headers, and common boilerplate
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("<!--") &&
      !trimmed.includes("Generated with") &&
      trimmed.length > 10
    ) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Extract issue number from PR body.
 * Looks for "Closes #123", "Fixes #123", "Related to #123" patterns.
 */
function extractIssueNumber(body: string | null): number | undefined {
  if (!body) return undefined;

  // Match "Closes #123", "Fixes #123", "Related to #123"
  const match = body.match(/(?:closes|fixes|related\s+to)\s+#(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return undefined;
}

/**
 * Format learning content from commit type and summary.
 */
function formatLearningContent(type: string, summary: string): string {
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
  return `${prefix}: ${summary}`;
}
