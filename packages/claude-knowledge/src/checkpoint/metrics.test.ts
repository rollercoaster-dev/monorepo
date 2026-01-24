import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { metrics } from "./metrics";
import { workflow } from "./workflow";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

const TEST_DB = ".claude/test-metrics.db";

describe("determineQuerySource", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    // Ensure .claude directory exists
    if (!existsSync(".claude")) {
      await mkdir(".claude", { recursive: true });
    }
    resetDatabase(TEST_DB);
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    // Restore original env
    process.env = originalEnv;
    closeDatabase();
    try {
      await unlink(TEST_DB);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  test("returns 'cli' when no env vars set", () => {
    delete process.env.CLAUDE_AGENT_NAME;
    delete process.env.CLAUDE_SKILL_NAME;
    delete process.env.GIT_HOOK_NAME;

    expect(metrics.determineQuerySource()).toBe("cli");
  });

  test("returns 'agent:{name}' when CLAUDE_AGENT_NAME set", () => {
    process.env.CLAUDE_AGENT_NAME = "atomic-developer";
    delete process.env.CLAUDE_SKILL_NAME;
    delete process.env.GIT_HOOK_NAME;

    expect(metrics.determineQuerySource()).toBe("agent:atomic-developer");
  });

  test("returns 'skill:{name}' when CLAUDE_SKILL_NAME set", () => {
    delete process.env.CLAUDE_AGENT_NAME;
    process.env.CLAUDE_SKILL_NAME = "graph-query";
    delete process.env.GIT_HOOK_NAME;

    expect(metrics.determineQuerySource()).toBe("skill:graph-query");
  });

  test("returns 'hook:{name}' when GIT_HOOK_NAME set", () => {
    delete process.env.CLAUDE_AGENT_NAME;
    delete process.env.CLAUDE_SKILL_NAME;
    process.env.GIT_HOOK_NAME = "pre-commit";

    expect(metrics.determineQuerySource()).toBe("hook:pre-commit");
  });

  test("prioritizes agent over skill over hook", () => {
    process.env.CLAUDE_AGENT_NAME = "atomic-developer";
    process.env.CLAUDE_SKILL_NAME = "graph-query";
    process.env.GIT_HOOK_NAME = "pre-commit";

    expect(metrics.determineQuerySource()).toBe("agent:atomic-developer");

    delete process.env.CLAUDE_AGENT_NAME;
    expect(metrics.determineQuerySource()).toBe("skill:graph-query");

    delete process.env.CLAUDE_SKILL_NAME;
    expect(metrics.determineQuerySource()).toBe("hook:pre-commit");
  });
});

describe("logGraphQuery", () => {
  beforeEach(async () => {
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

  test("succeeds without session ID and persists data", () => {
    metrics.logGraphQuery({
      source: "cli",
      queryType: "what-calls",
      queryParams: JSON.stringify({ name: "parsePackage" }),
      resultCount: 5,
      durationMs: 42,
    });

    const queries = metrics.getGraphQueries();
    expect(queries).toHaveLength(1);
    expect(queries[0].source).toBe("cli");
    expect(queries[0].queryType).toBe("what-calls");
    expect(queries[0].resultCount).toBe(5);
    expect(queries[0].durationMs).toBe(42);
  });

  test("succeeds with all optional fields and persists data", () => {
    metrics.logGraphQuery({
      source: "agent:atomic-developer",
      sessionId: "test-session-123",
      workflowId: "workflow-456",
      queryType: "blast-radius",
      queryParams: JSON.stringify({ file: "src/graph/query.ts" }),
      resultCount: 10,
      durationMs: 87,
    });

    const queries = metrics.getGraphQueries();
    expect(queries).toHaveLength(1);
    expect(queries[0].source).toBe("agent:atomic-developer");
    expect(queries[0].sessionId).toBe("test-session-123");
    expect(queries[0].workflowId).toBe("workflow-456");
    expect(queries[0].queryType).toBe("blast-radius");
    expect(queries[0].resultCount).toBe(10);
    expect(queries[0].durationMs).toBe(87);
  });

  test("filters by source", () => {
    metrics.logGraphQuery({
      source: "cli",
      queryType: "what-calls",
      queryParams: JSON.stringify({ name: "foo" }),
      resultCount: 1,
      durationMs: 10,
    });

    metrics.logGraphQuery({
      source: "agent:test-agent",
      queryType: "find",
      queryParams: JSON.stringify({ name: "bar" }),
      resultCount: 2,
      durationMs: 20,
    });

    const cliQueries = metrics.getGraphQueries({ source: "cli" });
    expect(cliQueries).toHaveLength(1);
    expect(cliQueries[0].source).toBe("cli");

    const agentQueries = metrics.getGraphQueries({
      source: "agent:test-agent",
    });
    expect(agentQueries).toHaveLength(1);
    expect(agentQueries[0].source).toBe("agent:test-agent");
  });

  test("filters by queryType", () => {
    metrics.logGraphQuery({
      source: "cli",
      queryType: "what-calls",
      queryParams: JSON.stringify({ name: "foo" }),
      resultCount: 1,
      durationMs: 10,
    });

    metrics.logGraphQuery({
      source: "cli",
      queryType: "blast-radius",
      queryParams: JSON.stringify({ file: "test.ts" }),
      resultCount: 5,
      durationMs: 30,
    });

    const whatCallsQueries = metrics.getGraphQueries({
      queryType: "what-calls",
    });
    expect(whatCallsQueries).toHaveLength(1);
    expect(whatCallsQueries[0].queryType).toBe("what-calls");

    const blastRadiusQueries = metrics.getGraphQueries({
      queryType: "blast-radius",
    });
    expect(blastRadiusQueries).toHaveLength(1);
    expect(blastRadiusQueries[0].queryType).toBe("blast-radius");
  });
});

describe("getGraphQuerySummary", () => {
  beforeEach(async () => {
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

  test("includes queriesBySource in summary", () => {
    metrics.logGraphQuery({
      source: "cli",
      queryType: "what-calls",
      queryParams: JSON.stringify({ name: "foo" }),
      resultCount: 1,
      durationMs: 10,
    });

    metrics.logGraphQuery({
      source: "agent:test-agent",
      queryType: "find",
      queryParams: JSON.stringify({ name: "bar" }),
      resultCount: 2,
      durationMs: 20,
    });

    const summary = metrics.getGraphQuerySummary();

    expect(summary).toHaveProperty("queriesBySource");
    expect(typeof summary.queriesBySource).toBe("object");
    expect(summary.queriesBySource.cli).toBe(1);
    expect(summary.queriesBySource["agent:test-agent"]).toBe(1);
  });
});

// ============================================================================
// Task Hierarchy Tests (Issue #580)
// ============================================================================

describe("Task Hierarchy", () => {
  // Helper to create a workflow for foreign key constraint satisfaction
  const createTestWorkflow = (workflowId: string) => {
    // Extract issue number from workflow ID or use a default
    const issueNumber =
      parseInt(workflowId.replace(/\D/g, ""), 10) || Date.now();
    return workflow.create(issueNumber, `test-branch-${issueNumber}`);
  };

  beforeEach(async () => {
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

  describe("logTaskSnapshot with parentTaskId", () => {
    test("logs task with parent", () => {
      // Create workflow first (for foreign key)
      const wf = createTestWorkflow("workflow-1");

      // Log parent task first
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "parent-task-1",
        "Gate 3: Implement #123",
        "in_progress",
        undefined,
        undefined,
      );

      // Log child task with parent
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-task-1",
        "Commit 1: Add types",
        "completed",
        undefined,
        "parent-task-1",
      );

      const snapshots = metrics.getTaskSnapshots(wf.id);
      expect(snapshots).toHaveLength(2);

      const childSnapshot = snapshots.find((s) => s.taskId === "child-task-1");
      expect(childSnapshot).toBeDefined();
      expect(childSnapshot?.parentTaskId).toBe("parent-task-1");
    });
  });

  describe("getChildTasks", () => {
    test("returns children for a parent task", () => {
      const wf = createTestWorkflow("workflow-2");

      // Log parent
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "parent-task-1",
        "Gate 3: Implement",
        "in_progress",
      );

      // Log children
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-task-1",
        "Commit 1",
        "completed",
        undefined,
        "parent-task-1",
      );

      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-task-2",
        "Commit 2",
        "in_progress",
        undefined,
        "parent-task-1",
      );

      const children = metrics.getChildTasks("parent-task-1");
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.taskId)).toContain("child-task-1");
      expect(children.map((c) => c.taskId)).toContain("child-task-2");
    });

    test("returns empty array when no children", () => {
      const wf = createTestWorkflow("workflow-3");

      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "task-without-children",
        "Lone task",
        "completed",
      );

      const children = metrics.getChildTasks("task-without-children");
      expect(children).toHaveLength(0);
    });

    test("returns most recent snapshot for each child", () => {
      const wf = createTestWorkflow("workflow-4");

      // Log parent
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "parent-task-1",
        "Parent",
        "in_progress",
      );

      // Log child - first snapshot (pending)
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-task-1",
        "Child",
        "pending",
        undefined,
        "parent-task-1",
      );

      // Log child - second snapshot (completed)
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-task-1",
        "Child",
        "completed",
        undefined,
        "parent-task-1",
      );

      const children = metrics.getChildTasks("parent-task-1");
      expect(children).toHaveLength(1);
      expect(children[0].taskStatus).toBe("completed");
    });
  });

  describe("getTaskProgress", () => {
    test("returns progress for leaf task", () => {
      const wf = createTestWorkflow("workflow-5");

      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "leaf-task",
        "Simple task",
        "completed",
      );

      const progress = metrics.getTaskProgress("leaf-task");
      expect(progress.total).toBe(1);
      expect(progress.completed).toBe(1);
      expect(progress.inProgress).toBe(0);
      expect(progress.pending).toBe(0);
      expect(progress.percentage).toBe(100);
    });

    test("aggregates progress from children", () => {
      const wf = createTestWorkflow("workflow-6");

      // Parent task
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "parent-task",
        "Implementation",
        "in_progress",
      );

      // Child 1 - completed
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-1",
        "Step 1",
        "completed",
        undefined,
        "parent-task",
      );

      // Child 2 - in progress
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-2",
        "Step 2",
        "in_progress",
        undefined,
        "parent-task",
      );

      // Child 3 - pending
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-3",
        "Step 3",
        "pending",
        undefined,
        "parent-task",
      );

      const progress = metrics.getTaskProgress("parent-task");
      expect(progress.total).toBe(3);
      expect(progress.completed).toBe(1);
      expect(progress.inProgress).toBe(1);
      expect(progress.pending).toBe(1);
      expect(progress.percentage).toBe(33); // 1/3 = 33%
    });

    test("handles nested hierarchy", () => {
      const wf = createTestWorkflow("workflow-7");

      // Root task
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "root",
        "Root",
        "in_progress",
      );

      // Middle level
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "middle",
        "Middle",
        "in_progress",
        undefined,
        "root",
      );

      // Leaf tasks under middle
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "leaf-1",
        "Leaf 1",
        "completed",
        undefined,
        "middle",
      );

      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "leaf-2",
        "Leaf 2",
        "completed",
        undefined,
        "middle",
      );

      // Progress of middle should aggregate leaves
      const middleProgress = metrics.getTaskProgress("middle");
      expect(middleProgress.total).toBe(2);
      expect(middleProgress.completed).toBe(2);
      expect(middleProgress.percentage).toBe(100);

      // Progress of root should aggregate middle (which aggregates leaves)
      const rootProgress = metrics.getTaskProgress("root");
      expect(rootProgress.total).toBe(2);
      expect(rootProgress.completed).toBe(2);
      expect(rootProgress.percentage).toBe(100);
    });
  });

  describe("getTaskTree", () => {
    test("builds tree with root and children", () => {
      const wf = createTestWorkflow("workflow-8");

      // Root task
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "root-task",
        "Root",
        "in_progress",
      );

      // Children
      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-1",
        "Child 1",
        "completed",
        undefined,
        "root-task",
      );

      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "child-2",
        "Child 2",
        "pending",
        undefined,
        "root-task",
      );

      const tree = metrics.getTaskTree(wf.id);
      expect(tree).toHaveLength(1);
      expect(tree[0].task.taskId).toBe("root-task");
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].progress.total).toBe(2);
      expect(tree[0].progress.completed).toBe(1);
    });

    test("handles multiple root tasks", () => {
      const wf = createTestWorkflow("workflow-9");

      // Two unrelated root tasks
      metrics.logTaskSnapshot(
        wf.id,
        "research",
        "root-1",
        "Root 1",
        "completed",
      );

      metrics.logTaskSnapshot(
        wf.id,
        "implement",
        "root-2",
        "Root 2",
        "in_progress",
      );

      const tree = metrics.getTaskTree(wf.id);
      expect(tree).toHaveLength(2);
    });

    test("returns empty array when no tasks", () => {
      const tree = metrics.getTaskTree("non-existent-workflow");
      expect(tree).toHaveLength(0);
    });
  });
});
