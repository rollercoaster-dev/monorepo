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
 * Split an oversized section into smaller chunks with overlap.
 * Used when a section exceeds MAX_SECTION_TOKENS.
 *
 * @param section - Section to chunk
 * @returns Array of chunked sections (or single section if no split needed)
 */
function chunkSection(section: ParsedSection): ParsedSection[] {
  const tokens = estimateTokens(section.content);

  // If section fits within limit, return as-is
  if (tokens <= MAX_SECTION_TOKENS) {
    return [section];
  }

  // Split content into chunks
  const chunks: ParsedSection[] = [];
  const lines = section.content.split("\n");
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line);

    // If adding this line exceeds limit, save current chunk and start new one
    if (
      currentTokens + lineTokens > MAX_SECTION_TOKENS &&
      currentChunk.length > 0
    ) {
      chunks.push({
        ...section,
        content: currentChunk.join("\n"),
        isChunk: true,
        chunkIndex,
        anchor: `${section.anchor}-chunk-${chunkIndex}`,
      });

      // Start new chunk with overlap (last OVERLAP_TOKENS worth of lines)
      const overlapChars = OVERLAP_TOKENS * 4; // ~50 tokens worth
      let overlapContent = "";
      let overlapSize = 0;

      // Take lines from end of current chunk until we have enough overlap
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const candidate = currentChunk[i];
        if (overlapSize + candidate.length <= overlapChars) {
          overlapContent = candidate + "\n" + overlapContent;
          overlapSize += candidate.length;
        } else {
          break;
        }
      }

      currentChunk = overlapContent ? [overlapContent.trim()] : [];
      currentTokens = estimateTokens(overlapContent);
      chunkIndex++;
    }

    currentChunk.push(line);
    currentTokens += lineTokens;
  }

  // Save final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      ...section,
      content: currentChunk.join("\n"),
      isChunk: true,
      chunkIndex,
      anchor: `${section.anchor}-chunk-${chunkIndex}`,
    });
  }

  return chunks;
}

/**
 * Parse markdown content into hierarchical sections with hybrid chunking.
 * Uses marked.lexer() to extract heading and content tokens,
 * then builds a hierarchy using a stack-based approach.
 * Oversized sections are automatically chunked with overlap.
 *
 * @param markdown - Raw markdown content to parse
 * @returns Array of parsed sections with hierarchy preserved and chunks applied
 */
export function parseMarkdown(markdown: string): ParsedSection[] {
  const tokens = marked.lexer(markdown);
  const rawSections: ParsedSection[] = [];
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

        rawSections.push({
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

    rawSections.push({
      heading: currentHeading,
      content,
      level: currentLevel,
      anchor: currentAnchor,
      parentAnchor,
    });
  }

  // Apply hybrid chunking: split oversized sections
  const chunkedSections: ParsedSection[] = [];
  for (const section of rawSections) {
    const chunks = chunkSection(section);
    chunkedSections.push(...chunks);
  }

  return chunkedSections;
}
