/**
 * Markdown Parser with Hierarchical Section Extraction and Hybrid Chunking
 *
 * Implements RFC from docs/DOCS-AS-KNOWLEDGE.md:
 * - Hierarchical parsing: Preserves heading structure
 * - Hybrid chunking: Respects sections but splits oversized ones
 * - Token-aware: Chunks based on 512 token limit with 50 token overlap
 */

import { marked } from "marked";

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

/**
 * Parse markdown content into hierarchical sections.
 * Uses marked.lexer() to extract heading and content tokens,
 * then builds a hierarchy using a stack-based approach.
 *
 * @param markdown - Raw markdown content to parse
 * @returns Array of parsed sections with hierarchy preserved
 */
export function parseMarkdown(markdown: string): ParsedSection[] {
  const tokens = marked.lexer(markdown);
  const sections: ParsedSection[] = [];
  const stack: Array<{ level: number; anchor: string }> = [];

  let currentHeading = "";
  let currentLevel = 0;
  let currentAnchor = "";
  let currentContent: string[] = [];

  for (const token of tokens) {
    if (token.type === "heading") {
      // Save previous section if it exists
      if (currentHeading) {
        const content = currentContent.join("\n").trim();
        const parentAnchor =
          stack.length > 0 ? stack[stack.length - 1].anchor : undefined;

        sections.push({
          heading: currentHeading,
          content,
          level: currentLevel,
          anchor: currentAnchor,
          parentAnchor,
        });
      }

      // Start new section
      currentHeading = token.text;
      currentLevel = token.depth;
      currentAnchor = slugify(token.text);
      currentContent = [];

      // Update stack for hierarchy tracking
      // Pop all items at same or deeper level
      while (
        stack.length > 0 &&
        stack[stack.length - 1].level >= currentLevel
      ) {
        stack.pop();
      }

      // Push current section to stack
      stack.push({ level: currentLevel, anchor: currentAnchor });
    } else {
      // Accumulate content for current section
      if (token.type === "paragraph") {
        currentContent.push(token.text);
      } else if (token.type === "list") {
        // Handle list items
        const listItems = token.items.map(
          (item: { text: string }) => `- ${item.text}`,
        );
        currentContent.push(listItems.join("\n"));
      } else if (token.type === "code") {
        currentContent.push(`\`\`\`${token.lang || ""}\n${token.text}\n\`\`\``);
      } else if (token.type === "blockquote") {
        currentContent.push(`> ${token.text}`);
      } else if (token.type === "html") {
        currentContent.push(token.text);
      } else if (token.type === "text") {
        currentContent.push(token.text);
      }
    }
  }

  // Save final section
  if (currentHeading) {
    const content = currentContent.join("\n").trim();
    const parentAnchor =
      stack.length > 1 ? stack[stack.length - 2].anchor : undefined;

    sections.push({
      heading: currentHeading,
      content,
      level: currentLevel,
      anchor: currentAnchor,
      parentAnchor,
    });
  }

  return sections;
}
