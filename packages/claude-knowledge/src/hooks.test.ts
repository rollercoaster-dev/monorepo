import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { hooks } from "./hooks";
import { knowledge } from "./knowledge";
import { resetDatabase, closeDatabase } from "./db/sqlite";
import { resetDefaultEmbedder } from "./embeddings";
import { unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const TEST_DB = join(tmpdir(), "test-hooks.db");

describe("hooks", () => {
  beforeEach(() => {
    // Reset embedder to ensure clean state (other tests may reset it)
    resetDefaultEmbedder();
    // Clean up and reset test database
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
    resetDatabase(TEST_DB);
  });

  afterEach(() => {
    // Close database after each test
    closeDatabase();
    // Reset embedder to clean up
    resetDefaultEmbedder();
    // Clean up test database file
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
  });

  describe("onSessionStart", () => {
    it("should return empty context when no data in knowledge graph", async () => {
      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        branch: "feat/issue-123-test",
        modifiedFiles: ["src/index.ts"],
      });

      expect(result.learnings).toEqual([]);
      expect(result.patterns).toEqual([]);
      expect(result.mistakes).toEqual([]);
      expect(result.summary).toContain("No relevant knowledge found");
    });

    it("should parse issue number from branch name", async () => {
      // Store a learning with issue number
      await knowledge.store([
        {
          id: "learning-1",
          content: "Test learning for issue 456",
          sourceIssue: 456,
        },
      ]);

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        branch: "feat/issue-456-test-feature",
      });

      expect(result.learnings.length).toBe(1);
      expect(result.learnings[0].learning.sourceIssue).toBe(456);
      expect(result.summary).toContain("Issue #456");
    });

    it("should use provided issue number over branch parsing", async () => {
      await knowledge.store([
        {
          id: "learning-1",
          content: "Learning for issue 100",
          sourceIssue: 100,
        },
        {
          id: "learning-2",
          content: "Learning for issue 200",
          sourceIssue: 200,
        },
      ]);

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        branch: "feat/issue-200-other",
        issueNumber: 100, // Explicitly provided
      });

      // Should prioritize the provided issueNumber
      expect(result.learnings.some((l) => l.learning.sourceIssue === 100)).toBe(
        true,
      );
    });

    it("should infer code area from modified files", async () => {
      await knowledge.store([
        {
          id: "learning-1",
          content: "Database best practice",
          codeArea: "Database",
        },
      ]);

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        modifiedFiles: [
          "apps/openbadges-modular-server/src/db/queries.ts",
          "apps/openbadges-modular-server/src/db/migrations.ts",
        ],
      });

      expect(result.learnings.length).toBe(1);
      expect(result.learnings[0].learning.codeArea).toBe("Database");
      expect(result.summary).toContain("Area: Database");
    });

    it("should get patterns for code areas", async () => {
      await knowledge.storePattern({
        id: "pattern-1",
        name: "SQL Injection Prevention",
        description: "Use parameterized queries",
        codeArea: "Database",
      });

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        modifiedFiles: ["src/db/queries.ts"],
      });

      expect(result.patterns.length).toBe(1);
      expect(result.patterns[0].name).toBe("SQL Injection Prevention");
      expect(result.summary).toContain("SQL Injection Prevention");
    });

    it("should get mistakes for modified files", async () => {
      await knowledge.storeMistake({
        id: "mistake-1",
        description: "Used string concatenation in SQL",
        howFixed: "Used parameterized queries",
        filePath: "src/db/queries.ts",
      });

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        modifiedFiles: ["src/db/queries.ts"],
      });

      expect(result.mistakes.length).toBe(1);
      expect(result.mistakes[0].description).toBe(
        "Used string concatenation in SQL",
      );
      // New formatter uses "Past Mistakes in Current Files" for modified files
      expect(result.summary).toContain("Past Mistakes in Current Files");
    });

    it("should deduplicate learnings from multiple queries", async () => {
      // Store learning with both issue and code area
      await knowledge.store([
        {
          id: "learning-shared",
          content: "Shared learning",
          sourceIssue: 100,
          codeArea: "Testing",
        },
      ]);

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        branch: "feat/issue-100-test",
        modifiedFiles: ["src/__tests__/example.test.ts"],
        issueNumber: 100,
      });

      // Should only appear once despite matching issue and code area
      expect(result.learnings.length).toBe(1);
    });

    it("should format summary with all sections", async () => {
      await knowledge.store([
        {
          id: "learning-1",
          content: "Important learning",
          sourceIssue: 123,
          codeArea: "API",
        },
      ]);

      await knowledge.storePattern({
        id: "pattern-1",
        name: "REST Pattern",
        description: "Use proper HTTP methods",
        codeArea: "API",
      });

      await knowledge.storeMistake({
        id: "mistake-1",
        description: "Wrong HTTP method",
        howFixed: "Used POST for mutations",
        filePath: "src/api/routes.ts",
      });

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        branch: "feat/issue-123-api",
        modifiedFiles: ["src/api/routes.ts"],
      });

      expect(result.summary).toContain("## Relevant Knowledge");
      // New formatter uses "Code Area:" instead of "### Learnings"
      expect(result.summary).toContain("### Code Area:");
      expect(result.summary).toContain("### Patterns");
      // Mistakes in modified files use different header
      expect(result.summary).toContain("Past Mistakes in Current Files");
      expect(result.summary).toContain("[#123]");
      expect(result.summary).toContain("REST Pattern");
      expect(result.summary).toContain("Wrong HTTP method");
    });

    it("should handle empty context gracefully", async () => {
      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
      });

      expect(result.learnings).toEqual([]);
      expect(result.patterns).toEqual([]);
      expect(result.mistakes).toEqual([]);
      expect(result.summary).toContain("No relevant knowledge found");
    });

    it("should respect max limits", async () => {
      // Store more learnings than the limit
      const learnings = Array.from({ length: 15 }, (_, i) => ({
        id: `learning-${i}`,
        content: `Learning ${i}`,
        sourceIssue: 100,
      }));

      await knowledge.store(learnings);

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        issueNumber: 100,
      });

      // Should be limited to MAX_LEARNINGS (10)
      expect(result.learnings.length).toBeLessThanOrEqual(10);
    });

    it("should query and return relevant topics", async () => {
      // Store topics with keywords that match code area "Authentication"
      await knowledge.storeTopic({
        id: "topic-auth-1",
        content: "Worked on authentication: OAuth integration",
        keywords: ["Authentication", "oauth"],
        timestamp: new Date().toISOString(),
        confidence: 0.8,
      });

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        modifiedFiles: ["src/auth/login.ts"], // Will infer Authentication code area
      });

      expect(result.topics).toBeDefined();
      expect(result.topics!.length).toBeGreaterThan(0);
      expect(result.topics![0].content).toContain("OAuth");
    });

    it("should include topics in formatted summary", async () => {
      await knowledge.storeTopic({
        id: "topic-db-1",
        content: "Database schema discussion: normalized tables",
        keywords: ["Database", "schema"],
        timestamp: new Date().toISOString(),
      });

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        modifiedFiles: ["src/db/schema.ts"],
      });

      expect(result.summary).toContain("Recent Conversation Topics");
      expect(result.summary).toContain("normalized tables");
    });

    it("should respect MAX_TOPICS limit", async () => {
      // Store more topics than the limit (MAX_TOPICS = 5)
      const topics = Array.from({ length: 10 }, (_, i) => ({
        id: `topic-${i}`,
        content: `Topic ${i} about testing`,
        keywords: ["Testing"],
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
      }));

      for (const topic of topics) {
        await knowledge.storeTopic(topic);
      }

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        modifiedFiles: ["src/__tests__/example.test.ts"], // Will infer "Testing" code area
      });

      expect(result.topics!.length).toBeLessThanOrEqual(5);
    });

    it("should query topics using code areas as keywords", async () => {
      await knowledge.storeTopic({
        id: "topic-api-1",
        content: "API design patterns discussion",
        keywords: ["API", "patterns"],
        timestamp: new Date().toISOString(),
      });

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        modifiedFiles: ["src/api/routes.ts"], // Will infer "API" code area
      });

      // Should find topic via code area "API" keyword match
      expect(result.topics!.length).toBeGreaterThan(0);
    });

    it("should return recent topics when no keywords match", async () => {
      await knowledge.storeTopic({
        id: "topic-recent-1",
        content: "Recent unrelated topic",
        keywords: ["unrelated"],
        timestamp: new Date().toISOString(),
      });

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        // No branch or modified files to generate keywords
      });

      // Should return recent topics as fallback
      expect(result.topics!.length).toBeGreaterThan(0);
    });
  });

  describe("onSessionEnd", () => {
    it("should extract learnings from conventional commits", async () => {
      const result = await hooks.onSessionEnd({
        commits: [
          { sha: "abc123", message: "feat(api): add user endpoint" },
          { sha: "def456", message: "fix(db): resolve connection leak" },
        ],
        modifiedFiles: [],
      });

      expect(result.learningsStored).toBe(2);
      expect(result.learningIds.length).toBe(2);

      // Verify learnings were stored and are queryable
      const apiLearnings = await knowledge.query({ codeArea: "api" });
      expect(apiLearnings.length).toBe(1);
      expect(apiLearnings[0].learning.content).toContain("add user endpoint");

      const dbLearnings = await knowledge.query({ codeArea: "db" });
      expect(dbLearnings.length).toBe(1);
      expect(dbLearnings[0].learning.content).toContain(
        "resolve connection leak",
      );
    });

    it("should skip non-conventional commits", async () => {
      const result = await hooks.onSessionEnd({
        commits: [
          { sha: "abc123", message: "feat(api): valid commit" },
          { sha: "def456", message: "WIP: work in progress" },
          { sha: "ghi789", message: "Merge branch main" },
        ],
        modifiedFiles: [],
      });

      // Only the conventional commit should be extracted
      expect(result.learningsStored).toBe(1);
    });

    it("should extract learnings from modified files", async () => {
      const result = await hooks.onSessionEnd({
        commits: [],
        modifiedFiles: [
          "src/db/queries.ts",
          "src/db/migrations.ts",
          "src/api/routes.ts",
        ],
      });

      // Should create learnings for Database and API areas
      expect(result.learningsStored).toBe(2);

      const dbLearnings = await knowledge.query({ codeArea: "Database" });
      expect(dbLearnings.length).toBe(1);
      expect(dbLearnings[0].learning.content).toContain("Database");

      const apiLearnings = await knowledge.query({ codeArea: "API" });
      expect(apiLearnings.length).toBe(1);
      expect(apiLearnings[0].learning.content).toContain("API");
    });

    it("should not duplicate learnings for same code area from commits and files", async () => {
      await hooks.onSessionEnd({
        commits: [{ sha: "abc123", message: "feat(Database): add query" }],
        modifiedFiles: ["src/db/queries.ts", "src/db/migrations.ts"],
      });

      // Should only create one learning for Database (from commit, not files)
      const dbLearnings = await knowledge.query({ codeArea: "Database" });
      expect(dbLearnings.length).toBe(1);
      expect(dbLearnings[0].learning.content).toContain("add query");
    });

    it("should set lower confidence for auto-extracted learnings", async () => {
      await hooks.onSessionEnd({
        commits: [{ sha: "abc123", message: "feat(api): add endpoint" }],
        modifiedFiles: [],
      });

      const learnings = await knowledge.query({ codeArea: "api" });
      expect(learnings[0].learning.confidence).toBeLessThan(1);
      expect(learnings[0].learning.confidence).toBeGreaterThan(0);
    });

    it("should include metadata for auto-extracted learnings", async () => {
      await hooks.onSessionEnd({
        commits: [{ sha: "abc123", message: "feat(api): add endpoint" }],
        modifiedFiles: [],
      });

      const learnings = await knowledge.query({ codeArea: "api" });
      expect(learnings[0].learning.metadata).toBeDefined();
      expect(learnings[0].learning.metadata?.source).toBe("auto-extracted");
      expect(learnings[0].learning.metadata?.commitSha).toBe("abc123");
    });

    it("should return empty result when no learnings extracted", async () => {
      const result = await hooks.onSessionEnd({
        commits: [
          { sha: "abc123", message: "random non-conventional message" },
        ],
        modifiedFiles: ["some/unknown/path.xyz"],
      });

      expect(result.learningsStored).toBe(0);
      expect(result.learningIds).toEqual([]);
    });

    it("should handle empty session gracefully", async () => {
      const result = await hooks.onSessionEnd({
        commits: [],
        modifiedFiles: [],
      });

      expect(result.learningsStored).toBe(0);
      expect(result.learningIds).toEqual([]);
    });

    it("should extract topics from commits with same scope", async () => {
      // Create 2+ commits with the same scope (threshold for topic creation)
      await hooks.onSessionEnd({
        commits: [
          { sha: "abc123", message: "feat(auth): add login" },
          { sha: "def456", message: "feat(auth): add logout" },
        ],
        modifiedFiles: [],
      });

      // Should create a topic for "auth" scope
      const topics = await knowledge.queryTopics({ keywords: ["auth"] });
      expect(topics.length).toBe(1);
      expect(topics[0].content).toContain("auth");
      expect(topics[0].keywords).toContain("auth");
    });

    it("should not create topic for single commit per scope", async () => {
      await hooks.onSessionEnd({
        commits: [
          { sha: "abc123", message: "feat(api): single commit" },
          { sha: "def456", message: "feat(db): different scope" },
        ],
        modifiedFiles: [],
      });

      // Neither scope has >= 2 commits, so no topics
      const apiTopics = await knowledge.queryTopics({ keywords: ["api"] });
      const dbTopics = await knowledge.queryTopics({ keywords: ["db"] });

      // Both should be empty - single commits don't create topics
      expect(apiTopics.length).toBe(0);
      expect(dbTopics.length).toBe(0);
    });

    it("should extract keywords from commit messages for topics", async () => {
      await hooks.onSessionEnd({
        commits: [
          {
            sha: "abc123",
            message: "feat(database): optimize query performance",
          },
          { sha: "def456", message: "feat(database): add caching layer" },
        ],
        modifiedFiles: [],
      });

      const topics = await knowledge.queryTopics({ keywords: ["database"] });
      expect(topics.length).toBe(1);
      // Keywords should include significant words from descriptions
      expect(topics[0].keywords).toContain("database");
    });

    it("should set auto-extract confidence on topics", async () => {
      await hooks.onSessionEnd({
        commits: [
          { sha: "abc123", message: "feat(testing): add unit tests" },
          { sha: "def456", message: "feat(testing): add integration tests" },
        ],
        modifiedFiles: [],
      });

      const topics = await knowledge.queryTopics({ keywords: ["testing"] });
      expect(topics.length).toBe(1);
      expect(topics[0].confidence).toBeLessThan(1);
      expect(topics[0].confidence).toBeGreaterThan(0);
    });

    it("should include session ID in extracted topics", async () => {
      await hooks.onSessionEnd({
        sessionId: "test-session-123",
        commits: [
          { sha: "abc123", message: "feat(api): endpoint 1" },
          { sha: "def456", message: "feat(api): endpoint 2" },
        ],
        modifiedFiles: [],
      });

      const topics = await knowledge.queryTopics({ keywords: ["api"] });
      expect(topics.length).toBe(1);
      expect(topics[0].sourceSession).toBe("test-session-123");
    });
  });
});
