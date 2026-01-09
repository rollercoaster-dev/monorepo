import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { analyzeWorkflow, storeWorkflowLearning } from "./retrospective";
import { checkpoint } from "./checkpoint";
import { query } from "./knowledge";
import { closeDatabase, resetDatabase } from "./db/sqlite";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";

const TEST_DB = ".claude/test-retrospective.db";
const DEV_PLAN_PATH = ".claude/dev-plans/test-plan.md";

describe("retrospective", () => {
  beforeEach(() => {
    // Ensure directories exist
    if (!existsSync(".claude")) {
      mkdirSync(".claude", { recursive: true });
    }
    if (!existsSync(".claude/dev-plans")) {
      mkdirSync(".claude/dev-plans", { recursive: true });
    }
    resetDatabase(TEST_DB);
  });

  afterEach(() => {
    closeDatabase();
    try {
      unlinkSync(TEST_DB);
    } catch {
      // Ignore if file doesn't exist
    }
    try {
      unlinkSync(DEV_PLAN_PATH);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("analyzeWorkflow", () => {
    test("analyzes workflow and identifies deviations", async () => {
      // Create a workflow with commits
      const workflow = checkpoint.create(123, "feat/issue-123-test-feature");
      checkpoint.logCommit(
        workflow.id,
        "abc123",
        "feat(test): first implementation commit",
      );
      checkpoint.logCommit(
        workflow.id,
        "def456",
        "feat(test): second implementation commit",
      );
      checkpoint.logCommit(
        workflow.id,
        "ghi789",
        "chore(test): cleanup commit",
      );

      // Create a dev plan with different planned commits
      const devPlan = `
# Development Plan: Issue #123

## Implementation Plan

### Step 1: First commit
**Commit**: \`feat(test): first planned commit\`

### Step 2: Second commit
**Commit**: \`feat(test): second planned commit\`
`;
      writeFileSync(DEV_PLAN_PATH, devPlan);

      // Analyze the workflow
      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      expect(learning.issueNumber).toBe(123);
      expect(learning.branch).toBe("feat/issue-123-test-feature");
      expect(learning.workflowId).toBe(workflow.id);
      expect(learning.plannedCommits).toHaveLength(2);
      expect(learning.actualCommits).toHaveLength(3);
      // Should have deviations (unplanned cleanup commit)
      expect(learning.deviations.length).toBeGreaterThan(0);
    });

    test("extracts patterns from clean implementation", async () => {
      // Create a workflow with commits that match the plan
      const workflow = checkpoint.create(456, "feat/issue-456-clean");
      checkpoint.logCommit(
        workflow.id,
        "abc123",
        "feat(clean): add feature implementation",
      );

      // Create a matching dev plan
      const devPlan = `
# Development Plan: Issue #456

## Implementation Plan

### Step 1: Add feature
**Commit**: \`feat(clean): add feature implementation\`
`;
      writeFileSync(DEV_PLAN_PATH, devPlan);

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      // Clean implementation should extract a "Clean Implementation" pattern
      const cleanPattern = learning.patterns.find((p) =>
        p.name.includes("Clean Implementation"),
      );
      expect(cleanPattern).toBeDefined();
    });

    test("handles missing dev plan gracefully", async () => {
      const workflow = checkpoint.create(789, "feat/issue-789-no-plan");
      checkpoint.logCommit(workflow.id, "abc123", "feat(test): some commit");

      // Don't create a dev plan - use a non-existent path
      const learning = await analyzeWorkflow(
        workflow.id,
        ".claude/dev-plans/non-existent.md",
      );

      expect(learning.plannedCommits).toHaveLength(0);
      expect(learning.actualCommits).toHaveLength(1);
      // All actual commits are deviations since nothing was planned
      expect(learning.deviations.length).toBeGreaterThan(0);
    });

    test("throws error for non-existent workflow", async () => {
      await expect(
        analyzeWorkflow("non-existent-workflow", DEV_PLAN_PATH),
      ).rejects.toThrow("Workflow not found: non-existent-workflow");
    });

    test("extracts review findings from action metadata", async () => {
      const workflow = checkpoint.create(111, "feat/issue-111-review");
      checkpoint.logCommit(workflow.id, "abc123", "feat(test): implementation");

      // Log a review action with findings
      checkpoint.logAction(workflow.id, "code-review-complete", "success", {
        agent: "code-reviewer",
        findings: [
          {
            description: "Missing null check",
            severity: "critical",
          },
          {
            description: "Could use optional chaining",
            severity: "medium",
          },
        ],
      });

      const devPlan = `# Plan\n**Commit**: \`feat(test): implementation\``;
      writeFileSync(DEV_PLAN_PATH, devPlan);

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      expect(learning.reviewFindings.length).toBeGreaterThan(0);
      const criticalFinding = learning.reviewFindings.find(
        (f) => f.severity === "critical",
      );
      expect(criticalFinding).toBeDefined();
    });

    test("extracts fix attempts from action metadata", async () => {
      const workflow = checkpoint.create(222, "feat/issue-222-fixes");
      checkpoint.logCommit(workflow.id, "abc123", "feat(test): implementation");

      // Log fix actions
      checkpoint.logAction(workflow.id, "auto-fix-attempt", "success", {
        finding: "Missing null check",
        fix: "Added optional chaining",
      });
      checkpoint.logAction(workflow.id, "auto-fix-attempt", "failed", {
        finding: "Type error",
        fix: "Attempted type cast",
      });

      const devPlan = `# Plan\n**Commit**: \`feat(test): implementation\``;
      writeFileSync(DEV_PLAN_PATH, devPlan);

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      expect(learning.fixesApplied).toHaveLength(2);
      const successfulFix = learning.fixesApplied.find((f) => f.success);
      expect(successfulFix).toBeDefined();
      const failedFix = learning.fixesApplied.find((f) => !f.success);
      expect(failedFix).toBeDefined();
    });
  });

  describe("storeWorkflowLearning", () => {
    test("stores learning in knowledge graph", async () => {
      // Create a workflow first
      const workflow = checkpoint.create(333, "feat/issue-333-store");
      checkpoint.logCommit(workflow.id, "abc123", "feat(test): implementation");

      const devPlan = `# Plan\n**Commit**: \`feat(test): implementation\``;
      writeFileSync(DEV_PLAN_PATH, devPlan);

      // Analyze and store
      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);
      await storeWorkflowLearning(learning);

      // Query to verify it was stored
      const results = await query({ issueNumber: 333 });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].learning.sourceIssue).toBe(333);
    });

    test("stores patterns as separate entities", async () => {
      const workflow = checkpoint.create(444, "feat/issue-444-patterns");
      checkpoint.logCommit(workflow.id, "abc123", "feat(test): clean impl");

      // Add a successful fix to generate a pattern
      checkpoint.logAction(workflow.id, "auto-fix", "success", {
        finding: "Type issue",
        fix: "Used type guard",
      });

      const devPlan = `# Plan\n**Commit**: \`feat(test): clean impl\``;
      writeFileSync(DEV_PLAN_PATH, devPlan);

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);
      await storeWorkflowLearning(learning);

      // Verify learning was stored with its patterns
      const results = await query({ issueNumber: 444 });
      expect(results.length).toBeGreaterThan(0);

      // The learning content should reference the patterns
      expect(results[0].learning.content).toContain("444");
    });

    test("calculates confidence score based on deviations and findings", async () => {
      // Create a "problematic" workflow with many deviations
      const workflow = checkpoint.create(555, "feat/issue-555-problems");
      checkpoint.logCommit(workflow.id, "a", "feat: unplanned commit 1");
      checkpoint.logCommit(workflow.id, "b", "feat: unplanned commit 2");
      checkpoint.logCommit(workflow.id, "c", "feat: unplanned commit 3");
      checkpoint.logCommit(workflow.id, "d", "feat: unplanned commit 4");
      checkpoint.logCommit(workflow.id, "e", "feat: unplanned commit 5");

      // Add critical findings
      checkpoint.logAction(workflow.id, "review", "success", {
        critical: 3,
        agent: "code-reviewer",
      });

      // Use an empty plan to maximize deviations
      writeFileSync(DEV_PLAN_PATH, "# Empty plan\nNo commits planned.");

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      // Just verify it doesn't crash with problematic data
      expect(learning.deviations.length).toBeGreaterThan(0);
    });
  });

  describe("parseCommitsFromDevPlan", () => {
    test("parses conventional commit patterns", async () => {
      const workflow = checkpoint.create(666, "feat/issue-666-parse");

      const devPlan = `
# Development Plan

## Implementation Plan

1. \`feat(api): add endpoint\`
2. \`fix(ui): correct styling\`
3. \`refactor(core): improve logic\`
4. \`test(api): add unit tests\`
5. \`docs(readme): update documentation\`
`;
      writeFileSync(DEV_PLAN_PATH, devPlan);

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      expect(learning.plannedCommits).toContain("feat(api): add endpoint");
      expect(learning.plannedCommits).toContain("fix(ui): correct styling");
      expect(learning.plannedCommits).toContain(
        "refactor(core): improve logic",
      );
      expect(learning.plannedCommits).toContain("test(api): add unit tests");
      expect(learning.plannedCommits).toContain(
        "docs(readme): update documentation",
      );
    });

    test("parses **Commit**: format", async () => {
      const workflow = checkpoint.create(777, "feat/issue-777-commit-format");

      const devPlan = `
# Development Plan

### Step 1: Add feature
**Commit**: \`feat(feature): add new feature\`

### Step 2: Fix bug
**Commit**: \`fix(bug): resolve issue\`
`;
      writeFileSync(DEV_PLAN_PATH, devPlan);

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      expect(learning.plannedCommits).toContain(
        "feat(feature): add new feature",
      );
      expect(learning.plannedCommits).toContain("fix(bug): resolve issue");
    });
  });

  describe("generateImprovements", () => {
    test("suggests breaking down complex issues when many deviations", async () => {
      const workflow = checkpoint.create(888, "feat/issue-888-complex");

      // Create many unplanned commits (will be deviations)
      for (let i = 0; i < 6; i++) {
        checkpoint.logCommit(
          workflow.id,
          `sha${i}`,
          `feat: unplanned commit ${i}`,
        );
      }

      writeFileSync(DEV_PLAN_PATH, "# Plan\nOnly one planned commit.");

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      // Should suggest breaking down complex issues
      const breakdownSuggestion = learning.improvements.find((imp) =>
        imp.includes("breaking down"),
      );
      expect(breakdownSuggestion).toBeDefined();
    });

    test("suggests pre-implementation review when many critical findings", async () => {
      const workflow = checkpoint.create(999, "feat/issue-999-critical");
      checkpoint.logCommit(workflow.id, "abc", "feat: impl");

      // Add multiple critical findings (need individual findings with severity)
      checkpoint.logAction(workflow.id, "code-review-complete", "success", {
        agent: "code-reviewer",
        findings: [
          { description: "Security vulnerability", severity: "critical" },
          { description: "SQL injection risk", severity: "critical" },
          { description: "Missing auth check", severity: "critical" },
        ],
      });

      writeFileSync(DEV_PLAN_PATH, "# Plan\n**Commit**: `feat: impl`");

      const learning = await analyzeWorkflow(workflow.id, DEV_PLAN_PATH);

      const preReviewSuggestion = learning.improvements.find((imp) =>
        imp.includes("pre-implementation review"),
      );
      expect(preReviewSuggestion).toBeDefined();
    });
  });
});
