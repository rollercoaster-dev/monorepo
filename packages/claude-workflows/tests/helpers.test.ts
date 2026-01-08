import { describe, test, expect } from "bun:test";
import {
  extractDependencies,
  formatDependencyReport,
} from "../src/helpers/dependencies";
import {
  gateApprovalPrompt,
  workflowStartPrompt,
  gate1Prompt,
} from "../src/prompts/gate-templates";
import {
  escalationPrompt,
  escalationReportMarkdown,
} from "../src/prompts/escalation";
import { completionPrompt, blockedPrompt } from "../src/prompts/notifications";
import { BOARD_CONFIG } from "../src/helpers/board";
import type { EscalationReport } from "../src/types";

describe("dependency helpers", () => {
  test("extractDependencies finds blockers", () => {
    const body = `
      This issue is blocked by #123.
      Also blocked by #456.
    `;
    const result = extractDependencies(body);
    expect(result.blockers).toEqual([123, 456]);
  });

  test("extractDependencies finds soft deps", () => {
    const body = `
      Depends on #100.
      After #200.
      - [ ] #300
    `;
    const result = extractDependencies(body);
    expect(result.softDeps).toContain(100);
    expect(result.softDeps).toContain(200);
    expect(result.softDeps).toContain(300);
  });

  test("extractDependencies returns empty when no deps", () => {
    const body = "Just a regular issue body";
    const result = extractDependencies(body);
    expect(result.blockers).toEqual([]);
    expect(result.softDeps).toEqual([]);
  });

  test("formatDependencyReport shows blocking status", () => {
    const result = formatDependencyReport({
      blockers: [{ issueNumber: 123, type: "blocker", state: "OPEN" }],
      softDeps: [],
      canProceed: false,
    });
    expect(result).toContain("#123");
    expect(result).toContain("BLOCKING");
    expect(result).toContain("Cannot proceed");
  });
});

describe("gate templates", () => {
  test("gateApprovalPrompt formats correctly", () => {
    const prompt = gateApprovalPrompt(1, "Issue Review", "Check the issue");
    expect(prompt).toContain("GATE 1");
    expect(prompt).toContain("Issue Review");
    expect(prompt).toContain("Check the issue");
    expect(prompt).toContain("proceed");
  });

  test("workflowStartPrompt includes all info", () => {
    const prompt = workflowStartPrompt(
      "auto-issue",
      123,
      "feat/test",
      "autonomous",
    );
    expect(prompt).toContain("/auto-issue");
    expect(prompt).toContain("#123");
    expect(prompt).toContain("feat/test");
    expect(prompt).toContain("autonomous");
  });

  test("gate1Prompt includes issue details", () => {
    const prompt = gate1Prompt(123, "Test Issue", "Body content", "No deps");
    expect(prompt).toContain("#123");
    expect(prompt).toContain("Test Issue");
    expect(prompt).toContain("Body content");
  });
});

describe("escalation templates", () => {
  test("escalationPrompt formats correctly", () => {
    const report: EscalationReport = {
      issueNumber: 123,
      title: "Test Issue",
      branch: "feat/test",
      retryCount: 2,
      maxRetry: 3,
      trigger: "max_retry",
      findings: [
        {
          file: "src/foo.ts",
          line: 42,
          issue: "Missing null check",
          agent: "code-reviewer",
        },
      ],
    };
    const prompt = escalationPrompt(report);
    expect(prompt).toContain("ESCALATION");
    expect(prompt).toContain("#123");
    expect(prompt).toContain("2/3");
    expect(prompt).toContain("src/foo.ts");
  });

  test("escalationReportMarkdown includes fix attempts", () => {
    const report: EscalationReport = {
      issueNumber: 123,
      title: "Test Issue",
      branch: "feat/test",
      retryCount: 3,
      maxRetry: 3,
      trigger: "max_retry",
      findings: [{ file: "src/foo.ts", issue: "Bug", agent: "code-reviewer" }],
    };
    const fixAttempts = [
      {
        file: "src/foo.ts",
        attempt: 1,
        action: "Added check",
        result: "FAILED",
      },
    ];
    const markdown = escalationReportMarkdown(report, fixAttempts);
    expect(markdown).toContain("Fix Attempt Log");
    expect(markdown).toContain("Attempt 1");
    expect(markdown).toContain("Added check");
  });
});

describe("notification templates", () => {
  test("completionPrompt includes PR info", () => {
    const prompt = completionPrompt(
      123,
      "Test Issue",
      456,
      "PR Title",
      "https://github.com/pr/456",
      5,
    );
    expect(prompt).toContain("PR Created");
    expect(prompt).toContain("#123");
    expect(prompt).toContain("#456");
    expect(prompt).toContain("Commits: 5");
  });

  test("blockedPrompt lists blockers", () => {
    const prompt = blockedPrompt("AUTO-ISSUE", 123, [100, 200]);
    expect(prompt).toContain("Blocked");
    expect(prompt).toContain("#123");
    expect(prompt).toContain("#100");
    expect(prompt).toContain("#200");
  });
});

describe("board config", () => {
  test("BOARD_CONFIG has all status options", () => {
    expect(BOARD_CONFIG.statusOptions).toHaveProperty("backlog");
    expect(BOARD_CONFIG.statusOptions).toHaveProperty("next");
    expect(BOARD_CONFIG.statusOptions).toHaveProperty("inProgress");
    expect(BOARD_CONFIG.statusOptions).toHaveProperty("blocked");
    expect(BOARD_CONFIG.statusOptions).toHaveProperty("done");
  });

  test("BOARD_CONFIG has project ID", () => {
    expect(BOARD_CONFIG.projectId).toBeTruthy();
    expect(BOARD_CONFIG.statusFieldId).toBeTruthy();
  });
});
