/**
 * Gate approval prompt templates
 *
 * Templates for gated workflow approval messages.
 */

/**
 * Generate a gate approval prompt
 *
 * @param gateNumber - The gate number (1-4)
 * @param gateName - Name of the gate (e.g., "Issue Review")
 * @param summary - Summary content to display
 * @returns Formatted gate approval prompt
 * @throws Error if gateNumber is invalid or strings are empty
 */
export function gateApprovalPrompt(
  gateNumber: number,
  gateName: string,
  summary: string,
): string {
  if (gateNumber < 1 || gateNumber > 4) {
    throw new Error(`Invalid gate number: ${gateNumber} (expected 1-4)`);
  }
  if (!gateName.trim()) {
    throw new Error("Gate name cannot be empty");
  }
  if (!summary.trim()) {
    throw new Error("Summary cannot be empty");
  }

  return `🚦 GATE ${gateNumber}: ${gateName}

${summary}

Reply "proceed" to continue, or provide feedback.`;
}

/**
 * Generate a workflow start message
 *
 * @param command - The command name (e.g., "auto-issue")
 * @param issueNumber - The GitHub issue number
 * @param branchName - The git branch name
 * @param mode - The workflow mode (e.g., "autonomous", "supervised")
 * @returns Formatted workflow start message
 * @throws Error if issueNumber is invalid or strings are empty
 */
export function workflowStartPrompt(
  command: string,
  issueNumber: number,
  branchName: string,
  mode: string,
): string {
  if (!command.trim()) {
    throw new Error("Command cannot be empty");
  }
  if (issueNumber < 1) {
    throw new Error(`Invalid issue number: ${issueNumber}`);
  }
  if (!branchName.trim()) {
    throw new Error("Branch name cannot be empty");
  }
  if (!mode.trim()) {
    throw new Error("Mode cannot be empty");
  }

  return `🚀 Starting /${command} #${issueNumber}

Branch: ${branchName}
Mode: ${mode}

You'll receive updates at each phase.`;
}

/**
 * Generate a phase transition message
 *
 * @param context - Context string (e.g., "AUTO-ISSUE")
 * @param issueNumber - The GitHub issue number
 * @param from - The previous phase
 * @param to - The new phase
 * @param details - Additional details about the transition
 * @returns Formatted phase transition message
 */
export function phaseTransitionPrompt(
  context: string,
  issueNumber: number,
  from: string,
  to: string,
  details: string,
): string {
  if (!context.trim()) {
    throw new Error("Context cannot be empty");
  }
  if (issueNumber < 1) {
    throw new Error(`Invalid issue number: ${issueNumber}`);
  }

  return `[${context} #${issueNumber}] Phase: ${from} → ${to}

${details}`;
}

/**
 * Generate Gate 1 (Issue Review) prompt
 *
 * @param issueNumber - The GitHub issue number
 * @param title - The issue title
 * @param body - The issue body content
 * @param dependencies - Formatted dependency information
 * @returns Formatted Gate 1 prompt
 */
export function gate1Prompt(
  issueNumber: number,
  title: string,
  body: string,
  dependencies: string,
): string {
  if (issueNumber < 1) {
    throw new Error(`Invalid issue number: ${issueNumber}`);
  }
  if (!title.trim()) {
    throw new Error("Title cannot be empty");
  }

  return `🚦 GATE 1: Issue Review

## Issue #${issueNumber}: ${title}

${body}

${dependencies}

---

Reply "proceed" to continue to planning, or provide feedback.`;
}

/**
 * Generate Gate 2 (Plan Review) prompt
 *
 * @param issueNumber - The GitHub issue number
 * @param planContent - The development plan content
 * @returns Formatted Gate 2 prompt
 */
export function gate2Prompt(issueNumber: number, planContent: string): string {
  if (issueNumber < 1) {
    throw new Error(`Invalid issue number: ${issueNumber}`);
  }
  if (!planContent.trim()) {
    throw new Error("Plan content cannot be empty");
  }

  return `🚦 GATE 2: Plan Review

## Development Plan for #${issueNumber}

${planContent}

---

Reply "proceed" to start implementation, or provide feedback.`;
}

/**
 * Generate Gate 3 (Pre-PR Review) prompt
 *
 * @param issueNumber - The GitHub issue number
 * @param reviewSummary - Summary of the review
 * @param findings - Formatted findings from review agents
 * @returns Formatted Gate 3 prompt
 */
export function gate3Prompt(
  issueNumber: number,
  reviewSummary: string,
  findings: string,
): string {
  if (issueNumber < 1) {
    throw new Error(`Invalid issue number: ${issueNumber}`);
  }

  return `🚦 GATE 3: Pre-PR Review

## Review Summary for #${issueNumber}

${reviewSummary}

### Findings

${findings}

---

Reply "proceed" to create PR, or provide feedback.`;
}

/**
 * Generate Gate 4 (PR Ready) prompt
 *
 * @param issueNumber - The GitHub issue number
 * @param prTitle - The PR title
 * @param prBody - The PR body/description
 * @param commits - Formatted list of commits
 * @returns Formatted Gate 4 prompt
 */
export function gate4Prompt(
  issueNumber: number,
  prTitle: string,
  prBody: string,
  commits: string,
): string {
  if (issueNumber < 1) {
    throw new Error(`Invalid issue number: ${issueNumber}`);
  }
  if (!prTitle.trim()) {
    throw new Error("PR title cannot be empty");
  }

  return `🚦 GATE 4: PR Ready

## PR for #${issueNumber}

**Title:** ${prTitle}

${prBody}

### Commits

${commits}

---

Reply "proceed" to create PR, or provide feedback.`;
}
