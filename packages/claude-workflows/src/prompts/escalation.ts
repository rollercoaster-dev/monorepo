/**
 * Escalation prompt templates
 *
 * Templates for workflow escalation messages.
 */

import type { EscalationReport, Finding, EscalationTrigger } from "../types";

/**
 * Generate an escalation prompt
 */
export function escalationPrompt(report: EscalationReport): string {
  const findingsList = report.findings
    .map((f) => `• ${f.file}${f.line ? `:${f.line}` : ""}: ${f.issue}`)
    .join("\n");

  return `🚨 ESCALATION REQUIRED

Issue: #${report.issueNumber} - ${report.title}
Branch: ${report.branch}
Retry: ${report.retryCount}/${report.maxRetry}
Trigger: ${formatTrigger(report.trigger)}

Critical Findings:
${findingsList}

Options:
1. 'continue' - Fix manually, then continue
2. 'force-pr' - Create PR with issues flagged
3. 'abort' - Delete branch and exit
4. 'reset' - Go back to last good state`;
}

/**
 * Format escalation trigger for display
 */
function formatTrigger(trigger: EscalationTrigger): string {
  switch (trigger) {
    case "max_retry":
      return "Maximum retry attempts exceeded";
    case "max_fix_commits":
      return "Maximum fix commits exceeded";
    case "validation_failed":
      return "Validation failed after fix";
    case "test_failed":
      return "Tests failed";
    case "build_failed":
      return "Build failed";
    case "agent_failed":
      return "Review agent failed";
  }
}

/**
 * Generate escalation report markdown
 */
export function escalationReportMarkdown(
  report: EscalationReport,
  fixAttempts: Array<{
    file: string;
    attempt: number;
    action: string;
    result: string;
  }>,
): string {
  const lines: string[] = [
    "## ESCALATION REQUIRED",
    "",
    `**Issue:** #${report.issueNumber} - ${report.title}`,
    `**Branch:** ${report.branch}`,
    `**Retry Count:** ${report.retryCount}/${report.maxRetry}`,
    "",
    "### Critical Findings (Unresolved)",
    "",
    "| # | Agent | File | Issue | Fix Attempts |",
    "| --- | ----- | ---- | ----- | ------------ |",
  ];

  report.findings.forEach((f, i) => {
    const location = f.line ? `${f.file}:${f.line}` : f.file;
    const attempts = fixAttempts.filter((a) => a.file === f.file).length;
    lines.push(
      `| ${i + 1} | ${f.agent} | ${location} | ${f.issue} | ${attempts} |`,
    );
  });

  if (fixAttempts.length > 0) {
    lines.push("", "### Fix Attempt Log", "");

    fixAttempts.forEach((attempt) => {
      lines.push(`**Attempt ${attempt.attempt} (${attempt.file}):**`);
      lines.push(`- Applied: ${attempt.action}`);
      lines.push(`- Result: ${attempt.result}`);
      lines.push("");
    });
  }

  lines.push("### Your Options", "");
  lines.push(
    "1. **Fix manually** - Make the fix yourself, then type `continue`",
  );
  lines.push(
    "2. **Force PR** - Type `force-pr` to create PR with issues flagged",
  );
  lines.push("3. **Abort** - Type `abort` to delete branch and exit");
  lines.push("4. **Reset** - Type `reset` to go back to last good state");

  return lines.join("\n");
}

/**
 * Generate force-PR warning section
 */
export function forcePrWarningSection(findings: Finding[]): string {
  const lines: string[] = [
    "## ⚠️ UNRESOLVED ISSUES",
    "",
    "The following issues could not be auto-fixed and require manual attention:",
    "",
    "| Finding | File | Issue |",
    "| ------- | ---- | ----- |",
  ];

  findings.forEach((f, i) => {
    const location = f.line ? `${f.file}:${f.line}` : f.file;
    lines.push(`| ${i + 1} | ${location} | ${f.issue} |`);
  });

  lines.push("", "### Labels Added", "", "- `needs-attention`");

  return lines.join("\n");
}
