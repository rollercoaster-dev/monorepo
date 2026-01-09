/**
 * Embedding providers for semantic search in the knowledge graph.
 *
 * This module provides a pluggable embedding interface with a default TF-IDF
 * implementation that requires zero external dependencies.
 */

// Buffer import needed for ESLint - it's also global in Bun runtime
import { Buffer } from "buffer";

/**
 * Interface for embedding providers.
 * Implementations generate fixed-dimension vector representations of text.
 */
export interface EmbeddingProvider {
  /**
   * Generate an embedding vector for the given text.
   * @param text - The text to embed
   * @returns A Float32Array representing the embedding vector
   */
  generate(text: string): Promise<Float32Array>;

  /**
   * Get the dimension of embeddings produced by this provider.
   */
  readonly dimensions: number;
}

/**
 * Configuration for TF-IDF embedding provider.
 */
export interface TfIdfConfig {
  /** Number of dimensions for the embedding vector (default: 256) */
  dimensions?: number;
}

/** Default number of dimensions for TF-IDF embeddings */
const DEFAULT_DIMENSIONS = 256;

/**
 * Simple hash function for the hashing trick.
 * Maps words to bucket indices deterministically.
 */
function hashWord(word: string, buckets: number): number {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    // Use a prime multiplier for better distribution
    hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
  }
  return hash % buckets;
}

/**
 * Tokenize text into lowercase words.
 * Removes punctuation and splits on whitespace.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter((token) => token.length > 0); // Remove empty tokens
}

/**
 * Calculate term frequency for tokens.
 * Returns a map of token -> frequency.
 */
function calculateTf(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by document length
  const docLength = tokens.length;
  if (docLength > 0) {
    for (const [token, count] of tf) {
      tf.set(token, count / docLength);
    }
  }
  return tf;
}

/**
 * L2 normalize a vector in place.
 * Converts vector to unit length for cosine similarity.
 */
function l2NormalizeInPlace(vec: Float32Array): void {
  let sumSquares = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSquares += vec[i] * vec[i];
  }
  const magnitude = Math.sqrt(sumSquares);
  if (magnitude > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= magnitude;
    }
  }
}

/**
 * TF-IDF embedding provider with hashing trick.
 *
 * This implementation uses the hashing trick to map words to fixed-dimension
 * vectors without maintaining a vocabulary. This allows for:
 * - Fixed memory usage regardless of vocabulary size
 * - No need to rebuild index when vocabulary changes
 * - Deterministic embeddings (same input = same output)
 *
 * Trade-off: Some hash collisions may occur, but with 256 dimensions
 * this is acceptable for typical knowledge graph sizes (<10k documents).
 */
export class TfIdfEmbedding implements EmbeddingProvider {
  readonly dimensions: number;

  // Corpus statistics for IDF calculation
  private documentCount = 0;
  private documentFrequency = new Map<number, number>(); // bucket -> doc count

  constructor(config?: TfIdfConfig) {
    this.dimensions = config?.dimensions ?? DEFAULT_DIMENSIONS;
  }

  /**
   * Update corpus statistics with a new document.
   * Called internally when generating embeddings.
   */
  private updateCorpusStats(tokens: string[]): void {
    this.documentCount++;

    // Track which buckets this document contributes to
    const seenBuckets = new Set<number>();
    for (const token of tokens) {
      const bucket = hashWord(token, this.dimensions);
      seenBuckets.add(bucket);
    }

    // Increment document frequency for each bucket
    for (const bucket of seenBuckets) {
      this.documentFrequency.set(
        bucket,
        (this.documentFrequency.get(bucket) || 0) + 1,
      );
    }
  }

  /**
   * Calculate IDF for a bucket.
   * IDF = log(N / (df + 1)) where N = total docs, df = docs containing term
   */
  private calculateIdf(bucket: number): number {
    const df = this.documentFrequency.get(bucket) || 0;
    // Add 1 to prevent division by zero and smooth rare terms
    return Math.log((this.documentCount + 1) / (df + 1)) + 1;
  }

  /**
   * Generate a TF-IDF embedding for the given text.
   *
   * The embedding is a fixed-dimension vector where each dimension
   * corresponds to a hash bucket. The value is TF * IDF for terms
   * that hash to that bucket.
   *
   * @param text - The text to embed
   * @returns L2-normalized Float32Array of dimension `this.dimensions`
   */
  async generate(text: string): Promise<Float32Array> {
    const tokens = tokenize(text);
    const embedding = new Float32Array(this.dimensions);

    if (tokens.length === 0) {
      return embedding; // Return zero vector for empty text
    }

    // Update corpus statistics
    this.updateCorpusStats(tokens);

    // Calculate TF for this document
    const tf = calculateTf(tokens);

    // Build TF-IDF vector using hashing trick
    for (const [token, tfValue] of tf) {
      const bucket = hashWord(token, this.dimensions);
      const idf = this.calculateIdf(bucket);
      // Accumulate in case of hash collisions
      embedding[bucket] += tfValue * idf;
    }

    // L2 normalize for cosine similarity
    l2NormalizeInPlace(embedding);

    return embedding;
  }

  /**
   * Get current corpus size (number of documents processed).
   * Useful for debugging and testing.
   */
  get corpusSize(): number {
    return this.documentCount;
  }

  /**
   * Reset corpus statistics.
   * Use when starting fresh or for testing.
   */
  reset(): void {
    this.documentCount = 0;
    this.documentFrequency.clear();
  }
}

/**
 * Convert a Float32Array to a Buffer for database storage.
 */
export function floatArrayToBuffer(arr: Float32Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
}

/**
 * Convert a Buffer back to a Float32Array.
 */
export function bufferToFloatArray(buf: Buffer): Float32Array {
  // Create a copy to avoid alignment issues
  const arrayBuffer = new ArrayBuffer(buf.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buf.length; i++) {
    view[i] = buf[i];
  }
  return new Float32Array(arrayBuffer);
}

// Default singleton instance for convenience
let defaultEmbedder: TfIdfEmbedding | null = null;

/**
 * Get the default TF-IDF embedding provider.
 * Uses a singleton to maintain corpus statistics across calls.
 */
export function getDefaultEmbedder(): TfIdfEmbedding {
  if (!defaultEmbedder) {
    defaultEmbedder = new TfIdfEmbedding();
  }
  return defaultEmbedder;
}

/**
 * Reset the default embedder.
 * Useful for testing to start with fresh corpus statistics.
 */
export function resetDefaultEmbedder(): void {
  defaultEmbedder = null;
}
