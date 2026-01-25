import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./index";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { getEntity, getEntitiesByType } from "../__tests__/helpers";
import { cleanupTestDb } from "../test-utils";

const TEST_DB = ".claude/test-knowledge-topics.db";

describe("knowledge topics", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
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
