import { describe, test, expect, beforeEach, mock } from "bun:test";
import {
  OpenAIEmbedding,
  OpenRouterEmbedding,
  createEmbeddingProvider,
} from "./api-providers";

describe("OpenAIEmbedding", () => {
  beforeEach(() => {
    // Reset usage metrics before each test
    OpenAIEmbedding.resetUsageMetrics();
  });

  describe("constructor", () => {
    test("throws error when API key is missing", () => {
      expect(() => new OpenAIEmbedding("")).toThrow(
        "OpenAI API key is required",
      );
    });

    test("creates instance with valid API key", () => {
      const embedder = new OpenAIEmbedding("test-api-key");
      expect(embedder).toBeDefined();
      expect(embedder.dimensions).toBe(256); // default dimensions
    });

    test("respects custom dimensions", () => {
      const embedder = new OpenAIEmbedding("test-api-key", { dimensions: 512 });
      expect(embedder.dimensions).toBe(512);
    });

    test("respects custom model", () => {
      const embedder = new OpenAIEmbedding("test-api-key", {
        model: "text-embedding-3-large",
      });
      expect(embedder).toBeDefined();
    });
  });

  describe("generate", () => {
    test("returns zero vector for empty text", async () => {
      const embedder = new OpenAIEmbedding("test-api-key");
      const result = await embedder.generate("");
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(256);
      expect(result.every((v) => v === 0)).toBe(true);
    });

    test("returns zero vector for whitespace-only text", async () => {
      const embedder = new OpenAIEmbedding("test-api-key");
      const result = await embedder.generate("   ");
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.every((v) => v === 0)).toBe(true);
    });

    test("generates embedding with mocked API response", async () => {
      // Create mock embedding data
      const mockEmbedding = Array.from({ length: 256 }, (_, i) => i * 0.001);

      // Mock fetch
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: mockEmbedding }],
              usage: { prompt_tokens: 10, total_tokens: 10 },
            }),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        const result = await embedder.generate("test text");

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(256);
        expect(result[0]).toBeCloseTo(0);
        expect(result[100]).toBeCloseTo(0.1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("tracks usage metrics", async () => {
      const mockEmbedding = Array.from({ length: 256 }, () => 0.1);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: mockEmbedding }],
              usage: { prompt_tokens: 50, total_tokens: 50 },
            }),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await embedder.generate("test text for usage tracking");

        const metrics = OpenAIEmbedding.getUsageMetrics();
        expect(metrics.totalTokens).toBe(50);
        expect(metrics.requestCount).toBe(1);
        // Cost: 50 tokens / 1M * $0.02 = $0.000001
        expect(metrics.estimatedCostUsd).toBeCloseTo(0.000001, 8);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("accumulates usage metrics across multiple requests", async () => {
      const mockEmbedding = Array.from({ length: 256 }, () => 0.1);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: mockEmbedding }],
              usage: { prompt_tokens: 100, total_tokens: 100 },
            }),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await embedder.generate("first request");
        await embedder.generate("second request");
        await embedder.generate("third request");

        const metrics = OpenAIEmbedding.getUsageMetrics();
        expect(metrics.totalTokens).toBe(300);
        expect(metrics.requestCount).toBe(3);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("error handling", () => {
    test("throws specific error for 401 unauthorized", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Invalid API key"),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("invalid-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "OpenAI API authentication failed",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws specific error for 429 rate limit", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Rate limit exceeded"),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "rate limit exceeded",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws specific error for 5xx server errors", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          text: () => Promise.resolve("Service unavailable"),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "service error (503)",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws error for invalid API response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }), // No embedding in response
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "Invalid response from OpenAI embeddings API",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws error for network failure", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("Network connection failed")),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "OpenAI API network error: Network connection failed",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws error for JSON parse failure", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "Failed to parse OpenAI API response",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws specific error for 400 bad request", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Invalid input"),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "OpenAI API bad request",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("static methods", () => {
    test("getUsageMetrics returns copy of metrics", () => {
      const metrics1 = OpenAIEmbedding.getUsageMetrics();
      const metrics2 = OpenAIEmbedding.getUsageMetrics();
      expect(metrics1).not.toBe(metrics2); // Different object references
      expect(metrics1).toEqual(metrics2); // Same values
    });

    test("resetUsageMetrics clears all metrics", async () => {
      const mockEmbedding = Array.from({ length: 256 }, () => 0.1);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: mockEmbedding }],
              usage: { prompt_tokens: 100, total_tokens: 100 },
            }),
        } as Response),
      );

      try {
        const embedder = new OpenAIEmbedding("test-api-key");
        await embedder.generate("some text");

        // Verify metrics were tracked
        expect(OpenAIEmbedding.getUsageMetrics().totalTokens).toBeGreaterThan(
          0,
        );

        // Reset and verify
        OpenAIEmbedding.resetUsageMetrics();
        const metrics = OpenAIEmbedding.getUsageMetrics();
        expect(metrics.totalTokens).toBe(0);
        expect(metrics.requestCount).toBe(0);
        expect(metrics.estimatedCostUsd).toBe(0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});

describe("OpenRouterEmbedding", () => {
  beforeEach(() => {
    // Reset usage metrics before each test
    OpenRouterEmbedding.resetUsageMetrics();
  });

  describe("constructor", () => {
    test("throws error when API key is missing", () => {
      expect(() => new OpenRouterEmbedding("")).toThrow(
        "OpenRouter API key is required",
      );
    });

    test("creates instance with valid API key", () => {
      const embedder = new OpenRouterEmbedding("test-api-key");
      expect(embedder).toBeDefined();
      expect(embedder.dimensions).toBe(256); // default dimensions
    });

    test("respects custom dimensions", () => {
      const embedder = new OpenRouterEmbedding("test-api-key", {
        dimensions: 512,
      });
      expect(embedder.dimensions).toBe(512);
    });

    test("respects custom model", () => {
      const embedder = new OpenRouterEmbedding("test-api-key", {
        model: "openai/text-embedding-3-large",
      });
      expect(embedder).toBeDefined();
    });
  });

  describe("generate", () => {
    test("returns zero vector for empty text", async () => {
      const embedder = new OpenRouterEmbedding("test-api-key");
      const result = await embedder.generate("");
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(256);
      expect(result.every((v) => v === 0)).toBe(true);
    });

    test("returns zero vector for whitespace-only text", async () => {
      const embedder = new OpenRouterEmbedding("test-api-key");
      const result = await embedder.generate("   ");
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.every((v) => v === 0)).toBe(true);
    });

    test("generates embedding with mocked API response", async () => {
      const mockEmbedding = Array.from({ length: 256 }, (_, i) => i * 0.001);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: mockEmbedding }],
              usage: { prompt_tokens: 10, total_tokens: 10 },
            }),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        const result = await embedder.generate("test text");

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(256);
        expect(result[0]).toBeCloseTo(0);
        expect(result[100]).toBeCloseTo(0.1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("tracks usage metrics", async () => {
      const mockEmbedding = Array.from({ length: 256 }, () => 0.1);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: mockEmbedding }],
              usage: { prompt_tokens: 50, total_tokens: 50 },
            }),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await embedder.generate("test text for usage tracking");

        const metrics = OpenRouterEmbedding.getUsageMetrics();
        expect(metrics.totalTokens).toBe(50);
        expect(metrics.requestCount).toBe(1);
        // Cost: 50 tokens / 1M * $0.02 = $0.000001
        expect(metrics.estimatedCostUsd).toBeCloseTo(0.000001, 8);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("accumulates usage metrics across multiple requests", async () => {
      const mockEmbedding = Array.from({ length: 256 }, () => 0.1);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: mockEmbedding }],
              usage: { prompt_tokens: 100, total_tokens: 100 },
            }),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await embedder.generate("first request");
        await embedder.generate("second request");
        await embedder.generate("third request");

        const metrics = OpenRouterEmbedding.getUsageMetrics();
        expect(metrics.totalTokens).toBe(300);
        expect(metrics.requestCount).toBe(3);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("error handling", () => {
    test("throws specific error for 401 unauthorized", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Invalid API key"),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("invalid-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "OpenRouter API authentication failed",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws specific error for 402 payment required", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 402,
          text: () => Promise.resolve("Insufficient credits"),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "payment required",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws specific error for 429 rate limit", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Rate limit exceeded"),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "rate limit exceeded",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws specific error for 5xx server errors", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          text: () => Promise.resolve("Service unavailable"),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "service error (503)",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws error for invalid API response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "Invalid response from OpenRouter embeddings API",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws error for network failure", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("Network connection failed")),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "OpenRouter API network error: Network connection failed",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws error for JSON parse failure", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "Failed to parse OpenRouter API response",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("throws specific error for 400 bad request", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Invalid input"),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await expect(embedder.generate("test")).rejects.toThrow(
          "OpenRouter API bad request",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("static methods", () => {
    test("getUsageMetrics returns copy of metrics", () => {
      const metrics1 = OpenRouterEmbedding.getUsageMetrics();
      const metrics2 = OpenRouterEmbedding.getUsageMetrics();
      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });

    test("resetUsageMetrics clears all metrics", async () => {
      const mockEmbedding = Array.from({ length: 256 }, () => 0.1);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: mockEmbedding }],
              usage: { prompt_tokens: 100, total_tokens: 100 },
            }),
        } as Response),
      );

      try {
        const embedder = new OpenRouterEmbedding("test-api-key");
        await embedder.generate("some text");

        expect(
          OpenRouterEmbedding.getUsageMetrics().totalTokens,
        ).toBeGreaterThan(0);

        OpenRouterEmbedding.resetUsageMetrics();
        const metrics = OpenRouterEmbedding.getUsageMetrics();
        expect(metrics.totalTokens).toBe(0);
        expect(metrics.requestCount).toBe(0);
        expect(metrics.estimatedCostUsd).toBe(0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});

describe("createEmbeddingProvider", () => {
  test("creates TF-IDF provider", async () => {
    const provider = await createEmbeddingProvider("tfidf");
    expect(provider).toBeDefined();
    expect(provider.dimensions).toBe(256);
  });

  test("creates TF-IDF provider with custom dimensions", async () => {
    const provider = await createEmbeddingProvider("tfidf", {
      dimensions: 128,
    });
    expect(provider.dimensions).toBe(128);
  });

  test("creates OpenAI provider with API key", async () => {
    const provider = await createEmbeddingProvider("openai", {
      apiKey: "test-key",
    });
    expect(provider).toBeDefined();
    expect(provider.dimensions).toBe(256);
  });

  test("throws error for OpenAI without API key", async () => {
    await expect(createEmbeddingProvider("openai")).rejects.toThrow(
      "OpenAI provider requires an API key",
    );
  });

  test("creates OpenRouter provider with API key", async () => {
    const provider = await createEmbeddingProvider("openrouter", {
      apiKey: "test-key",
    });
    expect(provider).toBeDefined();
    expect(provider.dimensions).toBe(256);
  });

  test("throws error for OpenRouter without API key", async () => {
    await expect(createEmbeddingProvider("openrouter")).rejects.toThrow(
      "OpenRouter provider requires an API key",
    );
  });

  test("throws error for unknown provider type", async () => {
    await expect(
      // @ts-expect-error Testing invalid provider type
      createEmbeddingProvider("unknown"),
    ).rejects.toThrow("Unknown embedding provider type");
  });
});
