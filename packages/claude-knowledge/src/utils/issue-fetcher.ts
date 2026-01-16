/**
 * Issue Metadata Fetching Utilities
 *
 * Fetch GitHub issue metadata via `gh` CLI for enhanced doc discovery.
 * Includes caching to avoid repeated API calls.
 */

import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

/**
 * Issue context extracted from GitHub issue metadata.
 */
export interface IssueContext {
  /** Issue title */
  title: string;
  /** Parsed label names (e.g., "claude-knowledge" from "pkg:claude-knowledge") */
  labels: string[];
  /** Keywords extracted from title and body */
  keywords: string[];
}

/**
 * Raw issue data from GitHub CLI.
 */
interface GitHubIssue {
  title: string;
  body: string;
  labels: Array<{ name: string }>;
}

/**
 * Cache entry with expiration.
 */
interface CacheEntry {
  data: IssueContext;
  expiresAt: number;
}

/** Cache TTL: 15 minutes */
const CACHE_TTL_MS = 15 * 60 * 1000;

/** In-memory cache for issue metadata */
const issueCache = new Map<number, CacheEntry>();

/** Stop words to filter from keyword extraction */
const STOP_WORDS = new Set([
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
  "when",
  "what",
  "how",
  "why",
  "where",
  "which",
  "who",
  "whom",
  "all",
  "any",
  "some",
  "most",
  "other",
  "each",
  "every",
  "both",
  "few",
  "more",
  "less",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "than",
  "too",
  "very",
  "just",
  "also",
  "now",
  "here",
  "there",
  "then",
  "so",
  "if",
  "else",
  "because",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "once",
]);

/**
 * Extract meaningful keywords from text.
 * Filters stop words and returns unique significant terms.
 */
function extractKeywords(text: string, maxWords = 10): string[] {
  if (!text) return [];

  const words = text
    .toLowerCase()
    // Remove markdown formatting and special chars
    .replace(/[#*`[\](){}|\\<>]/g, " ")
    // Replace non-alphanumeric (except hyphens) with spaces
    .replace(/[^a-z0-9-\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !STOP_WORDS.has(word) &&
        // Filter pure numbers
        !/^\d+$/.test(word),
    );

  // Return unique words, limited to maxWords
  return [...new Set(words)].slice(0, maxWords);
}

/**
 * Parse label names to extract meaningful parts.
 * Handles patterns like "pkg:claude-knowledge" → "claude-knowledge"
 */
function parseLabels(labels: Array<{ name: string }>): string[] {
  const result: string[] = [];

  for (const label of labels) {
    const name = label.name.toLowerCase();

    // Handle prefixed labels (pkg:name, type:name, etc.)
    if (name.includes(":")) {
      const parts = name.split(":");
      // Add the value part (e.g., "claude-knowledge" from "pkg:claude-knowledge")
      if (parts[1]) {
        result.push(parts[1]);
      }
    } else {
      // Add non-prefixed labels directly (filter common ones)
      if (!["enhancement", "bug", "documentation", "question"].includes(name)) {
        result.push(name);
      }
    }
  }

  return result;
}

/**
 * Execute a shell command and return stdout.
 * Returns undefined if command fails.
 */
async function execCommand(command: string[]): Promise<string | undefined> {
  try {
    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      logger.debug("Command failed", {
        command: command.join(" "),
        exitCode,
        stderr,
        context: "issue-fetcher",
      });
      return undefined;
    }

    return await new Response(proc.stdout).text();
  } catch (error) {
    logger.debug("Command execution failed", {
      error: error instanceof Error ? error.message : String(error),
      command: command.join(" "),
      context: "issue-fetcher",
    });
    return undefined;
  }
}

/**
 * Fetch issue context from GitHub via `gh` CLI.
 * Results are cached for CACHE_TTL_MS to avoid repeated API calls.
 *
 * @param issueNumber - GitHub issue number
 * @returns Issue context or undefined if fetch fails
 */
export async function fetchIssueContext(
  issueNumber: number,
): Promise<IssueContext | undefined> {
  // Check cache first
  const cached = issueCache.get(issueNumber);
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug("Issue context cache hit", {
      issueNumber,
      context: "issue-fetcher",
    });
    return cached.data;
  }

  // Fetch from GitHub
  const output = await execCommand([
    "gh",
    "issue",
    "view",
    String(issueNumber),
    "--json",
    "title,body,labels",
  ]);

  if (!output) {
    logger.debug("Failed to fetch issue", {
      issueNumber,
      context: "issue-fetcher",
    });
    return undefined;
  }

  try {
    const issue: GitHubIssue = JSON.parse(output);

    // Extract keywords from title (high value)
    const titleKeywords = extractKeywords(issue.title, 5);

    // Extract keywords from body (first 500 chars to focus on summary)
    const bodyText = issue.body?.slice(0, 500) ?? "";
    const bodyKeywords = extractKeywords(bodyText, 5);

    // Parse labels
    const labels = parseLabels(issue.labels ?? []);

    const context: IssueContext = {
      title: issue.title,
      labels,
      keywords: [...new Set([...titleKeywords, ...bodyKeywords])],
    };

    // Cache the result
    issueCache.set(issueNumber, {
      data: context,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    logger.debug("Issue context fetched and cached", {
      issueNumber,
      keywordCount: context.keywords.length,
      labelCount: context.labels.length,
      context: "issue-fetcher",
    });

    return context;
  } catch (error) {
    logger.warn("Failed to parse issue response", {
      error: error instanceof Error ? error.message : String(error),
      issueNumber,
      context: "issue-fetcher",
    });
    return undefined;
  }
}

/**
 * Clear the issue cache.
 * Primarily for testing.
 */
export function clearIssueCache(): void {
  issueCache.clear();
}

/**
 * Get the current cache size.
 * Primarily for testing.
 */
export function getIssueCacheSize(): number {
  return issueCache.size;
}
