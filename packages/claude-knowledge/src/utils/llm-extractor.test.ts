/**
 * Tests for LLM-based learning extraction.
 */

/* eslint-disable no-undef */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { extractLearningsFromTranscript } from "./llm-extractor";
import { mkdirSync, writeFileSync, rmSync, utimesSync } from "fs";
import { homedir } from "os";
import { join } from "path";

describe("extractLearningsFromTranscript", () => {
  const originalEnv = process.env.OPENROUTER_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Set up API key for tests
    process.env.OPENROUTER_API_KEY = "test-api-key";
  });

  afterEach(() => {
    // Restore original env and fetch
    process.env.OPENROUTER_API_KEY = originalEnv;
    global.fetch = originalFetch;
  });

  it("should return empty array when API key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const startTime = new Date("2026-01-25T10:00:00Z");
    const endTime = new Date("2026-01-25T11:00:00Z");
    const result = await extractLearningsFromTranscript(startTime, endTime);

    expect(result).toEqual([]);
  });

  it("should return empty array when no transcripts in time range", async () => {
    // Use a time range in the far past with no transcripts
    const startTime = new Date("2000-01-01T00:00:00Z");
    const endTime = new Date("2000-01-01T01:00:00Z");
    const result = await extractLearningsFromTranscript(startTime, endTime);

    expect(result).toEqual([]);
  });

  // Integration tests with real temp transcript file
  describe("with transcript file", () => {
    let testProjectDir: string;
    let testTranscriptPath: string;
    let testFileTime: number;
    let startTime: Date;
    let endTime: Date;

    beforeEach(() => {
      // Generate unique IDs for each test
      const timestamp = Date.now();
      testProjectDir = join(
        homedir(),
        ".claude",
        "projects",
        `test-llm-extract-${timestamp}`,
      );
      testTranscriptPath = join(testProjectDir, "session-test.jsonl");

      // Create temp directory and transcript file
      mkdirSync(testProjectDir, { recursive: true });

      // Write a minimal transcript in Claude Code's JSONL format
      const transcript = [
        {
          type: "user",
          message: {
            role: "user",
            content: "How do I fix this CSS issue?",
          },
        },
        {
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "The problem is that CSS variables fail silently when undefined.",
              },
            ],
          },
        },
      ];
      writeFileSync(
        testTranscriptPath,
        transcript.map((m) => JSON.stringify(m)).join("\n"),
      );

      // Set file mtime to a specific time and create time range around it
      testFileTime = timestamp;
      utimesSync(
        testTranscriptPath,
        new Date(testFileTime),
        new Date(testFileTime),
      );

      // Time range that includes this file
      startTime = new Date(testFileTime - 5000); // 5 seconds before
      endTime = new Date(testFileTime + 5000); // 5 seconds after
    });

    afterEach(() => {
      // Clean up temp directory
      try {
        rmSync(testProjectDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should extract learnings from transcript with valid API response", async () => {
      const mockLearnings = [
        {
          content: "CSS variables fail silently when undefined",
          codeArea: "CSS",
        },
      ];

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockLearnings),
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      ) as unknown as typeof fetch;

      const result = await extractLearningsFromTranscript(startTime, endTime);

      // Should return learnings with proper structure
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(
        "CSS variables fail silently when undefined",
      );
      expect(result[0].codeArea).toBe("CSS");
      expect(result[0].confidence).toBe(0.8); // LLM_EXTRACT_CONFIDENCE
      expect(result[0].id).toMatch(/^learning-llm-/);
      expect(result[0].metadata?.source).toBe("llm-extracted");
    });

    it("should filter out learnings with empty content", async () => {
      const mockLearnings = [
        { content: "Valid learning", codeArea: "test" },
        { content: "", codeArea: "test" }, // Should be filtered
        { content: "   ", codeArea: "test" }, // Should be filtered (whitespace only)
        { content: "Another valid", codeArea: "test" },
      ];

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockLearnings),
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      ) as unknown as typeof fetch;

      const result = await extractLearningsFromTranscript(startTime, endTime);

      // Should only have 2 valid learnings (empty and whitespace filtered)
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Valid learning");
      expect(result[1].content).toBe("Another valid");
    });

    // Error handling tests - now properly exercise the fetch path
    describe("error handling", () => {
      it("should handle timeout errors gracefully", async () => {
        // Simulate AbortError (what AbortController throws on timeout)
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";
        global.fetch = mock(() =>
          Promise.reject(abortError),
        ) as unknown as typeof fetch;

        const result = await extractLearningsFromTranscript(startTime, endTime);

        // Should return empty array (graceful degradation) rather than throwing
        expect(result).toEqual([]);
      });

      it("should handle network errors gracefully", async () => {
        global.fetch = mock(() => {
          throw new Error("Network connection failed");
        }) as unknown as typeof fetch;

        const result = await extractLearningsFromTranscript(startTime, endTime);

        expect(result).toEqual([]);
      });

      it("should handle 401 authentication errors", async () => {
        global.fetch = mock(() =>
          Promise.resolve(
            new Response("Unauthorized", {
              status: 401,
              headers: { "Content-Type": "text/plain" },
            }),
          ),
        ) as unknown as typeof fetch;

        const result = await extractLearningsFromTranscript(startTime, endTime);

        expect(result).toEqual([]);
      });

      it("should handle 429 rate limit errors", async () => {
        global.fetch = mock(() =>
          Promise.resolve(
            new Response("Rate limit exceeded", {
              status: 429,
              headers: { "Content-Type": "text/plain" },
            }),
          ),
        ) as unknown as typeof fetch;

        const result = await extractLearningsFromTranscript(startTime, endTime);

        expect(result).toEqual([]);
      });

      it("should handle 500 service errors", async () => {
        global.fetch = mock(() =>
          Promise.resolve(
            new Response("Internal server error", {
              status: 500,
              headers: { "Content-Type": "text/plain" },
            }),
          ),
        ) as unknown as typeof fetch;

        const result = await extractLearningsFromTranscript(startTime, endTime);

        expect(result).toEqual([]);
      });
    });

    // Malformed response tests - now properly exercise the parsing code
    describe("malformed responses", () => {
      it("should handle malformed JSON response", async () => {
        global.fetch = mock(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                choices: [
                  {
                    message: {
                      content: "not valid json",
                    },
                  },
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          ),
        ) as unknown as typeof fetch;

        const result = await extractLearningsFromTranscript(startTime, endTime);

        expect(result).toEqual([]);
      });

      it("should handle empty response content", async () => {
        global.fetch = mock(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                choices: [
                  {
                    message: {},
                  },
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          ),
        ) as unknown as typeof fetch;

        const result = await extractLearningsFromTranscript(startTime, endTime);

        expect(result).toEqual([]);
      });

      it("should handle response with non-array learnings", async () => {
        global.fetch = mock(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                choices: [
                  {
                    message: {
                      content: '{"learning": "single object, not array"}',
                    },
                  },
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          ),
        ) as unknown as typeof fetch;

        const result = await extractLearningsFromTranscript(startTime, endTime);

        expect(result).toEqual([]);
      });
    });

    it("should combine multiple transcripts in time range", async () => {
      // Create a second transcript file
      const transcript2Path = join(testProjectDir, "session-test-2.jsonl");
      const transcript2 = [
        {
          type: "user",
          message: { role: "user", content: "Another question" },
        },
        {
          type: "assistant",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Another insight" }],
          },
        },
      ];
      writeFileSync(
        transcript2Path,
        transcript2.map((m) => JSON.stringify(m)).join("\n"),
      );
      utimesSync(
        transcript2Path,
        new Date(testFileTime),
        new Date(testFileTime),
      );

      const mockLearnings = [
        { content: "Learning from combined transcripts", codeArea: "test" },
      ];

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockLearnings),
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      ) as unknown as typeof fetch;

      const result = await extractLearningsFromTranscript(startTime, endTime);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Learning from combined transcripts");
    });
  });
});
