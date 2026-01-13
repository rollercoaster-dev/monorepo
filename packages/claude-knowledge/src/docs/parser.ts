/**
 * Markdown Parser with Hierarchical Section Extraction and Hybrid Chunking
 *
 * Implements RFC from docs/DOCS-AS-KNOWLEDGE.md:
 * - Hierarchical parsing: Preserves heading structure
 * - Hybrid chunking: Respects sections but splits oversized ones
 * - Token-aware: Chunks based on 512 token limit with 50 token overlap
 */

import { marked } from "marked";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

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

  // If there's only one line and it's too long, split by character chunks
  if (lines.length === 1 && estimateTokens(lines[0]) > MAX_SECTION_TOKENS) {
    const chunkSize = MAX_SECTION_TOKENS * 4; // ~512 tokens worth of chars
    const overlapSize = OVERLAP_TOKENS * 4; // ~50 tokens worth of chars
    const text = lines[0];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.substring(start, end);

      chunks.push({
        ...section,
        content: chunkText,
        isChunk: true,
        chunkIndex,
        anchor: `${section.anchor}-chunk-${chunkIndex}`,
      });

      chunkIndex++;

      // If we've reached the end, stop
      if (end >= text.length) break;

      // Move forward with overlap (ensure we always make progress)
      const nextStart = end - overlapSize;
      start = Math.max(nextStart, start + 1);
    }

    return chunks;
  }

  // Multi-line content: chunk by lines
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
  // Input validation
  if (typeof markdown !== "string") {
    throw new TypeError(
      `parseMarkdown expects a string, received ${typeof markdown}`,
    );
  }

  // Parse markdown tokens with error handling
  let tokens;
  try {
    tokens = marked.lexer(markdown);
  } catch (error) {
    logger.error("Failed to parse markdown", {
      error: error instanceof Error ? error.message : String(error),
      markdownLength: markdown.length,
      markdownPreview: markdown.substring(0, 200),
    });
    throw new Error(
      `Markdown parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const rawSections: ParsedSection[] = [];
  const stack: Array<{ level: number; anchor: string }> = [];
  const usedAnchors = new Map<string, number>();

  let currentHeading = "";
  let currentLevel = 0;
  let currentAnchor = "";
  let currentParentAnchor: string | undefined = undefined;
  let currentContent: string[] = [];

  for (const token of tokens) {
    if (token.type === "heading") {
      const newLevel = token.depth;

      // Save previous section if it exists
      if (currentHeading) {
        rawSections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
          level: currentLevel,
          anchor: currentAnchor,
          parentAnchor: currentParentAnchor,
        });

        // Push saved section to stack (could be parent of future deeper sections)
        stack.push({ level: currentLevel, anchor: currentAnchor });
      }

      // Update stack for NEW section: pop items at same or deeper level
      while (stack.length > 0 && stack[stack.length - 1].level >= newLevel) {
        stack.pop();
      }

      // Start new section - capture parent NOW from updated stack
      currentHeading = token.text;
      currentLevel = newLevel;

      // Generate unique anchor (handle duplicate headings like GitHub does)
      const baseAnchor = slugify(token.text);
      const count = usedAnchors.get(baseAnchor) || 0;
      usedAnchors.set(baseAnchor, count + 1);
      currentAnchor = count === 0 ? baseAnchor : `${baseAnchor}-${count}`;

      currentParentAnchor =
        stack.length > 0 ? stack[stack.length - 1].anchor : undefined;
      currentContent = [];
    } else {
      // Accumulate content for current section
      if (token.type === "paragraph") {
        currentContent.push(token.text);
      } else if (token.type === "list") {
        // Handle list items (preserves ordered vs unordered)
        const listItems = token.items.map(
          (item: { text: string }, index: number) =>
            token.ordered ? `${index + 1}. ${item.text}` : `- ${item.text}`,
        );
        currentContent.push(listItems.join("\n"));
      } else if (token.type === "code") {
        currentContent.push(`\`\`\`${token.lang || ""}\n${token.text}\n\`\`\``);
      } else if (token.type === "blockquote") {
        currentContent.push(`> ${token.text}`);
      } else if (token.type === "table") {
        // Reconstruct markdown table from tokens
        const header = token.header
          .map((cell: { text: string }) => cell.text)
          .join(" | ");
        const separator = token.header.map(() => "---").join(" | ");
        const rows = token.rows
          .map((row: Array<{ text: string }>) =>
            row.map((cell) => cell.text).join(" | "),
          )
          .join("\n| ");
        currentContent.push(`| ${header} |\n| ${separator} |\n| ${rows} |`);
      } else if (token.type === "html") {
        currentContent.push(token.text);
      } else if (token.type === "text") {
        currentContent.push(token.text);
      }
    }
  }

  // Save final section
  if (currentHeading) {
    rawSections.push({
      heading: currentHeading,
      content: currentContent.join("\n").trim(),
      level: currentLevel,
      anchor: currentAnchor,
      parentAnchor: currentParentAnchor,
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
