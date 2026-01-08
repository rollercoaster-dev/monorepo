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
