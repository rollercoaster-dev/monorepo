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
});
