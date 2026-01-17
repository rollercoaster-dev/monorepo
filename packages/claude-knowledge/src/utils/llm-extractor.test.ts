/**
 * Tests for LLM-based learning extraction.
 */

/* eslint-disable no-undef */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { extractLearningsFromTranscript } from "./llm-extractor";

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

    const result = await extractLearningsFromTranscript("test-session-id");

    expect(result).toEqual([]);
  });

  it("should return empty array when transcript not found", async () => {
    // getTranscriptPath returns null for non-existent transcripts
    const result = await extractLearningsFromTranscript("nonexistent-session");

    expect(result).toEqual([]);
  });

  it("should handle network errors gracefully", async () => {
    // Mock fetch to throw network error
    global.fetch = mock(() => {
      throw new Error("Network connection failed");
    });

    const result = await extractLearningsFromTranscript("test-session-id");

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
    );

    const result = await extractLearningsFromTranscript("test-session-id");

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
    );

    const result = await extractLearningsFromTranscript("test-session-id");

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
    );

    const result = await extractLearningsFromTranscript("test-session-id");

    expect(result).toEqual([]);
  });

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
    );

    const result = await extractLearningsFromTranscript("test-session-id");

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
    );

    const result = await extractLearningsFromTranscript("test-session-id");

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
    );

    const result = await extractLearningsFromTranscript("test-session-id");

    expect(result).toEqual([]);
  });

  // Note: Full extraction tests would require mocking getTranscriptPath and readFileSync
  // For now, these tests verify error handling paths which are most critical
});
