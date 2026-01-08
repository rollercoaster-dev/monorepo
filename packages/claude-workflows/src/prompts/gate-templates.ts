/**
 * Gate approval prompt templates
 *
 * Templates for gated workflow approval messages.
 */

/**
 * Generate a gate approval prompt
 */
export function gateApprovalPrompt(
  gateNumber: number,
  gateName: string,
  summary: string,
): string {
  return `🚦 GATE ${gateNumber}: ${gateName}

${summary}

Reply "proceed" to continue, or provide feedback.`;
}

/**
 * Generate a workflow start message
 */
export function workflowStartPrompt(
  command: string,
  issueNumber: number,
  branchName: string,
  mode: string,
): string {
  return `🚀 Starting /${command} #${issueNumber}

Branch: ${branchName}
Mode: ${mode}

You'll receive updates at each phase.`;
}

/**
 * Generate a phase transition message
 */
export function phaseTransitionPrompt(
  context: string,
  issueNumber: number,
  from: string,
  to: string,
  details: string,
): string {
  return `[${context} #${issueNumber}] Phase: ${from} → ${to}

${details}`;
}

/**
 * Generate Gate 1 (Issue Review) prompt
 */
export function gate1Prompt(
  issueNumber: number,
  title: string,
  body: string,
  dependencies: string,
): string {
  return `🚦 GATE 1: Issue Review

## Issue #${issueNumber}: ${title}

${body}

${dependencies}

---

Reply "proceed" to continue to planning, or provide feedback.`;
}

/**
 * Generate Gate 2 (Plan Review) prompt
 */
export function gate2Prompt(issueNumber: number, planContent: string): string {
  return `🚦 GATE 2: Plan Review

## Development Plan for #${issueNumber}

${planContent}

---

Reply "proceed" to start implementation, or provide feedback.`;
}

/**
 * Generate Gate 3 (Pre-PR Review) prompt
 */
export function gate3Prompt(
  issueNumber: number,
  reviewSummary: string,
  findings: string,
): string {
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
 */
export function gate4Prompt(
  issueNumber: number,
  prTitle: string,
  prBody: string,
  commits: string,
): string {
  return `🚦 GATE 4: PR Ready

## PR for #${issueNumber}

**Title:** ${prTitle}

${prBody}

### Commits

${commits}

---

Reply "proceed" to create PR, or provide feedback.`;
}
