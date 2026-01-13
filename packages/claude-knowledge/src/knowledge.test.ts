import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./knowledge/index";
import { closeDatabase, resetDatabase, getDatabase } from "./db/sqlite";
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

  describe("storeTopic()", () => {
    test("creates Topic entity", async () => {
      await knowledge.storeTopic({
        id: "topic-1",
        content: "Worked on authentication system",
        keywords: ["auth", "login", "security"],
        timestamp: new Date().toISOString(),
      });

      const entity = getEntity("topic-1");
      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Topic");
      expect(JSON.parse(entity!.data).content).toBe(
        "Worked on authentication system",
      );
    });

    test("stores keywords in topic data", async () => {
      await knowledge.storeTopic({
        id: "topic-2",
        content: "Database optimization",
        keywords: ["db", "performance", "indexes"],
        timestamp: new Date().toISOString(),
      });

      const entity = getEntity("topic-2");
      const data = JSON.parse(entity!.data);
      expect(data.keywords).toEqual(["db", "performance", "indexes"]);
    });

    test("generates ID if not provided", async () => {
      await knowledge.storeTopic({
        id: "",
        content: "Auto ID topic",
        keywords: ["test"],
        timestamp: new Date().toISOString(),
      });

      const entities = getEntitiesByType("Topic");
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^topic-/);
    });

    test("stores optional metadata", async () => {
      await knowledge.storeTopic({
        id: "topic-3",
        content: "Topic with metadata",
        keywords: ["meta"],
        timestamp: new Date().toISOString(),
        sourceSession: "session-123",
        confidence: 0.8,
        metadata: { commitCount: 5 },
      });

      const entity = getEntity("topic-3");
      const data = JSON.parse(entity!.data);
      expect(data.sourceSession).toBe("session-123");
      expect(data.confidence).toBe(0.8);
      expect(data.metadata.commitCount).toBe(5);
    });

    test("updates existing topic on duplicate ID", async () => {
      await knowledge.storeTopic({
        id: "topic-update",
        content: "Original content",
        keywords: ["original"],
        timestamp: new Date().toISOString(),
      });
      await knowledge.storeTopic({
        id: "topic-update",
        content: "Updated content",
        keywords: ["updated"],
        timestamp: new Date().toISOString(),
      });

      const data = JSON.parse(getEntity("topic-update")!.data);
      expect(data.content).toBe("Updated content");
      expect(data.keywords).toEqual(["updated"]);
    });
  });

  describe("queryTopics()", () => {
    beforeEach(async () => {
      // Store topics with different keywords
      await knowledge.storeTopic({
        id: "topic-auth-1",
        content: "Worked on authentication: added OAuth support",
        keywords: ["auth", "oauth", "security"],
        timestamp: new Date(Date.now() - 1000).toISOString(),
        confidence: 0.9,
      });

      await knowledge.storeTopic({
        id: "topic-db-1",
        content: "Database optimization: added indexes",
        keywords: ["database", "performance", "indexes"],
        timestamp: new Date(Date.now() - 2000).toISOString(),
        confidence: 0.85,
      });

      await knowledge.storeTopic({
        id: "topic-auth-2",
        content: "Authentication refactor: improved session handling",
        keywords: ["auth", "session", "refactor"],
        timestamp: new Date().toISOString(),
        confidence: 0.8,
      });
    });

    test("returns topics matching keywords", async () => {
      const results = await knowledge.queryTopics({ keywords: ["auth"] });

      expect(results).toHaveLength(2);
      expect(results.map((t) => t.id)).toContain("topic-auth-1");
      expect(results.map((t) => t.id)).toContain("topic-auth-2");
    });

    test("returns topics ordered by recency (newest first)", async () => {
      const results = await knowledge.queryTopics({ keywords: ["auth"] });

      expect(results).toHaveLength(2);
      // Newest (topic-auth-2) should be first
      expect(results[0].id).toBe("topic-auth-2");
      expect(results[1].id).toBe("topic-auth-1");
    });

    test("respects limit parameter", async () => {
      const results = await knowledge.queryTopics({
        keywords: ["auth"],
        limit: 1,
      });

      expect(results).toHaveLength(1);
    });

    test("returns all topics when no keywords specified", async () => {
      const results = await knowledge.queryTopics({});

      expect(results).toHaveLength(3);
    });

    test("returns empty array for non-matching keywords", async () => {
      const results = await knowledge.queryTopics({
        keywords: ["nonexistent123xyz"],
      });

      expect(results).toHaveLength(0);
    });

    test("uses semantic search on topic content", async () => {
      // Search for "login" which is semantically related to auth content
      const results = await knowledge.queryTopics({
        keywords: ["OAuth", "support"],
      });

      // Should find the OAuth topic via content or keyword match
      expect(results.length).toBeGreaterThan(0);
    });

    test("returns topics with all fields populated", async () => {
      const results = await knowledge.queryTopics({ keywords: ["database"] });

      expect(results).toHaveLength(1);
      const topic = results[0];
      expect(topic.id).toBe("topic-db-1");
      expect(topic.content).toContain("Database optimization");
      expect(topic.keywords).toContain("database");
      expect(topic.timestamp).toBeDefined();
      expect(topic.confidence).toBe(0.85);
    });

    test("handles empty database gracefully", async () => {
      resetDatabase(TEST_DB);

      const results = await knowledge.queryTopics({ keywords: ["anything"] });

      expect(results).toHaveLength(0);
    });
  });
});
