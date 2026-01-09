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

import type { EmbeddingProvider } from "./index";

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
      const error = await response.text();
      throw new Error(
        `OpenAI embeddings API error: ${response.status} - ${error}`,
      );
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    if (!data.data?.[0]?.embedding) {
      throw new Error("Invalid response from OpenAI embeddings API");
    }

    return new Float32Array(data.data[0].embedding);
  }
}

/**
 * Anthropic embedding provider (placeholder).
 *
 * Anthropic's embeddings API is not yet publicly available.
 * This class is included for future compatibility and to demonstrate
 * the pluggable provider architecture.
 *
 * @throws Error when attempting to generate embeddings
 */
export class AnthropicEmbedding implements EmbeddingProvider {
  readonly dimensions = 256;

  constructor(_apiKey?: string) {
    // API key stored for future use when API becomes available
  }

  async generate(_text: string): Promise<Float32Array> {
    throw new Error(
      "Anthropic embeddings API is not yet publicly available. " +
        "Please use TfIdfEmbedding or OpenAIEmbedding instead.",
    );
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
      return new AnthropicEmbedding(config?.apiKey);
    }
    default:
      throw new Error(`Unknown embedding provider type: ${type}`);
  }
}
