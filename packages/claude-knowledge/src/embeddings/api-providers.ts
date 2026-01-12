/**
 * Optional API-based embedding providers.
 *
 * These providers use external APIs (OpenAI, Anthropic) for higher-quality
 * embeddings. They are optional and not loaded by default to maintain the
 * zero-dependency philosophy of the package.
 *
 * Usage:
 * ```typescript
 * import { OpenAIEmbedding } from "claude-knowledge/embeddings/api-providers";
 *
 * const embedder = new OpenAIEmbedding(process.env.OPENAI_API_KEY);
 * const embedding = await embedder.generate("some text");
 * ```
 */

import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import type { EmbeddingProvider } from "./index";

/**
 * Usage metrics for tracking API costs.
 */
export interface EmbeddingUsageMetrics {
  /** Total tokens processed */
  totalTokens: number;
  /** Total number of requests made */
  requestCount: number;
  /** Estimated cost in USD (based on text-embedding-3-small pricing) */
  estimatedCostUsd: number;
}

/** Cost per 1M tokens for text-embedding-3-small */
const OPENAI_COST_PER_1M_TOKENS = 0.02;

/**
 * OpenAI embedding provider using the embeddings API.
 *
 * Uses the text-embedding-3-small model by default, which provides
 * good quality embeddings at a reasonable cost.
 *
 * @see https://platform.openai.com/docs/guides/embeddings
 */
export class OpenAIEmbedding implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private _dimensions: number;

  /** Cumulative usage metrics across all instances */
  private static usageMetrics: EmbeddingUsageMetrics = {
    totalTokens: 0,
    requestCount: 0,
    estimatedCostUsd: 0,
  };

  /**
   * Get cumulative usage metrics for all OpenAI embedding requests.
   */
  static getUsageMetrics(): EmbeddingUsageMetrics {
    return { ...OpenAIEmbedding.usageMetrics };
  }

  /**
   * Reset usage metrics to zero.
   */
  static resetUsageMetrics(): void {
    OpenAIEmbedding.usageMetrics = {
      totalTokens: 0,
      requestCount: 0,
      estimatedCostUsd: 0,
    };
  }

  /**
   * Create an OpenAI embedding provider.
   *
   * @param apiKey - OpenAI API key
   * @param options - Optional configuration
   */
  constructor(
    apiKey: string,
    options?: {
      /** Model to use (default: "text-embedding-3-small") */
      model?: string;
      /** Output dimensions (default: 256 for consistency with TF-IDF) */
      dimensions?: number;
    },
  ) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = apiKey;
    this.model = options?.model ?? "text-embedding-3-small";
    this._dimensions = options?.dimensions ?? 256;
  }

  get dimensions(): number {
    return this._dimensions;
  }

  async generate(text: string): Promise<Float32Array> {
    if (!text || text.trim().length === 0) {
      return new Float32Array(this._dimensions);
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
        dimensions: this._dimensions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;

      // Provide specific error messages for common error codes
      if (status === 401) {
        throw new Error(
          "OpenAI API authentication failed: Invalid API key. Please check your OPENAI_API_KEY.",
        );
      }
      if (status === 429) {
        throw new Error(
          "OpenAI API rate limit exceeded. Please wait and try again.",
        );
      }
      if (status === 500 || status === 502 || status === 503) {
        throw new Error(
          `OpenAI API service error (${status}). Please try again later.`,
        );
      }

      throw new Error(`OpenAI embeddings API error: ${status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
      usage?: { prompt_tokens: number; total_tokens: number };
    };

    if (!data.data?.[0]?.embedding) {
      throw new Error("Invalid response from OpenAI embeddings API");
    }

    // Track usage metrics
    if (data.usage) {
      const tokens = data.usage.total_tokens;
      const cost = (tokens / 1_000_000) * OPENAI_COST_PER_1M_TOKENS;

      OpenAIEmbedding.usageMetrics.totalTokens += tokens;
      OpenAIEmbedding.usageMetrics.requestCount += 1;
      OpenAIEmbedding.usageMetrics.estimatedCostUsd += cost;

      logger.debug("OpenAI embedding generated", {
        tokens,
        costUsd: cost.toFixed(6),
        cumulativeTokens: OpenAIEmbedding.usageMetrics.totalTokens,
        cumulativeCostUsd:
          OpenAIEmbedding.usageMetrics.estimatedCostUsd.toFixed(6),
      });
    }

    return new Float32Array(data.data[0].embedding);
  }
}

/**
 * Factory function to create an embedding provider by type.
 *
 * @param type - Provider type ('tfidf', 'openai', 'anthropic')
 * @param config - Provider-specific configuration
 * @returns An EmbeddingProvider instance
 *
 * @example
 * ```typescript
 * // Use default TF-IDF (no API key needed)
 * const tfidf = await createEmbeddingProvider('tfidf');
 *
 * // Use OpenAI (requires API key)
 * const openai = await createEmbeddingProvider('openai', {
 *   apiKey: process.env.OPENAI_API_KEY,
 * });
 * ```
 */
export async function createEmbeddingProvider(
  type: "tfidf" | "openai" | "anthropic",
  config?: {
    apiKey?: string;
    model?: string;
    dimensions?: number;
  },
): Promise<EmbeddingProvider> {
  switch (type) {
    case "tfidf": {
      // Import TfIdfEmbedding directly - it's in the same package
      // We import here to keep API providers as an optional module
      // that doesn't force users to load TF-IDF if they don't need it
      const { TfIdfEmbedding } = await import("./index");
      return new TfIdfEmbedding({ dimensions: config?.dimensions });
    }
    case "openai": {
      if (!config?.apiKey) {
        throw new Error("OpenAI provider requires an API key");
      }
      return new OpenAIEmbedding(config.apiKey, {
        model: config.model,
        dimensions: config.dimensions,
      });
    }
    case "anthropic": {
      throw new Error(
        "Anthropic embeddings API is not yet publicly available. " +
          "Please use 'tfidf' or 'openai' instead.",
      );
    }
    default:
      throw new Error(`Unknown embedding provider type: ${type}`);
  }
}
