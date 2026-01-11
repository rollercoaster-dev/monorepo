import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./knowledge/index";
import { closeDatabase, resetDatabase, getDatabase } from "./db/sqlite";
import type { Learning } from "./types";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

const TEST_DB = ".claude/test-knowledge.db";

// Test helpers to reduce query boilerplate
const db = () => getDatabase();

const getEntity = (id: string) =>
  db()
    .query<
      { id: string; type: string; data: string },
      [string]
    >("SELECT * FROM entities WHERE id = ?")
    .get(id);

const getEntitiesByType = (type: string) =>
  db()
    .query<
      { id: string; type: string },
      [string]
    >("SELECT id, type FROM entities WHERE type = ?")
    .all(type);

const getRels = (fromId: string, type: string) =>
  db()
    .query<
      { from_id: string; to_id: string; type: string },
      [string, string]
    >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
    .all(fromId, type);

const getRelsTo = (toId: string, type: string) =>
  db()
    .query<
      { from_id: string },
      [string, string]
    >("SELECT from_id FROM relationships WHERE to_id = ? AND type = ?")
    .all(toId, type);

const countEntities = (type: string) =>
  db()
    .query<
      { count: number },
      [string]
    >("SELECT COUNT(*) as count FROM entities WHERE type = ?")
    .get(type)!.count;

describe("knowledge API", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    try {
      await unlink(TEST_DB);
    } catch {
      /* ignore */
    }
  });

  describe("store()", () => {
    test("creates Learning entities", async () => {
      await knowledge.store([
        { id: "learning-1", content: "Validate user input", confidence: 0.95 },
      ]);

      const entity = getEntity("learning-1");
      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Learning");
      expect(JSON.parse(entity!.data).content).toBe("Validate user input");
    });

    test("auto-creates CodeArea entity and ABOUT relationship", async () => {
      await knowledge.store([
        { id: "learning-2", content: "Use rd-logger", codeArea: "Logging" },
      ]);

      const codeArea = getEntity("codearea-logging");
      expect(codeArea).not.toBeNull();
      expect(codeArea!.type).toBe("CodeArea");

      const rels = getRels("learning-2", "ABOUT");
      expect(rels).toHaveLength(1);
      expect(rels[0].to_id).toBe("codearea-logging");
    });

    test("auto-creates File entity and IN_FILE relationship", async () => {
      await knowledge.store([
        { id: "learning-3", content: "Test", filePath: "src/checkpoint.ts" },
      ]);

      expect(getEntitiesByType("File").length).toBeGreaterThan(0);
      expect(getRels("learning-3", "IN_FILE")).toHaveLength(1);
    });

    test("merges duplicate CodeArea entities", async () => {
      await knowledge.store([
        { id: "learning-4", content: "Learning 1", codeArea: "Database" },
        { id: "learning-5", content: "Learning 2", codeArea: "Database" },
      ]);

      expect(countEntities("CodeArea")).toBe(1);
      expect(getRelsTo("codearea-database", "ABOUT")).toHaveLength(2);
    });

    test("handles batch insert with transaction", async () => {
      const learnings: Learning[] = Array.from({ length: 100 }, (_, i) => ({
        id: `learning-batch-${i}`,
        content: `Content ${i}`,
        codeArea: `Area${i % 10}`,
      }));

      await knowledge.store(learnings);
      expect(countEntities("Learning")).toBe(100);
    });

    test("handles empty array gracefully", async () => {
      await knowledge.store([]);
      expect(true).toBe(true);
    });

    test("generates ID if not provided", async () => {
      await knowledge.store([{ id: "", content: "Auto ID test" }]);

      const entities = getEntitiesByType("Learning");
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^learning-/);
    });

    test("updates existing entity on duplicate ID", async () => {
      await knowledge.store([
        { id: "learning-update", content: "Original", confidence: 0.5 },
      ]);
      await knowledge.store([
        { id: "learning-update", content: "Updated", confidence: 0.9 },
      ]);

      const data = JSON.parse(getEntity("learning-update")!.data);
      expect(data.content).toBe("Updated");
      expect(data.confidence).toBe(0.9);
    });

    test("throws error when entity ID exists with different type", async () => {
      db().run(
        "INSERT INTO entities (id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [
          "conflict-id",
          "CodeArea",
          JSON.stringify({ name: "Test" }),
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      );

      await expect(
        knowledge.store([{ id: "conflict-id", content: "Fail" }]),
      ).rejects.toThrow(/already exists with type "CodeArea"/);
    });
  });

  describe("storePattern()", () => {
    test("creates Pattern entity", async () => {
      await knowledge.storePattern({
        id: "pattern-1",
        name: "Validation",
        description: "Validate input",
        codeArea: "Security",
      });

      const entity = getEntity("pattern-1");
      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Pattern");
      expect(JSON.parse(entity!.data).name).toBe("Validation");
    });

    test("creates APPLIES_TO relationship to CodeArea", async () => {
      await knowledge.storePattern({
        id: "pattern-2",
        name: "Logging",
        description: "Use rd-logger",
        codeArea: "Logging",
      });

      const rels = getRels("pattern-2", "APPLIES_TO");
      expect(rels).toHaveLength(1);
      expect(rels[0].to_id).toBe("codearea-logging");
    });

    test("links pattern to learnings via LED_TO", async () => {
      await knowledge.store([
        { id: "learning-7", content: "L1" },
        { id: "learning-8", content: "L2" },
      ]);

      await knowledge.storePattern(
        { id: "pattern-3", name: "Combined", description: "Multi-source" },
        ["learning-7", "learning-8"],
      );

      expect(getRels("pattern-3", "LED_TO")).toHaveLength(2);
    });

    test("throws error for non-existent learning", async () => {
      await expect(
        knowledge.storePattern(
          { id: "pattern-4", name: "Test", description: "Test" },
          ["non-existent"],
        ),
      ).rejects.toThrow(/does not exist/);
    });

    test("generates ID if not provided", async () => {
      await knowledge.storePattern({
        id: "",
        name: "Auto",
        description: "Test",
      });

      const entities = getEntitiesByType("Pattern");
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^pattern-/);
    });
  });

  describe("storeMistake()", () => {
    test("creates Mistake entity", async () => {
      await knowledge.storeMistake({
        id: "mistake-1",
        description: "No validation",
        howFixed: "Added Zod",
        filePath: "src/api/users.ts",
      });

      const entity = getEntity("mistake-1");
      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Mistake");
      expect(JSON.parse(entity!.data).howFixed).toContain("Zod");
    });

    test("creates IN_FILE relationship", async () => {
      await knowledge.storeMistake({
        id: "mistake-2",
        description: "SQL injection",
        howFixed: "Parameterized queries",
        filePath: "src/db/queries.ts",
      });

      expect(getRels("mistake-2", "IN_FILE")).toHaveLength(1);
    });

    test("links mistake to learning via LED_TO", async () => {
      await knowledge.store([{ id: "learning-9", content: "Use params" }]);

      await knowledge.storeMistake(
        { id: "mistake-3", description: "SQL injection", howFixed: "Params" },
        "learning-9",
      );

      const rels = getRels("mistake-3", "LED_TO");
      expect(rels).toHaveLength(1);
      expect(rels[0].to_id).toBe("learning-9");
    });

    test("throws error for non-existent learning", async () => {
      await expect(
        knowledge.storeMistake(
          { id: "mistake-4", description: "Test", howFixed: "Test" },
          "non-existent",
        ),
      ).rejects.toThrow(/does not exist/);
    });

    test("generates ID if not provided", async () => {
      await knowledge.storeMistake({
        id: "",
        description: "Auto",
        howFixed: "Test",
      });

      const entities = getEntitiesByType("Mistake");
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^mistake-/);
    });
  });

  describe("relationship integrity", () => {
    test("duplicate relationships are idempotent", async () => {
      await knowledge.store([
        { id: "learning-10", content: "Test", codeArea: "Testing" },
      ]);
      await knowledge.store([
        { id: "learning-10", content: "Updated", codeArea: "Testing" },
      ]);

      expect(getRels("learning-10", "ABOUT")).toHaveLength(1);
    });

    test("cascade delete removes relationships", async () => {
      await knowledge.store([
        { id: "learning-11", content: "Test", codeArea: "Testing" },
      ]);

      db().run("DELETE FROM entities WHERE id = ?", ["learning-11"]);

      expect(getRels("learning-11", "ABOUT")).toHaveLength(0);
    });
  });

  describe("integration", () => {
    test("full workflow: learning → pattern → mistake", async () => {
      await knowledge.store([
        {
          id: "learning-full-1",
          content: "Validation prevents security issues",
          codeArea: "Security",
          filePath: "src/validation.ts",
          confidence: 0.9,
        },
      ]);

      await knowledge.storePattern(
        {
          id: "pattern-full-1",
          name: "Input Validation",
          description: "Validate at API boundaries",
          codeArea: "Security",
        },
        ["learning-full-1"],
      );

      await knowledge.storeMistake(
        {
          id: "mistake-full-1",
          description: "Unvalidated input",
          howFixed: "Added Zod",
          filePath: "src/api/handler.ts",
        },
        "learning-full-1",
      );

      // Verify all entity types exist
      const types = db()
        .query<{ type: string }, []>("SELECT DISTINCT type FROM entities")
        .all()
        .map((e) => e.type);

      expect(types).toContain("Learning");
      expect(types).toContain("Pattern");
      expect(types).toContain("Mistake");
      expect(types).toContain("CodeArea");
      expect(types).toContain("File");

      // Verify relationship types
      const relTypes = db()
        .query<{ type: string }, []>("SELECT DISTINCT type FROM relationships")
        .all()
        .map((r) => r.type);

      expect(relTypes).toContain("ABOUT");
      expect(relTypes).toContain("IN_FILE");
      expect(relTypes).toContain("APPLIES_TO");
      expect(relTypes).toContain("LED_TO");
    });
  });

  describe("query()", () => {
    // Seed test data before each query test
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

    test("empty results for non-existent code area", async () => {
      const results = await knowledge.query({ codeArea: "NonExistent" });

      expect(results).toHaveLength(0);
    });

    test("empty results for non-existent file path", async () => {
      const results = await knowledge.query({
        filePath: "src/nonexistent.ts",
      });

      expect(results).toHaveLength(0);
    });

    test("empty results for non-matching keywords", async () => {
      const results = await knowledge.query({
        keywords: ["xyznonexistent123"],
      });

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

    test("does not return mistakes from other files", async () => {
      await knowledge.storeMistake({
        id: "mistake-other-file",
        description: "Bug in other file",
        howFixed: "Fixed it",
        filePath: "src/other/file.ts",
      });

      const mistakes = await knowledge.getMistakesForFile(
        "src/handlers/user.ts",
      );

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

    test("does not return patterns from other areas", async () => {
      await knowledge.storePattern({
        id: "pattern-other-area",
        name: "Other Pattern",
        description: "In different area",
        codeArea: "Other Area",
      });

      const patterns = await knowledge.getPatternsForArea("Error Management");

      expect(patterns).toHaveLength(0);
    });
  });

  describe("query integration", () => {
    test("full graph traversal with complex relationships", async () => {
      // Create a complex graph:
      // Learning1 (Security area, file1) <- Pattern1
      // Learning2 (Security area, file2) <- Pattern1, Pattern2, Mistake1

      await knowledge.store([
        {
          id: "learning-complex-1",
          content: "First security learning",
          codeArea: "Security",
          filePath: "src/auth/login.ts",
        },
        {
          id: "learning-complex-2",
          content: "Second security learning",
          codeArea: "Security",
          filePath: "src/auth/register.ts",
        },
      ]);

      // Pattern linked to both learnings
      await knowledge.storePattern(
        {
          id: "pattern-complex-shared",
          name: "Auth Pattern",
          description: "Shared auth pattern",
          codeArea: "Security",
        },
        ["learning-complex-1", "learning-complex-2"],
      );

      // Pattern linked only to second learning
      await knowledge.storePattern(
        {
          id: "pattern-complex-unique",
          name: "Registration Pattern",
          description: "Registration specific",
          codeArea: "Security",
        },
        ["learning-complex-2"],
      );

      // Mistake linked to second learning
      await knowledge.storeMistake(
        {
          id: "mistake-complex",
          description: "Registration bug",
          howFixed: "Fixed validation",
          filePath: "src/auth/register.ts",
        },
        "learning-complex-2",
      );

      const results = await knowledge.query({ codeArea: "Security" });

      expect(results).toHaveLength(2);

      // Check first learning has one pattern
      const result1 = results.find(
        (r) => r.learning.id === "learning-complex-1",
      );
      expect(result1?.relatedPatterns).toHaveLength(1);
      expect(result1?.relatedMistakes).toBeUndefined();

      // Check second learning has two patterns and one mistake
      const result2 = results.find(
        (r) => r.learning.id === "learning-complex-2",
      );
      expect(result2?.relatedPatterns).toHaveLength(2);
      expect(result2?.relatedMistakes).toHaveLength(1);
    });
  });

  describe("searchSimilar()", () => {
    beforeEach(async () => {
      // Store learnings with semantic variety
      await knowledge.store([
        {
          id: "learning-validate-1",
          content: "Always validate user input to prevent security issues",
          codeArea: "Security",
          confidence: 0.95,
        },
        {
          id: "learning-validate-2",
          content: "Use Zod schemas for input validation in TypeScript",
          codeArea: "Validation",
          confidence: 0.9,
        },
        {
          id: "learning-database-1",
          content: "Use indexes on frequently queried database columns",
          codeArea: "Database",
          confidence: 0.85,
        },
        {
          id: "learning-testing-1",
          content: "Write unit tests before implementing features",
          codeArea: "Testing",
          confidence: 0.88,
        },
      ]);
    });

    test("returns results sorted by similarity", async () => {
      const results = await knowledge.searchSimilar(
        "input validation security",
      );

      expect(results.length).toBeGreaterThan(0);
      // First result should have higher similarity than last
      if (results.length > 1) {
        expect(results[0].relevanceScore).toBeGreaterThanOrEqual(
          results[results.length - 1].relevanceScore!,
        );
      }
    });

    test("includes relevanceScore in results", async () => {
      const results = await knowledge.searchSimilar("validate input");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].relevanceScore).toBeDefined();
      expect(typeof results[0].relevanceScore).toBe("number");
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0);
      expect(results[0].relevanceScore).toBeLessThanOrEqual(1);
    });

    test("respects limit parameter", async () => {
      const results = await knowledge.searchSimilar("learning content", {
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    test("respects threshold parameter", async () => {
      const lowThreshold = await knowledge.searchSimilar("validate", {
        threshold: 0.1,
      });
      const highThreshold = await knowledge.searchSimilar("validate", {
        threshold: 0.9,
      });

      // Higher threshold should return fewer or equal results
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    test("returns empty array for non-matching query", async () => {
      // Query that has no semantic overlap
      const results = await knowledge.searchSimilar(
        "xyzabc123nonexistent random gibberish",
        { threshold: 0.5 },
      );

      expect(results).toHaveLength(0);
    });

    test("returns empty array for empty query", async () => {
      const results = await knowledge.searchSimilar("");

      expect(results).toHaveLength(0);
    });

    test("includes related entities when includeRelated is true", async () => {
      // Add a pattern linked to one of our learnings
      await knowledge.storePattern(
        {
          id: "pattern-validate",
          name: "Input Validation",
          description: "Validate all external input",
          codeArea: "Security",
        },
        ["learning-validate-1"],
      );

      const results = await knowledge.searchSimilar("validate user input", {
        includeRelated: true,
      });

      const validationResult = results.find(
        (r) => r.learning.id === "learning-validate-1",
      );
      expect(validationResult?.relatedPatterns).toBeDefined();
      expect(validationResult?.relatedPatterns?.length).toBeGreaterThan(0);
    });

    test("does not include related entities by default", async () => {
      await knowledge.storePattern(
        {
          id: "pattern-validate-2",
          name: "Input Validation 2",
          description: "Validate input",
          codeArea: "Security",
        },
        ["learning-validate-1"],
      );

      const results = await knowledge.searchSimilar("validate user input");

      const validationResult = results.find(
        (r) => r.learning.id === "learning-validate-1",
      );
      // relatedPatterns should not be populated when includeRelated is false
      expect(validationResult?.relatedPatterns).toBeUndefined();
    });

    test("handles corpus with no embeddings gracefully", async () => {
      // Reset database to have no learnings
      resetDatabase(TEST_DB);

      const results = await knowledge.searchSimilar("any query");

      expect(results).toHaveLength(0);
    });
  });

  describe("formatForContext()", () => {
    beforeEach(async () => {
      // Seed test data
      await knowledge.store([
        {
          id: "learning-ctx-1",
          content: "Always validate user input to prevent injection attacks",
          codeArea: "Security",
          filePath: "src/api/users.ts",
          confidence: 0.95,
          sourceIssue: 100,
        },
        {
          id: "learning-ctx-2",
          content: "Use parameterized queries for database operations",
          codeArea: "Security",
          filePath: "src/db/queries.ts",
          confidence: 0.9,
          sourceIssue: 100,
        },
        {
          id: "learning-ctx-3",
          content: "Index frequently queried columns",
          codeArea: "Database",
          confidence: 0.85,
        },
        {
          id: "learning-ctx-4",
          content: "Low confidence learning for testing filter",
          codeArea: "Security",
          confidence: 0.1,
        },
      ]);

      // Add pattern linked to security learnings
      await knowledge.storePattern(
        {
          id: "pattern-ctx-validation",
          name: "Input Validation",
          description: "Always validate external input",
          codeArea: "Security",
        },
        ["learning-ctx-1"],
      );

      // Add mistake for file
      await knowledge.storeMistake(
        {
          id: "mistake-ctx-injection",
          description: "Used string concatenation for SQL",
          howFixed: "Switched to parameterized queries",
          filePath: "src/db/queries.ts",
        },
        "learning-ctx-2",
      );
    });

    test("queries with QueryContext object", async () => {
      const result = await knowledge.formatForContext({ codeArea: "Security" });

      expect(result.resultCount).toBeGreaterThan(0);
      expect(result.content).toContain("validate");
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    test("queries with string using keywords (default)", async () => {
      const result = await knowledge.formatForContext("validate");

      expect(result.resultCount).toBeGreaterThan(0);
      expect(result.content).toContain("validate");
    });

    test("queries with string using semantic search", async () => {
      const result = await knowledge.formatForContext("input validation", {
        useSemanticSearch: true,
      });

      // Semantic search returns valid result structure
      expect(typeof result.content).toBe("string");
      expect(typeof result.tokenCount).toBe("number");
      expect(typeof result.resultCount).toBe("number");
      expect(typeof result.wasFiltered).toBe("boolean");
      // If results found via semantic search, they should contain relevant content
      if (result.resultCount > 0) {
        expect(result.content.toLowerCase()).toContain("validate");
      }
    });

    test("filters by confidence threshold", async () => {
      // With default threshold (0.3), should filter out low confidence
      const defaultResult = await knowledge.formatForContext({
        codeArea: "Security",
      });

      // With very low threshold, should include low confidence
      const lowThresholdResult = await knowledge.formatForContext(
        { codeArea: "Security" },
        { confidenceThreshold: 0.05 },
      );

      // Low threshold should include more results
      expect(lowThresholdResult.resultCount).toBeGreaterThanOrEqual(
        defaultResult.resultCount,
      );
    });

    test("sets wasFiltered when results are filtered", async () => {
      // High threshold (0.92) should filter results with lower confidence:
      // - learning-ctx-1: 0.95 (included)
      // - learning-ctx-2: 0.90 (filtered)
      // - learning-ctx-4: 0.10 (filtered)
      const result = await knowledge.formatForContext(
        { codeArea: "Security" },
        { confidenceThreshold: 0.92 },
      );

      // wasFiltered should be true since we filtered out results
      expect(result.wasFiltered).toBe(true);
      // Should only have 1 result (learning-ctx-1 with 0.95 confidence)
      expect(result.resultCount).toBe(1);
    });

    test("respects limit parameter", async () => {
      const result = await knowledge.formatForContext(
        { codeArea: "Security" },
        { limit: 1 },
      );

      expect(result.resultCount).toBeLessThanOrEqual(1);
    });

    test("formats output as markdown (default)", async () => {
      const result = await knowledge.formatForContext(
        { codeArea: "Security" },
        { format: "markdown" },
      );

      // Markdown format has headers
      expect(result.content).toContain("## Relevant Knowledge");
    });

    test("formats output as bullets", async () => {
      const result = await knowledge.formatForContext(
        { codeArea: "Security" },
        { format: "bullets" },
      );

      // Bullets format starts with "- "
      expect(result.content).toContain("- ");
      // Should not have markdown headers
      expect(result.content).not.toContain("## ");
    });

    test("formats output as XML", async () => {
      const result = await knowledge.formatForContext(
        { codeArea: "Security" },
        { format: "xml" },
      );

      // XML format has tags
      expect(result.content).toContain("<knowledge>");
      expect(result.content).toContain("</knowledge>");
      expect(result.content).toContain("<learning");
    });

    test("respects maxTokens parameter", async () => {
      const result = await knowledge.formatForContext(
        { codeArea: "Security" },
        { maxTokens: 500 },
      );

      // Token count should be within budget
      expect(result.tokenCount).toBeLessThanOrEqual(500);
    });

    test("includes related patterns via 2-hop traversal", async () => {
      const result = await knowledge.formatForContext(
        { codeArea: "Security" },
        { format: "markdown" },
      );

      // Should include the pattern
      expect(result.content).toContain("Input Validation");
    });

    test("includes related mistakes via 2-hop traversal", async () => {
      const result = await knowledge.formatForContext(
        { filePath: "src/db/queries.ts" },
        { format: "markdown" },
      );

      // Should include the mistake
      expect(result.content).toContain("string concatenation");
    });

    test("respects showFilePaths option", async () => {
      const withPaths = await knowledge.formatForContext(
        { codeArea: "Security" },
        { format: "bullets", showFilePaths: true },
      );

      const withoutPaths = await knowledge.formatForContext(
        { codeArea: "Security" },
        { format: "bullets", showFilePaths: false },
      );

      // With paths should contain file references
      expect(withPaths.content).toContain("src/");
      // Without paths should have different content (shorter or no file refs)
      expect(withoutPaths.content.length).toBeLessThanOrEqual(
        withPaths.content.length,
      );
    });

    test("returns empty result for non-existent code area", async () => {
      const result = await knowledge.formatForContext({
        codeArea: "NonExistent",
      });

      expect(result.resultCount).toBe(0);
      expect(result.tokenCount).toBeGreaterThanOrEqual(0);
    });

    test("handles empty query gracefully", async () => {
      const result = await knowledge.formatForContext({});

      // Should return some results (all learnings)
      expect(result.resultCount).toBeGreaterThan(0);
    });

    test("graceful degradation on database error", async () => {
      // Close database to simulate error
      closeDatabase();

      // This should not throw, but return result (may be empty or formatted empty state)
      const result = await knowledge.formatForContext({ codeArea: "Security" });

      // Should return a valid ContextInjectionResult, not throw
      expect(result.resultCount).toBe(0);
      expect(result.wasFiltered).toBe(false);
      expect(typeof result.content).toBe("string");
      expect(typeof result.tokenCount).toBe("number");
    });
  });
});
