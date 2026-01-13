import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { metrics } from "./metrics";
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
