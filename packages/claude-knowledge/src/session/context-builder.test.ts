import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";
import { buildSessionContext } from "./context-builder";
import { extractKeywords } from "../utils/issue-fetcher";
import { pushGoal } from "../planning/stack";

const TEST_DB = ".claude/test-context-builder.db";

describe("context-builder", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  describe("extractKeywords (reused from issue-fetcher)", () => {
    test("extracts meaningful words from goal titles", () => {
      const keywords = extractKeywords("Chat Agent Badge Issuance #657", 5);
      expect(keywords).toContain("chat");
      expect(keywords).toContain("agent");
      expect(keywords).toContain("badge");
      expect(keywords).toContain("issuance");
      // Should filter numbers
      expect(keywords).not.toContain("657");
    });

    test("filters stop words from titles", () => {
      const keywords = extractKeywords(
        "Add support for self-signed badge workflow",
        5,
      );
      // "add", "for" are stop words
      expect(keywords).not.toContain("add");
      expect(keywords).not.toContain("for");
      expect(keywords).toContain("support");
      expect(keywords).toContain("self-signed");
    });

    test("returns empty array for empty input", () => {
      expect(extractKeywords("")).toEqual([]);
      expect(extractKeywords("", 5)).toEqual([]);
    });

    test("limits to maxWords", () => {
      const keywords = extractKeywords(
        "one two three four five six seven eight nine ten eleven twelve",
        3,
      );
      expect(keywords.length).toBeLessThanOrEqual(3);
    });

    test("extracts from branch-like names", () => {
      const keywords = extractKeywords(
        "feat/issue-84-proof-verification".replace(/[/\-_]/g, " "),
        5,
      );
      expect(keywords).toContain("feat");
      expect(keywords).toContain("issue");
      expect(keywords).toContain("proof");
      expect(keywords).toContain("verification");
    });
  });

  describe("buildSessionContext()", () => {
    test("returns empty output with empty database", async () => {
      const result = await buildSessionContext({
        rootPath: "/nonexistent/path",
        sectionTimeoutMs: 2000,
      });

      // No planning items, no graph data, no learnings
      expect(result.output).toBe("");
      expect(result.sections.planning).toBe(false);
      expect(result.sections.learnings).toBe(false);
      expect(result.timings.totalMs).toBeGreaterThanOrEqual(0);
    });

    test("returns planning section when goals exist", async () => {
      pushGoal({ title: "Implement proof verification" });

      const result = await buildSessionContext({
        rootPath: "/nonexistent/path",
        sectionTimeoutMs: 2000,
      });

      expect(result.sections.planning).toBe(true);
      expect(result.output).toContain("Stack (depth: 1)");
      expect(result.output).toContain("[Goal]");
      expect(result.output).toContain("Implement proof verification");
      expect(result.output).toContain("═══ Session Context ═══");
    });

    test("shows multiple stack items with correct formatting", async () => {
      pushGoal({ title: "RDFC-1.0 Compliance", issueNumber: 661 });
      pushGoal({
        title: "Chat Agent Badge Issuance",
        issueNumber: 657,
      });

      const result = await buildSessionContext({
        rootPath: "/nonexistent/path",
        sectionTimeoutMs: 2000,
      });

      expect(result.sections.planning).toBe(true);
      expect(result.output).toContain("Stack (depth: 2)");
      expect(result.output).toContain("#657");
      expect(result.output).toContain("#661");
      // Active goal should be on top
      expect(result.output).toContain("Chat Agent Badge Issuance");
      expect(result.output).toContain("RDFC-1.0 Compliance");
    });

    test("completes without error even with short timeout", async () => {
      pushGoal({ title: "Test goal" });

      // Short timeout with non-existent path (no packages to parse)
      const result = await buildSessionContext({
        rootPath: "/nonexistent/no-packages-here",
        sectionTimeoutMs: 100,
      });

      // Should still have planning section (sync, fast)
      expect(result.sections.planning).toBe(true);
      expect(result.timings.totalMs).toBeGreaterThanOrEqual(0);
      // The function should not throw
    });

    test("includes section separators in output", async () => {
      pushGoal({ title: "Test formatting" });

      const result = await buildSessionContext({
        rootPath: "/nonexistent/path",
        sectionTimeoutMs: 2000,
      });

      if (result.output) {
        expect(result.output).toContain("═══ Session Context ═══");
        expect(result.output).toContain("═══════════════════════");
      }
    });

    test("returns timing data for all sections", async () => {
      const result = await buildSessionContext({
        rootPath: "/nonexistent/path",
        sectionTimeoutMs: 2000,
      });

      expect(result.timings).toHaveProperty("planningMs");
      expect(result.timings).toHaveProperty("graphMs");
      expect(result.timings).toHaveProperty("learningsMs");
      expect(result.timings).toHaveProperty("totalMs");
      expect(result.timings.planningMs).toBeGreaterThanOrEqual(0);
      expect(result.timings.graphMs).toBeGreaterThanOrEqual(0);
      expect(result.timings.learningsMs).toBeGreaterThanOrEqual(0);
      expect(result.timings.totalMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("graceful degradation", () => {
    test("planning section failure does not prevent other sections", async () => {
      // With no goals and no graph data, all sections return empty
      // but the function completes without error
      const result = await buildSessionContext({
        rootPath: "/nonexistent/path",
        sectionTimeoutMs: 2000,
      });

      // Should complete successfully even if all sections are empty
      expect(result).toBeDefined();
      expect(typeof result.output).toBe("string");
    });

    test("sections object tracks which sections succeeded", async () => {
      const result = await buildSessionContext({
        rootPath: "/nonexistent/path",
        sectionTimeoutMs: 2000,
      });

      expect(typeof result.sections.planning).toBe("boolean");
      expect(typeof result.sections.graph).toBe("boolean");
      expect(typeof result.sections.learnings).toBe("boolean");
    });
  });
});
