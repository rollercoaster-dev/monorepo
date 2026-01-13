/**
 * Documentation parsing module.
 * Exports markdown parser with hierarchical section extraction and hybrid chunking.
 */

export { parseMarkdown, slugify, estimateTokens } from "./parser";
export type { ParsedSection } from "./parser";
export { MAX_SECTION_TOKENS, OVERLAP_TOKENS } from "./parser";
