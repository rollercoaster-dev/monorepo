import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./index";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";

const TEST_DB = ".claude/test-knowledge-query.db";

describe("knowledge query operations", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  describe("query()", () => {
    beforeEach(async () => {
      // Create learnings in different areas
      await knowledge.store([
        {
          id: "learning-sec-1",
          content: "Always validate user input to prevent injection attacks",
          codeArea: "Security",
          filePath: "src/api/users.ts",
          sourceIssue: 100,
          confidence: 0.95,
        },
        {
          id: "learning-sec-2",
          content: "Use parameterized queries for database operations",
          codeArea: "Security",
          filePath: "src/db/queries.ts",
          sourceIssue: 100,
          confidence: 0.9,
        },
        {
          id: "learning-db-1",
          content: "Index frequently queried columns for performance",
          codeArea: "Database",
          filePath: "src/db/migrations.ts",
          sourceIssue: 101,
          confidence: 0.85,
        },
        {
          id: "learning-db-2",
          content: "Use transactions for atomic operations",
          codeArea: "Database",
          sourceIssue: 102,
          confidence: 0.92,
        },
        {
          id: "learning-api-1",
          content: "Return proper HTTP status codes",
          codeArea: "API Development",
          filePath: "src/api/users.ts",
          sourceIssue: 103,
          confidence: 0.88,
        },
      ]);

      // Create patterns linked to learnings
      await knowledge.storePattern(
        {
          id: "pattern-validation",
          name: "Input Validation",
          description: "Validate all external input",
          codeArea: "Security",
        },
        ["learning-sec-1"],
      );

      await knowledge.storePattern(
        {
          id: "pattern-sql-safety",
          name: "SQL Safety",
          description: "Use parameterized queries",
          codeArea: "Security",
        },
        ["learning-sec-2"],
      );

      // Create mistakes linked to learnings
      await knowledge.storeMistake(
        {
          id: "mistake-sql-injection",
          description: "Used string concatenation for SQL",
          howFixed: "Switched to parameterized queries",
          filePath: "src/db/queries.ts",
        },
        "learning-sec-2",
      );
    });

    test("query by code area returns relevant learnings", async () => {
      const results = await knowledge.query({ codeArea: "Security" });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.learning.id)).toContain("learning-sec-1");
      expect(results.map((r) => r.learning.id)).toContain("learning-sec-2");
    });

    test("query by file path returns relevant learnings", async () => {
      const results = await knowledge.query({ filePath: "src/api/users.ts" });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.learning.id)).toContain("learning-sec-1");
      expect(results.map((r) => r.learning.id)).toContain("learning-api-1");
    });

    test("keyword search on content works", async () => {
      const results = await knowledge.query({ keywords: ["parameterized"] });

      expect(results).toHaveLength(1);
      expect(results[0].learning.id).toBe("learning-sec-2");
    });

    test("multiple keywords use AND logic", async () => {
      const results = await knowledge.query({
        keywords: ["validate", "injection"],
      });

      expect(results).toHaveLength(1);
      expect(results[0].learning.id).toBe("learning-sec-1");
    });

    test("query by issue number filters correctly", async () => {
      const results = await knowledge.query({ issueNumber: 100 });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.learning.id)).toContain("learning-sec-1");
      expect(results.map((r) => r.learning.id)).toContain("learning-sec-2");
    });

    test("related patterns included via 2-hop traversal", async () => {
      const results = await knowledge.query({ codeArea: "Security" });

      // learning-sec-1 should have pattern-validation
      const sec1 = results.find((r) => r.learning.id === "learning-sec-1");
      expect(sec1?.relatedPatterns).toHaveLength(1);
      expect(sec1?.relatedPatterns?.[0].name).toBe("Input Validation");

      // learning-sec-2 should have pattern-sql-safety
      const sec2 = results.find((r) => r.learning.id === "learning-sec-2");
      expect(sec2?.relatedPatterns).toHaveLength(1);
      expect(sec2?.relatedPatterns?.[0].name).toBe("SQL Safety");
    });

    test("related mistakes included via 2-hop traversal", async () => {
      const results = await knowledge.query({ codeArea: "Security" });

      // learning-sec-2 should have mistake-sql-injection
      const sec2 = results.find((r) => r.learning.id === "learning-sec-2");
      expect(sec2?.relatedMistakes).toHaveLength(1);
      expect(sec2?.relatedMistakes?.[0].description).toContain(
        "string concatenation",
      );
    });

    test("results ordered by recency (newest first)", async () => {
      // Store learnings separately to ensure different timestamps
      await knowledge.store([
        {
          id: "learning-order-old",
          content: "Old learning for ordering test",
          codeArea: "Ordering Test",
        },
      ]);

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await knowledge.store([
        {
          id: "learning-order-new",
          content: "New learning for ordering test",
          codeArea: "Ordering Test",
        },
      ]);

      const results = await knowledge.query({ codeArea: "Ordering Test" });

      expect(results).toHaveLength(2);
      // Newest first
      expect(results[0].learning.id).toBe("learning-order-new");
      expect(results[1].learning.id).toBe("learning-order-old");
    });

    test("limit parameter caps results", async () => {
      const results = await knowledge.query({ codeArea: "Security", limit: 1 });

      expect(results).toHaveLength(1);
    });

    test.each([
      { filter: { codeArea: "NonExistent" }, desc: "non-existent code area" },
      {
        filter: { filePath: "src/nonexistent.ts" },
        desc: "non-existent file path",
      },
      {
        filter: { keywords: ["xyznonexistent123"] as string[] },
        desc: "non-matching keywords",
      },
    ])("returns empty results for $desc", async ({ filter }) => {
      const results = await knowledge.query(filter);
      expect(results).toHaveLength(0);
    });

    test("multiple filters combine with AND logic", async () => {
      const results = await knowledge.query({
        codeArea: "Security",
        filePath: "src/db/queries.ts",
      });

      expect(results).toHaveLength(1);
      expect(results[0].learning.id).toBe("learning-sec-2");
    });

    test("query with no filters returns all learnings", async () => {
      const results = await knowledge.query({});

      expect(results).toHaveLength(5);
    });

    test("default limit is 50", async () => {
      // Store 60 learnings
      const learnings = Array.from({ length: 60 }, (_, i) => ({
        id: `learning-limit-${i}`,
        content: `Content ${i}`,
      }));
      await knowledge.store(learnings);

      const results = await knowledge.query({});

      // Should return 50 (default limit) not all 65
      expect(results).toHaveLength(50);
    });
  });

  describe("getMistakesForFile()", () => {
    test("returns mistakes for given file path", async () => {
      await knowledge.storeMistake({
        id: "mistake-file-1",
        description: "Missing validation",
        howFixed: "Added Zod schema",
        filePath: "src/handlers/user.ts",
      });

      await knowledge.storeMistake({
        id: "mistake-file-2",
        description: "SQL injection vulnerability",
        howFixed: "Used parameterized queries",
        filePath: "src/handlers/user.ts",
      });

      const mistakes = await knowledge.getMistakesForFile(
        "src/handlers/user.ts",
      );

      expect(mistakes).toHaveLength(2);
      expect(mistakes.map((m) => m.id)).toContain("mistake-file-1");
      expect(mistakes.map((m) => m.id)).toContain("mistake-file-2");
    });

    test("returns empty array if no mistakes for file", async () => {
      const mistakes = await knowledge.getMistakesForFile("src/clean-file.ts");

      expect(mistakes).toHaveLength(0);
    });
  });

  describe("getPatternsForArea()", () => {
    test("returns patterns for given code area", async () => {
      await knowledge.storePattern({
        id: "pattern-area-1",
        name: "Error Handling",
        description: "Use structured error handling",
        codeArea: "Error Management",
      });

      await knowledge.storePattern({
        id: "pattern-area-2",
        name: "Logging",
        description: "Log at appropriate levels",
        codeArea: "Error Management",
      });

      const patterns = await knowledge.getPatternsForArea("Error Management");

      expect(patterns).toHaveLength(2);
      expect(patterns.map((p) => p.id)).toContain("pattern-area-1");
      expect(patterns.map((p) => p.id)).toContain("pattern-area-2");
    });

    test("returns empty array if no patterns for area", async () => {
      const patterns = await knowledge.getPatternsForArea("NonExistent Area");

      expect(patterns).toHaveLength(0);
    });
  });
});
