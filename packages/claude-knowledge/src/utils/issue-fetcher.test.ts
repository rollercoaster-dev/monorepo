import { describe, expect, it, beforeEach, mock } from "bun:test";
import {
  fetchIssueContext,
  clearIssueCache,
  getIssueCacheSize,
} from "./issue-fetcher";

describe("issue-fetcher", () => {
  beforeEach(() => {
    // Clear cache before each test
    clearIssueCache();
  });

  describe("fetchIssueContext", () => {
    it("should parse issue metadata from gh CLI output", async () => {
      // Mock Bun.spawn to return fake issue data
      const mockIssueData = {
        title: "feat(claude-knowledge): enhance session doc injection",
        body: "## Summary\n\nEnhance the session documentation injection hook...",
        labels: [
          { name: "enhancement" },
          { name: "pkg:claude-knowledge" },
          { name: "priority:medium" },
        ],
      };

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = mock(() => ({
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify(mockIssueData)),
            );
            controller.close();
          },
        }),
        stderr: new ReadableStream(),
      }));

      try {
        const context = await fetchIssueContext(476);

        expect(context).toBeDefined();
        expect(context?.title).toBe(mockIssueData.title);
        // Labels should be parsed: pkg:claude-knowledge → claude-knowledge
        expect(context?.labels).toContain("claude-knowledge");
        expect(context?.labels).toContain("medium");
        // Keywords should be extracted from title
        expect(context?.keywords.length).toBeGreaterThan(0);
      } finally {
        Bun.spawn = originalSpawn;
      }
    });

    it("should cache results and return cached data on subsequent calls", async () => {
      const mockIssueData = {
        title: "Test issue",
        body: "Test body",
        labels: [],
      };

      let callCount = 0;
      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = mock(() => {
        callCount++;
        return {
          exited: Promise.resolve(0),
          stdout: new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(JSON.stringify(mockIssueData)),
              );
              controller.close();
            },
          }),
          stderr: new ReadableStream(),
        };
      });

      try {
        // First call should fetch
        await fetchIssueContext(123);
        expect(callCount).toBe(1);
        expect(getIssueCacheSize()).toBe(1);

        // Second call should use cache
        await fetchIssueContext(123);
        expect(callCount).toBe(1); // Still 1 - used cache
        expect(getIssueCacheSize()).toBe(1);

        // Different issue should fetch again
        await fetchIssueContext(456);
        expect(callCount).toBe(2);
        expect(getIssueCacheSize()).toBe(2);
      } finally {
        Bun.spawn = originalSpawn;
      }
    });

    it("should return undefined when gh CLI fails", async () => {
      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = mock(() => ({
        exited: Promise.resolve(1), // Non-zero exit code
        stdout: new ReadableStream(),
        stderr: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("Issue not found"));
            controller.close();
          },
        }),
      }));

      try {
        const context = await fetchIssueContext(99999);
        expect(context).toBeUndefined();
      } finally {
        Bun.spawn = originalSpawn;
      }
    });

    it("should return undefined when JSON parsing fails", async () => {
      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = mock(() => ({
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("not valid json"));
            controller.close();
          },
        }),
        stderr: new ReadableStream(),
      }));

      try {
        const context = await fetchIssueContext(123);
        expect(context).toBeUndefined();
      } finally {
        Bun.spawn = originalSpawn;
      }
    });

    it("should extract keywords from title and body", async () => {
      const mockIssueData = {
        title: "Add authentication middleware for API endpoints",
        body: "We need to implement JWT-based authentication for securing the REST API.",
        labels: [],
      };

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = mock(() => ({
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify(mockIssueData)),
            );
            controller.close();
          },
        }),
        stderr: new ReadableStream(),
      }));

      try {
        const context = await fetchIssueContext(123);

        expect(context?.keywords).toContain("authentication");
        expect(context?.keywords).toContain("middleware");
        expect(context?.keywords).toContain("api");
        expect(context?.keywords).toContain("endpoints");
        // Stop words should be filtered
        expect(context?.keywords).not.toContain("the");
        expect(context?.keywords).not.toContain("for");
      } finally {
        Bun.spawn = originalSpawn;
      }
    });

    it("should parse label prefixes correctly", async () => {
      const mockIssueData = {
        title: "Test",
        body: "",
        labels: [
          { name: "pkg:openbadges-types" },
          { name: "type:feature" },
          { name: "priority:high" },
          { name: "enhancement" }, // No prefix - should be filtered as common
          { name: "custom-label" }, // No prefix - should be included
        ],
      };

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = mock(() => ({
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify(mockIssueData)),
            );
            controller.close();
          },
        }),
        stderr: new ReadableStream(),
      }));

      try {
        const context = await fetchIssueContext(123);

        expect(context?.labels).toContain("openbadges-types");
        expect(context?.labels).toContain("feature");
        expect(context?.labels).toContain("high");
        expect(context?.labels).toContain("custom-label");
        // Common labels should be filtered
        expect(context?.labels).not.toContain("enhancement");
      } finally {
        Bun.spawn = originalSpawn;
      }
    });
  });

  describe("clearIssueCache", () => {
    it("should clear all cached entries", async () => {
      const mockIssueData = { title: "Test", body: "", labels: [] };

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = mock(() => ({
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify(mockIssueData)),
            );
            controller.close();
          },
        }),
        stderr: new ReadableStream(),
      }));

      try {
        await fetchIssueContext(1);
        await fetchIssueContext(2);
        expect(getIssueCacheSize()).toBe(2);

        clearIssueCache();
        expect(getIssueCacheSize()).toBe(0);
      } finally {
        Bun.spawn = originalSpawn;
      }
    });
  });
});
