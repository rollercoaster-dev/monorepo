import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { hooks } from "./hooks";
import { knowledge } from "./knowledge";
import { checkpoint } from "./checkpoint";
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
      // summary only contains workflow state now (empty when no workflow)
      expect(result.summary).toBe("");
    });

    it("should return empty arrays since knowledge queries moved to context-builder", async () => {
      // Knowledge queries were moved to context-builder.ts.
      // onSessionStart() now only handles JSONL imports, workflow state, and metadata.
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

      // All knowledge arrays are empty — context builder owns display
      expect(result.learnings).toEqual([]);
      expect(result.patterns).toEqual([]);
      expect(result.mistakes).toEqual([]);
      expect(result.topics).toEqual([]);
      expect(result.docs).toEqual([]);
    });

    it("should include workflow state when workflow exists for issue", async () => {
      // Create a workflow for issue 123
      const workflow = checkpoint.create(123, "feat/issue-123-test");

      // Log some actions to the workflow
      checkpoint.logAction(workflow.id, "phase_transition", "success", {
        from: "research",
        to: "implement",
      });
      checkpoint.logAction(workflow.id, "spawned_agent", "success", {
        agent: "atomic-developer",
      });

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        branch: "feat/issue-123-test",
        issueNumber: 123,
      });

      expect(result._workflowState).toBeDefined();
      expect(result._workflowState!.issueNumber).toBe(123);
      expect(result._workflowState!.branch).toBe("feat/issue-123-test");
      expect(result._workflowState!.phase).toBe("research"); // Initial phase
      expect(result._workflowState!.status).toBe("running");
      expect(result._workflowState!.recentActions.length).toBeGreaterThan(0);
    });

    it("should include workflow state in summary when workflow exists", async () => {
      // Create a workflow for issue 456
      checkpoint.create(456, "feat/issue-456-feature");

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        branch: "feat/issue-456-feature",
        issueNumber: 456,
      });

      // Summary should include workflow section
      expect(result.summary).toContain("## Active Workflow");
      expect(result.summary).toContain("Issue:** #456");
      expect(result.summary).toContain("feat/issue-456-feature");
      expect(result.summary).toContain("Phase:**");
    });

    it("should fall back to active workflow when issue number not provided", async () => {
      // Create an active workflow
      checkpoint.create(789, "feat/issue-789-active");

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        // No branch or issue number provided
      });

      // Should find the active workflow
      expect(result._workflowState).toBeDefined();
      expect(result._workflowState!.issueNumber).toBe(789);
    });

    it("should not include workflow state when no workflows exist", async () => {
      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        branch: "feat/issue-999-nonexistent",
        issueNumber: 999,
      });

      expect(result._workflowState).toBeUndefined();
      // Summary should not contain workflow section
      expect(result.summary).not.toContain("## Active Workflow");
    });

    it("should include recent actions in workflow state (max 5)", async () => {
      // Create a workflow with many actions
      const workflow = checkpoint.create(111, "feat/issue-111-many-actions");

      // Log 7 actions
      for (let i = 0; i < 7; i++) {
        checkpoint.logAction(workflow.id, `action_${i}`, "success", {
          index: i,
        });
      }

      const result = await hooks.onSessionStart({
        workingDir: "/test/project",
        issueNumber: 111,
      });

      expect(result._workflowState).toBeDefined();
      // Should only include last 5 actions
      expect(result._workflowState!.recentActions.length).toBeLessThanOrEqual(
        5,
      );
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
