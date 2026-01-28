import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";
import { generateSummary } from "./summarize";
import type { Goal, Interrupt } from "../types";

const TEST_DB = ".claude/test-planning-summarize.db";

describe("planning summarization", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  describe("generateSummary()", () => {
    test("summarizes a goal without git context", () => {
      const goal: Goal = {
        id: "goal-1",
        type: "Goal",
        title: "Implement badge generator",
        stackOrder: null,
        status: "completed",
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updatedAt: new Date().toISOString(),
      };

      const summary = generateSummary(goal);
      expect(summary).toContain('Completed: "Implement badge generator"');
      expect(summary).toContain("Duration:");
    });

    test("includes commit count from git context", () => {
      const goal: Goal = {
        id: "goal-2",
        type: "Goal",
        title: "Fix auth",
        stackOrder: null,
        status: "completed",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const summary = generateSummary(goal, {
        commitCount: 5,
        commitMessages: [],
      });

      expect(summary).toContain("5 commits");
    });

    test("includes PR info from git context", () => {
      const goal: Goal = {
        id: "goal-3",
        type: "Goal",
        title: "JSONL sync",
        issueNumber: 608,
        stackOrder: null,
        status: "completed",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const summary = generateSummary(goal, {
        commitCount: 8,
        commitMessages: [],
        prNumber: 623,
        prMerged: true,
        issueClosed: true,
      });

      expect(summary).toContain("PR #623 merged");
      expect(summary).toContain("Issue #608 closed");
    });

    test("summarizes an interrupt", () => {
      const interrupt: Interrupt = {
        id: "interrupt-1",
        type: "Interrupt",
        title: "Fix CI failure",
        reason: "Tests breaking on main",
        stackOrder: null,
        status: "completed",
        createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        updatedAt: new Date().toISOString(),
      };

      const summary = generateSummary(interrupt);
      expect(summary).toContain('Resolved: "Fix CI failure"');
      expect(summary).toContain("Reason: Tests breaking on main");
    });

    test("formats duration correctly", () => {
      // 2 days ago
      const goal: Goal = {
        id: "goal-4",
        type: "Goal",
        title: "Long task",
        stackOrder: null,
        status: "completed",
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const summary = generateSummary(goal);
      expect(summary).toContain("Duration: 2d");
    });
  });
});
