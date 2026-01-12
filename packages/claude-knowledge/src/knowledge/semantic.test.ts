import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { searchSimilarTopics } from "./semantic";
import { storeTopic } from "./store";
import { resetDatabase, closeDatabase } from "../db/sqlite";
import { resetDefaultEmbedder } from "../embeddings";
import type { Topic } from "../types";
import { existsSync } from "fs";
import { mkdir, unlink } from "fs/promises";

const TEST_DB = ".claude/test-semantic.db";

describe("searchSimilarTopics", () => {
  beforeEach(async () => {
    // Reset embedder before each test
    resetDefaultEmbedder();
    // Ensure .claude directory exists
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    // Delete existing test database to ensure clean state
    if (existsSync(TEST_DB)) {
      await unlink(TEST_DB);
    }
    // Initialize fresh test database
    resetDatabase(TEST_DB);
  });

  afterEach(() => {
    resetDefaultEmbedder();
    closeDatabase();
  });

  describe("empty database", () => {
    test("returns empty array when no topics exist", async () => {
      const results = await searchSimilarTopics("authentication");
      expect(results).toEqual([]);
    });

    test("returns empty array for empty query", async () => {
      const results = await searchSimilarTopics("");
      expect(results).toEqual([]);
    });

    test("returns empty array for whitespace query", async () => {
      const results = await searchSimilarTopics("   ");
      expect(results).toEqual([]);
    });
  });

  describe("with topics", () => {
    const testTopics: Topic[] = [
      {
        id: "topic-auth-1",
        content: "Authentication and login flow implementation",
        keywords: ["auth", "login", "security"],
        confidence: 0.8,
        timestamp: new Date().toISOString(),
      },
      {
        id: "topic-validation-1",
        content: "Input validation and data sanitization",
        keywords: ["validation", "input", "security"],
        confidence: 0.7,
        timestamp: new Date().toISOString(),
      },
      {
        id: "topic-database-1",
        content: "Database query optimization",
        keywords: ["database", "sql", "performance"],
        confidence: 0.9,
        timestamp: new Date().toISOString(),
      },
    ];

    beforeEach(async () => {
      // Store test topics
      for (const topic of testTopics) {
        await storeTopic(topic);
      }
    });

    test("returns topics matching query", async () => {
      const results = await searchSimilarTopics("authentication login");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("topic");
      expect(results[0]).toHaveProperty("similarity");
    });

    test("returns topics sorted by similarity descending", async () => {
      const results = await searchSimilarTopics("authentication security");

      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].similarity).toBeGreaterThanOrEqual(
            results[i].similarity,
          );
        }
      }
    });

    test("respects limit parameter", async () => {
      const results = await searchSimilarTopics("security", { limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    test("respects threshold parameter", async () => {
      // With a very high threshold, should return fewer or no results
      const highThreshold = await searchSimilarTopics(
        "random unrelated query",
        {
          threshold: 0.9,
        },
      );

      // With a low threshold, should return more results
      const lowThreshold = await searchSimilarTopics("random unrelated query", {
        threshold: 0.1,
      });

      expect(highThreshold.length).toBeLessThanOrEqual(lowThreshold.length);
    });

    test("returns TopicSearchResult with correct structure", async () => {
      const results = await searchSimilarTopics("database");

      if (results.length > 0) {
        const result = results[0];
        expect(result.topic).toBeDefined();
        expect(result.topic.id).toBeDefined();
        expect(result.topic.content).toBeDefined();
        expect(result.topic.keywords).toBeDefined();
        expect(typeof result.similarity).toBe("number");
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      }
    });

    test("similarity scores are between 0 and 1", async () => {
      const results = await searchSimilarTopics("security validation");

      for (const result of results) {
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("semantic matching quality", () => {
    beforeEach(async () => {
      // Store topics with distinct domains
      const topics: Topic[] = [
        {
          id: "topic-frontend-1",
          content: "React component state management and hooks",
          keywords: ["react", "frontend", "state"],
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        },
        {
          id: "topic-backend-1",
          content: "REST API endpoint design and implementation",
          keywords: ["api", "backend", "rest"],
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        },
        {
          id: "topic-testing-1",
          content: "Unit testing strategies and test coverage",
          keywords: ["testing", "unit", "coverage"],
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        },
      ];

      for (const topic of topics) {
        await storeTopic(topic);
      }
    });

    test("query about frontend returns frontend-related topics first", async () => {
      const results = await searchSimilarTopics("react components");

      // Should find results
      expect(results.length).toBeGreaterThan(0);

      // First result should be related to frontend/React
      const firstTopic = results[0]?.topic;
      if (firstTopic) {
        expect(
          firstTopic.content.toLowerCase().includes("react") ||
            firstTopic.keywords.includes("react") ||
            firstTopic.keywords.includes("frontend"),
        ).toBe(true);
      }
    });

    test("query about API returns backend-related topics first", async () => {
      const results = await searchSimilarTopics("API endpoints REST");

      expect(results.length).toBeGreaterThan(0);

      const firstTopic = results[0]?.topic;
      if (firstTopic) {
        expect(
          firstTopic.content.toLowerCase().includes("api") ||
            firstTopic.keywords.includes("api") ||
            firstTopic.keywords.includes("backend"),
        ).toBe(true);
      }
    });
  });

  describe("edge cases", () => {
    test("handles special characters in query", async () => {
      // Should not throw
      const results = await searchSimilarTopics("test@#$%^&*()");
      expect(Array.isArray(results)).toBe(true);
    });

    test("handles very long query", async () => {
      const longQuery = "test ".repeat(1000);
      // Should not throw
      const results = await searchSimilarTopics(longQuery);
      expect(Array.isArray(results)).toBe(true);
    });

    test("handles unicode characters", async () => {
      const results = await searchSimilarTopics("认证 аутентификация 認証");
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
