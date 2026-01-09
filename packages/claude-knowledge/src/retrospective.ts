/**
 * Retrospective analysis for workflow learning capture.
 *
 * Analyzes completed workflows to:
 * 1. Compare planned vs actual commits
 * 2. Identify deviations and their reasons
 * 3. Extract patterns from successful approaches
 * 4. Extract mistakes from failures
 * 5. Generate improvement suggestions
 *
 * The learnings are stored in the knowledge graph for future session context.
 */

import { readFileSync, existsSync } from "fs";
import { checkpoint } from "./checkpoint";
import { store, storePattern, storeMistake } from "./knowledge";
import { randomUUID } from "crypto";
import type {
  WorkflowLearning,
  Deviation,
  ReviewFinding,
  AppliedFix,
  ExtractedPattern,
  ExtractedMistake,
  CheckpointData,
  Learning,
} from "./types";

/**
 * Parse commit messages from a dev plan markdown file.
 * Looks for commit patterns like:
 * - `feat(scope): description`
 * - **Commit**: `message`
 * - Step N: ... **Commit**: `message`
 */
function parseCommitsFromDevPlan(devPlanContent: string): string[] {
  const commits: string[] = [];

  // Pattern 1: Lines that look like commit messages (conventional commits)
  // e.g., `feat(claude-knowledge): add WorkflowLearning types`
  const conventionalCommitPattern =
    /`((?:feat|fix|refactor|test|docs|chore|build|ci)\([^)]+\):[^`]+)`/g;
  let match;
  while ((match = conventionalCommitPattern.exec(devPlanContent)) !== null) {
    commits.push(match[1].trim());
  }

  // Pattern 2: **Commit**: `message` format
  const commitHeaderPattern = /\*\*Commit\*\*:\s*`([^`]+)`/g;
  while ((match = commitHeaderPattern.exec(devPlanContent)) !== null) {
    const commit = match[1].trim();
    // Avoid duplicates
    if (!commits.includes(commit)) {
      commits.push(commit);
    }
  }

  // Pattern 3: Numbered list with commit-like items
  // e.g., 1. `feat(scope): description`
  const numberedCommitPattern =
    /^\d+\.\s*`((?:feat|fix|refactor|test|docs|chore|build|ci)\([^)]+\):[^`]+)`/gm;
  while ((match = numberedCommitPattern.exec(devPlanContent)) !== null) {
    const commit = match[1].trim();
    if (!commits.includes(commit)) {
      commits.push(commit);
    }
  }

  return commits;
}

/**
 * Extract review findings from workflow actions metadata.
 * Looks for actions with names like "review-*" or containing "findings" in metadata.
 */
function extractReviewFindings(data: CheckpointData): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  for (const action of data.actions) {
    // Skip non-review actions
    if (!action.action.includes("review") && !action.metadata?.findings) {
      continue;
    }

    const metadata = action.metadata;
    if (!metadata) continue;

    // Extract findings from metadata
    if (Array.isArray(metadata.findings)) {
      for (const finding of metadata.findings) {
        if (
          typeof finding === "object" &&
          finding !== null &&
          "description" in finding
        ) {
          findings.push({
            agent: String(metadata.agent || action.action),
            severity:
              (finding.severity as ReviewFinding["severity"]) || "medium",
            description: String(finding.description),
          });
        }
      }
    }

    // Also check for singular finding format
    if (
      typeof metadata.finding === "object" &&
      metadata.finding !== null &&
      "description" in metadata.finding
    ) {
      const finding = metadata.finding as Record<string, unknown>;
      findings.push({
        agent: String(metadata.agent || action.action),
        severity: (finding.severity as ReviewFinding["severity"]) || "medium",
        description: String(finding.description),
      });
    }

    // Handle critical/high/medium/low counts
    if (typeof metadata.critical === "number" && metadata.critical > 0) {
      findings.push({
        agent: String(metadata.agent || action.action),
        severity: "critical",
        description: `${metadata.critical} critical issue(s) found`,
      });
    }
  }

  return findings;
}

/**
 * Extract fix attempts from workflow actions metadata.
 * Looks for actions with names like "fix-*" or "auto-fix".
 */
function extractFixes(data: CheckpointData): AppliedFix[] {
  const fixes: AppliedFix[] = [];

  for (const action of data.actions) {
    if (!action.action.includes("fix") && !action.metadata?.fix) {
      continue;
    }

    const metadata = action.metadata;
    if (!metadata) continue;

    // Extract fix info
    if (
      typeof metadata.fix === "string" ||
      typeof metadata.finding === "string"
    ) {
      fixes.push({
        finding: String(metadata.finding || "Unknown finding"),
        fix: String(metadata.fix || action.action),
        success: action.result === "success",
      });
    }

    // Handle array of fixes
    if (Array.isArray(metadata.fixes)) {
      for (const fix of metadata.fixes) {
        if (typeof fix === "object" && fix !== null) {
          fixes.push({
            finding: String(
              (fix as Record<string, unknown>).finding || "Unknown",
            ),
            fix: String((fix as Record<string, unknown>).fix || "Unknown fix"),
            success: (fix as Record<string, unknown>).success !== false,
          });
        }
      }
    }
  }

  return fixes;
}

/**
 * Compare planned and actual commits to identify deviations.
 */
function identifyDeviations(
  plannedCommits: string[],
  actualCommits: string[],
): Deviation[] {
  const deviations: Deviation[] = [];

  // Normalize commit messages for comparison (remove whitespace, lowercase)
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

  const plannedNormalized = plannedCommits.map(normalize);
  const actualNormalized = actualCommits.map(normalize);

  // Find planned commits that weren't made
  for (let i = 0; i < plannedCommits.length; i++) {
    const planned = plannedNormalized[i];

    // Check if any actual commit matches (fuzzy - contains the scope/type)
    const hasMatch = actualNormalized.some((actual) => {
      // Extract type(scope) pattern
      const plannedTypeScope = planned.match(/^(\w+)\(([^)]+)\)/);
      const actualTypeScope = actual.match(/^(\w+)\(([^)]+)\)/);

      if (plannedTypeScope && actualTypeScope) {
        return (
          plannedTypeScope[1] === actualTypeScope[1] &&
          plannedTypeScope[2] === actualTypeScope[2]
        );
      }

      // Fallback to substring matching
      return actual.includes(planned.substring(0, 30));
    });

    if (!hasMatch) {
      deviations.push({
        plannedStep: plannedCommits[i],
        actualOutcome: "Commit was not made",
        reason: "Unknown - commit may have been merged or skipped",
      });
    }
  }

  // Find actual commits that weren't planned
  for (let i = 0; i < actualCommits.length; i++) {
    const actual = actualNormalized[i];

    const wasPlanned = plannedNormalized.some((planned) => {
      const plannedTypeScope = planned.match(/^(\w+)\(([^)]+)\)/);
      const actualTypeScope = actual.match(/^(\w+)\(([^)]+)\)/);

      if (plannedTypeScope && actualTypeScope) {
        return (
          plannedTypeScope[1] === actualTypeScope[1] &&
          plannedTypeScope[2] === actualTypeScope[2]
        );
      }

      return planned.includes(actual.substring(0, 30));
    });

    if (!wasPlanned) {
      deviations.push({
        plannedStep: "Not in original plan",
        actualOutcome: actualCommits[i],
        reason: "Additional commit added during implementation",
      });
    }
  }

  return deviations;
}

/**
 * Extract patterns from successful workflow execution.
 * Patterns are derived from:
 * - Successful fixes that resolved review findings
 * - Clean implementations (no deviations)
 */
function extractPatterns(
  data: CheckpointData,
  fixes: AppliedFix[],
  deviations: Deviation[],
): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];

  // Pattern: Successful fix approach
  const successfulFixes = fixes.filter((f) => f.success);
  for (const fix of successfulFixes) {
    patterns.push({
      name: `Fix: ${fix.finding.substring(0, 30)}`,
      description: `When encountering "${fix.finding}", apply: ${fix.fix}`,
      codeArea: extractCodeAreaFromWorkflow(data),
    });
  }

  // Pattern: Clean implementation (few deviations)
  if (deviations.length <= 1 && data.commits.length > 0) {
    patterns.push({
      name: "Clean Implementation",
      description: `Issue #${data.workflow.issueNumber} implemented with minimal deviations. Commits followed plan closely.`,
      codeArea: extractCodeAreaFromWorkflow(data),
    });
  }

  return patterns;
}

/**
 * Extract mistakes from workflow execution.
 * Mistakes are derived from:
 * - Failed fixes
 * - Critical review findings
 * - Large deviations from plan
 */
function extractMistakes(
  data: CheckpointData,
  findings: ReviewFinding[],
  fixes: AppliedFix[],
): ExtractedMistake[] {
  const mistakes: ExtractedMistake[] = [];

  // Mistake: Critical findings
  const criticalFindings = findings.filter((f) => f.severity === "critical");
  for (const finding of criticalFindings) {
    const relatedFix = fixes.find((f) =>
      f.finding
        .toLowerCase()
        .includes(finding.description.toLowerCase().substring(0, 20)),
    );

    mistakes.push({
      description: `Critical: ${finding.description}`,
      howFixed: relatedFix?.fix || "Unknown - may require manual review",
      filePath: extractFilePathFromFinding(finding),
    });
  }

  // Mistake: Failed fixes
  const failedFixes = fixes.filter((f) => !f.success);
  for (const fix of failedFixes) {
    mistakes.push({
      description: `Failed to fix: ${fix.finding}`,
      howFixed: `Attempted: ${fix.fix} - but failed. Manual intervention required.`,
    });
  }

  return mistakes;
}

/**
 * Extract code area from workflow data (branch name or issue context).
 */
function extractCodeAreaFromWorkflow(data: CheckpointData): string | undefined {
  // Try to extract from branch name
  // e.g., feat/issue-375-workflow-retrospective -> "workflow-retrospective"
  const branchMatch = data.workflow.branch.match(
    /(?:feat|fix|refactor)\/issue-\d+-(.+)/,
  );
  if (branchMatch) {
    return branchMatch[1].replace(/-/g, " ");
  }

  // Fallback to package name if in monorepo
  const packageMatch = data.workflow.branch.match(
    /(claude-knowledge|openbadges)/,
  );
  if (packageMatch) {
    return packageMatch[1];
  }

  return undefined;
}

/**
 * Extract file path from a review finding description if mentioned.
 */
function extractFilePathFromFinding(
  finding: ReviewFinding,
): string | undefined {
  // Look for common file path patterns
  const fileMatch = finding.description.match(
    /(?:in|at|file:?)\s+[`"]?([a-zA-Z0-9_\-/.]+\.[a-zA-Z]+)[`"]?/i,
  );
  return fileMatch?.[1];
}

/**
 * Generate improvement suggestions based on workflow analysis.
 */
function generateImprovements(
  deviations: Deviation[],
  findings: ReviewFinding[],
  fixes: AppliedFix[],
): string[] {
  const improvements: string[] = [];

  // Suggestion: Many deviations
  if (deviations.length > 3) {
    improvements.push(
      "Consider breaking down complex issues into smaller, more predictable tasks",
    );
  }

  // Suggestion: Many critical findings
  const criticalCount = findings.filter(
    (f) => f.severity === "critical",
  ).length;
  if (criticalCount > 2) {
    improvements.push(
      "Run pre-implementation review to catch potential issues earlier",
    );
  }

  // Suggestion: Failed fixes
  const failedCount = fixes.filter((f) => !f.success).length;
  if (failedCount > 0) {
    improvements.push(
      `${failedCount} fix(es) failed - consider manual review for complex issues`,
    );
  }

  // Suggestion: No issues found
  if (findings.length === 0 && deviations.length === 0) {
    improvements.push(
      "Excellent execution! Consider documenting this approach as a template",
    );
  }

  return improvements;
}

/**
 * Analyze a completed workflow and generate a WorkflowLearning object.
 *
 * @param workflowId - The workflow ID from the checkpoint system
 * @param devPlanPath - Path to the dev plan markdown file
 * @returns WorkflowLearning object with analysis results
 * @throws Error if workflow not found or dev plan cannot be read
 */
export async function analyzeWorkflow(
  workflowId: string,
  devPlanPath: string,
): Promise<WorkflowLearning> {
  // Load workflow data from checkpoint
  const data = checkpoint.load(workflowId);
  if (!data) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  // Load and parse dev plan
  let devPlanContent = "";
  let plannedCommits: string[] = [];

  if (existsSync(devPlanPath)) {
    devPlanContent = readFileSync(devPlanPath, "utf-8");
    plannedCommits = parseCommitsFromDevPlan(devPlanContent);
  }

  // Extract actual commits
  const actualCommits = data.commits.map((c) => c.message);

  // Analyze workflow
  const deviations = identifyDeviations(plannedCommits, actualCommits);
  const reviewFindings = extractReviewFindings(data);
  const fixesApplied = extractFixes(data);
  const patterns = extractPatterns(data, fixesApplied, deviations);
  const mistakes = extractMistakes(data, reviewFindings, fixesApplied);
  const improvements = generateImprovements(
    deviations,
    reviewFindings,
    fixesApplied,
  );

  return {
    id: `learning-${randomUUID()}`,
    issueNumber: data.workflow.issueNumber,
    branch: data.workflow.branch,
    workflowId,
    plannedCommits,
    actualCommits,
    deviations,
    reviewFindings,
    fixesApplied,
    patterns,
    mistakes,
    improvements,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Store a WorkflowLearning in the knowledge graph.
 *
 * This method:
 * 1. Stores the WorkflowLearning as a Learning entity
 * 2. Extracts and stores patterns as Pattern entities
 * 3. Extracts and stores mistakes as Mistake entities
 * 4. Creates relationships between them
 *
 * @param learning - The WorkflowLearning to store
 */
export async function storeWorkflowLearning(
  learning: WorkflowLearning,
): Promise<void> {
  // Generate summary content for the learning
  const summaryParts = [
    `Workflow for issue #${learning.issueNumber}`,
    `Branch: ${learning.branch}`,
    `Commits: ${learning.actualCommits.length} (planned: ${learning.plannedCommits.length})`,
    `Deviations: ${learning.deviations.length}`,
    `Review findings: ${learning.reviewFindings.length}`,
    `Fixes applied: ${learning.fixesApplied.length}`,
  ];

  if (learning.improvements.length > 0) {
    summaryParts.push(`Improvements: ${learning.improvements.join("; ")}`);
  }

  // Store as Learning entity
  const learningEntity: Learning = {
    id: learning.id,
    content: summaryParts.join("\n"),
    sourceIssue: learning.issueNumber,
    codeArea: extractCodeAreaFromBranch(learning.branch),
    confidence: calculateConfidence(learning),
    metadata: {
      workflowId: learning.workflowId,
      branch: learning.branch,
      plannedCommits: learning.plannedCommits,
      actualCommits: learning.actualCommits,
      deviations: learning.deviations,
      reviewFindings: learning.reviewFindings,
      fixesApplied: learning.fixesApplied,
      improvements: learning.improvements,
    },
  };

  await store([learningEntity]);

  // Store extracted patterns
  for (const pattern of learning.patterns) {
    await storePattern(
      {
        id: `pattern-${randomUUID()}`,
        name: pattern.name,
        description: pattern.description,
        codeArea: pattern.codeArea,
      },
      [learning.id],
    );
  }

  // Store extracted mistakes
  for (const mistake of learning.mistakes) {
    await storeMistake(
      {
        id: `mistake-${randomUUID()}`,
        description: mistake.description,
        howFixed: mistake.howFixed,
        filePath: mistake.filePath,
      },
      learning.id,
    );
  }
}

/**
 * Extract code area from branch name.
 */
function extractCodeAreaFromBranch(branch: string): string | undefined {
  // e.g., feat/issue-375-workflow-retrospective -> "workflow retrospective"
  const match = branch.match(/(?:feat|fix|refactor)\/issue-\d+-(.+)/);
  if (match) {
    return match[1].replace(/-/g, " ");
  }

  // Try package name
  const packageMatch = branch.match(/(claude-knowledge|openbadges|rd-logger)/);
  return packageMatch?.[1];
}

/**
 * Calculate confidence score for a workflow learning.
 * Higher confidence for clean implementations, lower for problematic ones.
 */
function calculateConfidence(learning: WorkflowLearning): number {
  let score = 1.0;

  // Deduct for deviations
  score -= learning.deviations.length * 0.1;

  // Deduct for critical findings
  const criticalCount = learning.reviewFindings.filter(
    (f) => f.severity === "critical",
  ).length;
  score -= criticalCount * 0.15;

  // Deduct for failed fixes
  const failedCount = learning.fixesApplied.filter((f) => !f.success).length;
  score -= failedCount * 0.2;

  // Bonus for clean implementation
  if (
    learning.deviations.length === 0 &&
    learning.reviewFindings.length === 0
  ) {
    score += 0.1;
  }

  // Clamp to 0.0-1.0
  return Math.max(0.0, Math.min(1.0, score));
}
