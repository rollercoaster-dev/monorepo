/**
 * Documentation parsing module.
 * Exports markdown parser with hierarchical section extraction and hybrid chunking.
 * Also supports external documentation indexing (e.g., Open Badges specs).
 */

export { parseMarkdown, slugify, estimateTokens } from "./parser";
export type { ParsedSection } from "./parser";
export { MAX_SECTION_TOKENS, OVERLAP_TOKENS } from "./parser";

export {
  indexDocument,
  indexDirectory,
  hashContent,
  extractCodeReferences,
  extractCrossDocLinks,
} from "./store";
export type { IndexOptions, IndexResult, DirectoryIndexResult } from "./store";

export { searchDocs, getDocsForCode, getCodeForDoc } from "./search";
export type { SearchOptions } from "./search";

export {
  fetchExternalDoc,
  indexExternalDoc,
  getSpecDefinition,
  SPEC_DEFINITIONS,
  convertHtmlToMarkdown,
} from "./external";
export type { ExternalDocSpec } from "./external";

export {
  indexMonorepoDocs,
  shouldSkipDoc,
  DOC_SKIP_PATTERNS,
} from "./index-monorepo";
export type { DocIndexStats, DocIndexCallbacks } from "./index-monorepo";
