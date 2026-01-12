import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { metrics } from "./metrics";

describe("determineQuerySource", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
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
  test("succeeds without session ID", () => {
    expect(() => {
      metrics.logGraphQuery({
        source: "cli",
        queryType: "what-calls",
        queryParams: JSON.stringify({ name: "parsePackage" }),
        resultCount: 5,
        durationMs: 42,
      });
    }).not.toThrow();
  });

  test("succeeds with all optional fields", () => {
    expect(() => {
      metrics.logGraphQuery({
        source: "agent:atomic-developer",
        sessionId: "test-session-123",
        workflowId: "workflow-456",
        queryType: "blast-radius",
        queryParams: JSON.stringify({ file: "src/graph/query.ts" }),
        resultCount: 10,
        durationMs: 87,
      });
    }).not.toThrow();
  });
});

describe("getGraphQuerySummary", () => {
  test("includes queriesBySource in summary", () => {
    // Log a few queries with different sources
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
    expect(summary.queriesBySource.cli).toBeGreaterThanOrEqual(1);
  });
});
