/**
 * Notification prompt templates
 *
 * Templates for workflow status notifications.
 */

/**
 * Generate workflow completion message
 */
export function completionPrompt(
  issueNumber: number,
  title: string,
  prNumber: number,
  prTitle: string,
  prUrl: string,
  commitCount: number,
): string {
  return `✅ PR Created!

Issue #${issueNumber}: ${title}

PR #${prNumber}: ${prTitle}
${prUrl}

Commits: ${commitCount}
Reviews: CodeRabbit + Claude triggered`;
}

/**
 * Generate permission needed notification
 */
export function permissionNeededPrompt(
  context: string,
  issueNumber: number,
  toolName: string,
  filePath: string,
): string {
  return `⏳ [${context} #${issueNumber}] Permission needed in terminal

Tool: ${toolName}
File: ${filePath}

Waiting for approval...`;
}

/**
 * Generate review started notification
 */
export function reviewStartedPrompt(
  context: string,
  issueNumber: number,
  agents: string[],
): string {
  return `🔍 [${context} #${issueNumber}] Starting pre-PR review

Agents: ${agents.join(", ")}

This may take a few minutes...`;
}

/**
 * Generate review completed notification
 */
export function reviewCompletedPrompt(
  context: string,
  issueNumber: number,
  criticalCount: number,
  nonCriticalCount: number,
): string {
  const status =
    criticalCount === 0
      ? "✅ All clear"
      : `⚠️ ${criticalCount} critical findings`;

  return `${status}

[${context} #${issueNumber}] Review completed

Critical: ${criticalCount}
Non-critical: ${nonCriticalCount}`;
}

/**
 * Generate fix in progress notification
 */
export function fixInProgressPrompt(
  context: string,
  issueNumber: number,
  attempt: number,
  maxAttempts: number,
  finding: string,
): string {
  return `🔧 [${context} #${issueNumber}] Auto-fix attempt ${attempt}/${maxAttempts}

Fixing: ${finding}`;
}

/**
 * Generate implementation started notification
 */
export function implementationStartedPrompt(
  context: string,
  issueNumber: number,
  commitCount: number,
): string {
  return `🛠️ [${context} #${issueNumber}] Implementation started

Planned commits: ${commitCount}

Working on first commit...`;
}

/**
 * Generate implementation progress notification
 */
export function implementationProgressPrompt(
  context: string,
  issueNumber: number,
  currentCommit: number,
  totalCommits: number,
  message: string,
): string {
  return `📦 [${context} #${issueNumber}] Commit ${currentCommit}/${totalCommits}

${message}`;
}

/**
 * Generate abort notification
 */
export function abortPrompt(
  context: string,
  issueNumber: number,
  reason: string,
  branchDeleted: boolean,
): string {
  const branchStatus = branchDeleted ? "Branch deleted." : "Branch preserved.";

  return `❌ [${context} #${issueNumber}] Workflow aborted

Reason: ${reason}

${branchStatus}`;
}

/**
 * Generate blocked notification
 */
export function blockedPrompt(
  context: string,
  issueNumber: number,
  blockers: number[],
): string {
  const blockerList = blockers.map((n) => `#${n}`).join(", ");

  return `🚫 [${context} #${issueNumber}] Blocked

This issue is blocked by: ${blockerList}

These issues must be closed before proceeding.`;
}
