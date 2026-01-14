/**
 * Git Context Parsing Utilities
 *
 * Parse git command output to extract context for session hooks.
 */

/**
 * Parse issue number from a branch name.
 * Supports patterns like:
 * - issue-123
 * - feat/issue-123-description
 * - fix/issue-123
 * - feature/123-some-feature
 *
 * @param branch - Git branch name
 * @returns Issue number if found, undefined otherwise
 */
export function parseIssueNumber(branch: string): number | undefined {
  if (!branch) return undefined;

  // Try common patterns:
  // 1. issue-N or issue/N
  // 2. feat/issue-N, fix/issue-N, etc.
  // 3. feature/N-description, fix/N-description
  const patterns = [
    /issue[-/](\d+)/i, // issue-123 or issue/123
    /(?:feat|fix|feature|bugfix|hotfix)\/issue[-/](\d+)/i, // feat/issue-123
    /(?:feat|fix|feature|bugfix|hotfix)\/(\d+)[-/]/i, // feat/123-description
    /#(\d+)/, // #123 anywhere in branch name
  ];

  for (const pattern of patterns) {
    const match = branch.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  return undefined;
}

/**
 * Parse modified files from git status --porcelain output.
 * Handles status prefixes: M (modified), A (added), D (deleted), R (renamed), etc.
 *
 * @param gitStatusOutput - Output from `git status --porcelain`
 * @returns Array of file paths
 */
export function parseModifiedFiles(gitStatusOutput: string): string[] {
  if (!gitStatusOutput || !gitStatusOutput.trim()) {
    return [];
  }

  const files: string[] = [];
  const lines = gitStatusOutput.trim().split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    // Porcelain format: XY filename (XY is 2 chars, then space, then filename)
    // Minimum valid line: "XY f" (4 chars: status + space + at least 1 char filename)
    if (line.length < 4) continue;

    // Extract filename starting after position 2 (skip XY), then trim leading space
    const filePart = line.substring(2).trim();
    if (!filePart) continue;

    // Handle renamed files: old -> new
    if (filePart.includes(" -> ")) {
      const parts = filePart.split(" -> ");
      // Add the new filename (destination of rename)
      if (parts[1]) {
        files.push(parts[1].trim());
      }
    } else {
      files.push(filePart);
    }
  }

  return files;
}

/**
 * Parsed commit structure.
 */
export interface ParsedCommit {
  sha: string;
  message: string;
}

/**
 * Parse recent commits from git log --oneline output.
 *
 * @param gitLogOutput - Output from `git log --oneline -N`
 * @returns Array of parsed commits with sha and message
 */
export function parseRecentCommits(gitLogOutput: string): ParsedCommit[] {
  if (!gitLogOutput || !gitLogOutput.trim()) {
    return [];
  }

  const commits: ParsedCommit[] = [];
  const lines = gitLogOutput.trim().split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    // Oneline format: sha message
    // SHA is typically 7+ characters
    const match = line.match(/^([a-f0-9]+)\s+(.+)$/i);
    if (match && match[1] && match[2]) {
      commits.push({
        sha: match[1],
        message: match[2],
      });
    }
  }

  return commits;
}

/**
 * Parse conventional commit message to extract type and scope.
 *
 * @param message - Commit message like "feat(scope): description"
 * @returns Parsed type, scope, and description, or null if not conventional
 */
export function parseConventionalCommit(message: string): {
  type: string;
  scope?: string;
  description: string;
} | null {
  if (!message) return null;

  // Pattern: type(scope): description OR type: description
  // Use \S.* instead of .+ to avoid ReDoS with spaces after colon
  const match = message.match(
    /^(feat|fix|refactor|test|docs|chore|build|ci|perf|style)(?:\(([^)]+)\))?:\s*(\S.*)$/i,
  );

  if (!match || !match[1] || !match[3]) return null;

  return {
    type: match[1].toLowerCase(),
    scope: match[2] || undefined,
    description: match[3],
  };
}

/**
 * Issue metadata fetched from GitHub.
 */
export interface IssueMetadata {
  title: string;
  labels: string[];
}

// In-memory cache for issue metadata (session-scoped)
const issueMetadataCache = new Map<number, IssueMetadata>();

/**
 * Fetch issue metadata from GitHub using gh CLI.
 *
 * Uses in-memory cache to avoid repeated API calls within the same session.
 * No TTL needed as CLI sessions are short-lived (minutes, not hours).
 * Requires gh CLI to be installed and authenticated.
 *
 * @param issueNumber - GitHub issue number
 * @returns Issue metadata (title, labels) or null on error (graceful fallback)
 *
 * @example
 * ```typescript
 * const metadata = await fetchIssueMetadata(476);
 * if (metadata) {
 *   console.log(metadata.title);
 *   console.log(metadata.labels);
 * }
 * ```
 */
export async function fetchIssueMetadata(
  issueNumber: number,
): Promise<IssueMetadata | null> {
  // Check cache first
  const cached = issueMetadataCache.get(issueNumber);
  if (cached) {
    return cached;
  }

  // Validate issue number is a safe positive integer
  if (
    !Number.isInteger(issueNumber) ||
    issueNumber <= 0 ||
    issueNumber > Number.MAX_SAFE_INTEGER
  ) {
    return null;
  }

  // Fetch from GitHub
  try {
    const { $ } = await import("bun");
    const result =
      await $`gh issue view ${issueNumber} --json title,labels`.quiet();

    // Parse and validate JSON structure
    let data: unknown;
    try {
      data = JSON.parse(result.text());
    } catch {
      // JSON parse failed - log and return null
      const { defaultLogger: logger } =
        await import("@rollercoaster-dev/rd-logger");
      logger.debug("Failed to parse gh CLI JSON output", {
        issueNumber,
        context: "fetchIssueMetadata",
      });
      return null;
    }

    // Validate structure before using
    if (
      typeof data !== "object" ||
      data === null ||
      typeof (data as Record<string, unknown>).title !== "string"
    ) {
      const { defaultLogger: logger } =
        await import("@rollercoaster-dev/rd-logger");
      logger.debug("gh CLI returned unexpected JSON structure", {
        issueNumber,
        context: "fetchIssueMetadata",
      });
      return null;
    }

    const typedData = data as {
      title: string;
      labels?: Array<{ name?: string }>;
    };

    const metadata: IssueMetadata = {
      title: typedData.title,
      labels: Array.isArray(typedData.labels)
        ? typedData.labels
            .filter((l) => typeof l?.name === "string")
            .map((l) => l.name!)
        : [],
    };

    // Cache the result
    issueMetadataCache.set(issueNumber, metadata);

    return metadata;
  } catch (error) {
    // Log the failure - this is an enhancement, not critical
    const { defaultLogger: logger } =
      await import("@rollercoaster-dev/rd-logger");
    logger.debug("Failed to fetch issue metadata from gh CLI", {
      issueNumber,
      error: error instanceof Error ? error.message : String(error),
      context: "fetchIssueMetadata",
      hint: "Ensure gh CLI is installed and authenticated (gh auth login)",
    });
    return null;
  }
}

/**
 * Clear the issue metadata cache (for testing).
 */
export function clearIssueMetadataCache(): void {
  issueMetadataCache.clear();
}

/**
 * Extract search terms from issue metadata and branch name for documentation search.
 *
 * Processes multiple sources to build a comprehensive list of search keywords:
 * - **Issue title**: Significant words (filtered for stopwords and commit types)
 * - **Labels**: Package names from `pkg:*` labels (e.g., `pkg:claude-knowledge`)
 * - **Branch name**: Keywords after removing type prefixes and issue numbers
 *
 * Terms are deduplicated and filtered to ensure quality search results.
 *
 * @param issueMetadata - Issue metadata from GitHub (or null if unavailable)
 * @param branch - Git branch name (or null if unavailable)
 * @returns Array of unique search terms (lowercase, >2 chars, no stopwords)
 *
 * @example
 * ```typescript
 * const terms = extractIssueSearchTerms(
 *   { title: "feat: add documentation search", labels: ["pkg:claude-knowledge"] },
 *   "feat/issue-476-doc-search"
 * );
 * // Returns: ["add", "documentation", "search", "claude-knowledge", "doc"]
 * ```
 */
export function extractIssueSearchTerms(
  issueMetadata: IssueMetadata | null,
  branch: string | null,
): string[] {
  const terms: string[] = [];

  // Common stopwords to filter out
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
  ]);

  // Common commit type prefixes to filter out
  const commitTypes = new Set([
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "test",
    "chore",
    "perf",
    "build",
  ]);

  // Extract words from issue title
  if (issueMetadata?.title) {
    const titleWords = issueMetadata.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 && !stopWords.has(word) && !commitTypes.has(word),
      );
    terms.push(...titleWords);
  }

  // Extract package names from labels (e.g., pkg:claude-knowledge)
  if (issueMetadata?.labels) {
    for (const label of issueMetadata.labels) {
      const pkgMatch = label.match(/^pkg:(.+)$/);
      if (pkgMatch && pkgMatch[1]) {
        terms.push(pkgMatch[1]);
      }
    }
  }

  // Extract keywords from branch name
  if (branch) {
    // Remove type prefix and issue number
    const cleanBranch = branch.replace(
      /^(?:feat|fix|feature|bugfix|hotfix|chore)\//,
      "",
    );
    const branchWords = cleanBranch
      .replace(/issue-\d+/i, "")
      .replace(/[^a-z0-9\s]/g, " ") // Convert dashes and other chars to spaces
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
    terms.push(...branchWords);
  }

  // Deduplicate and filter empty strings
  return [...new Set(terms)].filter((term) => term.length > 0);
}
