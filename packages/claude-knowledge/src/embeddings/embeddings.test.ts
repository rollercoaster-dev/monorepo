import { describe, test, expect, beforeEach } from "bun:test";
import {
  TfIdfEmbedding,
  floatArrayToBuffer,
  bufferToFloatArray,
  getDefaultEmbedder,
  resetDefaultEmbedder,
} from "./index";
import {
  cosineSimilarity,
  dotProduct,
  magnitude,
  l2Normalize,
  findMostSimilar,
} from "./similarity";

describe("TF-IDF Embedding Provider", () => {
  let embedder: TfIdfEmbedding;

  beforeEach(() => {
    embedder = new TfIdfEmbedding();
  });

  describe("generate()", () => {
    test("produces fixed 256 dimension embeddings by default", async () => {
      const embedding = await embedder.generate("hello world");
      expect(embedding.length).toBe(256);
    });

    test("respects custom dimension configuration", async () => {
      const customEmbedder = new TfIdfEmbedding({ dimensions: 128 });
      const embedding = await customEmbedder.generate("hello world");
      expect(embedding.length).toBe(128);
    });

    test("produces deterministic embeddings for same input", async () => {
      const freshEmbedder = new TfIdfEmbedding();
      const e1 = await freshEmbedder.generate("consistent text");

      // Reset and generate again
      const anotherEmbedder = new TfIdfEmbedding();
      const e2 = await anotherEmbedder.generate("consistent text");

      // Should produce identical embeddings (within floating point tolerance)
      for (let i = 0; i < e1.length; i++) {
        expect(Math.abs(e1[i] - e2[i])).toBeLessThan(0.0001);
      }
    });

    test("returns zero vector for empty string", async () => {
      const embedding = await embedder.generate("");
      const allZero = embedding.every((v) => v === 0);
      expect(allZero).toBe(true);
    });

    test("returns zero vector for whitespace-only string", async () => {
      const embedding = await embedder.generate("   \t\n  ");
      const allZero = embedding.every((v) => v === 0);
      expect(allZero).toBe(true);
    });

    test("produces L2-normalized embeddings (magnitude ~1.0)", async () => {
      const embedding = await embedder.generate("test vector normalization");
      const mag = magnitude(embedding);
      // Should be very close to 1.0 for non-empty text
      expect(mag).toBeCloseTo(1.0, 5);
    });

    test("handles unicode content without crashing", async () => {
      // Unicode characters may not produce meaningful tokens with basic \w regex
      // but the function should not throw
      const embedding = await embedder.generate("こんにちは 世界 🎉");
      expect(embedding.length).toBe(256);
    });

    test("handles mixed unicode and ascii content", async () => {
      const embedding = await embedder.generate("hello こんにちは world");
      expect(embedding.length).toBe(256);
      // Should produce non-zero embedding from ascii words
      const hasNonZero = embedding.some((v) => v !== 0);
      expect(hasNonZero).toBe(true);
    });

    test("handles very long content", async () => {
      const longText = "word ".repeat(10000);
      const embedding = await embedder.generate(longText);
      expect(embedding.length).toBe(256);
    });

    test("tracks corpus size", async () => {
      expect(embedder.corpusSize).toBe(0);
      await embedder.generate("first document");
      expect(embedder.corpusSize).toBe(1);
      await embedder.generate("second document");
      expect(embedder.corpusSize).toBe(2);
    });

    test("reset() clears corpus statistics", async () => {
      await embedder.generate("some text");
      expect(embedder.corpusSize).toBe(1);
      embedder.reset();
      expect(embedder.corpusSize).toBe(0);
    });
  });

  describe("tokenization", () => {
    test("lowercases text", async () => {
      const e1 = await embedder.generate("HELLO");
      embedder.reset();
      const e2 = await embedder.generate("hello");
      // Same tokens should produce same embeddings
      for (let i = 0; i < e1.length; i++) {
        expect(Math.abs(e1[i] - e2[i])).toBeLessThan(0.0001);
      }
    });

    test("removes punctuation", async () => {
      const e1 = await embedder.generate("hello, world!");
      embedder.reset();
      const e2 = await embedder.generate("hello world");
      // Same tokens after punctuation removal
      for (let i = 0; i < e1.length; i++) {
        expect(Math.abs(e1[i] - e2[i])).toBeLessThan(0.0001);
      }
    });
  });
});

describe("Buffer Conversion", () => {
  test("floatArrayToBuffer and bufferToFloatArray are reversible", () => {
    const original = new Float32Array([1.5, -2.3, 0, 3.14159, -0.001]);
    const buffer = floatArrayToBuffer(original);
    const restored = bufferToFloatArray(buffer);

    expect(restored.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBeCloseTo(original[i], 5);
    }
  });

  test("handles zero-length arrays", () => {
    const original = new Float32Array([]);
    const buffer = floatArrayToBuffer(original);
    const restored = bufferToFloatArray(buffer);
    expect(restored.length).toBe(0);
  });

  test("handles large arrays", () => {
    const original = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      original[i] = Math.random() * 2 - 1; // Random values between -1 and 1
    }
    const buffer = floatArrayToBuffer(original);
    const restored = bufferToFloatArray(buffer);

    expect(restored.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBeCloseTo(original[i], 5);
    }
  });
});

describe("Default Embedder Singleton", () => {
  beforeEach(() => {
    resetDefaultEmbedder();
  });

  test("getDefaultEmbedder returns consistent instance", async () => {
    const e1 = await getDefaultEmbedder();
    const e2 = await getDefaultEmbedder();
    expect(e1).toBe(e2);
  });

  test("resetDefaultEmbedder creates new instance", async () => {
    const e1 = await getDefaultEmbedder();
    resetDefaultEmbedder();
    const e2 = await getDefaultEmbedder();
    expect(e1).not.toBe(e2);
  });
});

describe("Similarity Utilities", () => {
  describe("dotProduct()", () => {
    test("calculates dot product correctly", () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      expect(dotProduct(a, b)).toBe(32);
    });

    test("throws on dimension mismatch", () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([1, 2]);
      expect(() => dotProduct(a, b)).toThrow("Dimension mismatch");
    });

    test("handles zero vectors", () => {
      const a = new Float32Array([0, 0, 0]);
      const b = new Float32Array([1, 2, 3]);
      expect(dotProduct(a, b)).toBe(0);
    });
  });

  describe("magnitude()", () => {
    test("calculates magnitude correctly", () => {
      const v = new Float32Array([3, 4]); // 3-4-5 right triangle
      expect(magnitude(v)).toBe(5);
    });

    test("handles zero vector", () => {
      const v = new Float32Array([0, 0, 0]);
      expect(magnitude(v)).toBe(0);
    });

    test("handles unit vectors", () => {
      const v = new Float32Array([1, 0, 0]);
      expect(magnitude(v)).toBe(1);
    });
  });

  describe("l2Normalize()", () => {
    test("produces unit vector", () => {
      const v = new Float32Array([3, 4]);
      const normalized = l2Normalize(v);
      expect(magnitude(normalized)).toBeCloseTo(1.0, 5);
    });

    test("preserves direction", () => {
      const v = new Float32Array([3, 4]);
      const normalized = l2Normalize(v);
      // Ratio should be preserved
      expect(normalized[0] / normalized[1]).toBeCloseTo(v[0] / v[1], 5);
    });

    test("handles zero vector", () => {
      const v = new Float32Array([0, 0, 0]);
      const normalized = l2Normalize(v);
      // Should return zero vector
      expect(normalized.every((x) => x === 0)).toBe(true);
    });

    test("returns new array (not in-place)", () => {
      const v = new Float32Array([3, 4]);
      const normalized = l2Normalize(v);
      expect(v[0]).toBe(3); // Original unchanged
      expect(normalized).not.toBe(v);
    });
  });

  describe("cosineSimilarity()", () => {
    test("returns 1.0 for identical vectors", () => {
      const v = new Float32Array([1, 2, 3]);
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    test("returns 0.0 for orthogonal vectors", () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([0, 1]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
    });

    test("returns -1.0 for opposite vectors", () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([-1, 0]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
    });

    test("handles zero vectors", () => {
      const a = new Float32Array([0, 0]);
      const b = new Float32Array([1, 2]);
      expect(cosineSimilarity(a, b)).toBe(0.0);
    });

    test("throws on dimension mismatch", () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([1, 2]);
      expect(() => cosineSimilarity(a, b)).toThrow("Dimension mismatch");
    });

    test("is symmetric", () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 5);
    });
  });

  describe("findMostSimilar()", () => {
    const query = new Float32Array([1, 0, 0]);
    const candidates: Array<[string, Float32Array]> = [
      ["exact", new Float32Array([1, 0, 0])],
      ["similar", new Float32Array([0.9, 0.1, 0])],
      ["orthogonal", new Float32Array([0, 1, 0])],
      ["opposite", new Float32Array([-1, 0, 0])],
    ];

    test("returns results sorted by similarity", () => {
      const results = findMostSimilar(query, candidates);
      expect(results[0].id).toBe("exact");
      expect(results[0].similarity).toBeCloseTo(1.0, 5);
    });

    test("respects limit parameter", () => {
      const results = findMostSimilar(query, candidates, { limit: 2 });
      expect(results.length).toBe(2);
    });

    test("filters by threshold", () => {
      const results = findMostSimilar(query, candidates, { threshold: 0.5 });
      // Only "exact" and "similar" should pass
      expect(results.length).toBe(2);
      expect(results.every((r) => r.similarity >= 0.5)).toBe(true);
    });

    test("handles empty candidates", () => {
      const results = findMostSimilar(query, []);
      expect(results.length).toBe(0);
    });
  });
});

describe("Integration: TF-IDF Semantic Similarity", () => {
  let embedder: TfIdfEmbedding;

  beforeEach(() => {
    embedder = new TfIdfEmbedding();
  });

  test("similar texts have higher similarity than unrelated texts", async () => {
    // Generate embeddings for related texts
    const e1 = await embedder.generate("validate user input forms");
    const e2 = await embedder.generate("check input validation rules");
    const e3 = await embedder.generate("database schema migration");

    // Related texts should have higher similarity
    const similarScore = cosineSimilarity(e1, e2);
    const unrelatedScore = cosineSimilarity(e1, e3);

    expect(similarScore).toBeGreaterThan(unrelatedScore);
  });

  test("identical texts have similarity 1.0", async () => {
    const text = "exact same content";
    const e1 = await embedder.generate(text);
    // Need to reset to get same IDF weights
    embedder.reset();
    const e2 = await embedder.generate(text);

    expect(cosineSimilarity(e1, e2)).toBeCloseTo(1.0, 5);
  });
});
