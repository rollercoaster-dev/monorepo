import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { checkpoint } from "./checkpoint";
import { closeDatabase, resetDatabase, getDatabase } from "./db/sqlite";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

const TEST_DB = ".claude/test-execution-state.db";

describe("checkpoint", () => {
  beforeEach(async () => {
    // Ensure .claude directory exists
    if (!existsSync(".claude")) {
      await mkdir(".claude", { recursive: true });
    }
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    try {
      await unlink(TEST_DB);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("create", () => {
    test("creates a new workflow", () => {
      const workflow = checkpoint.create(123, "feat/test-branch");

      expect(workflow.id).toMatch(/^workflow-123-\d+$/);
      expect(workflow.issueNumber).toBe(123);
      expect(workflow.branch).toBe("feat/test-branch");
      expect(workflow.phase).toBe("research");
      expect(workflow.status).toBe("running");
      expect(workflow.retryCount).toBe(0);
    });

    test("creates workflow with worktree", () => {
      const workflow = checkpoint.create(456, "feat/test", "/path/to/worktree");

      expect(workflow.worktree).toBe("/path/to/worktree");
    });
  });

  describe("save and load", () => {
    test("saves and loads workflow state", () => {
      const workflow = checkpoint.create(123, "feat/test");
      workflow.phase = "implement";
      workflow.status = "paused";
      workflow.retryCount = 2;

      checkpoint.save(workflow);

      const loaded = checkpoint.load(workflow.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.workflow.phase).toBe("implement");
      expect(loaded!.workflow.status).toBe("paused");
      expect(loaded!.workflow.retryCount).toBe(2);
    });

    test("returns null for non-existent workflow", () => {
      const loaded = checkpoint.load("non-existent-id");
      expect(loaded).toBeNull();
    });
  });

  describe("findByIssue", () => {
    test("finds most recent workflow for issue", () => {
      checkpoint.create(123, "feat/first");
      const second = checkpoint.create(123, "feat/second");

      const found = checkpoint.findByIssue(123);
      expect(found).not.toBeNull();
      expect(found!.workflow.id).toBe(second.id);
    });

    test("returns null for unknown issue", () => {
      const found = checkpoint.findByIssue(999);
      expect(found).toBeNull();
    });
  });

  describe("logAction", () => {
    test("logs actions to workflow", () => {
      const workflow = checkpoint.create(123, "feat/test");

      checkpoint.logAction(workflow.id, "spawned researcher", "success");
      checkpoint.logAction(workflow.id, "created plan", "success", {
        planFile: "issue-123.md",
      });

      const loaded = checkpoint.load(workflow.id);
      expect(loaded!.actions).toHaveLength(2);
      expect(loaded!.actions[0].action).toBe("spawned researcher");
      expect(loaded!.actions[1].metadata).toEqual({
        planFile: "issue-123.md",
      });
    });
  });

  describe("logCommit", () => {
    test("logs commits to workflow", () => {
      const workflow = checkpoint.create(123, "feat/test");

      checkpoint.logCommit(workflow.id, "abc123", "feat: add feature");
      checkpoint.logCommit(workflow.id, "def456", "test: add tests");

      const loaded = checkpoint.load(workflow.id);
      expect(loaded!.commits).toHaveLength(2);
      expect(loaded!.commits[0].sha).toBe("abc123");
      expect(loaded!.commits[1].sha).toBe("def456");
    });
  });

  describe("setPhase", () => {
    test("updates workflow phase", () => {
      const workflow = checkpoint.create(123, "feat/test");

      checkpoint.setPhase(workflow.id, "review");

      const loaded = checkpoint.load(workflow.id);
      expect(loaded!.workflow.phase).toBe("review");
    });
  });

  describe("setStatus", () => {
    test("updates workflow status", () => {
      const workflow = checkpoint.create(123, "feat/test");

      checkpoint.setStatus(workflow.id, "completed");

      const loaded = checkpoint.load(workflow.id);
      expect(loaded!.workflow.status).toBe("completed");
    });
  });

  describe("incrementRetry", () => {
    test("increments and returns retry count", () => {
      const workflow = checkpoint.create(123, "feat/test");

      const count1 = checkpoint.incrementRetry(workflow.id);
      const count2 = checkpoint.incrementRetry(workflow.id);

      expect(count1).toBe(1);
      expect(count2).toBe(2);
    });
  });

  describe("listActive", () => {
    test("lists only active workflows", () => {
      const w1 = checkpoint.create(1, "feat/one");
      const w2 = checkpoint.create(2, "feat/two");
      checkpoint.create(3, "feat/three");

      checkpoint.setStatus(w1.id, "completed");
      checkpoint.setStatus(w2.id, "paused");

      const active = checkpoint.listActive();
      expect(active).toHaveLength(2); // paused + running
      expect(active.map((w) => w.status)).toContain("paused");
      expect(active.map((w) => w.status)).toContain("running");
    });
  });

  describe("delete", () => {
    test("deletes workflow and cascades to actions/commits", () => {
      const workflow = checkpoint.create(123, "feat/test");
      checkpoint.logAction(workflow.id, "test action", "success");
      checkpoint.logCommit(workflow.id, "abc", "test commit");

      checkpoint.delete(workflow.id);

      const loaded = checkpoint.load(workflow.id);
      expect(loaded).toBeNull();
    });

    test("silently succeeds for non-existent workflow (idempotent)", () => {
      expect(() => checkpoint.delete("non-existent-id")).not.toThrow();
    });
  });

  describe("error handling", () => {
    test("save throws for non-existent workflow", () => {
      const fakeWorkflow = {
        id: "non-existent-id",
        issueNumber: 999,
        branch: "fake-branch",
        worktree: null,
        phase: "research" as const,
        status: "running" as const,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => checkpoint.save(fakeWorkflow)).toThrow(
        /No workflow found with ID/,
      );
    });

    test("setPhase throws for non-existent workflow", () => {
      expect(() => checkpoint.setPhase("non-existent-id", "review")).toThrow(
        /No workflow found with ID/,
      );
    });

    test("setStatus throws for non-existent workflow", () => {
      expect(() =>
        checkpoint.setStatus("non-existent-id", "completed"),
      ).toThrow(/No workflow found with ID/);
    });

    test("incrementRetry throws for non-existent workflow", () => {
      expect(() => checkpoint.incrementRetry("non-existent-id")).toThrow(
        /No workflow found with ID/,
      );
    });

    test("logAction throws for non-existent workflow", () => {
      expect(() =>
        checkpoint.logAction("non-existent-id", "test", "success"),
      ).toThrow(/No workflow found with ID/);
    });

    test("logCommit throws for non-existent workflow", () => {
      expect(() =>
        checkpoint.logCommit("non-existent-id", "abc123", "test"),
      ).toThrow(/No workflow found with ID/);
    });

    test("getDatabase throws on path mismatch", () => {
      // Database is already initialized with TEST_DB from beforeEach
      expect(() => getDatabase(".claude/different-db.db")).toThrow(
        /Database already initialized with path/,
      );
    });
  });

  describe("milestone API", () => {
    test("createMilestone creates a new milestone", () => {
      const milestone = checkpoint.createMilestone("OB3 Phase 1");

      expect(milestone.id).toMatch(/^milestone-ob3-phase-1-\d+$/);
      expect(milestone.name).toBe("OB3 Phase 1");
      expect(milestone.githubMilestoneNumber).toBeNull();
      expect(milestone.phase).toBe("planning");
      expect(milestone.status).toBe("running");
    });

    test("createMilestone with GitHub milestone number", () => {
      const milestone = checkpoint.createMilestone("OB3 Phase 1", 14);

      expect(milestone.githubMilestoneNumber).toBe(14);
    });

    test("getMilestone loads complete checkpoint data", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");

      // Save baseline
      checkpoint.saveBaseline(milestone.id, {
        capturedAt: new Date().toISOString(),
        lintExitCode: 0,
        lintWarnings: 5,
        lintErrors: 0,
        typecheckExitCode: 0,
        typecheckErrors: 2,
      });

      // Link workflows
      const w1 = checkpoint.create(111, "feat/issue-111");
      const w2 = checkpoint.create(112, "feat/issue-112");
      checkpoint.linkWorkflowToMilestone(w1.id, milestone.id, 1);
      checkpoint.linkWorkflowToMilestone(w2.id, milestone.id, 2);

      const data = checkpoint.getMilestone(milestone.id);

      expect(data).not.toBeNull();
      expect(data!.milestone.id).toBe(milestone.id);
      expect(data!.baseline).not.toBeNull();
      expect(data!.baseline!.lintWarnings).toBe(5);
      expect(data!.baseline!.typecheckErrors).toBe(2);
      expect(data!.workflows).toHaveLength(2);
      expect(data!.workflows[0].issueNumber).toBe(111);
      expect(data!.workflows[1].issueNumber).toBe(112);
    });

    test("getMilestone returns null for non-existent milestone", () => {
      const data = checkpoint.getMilestone("non-existent-id");
      expect(data).toBeNull();
    });

    test("findMilestoneByName finds most recent milestone", () => {
      checkpoint.createMilestone("Test Milestone");
      const second = checkpoint.createMilestone("Test Milestone");

      const data = checkpoint.findMilestoneByName("Test Milestone");

      expect(data).not.toBeNull();
      expect(data!.milestone.id).toBe(second.id);
    });

    test("findMilestoneByName returns null for unknown milestone", () => {
      const data = checkpoint.findMilestoneByName("Unknown Milestone");
      expect(data).toBeNull();
    });

    test("setMilestonePhase updates phase", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");

      checkpoint.setMilestonePhase(milestone.id, "execute");

      const data = checkpoint.getMilestone(milestone.id);
      expect(data!.milestone.phase).toBe("execute");
    });

    test("setMilestonePhase throws for non-existent milestone", () => {
      expect(() =>
        checkpoint.setMilestonePhase("non-existent-id", "execute"),
      ).toThrow(/No milestone found with ID/);
    });

    test("setMilestoneStatus updates status", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");

      checkpoint.setMilestoneStatus(milestone.id, "completed");

      const data = checkpoint.getMilestone(milestone.id);
      expect(data!.milestone.status).toBe("completed");
    });

    test("setMilestoneStatus throws for non-existent milestone", () => {
      expect(() =>
        checkpoint.setMilestoneStatus("non-existent-id", "completed"),
      ).toThrow(/No milestone found with ID/);
    });

    test("saveBaseline stores baseline data", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");

      checkpoint.saveBaseline(milestone.id, {
        capturedAt: new Date().toISOString(),
        lintExitCode: 0,
        lintWarnings: 10,
        lintErrors: 2,
        typecheckExitCode: 1,
        typecheckErrors: 5,
      });

      const data = checkpoint.getMilestone(milestone.id);

      expect(data!.baseline).not.toBeNull();
      expect(data!.baseline!.lintWarnings).toBe(10);
      expect(data!.baseline!.lintErrors).toBe(2);
      expect(data!.baseline!.typecheckExitCode).toBe(1);
      expect(data!.baseline!.typecheckErrors).toBe(5);
    });

    test("saveBaseline replaces existing baseline (upsert)", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");

      // Save first baseline
      checkpoint.saveBaseline(milestone.id, {
        capturedAt: new Date().toISOString(),
        lintExitCode: 0,
        lintWarnings: 5,
        lintErrors: 0,
        typecheckExitCode: 0,
        typecheckErrors: 2,
      });

      // Save second baseline (should replace)
      checkpoint.saveBaseline(milestone.id, {
        capturedAt: new Date().toISOString(),
        lintExitCode: 1,
        lintWarnings: 10,
        lintErrors: 3,
        typecheckExitCode: 1,
        typecheckErrors: 7,
      });

      const data = checkpoint.getMilestone(milestone.id);

      // Should only have one baseline with new values
      expect(data!.baseline).not.toBeNull();
      expect(data!.baseline!.lintWarnings).toBe(10);
      expect(data!.baseline!.lintErrors).toBe(3);
      expect(data!.baseline!.typecheckErrors).toBe(7);
    });

    test("saveBaseline throws for non-existent milestone", () => {
      expect(() =>
        checkpoint.saveBaseline("non-existent-id", {
          capturedAt: new Date().toISOString(),
          lintExitCode: 0,
          lintWarnings: 0,
          lintErrors: 0,
          typecheckExitCode: 0,
          typecheckErrors: 0,
        }),
      ).toThrow(/No milestone found with ID/);
    });

    test("linkWorkflowToMilestone creates junction", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");
      const workflow = checkpoint.create(123, "feat/test");

      checkpoint.linkWorkflowToMilestone(workflow.id, milestone.id, 1);

      const data = checkpoint.getMilestone(milestone.id);
      expect(data!.workflows).toHaveLength(1);
      expect(data!.workflows[0].id).toBe(workflow.id);
    });

    test("linkWorkflowToMilestone throws for non-existent workflow", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");

      expect(() =>
        checkpoint.linkWorkflowToMilestone(
          "non-existent-workflow",
          milestone.id,
        ),
      ).toThrow(/Either workflow .* or milestone .* does not exist/);
    });

    test("linkWorkflowToMilestone throws for non-existent milestone", () => {
      const workflow = checkpoint.create(123, "feat/test");

      expect(() =>
        checkpoint.linkWorkflowToMilestone(
          workflow.id,
          "non-existent-milestone",
        ),
      ).toThrow(/Either workflow .* or milestone .* does not exist/);
    });

    test("listMilestoneWorkflows returns workflows ordered by wave", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");

      const w1 = checkpoint.create(111, "feat/issue-111");
      const w2 = checkpoint.create(112, "feat/issue-112");
      const w3 = checkpoint.create(113, "feat/issue-113");

      // Link in non-sequential order
      checkpoint.linkWorkflowToMilestone(w2.id, milestone.id, 2);
      checkpoint.linkWorkflowToMilestone(w1.id, milestone.id, 1);
      checkpoint.linkWorkflowToMilestone(w3.id, milestone.id, 3);

      const workflows = checkpoint.listMilestoneWorkflows(milestone.id);

      // Should be ordered by wave number
      expect(workflows).toHaveLength(3);
      expect(workflows[0].issueNumber).toBe(111);
      expect(workflows[1].issueNumber).toBe(112);
      expect(workflows[2].issueNumber).toBe(113);
    });

    test("listActiveMilestones filters by status", () => {
      const m1 = checkpoint.createMilestone("Milestone 1");
      const m2 = checkpoint.createMilestone("Milestone 2");
      checkpoint.createMilestone("Milestone 3");

      checkpoint.setMilestoneStatus(m1.id, "completed");
      checkpoint.setMilestoneStatus(m2.id, "paused");

      const active = checkpoint.listActiveMilestones();

      // Should only have paused + running (not completed)
      expect(active).toHaveLength(2);
      expect(active.map((m) => m.status)).toContain("paused");
      expect(active.map((m) => m.status)).toContain("running");
    });

    test("deleteMilestone cascades to baselines and workflows", () => {
      const milestone = checkpoint.createMilestone("Test Milestone");

      // Add baseline and workflows
      checkpoint.saveBaseline(milestone.id, {
        capturedAt: new Date().toISOString(),
        lintExitCode: 0,
        lintWarnings: 0,
        lintErrors: 0,
        typecheckExitCode: 0,
        typecheckErrors: 0,
      });

      const workflow = checkpoint.create(123, "feat/test");
      checkpoint.linkWorkflowToMilestone(workflow.id, milestone.id);

      checkpoint.deleteMilestone(milestone.id);

      // Milestone should be gone
      const data = checkpoint.getMilestone(milestone.id);
      expect(data).toBeNull();

      // Workflow should still exist (only junction deleted)
      const workflowData = checkpoint.load(workflow.id);
      expect(workflowData).not.toBeNull();
    });

    test("deleteMilestone silently succeeds for non-existent milestone (idempotent)", () => {
      expect(() => checkpoint.deleteMilestone("non-existent-id")).not.toThrow();
    });

    test("full milestone workflow integration", () => {
      // Create milestone
      const milestone = checkpoint.createMilestone("OB3 Phase 1", 14);
      expect(milestone.phase).toBe("planning");

      // Save baseline
      checkpoint.saveBaseline(milestone.id, {
        capturedAt: new Date().toISOString(),
        lintExitCode: 0,
        lintWarnings: 3,
        lintErrors: 0,
        typecheckExitCode: 0,
        typecheckErrors: 1,
      });

      // Create and link workflows
      const w1 = checkpoint.create(111, "feat/issue-111", "/path/worktree-111");
      const w2 = checkpoint.create(112, "feat/issue-112", "/path/worktree-112");
      const w3 = checkpoint.create(113, "feat/issue-113", "/path/worktree-113");

      checkpoint.linkWorkflowToMilestone(w1.id, milestone.id, 1);
      checkpoint.linkWorkflowToMilestone(w2.id, milestone.id, 1);
      checkpoint.linkWorkflowToMilestone(w3.id, milestone.id, 2);

      // Update milestone phase
      checkpoint.setMilestonePhase(milestone.id, "execute");

      // Get complete checkpoint data
      const data = checkpoint.getMilestone(milestone.id);

      expect(data).not.toBeNull();
      expect(data!.milestone.phase).toBe("execute");
      expect(data!.milestone.githubMilestoneNumber).toBe(14);
      expect(data!.baseline).not.toBeNull();
      expect(data!.baseline!.lintWarnings).toBe(3);
      expect(data!.workflows).toHaveLength(3);

      // Wave 1 workflows should come first
      expect(data!.workflows[0].issueNumber).toBe(111);
      expect(data!.workflows[1].issueNumber).toBe(112);
      expect(data!.workflows[2].issueNumber).toBe(113);

      // List milestone workflows
      const workflows = checkpoint.listMilestoneWorkflows(milestone.id);
      expect(workflows).toHaveLength(3);

      // Delete milestone
      checkpoint.deleteMilestone(milestone.id);
      expect(checkpoint.getMilestone(milestone.id)).toBeNull();

      // Workflows should still exist
      expect(checkpoint.load(w1.id)).not.toBeNull();
      expect(checkpoint.load(w2.id)).not.toBeNull();
      expect(checkpoint.load(w3.id)).not.toBeNull();
    });
  });
});
