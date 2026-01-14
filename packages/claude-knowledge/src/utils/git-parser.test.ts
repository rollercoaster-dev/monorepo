import { describe, expect, it } from "bun:test";
import {
  parseIssueNumber,
  parseModifiedFiles,
  parseRecentCommits,
  parseConventionalCommit,
  extractBranchKeywords,
} from "./git-parser";

describe("git-parser", () => {
  describe("parseIssueNumber", () => {
    it("should parse issue-N format", () => {
      expect(parseIssueNumber("issue-123")).toBe(123);
      expect(parseIssueNumber("issue-1")).toBe(1);
    });

    it("should parse feat/issue-N format", () => {
      expect(parseIssueNumber("feat/issue-367-session-hooks")).toBe(367);
      expect(parseIssueNumber("fix/issue-42-bug")).toBe(42);
    });

    it("should parse feature/N-description format", () => {
      expect(parseIssueNumber("feat/123-add-feature")).toBe(123);
      expect(parseIssueNumber("fix/456-fix-bug")).toBe(456);
    });

    it("should parse #N format", () => {
      expect(parseIssueNumber("branch-with-#789")).toBe(789);
    });

    it("should return undefined for branches without issue numbers", () => {
      expect(parseIssueNumber("main")).toBeUndefined();
      expect(parseIssueNumber("develop")).toBeUndefined();
      expect(parseIssueNumber("feature/add-logging")).toBeUndefined();
    });

    it("should handle empty or invalid input", () => {
      expect(parseIssueNumber("")).toBeUndefined();
      expect(parseIssueNumber("   ")).toBeUndefined();
    });

    it("should handle case insensitivity", () => {
      expect(parseIssueNumber("ISSUE-123")).toBe(123);
      expect(parseIssueNumber("FEAT/ISSUE-456")).toBe(456);
    });
  });

  describe("parseModifiedFiles", () => {
    it("should parse modified files", () => {
      // Using explicit strings to avoid template literal whitespace issues
      const output = " M src/index.ts\n M src/types.ts";
      expect(parseModifiedFiles(output)).toEqual([
        "src/index.ts",
        "src/types.ts",
      ]);
    });

    it("should parse added files", () => {
      const output = "A  src/new-file.ts\nAM src/another.ts";
      expect(parseModifiedFiles(output)).toEqual([
        "src/new-file.ts",
        "src/another.ts",
      ]);
    });

    it("should parse deleted files", () => {
      const output = " D src/old-file.ts";
      expect(parseModifiedFiles(output)).toEqual(["src/old-file.ts"]);
    });

    it("should parse renamed files (return new name)", () => {
      const output = "R  src/old.ts -> src/new.ts";
      expect(parseModifiedFiles(output)).toEqual(["src/new.ts"]);
    });

    it("should handle mixed statuses", () => {
      const output = [
        " M src/modified.ts",
        "A  src/added.ts",
        " D src/deleted.ts",
        "R  src/renamed.ts -> src/renamed-new.ts",
      ].join("\n");
      expect(parseModifiedFiles(output)).toEqual([
        "src/modified.ts",
        "src/added.ts",
        "src/deleted.ts",
        "src/renamed-new.ts",
      ]);
    });

    it("should return empty array for empty input", () => {
      expect(parseModifiedFiles("")).toEqual([]);
      expect(parseModifiedFiles("   ")).toEqual([]);
    });

    it("should skip empty lines", () => {
      const output = " M src/file1.ts\n\n M src/file2.ts";
      expect(parseModifiedFiles(output)).toEqual([
        "src/file1.ts",
        "src/file2.ts",
      ]);
    });
  });

  describe("parseRecentCommits", () => {
    it("should parse oneline git log output", () => {
      // Note: Git SHAs are hex only (0-9, a-f)
      const output = [
        "abc1234 feat(scope): add feature",
        "def5678 fix: fix bug",
        "9012abc docs: update readme",
      ].join("\n");
      const commits = parseRecentCommits(output);
      expect(commits).toEqual([
        { sha: "abc1234", message: "feat(scope): add feature" },
        { sha: "def5678", message: "fix: fix bug" },
        { sha: "9012abc", message: "docs: update readme" },
      ]);
    });

    it("should handle full SHA hashes", () => {
      const output =
        "abc1234567890abcdef1234567890abcdef123456 long commit message";
      const commits = parseRecentCommits(output);
      expect(commits).toEqual([
        {
          sha: "abc1234567890abcdef1234567890abcdef123456",
          message: "long commit message",
        },
      ]);
    });

    it("should return empty array for empty input", () => {
      expect(parseRecentCommits("")).toEqual([]);
      expect(parseRecentCommits("   ")).toEqual([]);
    });

    it("should skip empty lines", () => {
      const output = "abc1234 first commit\n\ndef5678 second commit";
      expect(parseRecentCommits(output)).toEqual([
        { sha: "abc1234", message: "first commit" },
        { sha: "def5678", message: "second commit" },
      ]);
    });
  });

  describe("parseConventionalCommit", () => {
    it("should parse feat commits with scope", () => {
      const result = parseConventionalCommit(
        "feat(claude-knowledge): add session hooks",
      );
      expect(result).toEqual({
        type: "feat",
        scope: "claude-knowledge",
        description: "add session hooks",
      });
    });

    it("should parse fix commits without scope", () => {
      const result = parseConventionalCommit("fix: resolve null pointer");
      expect(result).toEqual({
        type: "fix",
        scope: undefined,
        description: "resolve null pointer",
      });
    });

    it("should parse all conventional commit types", () => {
      const types = [
        "feat",
        "fix",
        "refactor",
        "test",
        "docs",
        "chore",
        "build",
        "ci",
        "perf",
        "style",
      ];

      for (const type of types) {
        const result = parseConventionalCommit(`${type}: description`);
        expect(result?.type).toBe(type);
      }
    });

    it("should return null for non-conventional commits", () => {
      expect(parseConventionalCommit("WIP: work in progress")).toBeNull();
      expect(parseConventionalCommit("Merge branch main")).toBeNull();
      expect(parseConventionalCommit("random commit message")).toBeNull();
    });

    it("should handle empty or invalid input", () => {
      expect(parseConventionalCommit("")).toBeNull();
    });

    it("should be case insensitive for type", () => {
      const result = parseConventionalCommit("FEAT(scope): uppercase type");
      expect(result?.type).toBe("feat");
    });
  });

  describe("extractBranchKeywords", () => {
    it("should extract keywords from standard branch names", () => {
      expect(extractBranchKeywords("feat/issue-476-session-context")).toEqual([
        "session",
        "context",
      ]);
      expect(extractBranchKeywords("fix/issue-123-null-check")).toEqual([
        "null",
        "check",
      ]);
    });

    it("should filter common prefixes", () => {
      // All of these are filtered out
      expect(extractBranchKeywords("feat/issue-123")).toEqual([]);
      expect(extractBranchKeywords("fix/bugfix-hotfix")).toEqual([]);
      expect(extractBranchKeywords("chore/refactor-test")).toEqual([]);
    });

    it("should filter issue numbers", () => {
      expect(extractBranchKeywords("feat/476-doc-search")).toEqual([
        "doc",
        "search",
      ]);
      expect(extractBranchKeywords("fix/999-handle-error")).toEqual([
        "handle",
        "error",
      ]);
    });

    it("should filter short parts (2 chars or less)", () => {
      expect(extractBranchKeywords("feat/a-b-c-doc-api")).toEqual([
        "doc",
        "api",
      ]);
    });

    it("should handle empty or undefined input", () => {
      expect(extractBranchKeywords(undefined)).toEqual([]);
      expect(extractBranchKeywords("")).toEqual([]);
    });

    it("should lowercase keywords", () => {
      expect(extractBranchKeywords("FEAT/ISSUE-123-SESSION-CONTEXT")).toEqual([
        "session",
        "context",
      ]);
    });

    it("should handle branches without issue numbers", () => {
      expect(extractBranchKeywords("feature/add-authentication")).toEqual([
        "add",
        "authentication",
      ]);
      expect(extractBranchKeywords("main")).toEqual(["main"]);
    });

    it("should handle complex branch names", () => {
      expect(
        extractBranchKeywords("feat/issue-476-session-doc-injection-context"),
      ).toEqual(["session", "doc", "injection", "context"]);
    });
  });
});
