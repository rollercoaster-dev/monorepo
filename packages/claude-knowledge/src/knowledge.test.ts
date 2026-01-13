import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./knowledge/index";
import { closeDatabase, resetDatabase } from "./db/sqlite";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

const TEST_DB = ".claude/test-knowledge.db";

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
