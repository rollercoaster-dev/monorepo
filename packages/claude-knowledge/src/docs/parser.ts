/**
 * Markdown Parser with Hierarchical Section Extraction and Hybrid Chunking
 *
 * Implements RFC from docs/DOCS-AS-KNOWLEDGE.md:
 * - Hierarchical parsing: Preserves heading structure
 * - Hybrid chunking: Respects sections but splits oversized ones
 * - Token-aware: Chunks based on 512 token limit with 50 token overlap
 */

/**
 * Token limits for chunking strategy.
 * - MAX_SECTION_TOKENS: Maximum size for a single section (512 tokens ≈ 2048 chars)
 * - OVERLAP_TOKENS: Overlap between chunks to preserve context (50 tokens ≈ 200 chars)
 */
export const MAX_SECTION_TOKENS = 512;
export const OVERLAP_TOKENS = 50;

/**
 * A parsed section from a markdown document.
 */
export interface ParsedSection {
  /** Heading text for this section */
  heading: string;
  /** Content under this heading (excluding child sections) */
  content: string;
  /** Heading level (1-6) */
  level: number;
  /** URL-friendly anchor for deep linking */
  anchor: string;
  /** Parent section's anchor (for hierarchy) */
  parentAnchor?: string;
  /** True if this section was split due to size */
  isChunk?: boolean;
  /** Chunk index if this is part of a split section */
  chunkIndex?: number;
}

/**
 * Generate a URL-friendly slug from heading text.
 * Follows GitHub's anchor generation rules:
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 *
 * @param text - The heading text to slugify
 * @returns URL-friendly anchor string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens
}

/**
 * Estimate token count for text.
 * Uses the same heuristic as formatter.ts: ~4 characters per token.
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
