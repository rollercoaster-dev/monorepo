/**
 * Knowledge graph API for storing and querying learnings, patterns, and mistakes.
 *
 * This module provides a unified interface to the knowledge graph database,
 * with operations split across focused modules:
 * - store: Store operations (store, storePattern, storeMistake, storeWorkflowLearning)
 * - query: Query operations (query, getMistakesForFile, getPatternsForArea)
 * - semantic: Semantic search (searchSimilar)
 * - context: Context injection (formatForContext)
 */

// Re-export all store operations
export {
  store,
  storePattern,
  storeMistake,
  storeWorkflowLearning,
  analyzeWorkflow,
} from "./store";

// Re-export all query operations
export { query, getMistakesForFile, getPatternsForArea } from "./query";

// Re-export semantic search
export { searchSimilar, type SearchSimilarOptions } from "./semantic";

// Re-export context injection
export { formatForContext } from "./context";

// Import for unified knowledge object
import {
  store,
  storePattern,
  storeMistake,
  storeWorkflowLearning,
  analyzeWorkflow,
} from "./store";
import { query, getMistakesForFile, getPatternsForArea } from "./query";
import { searchSimilar } from "./semantic";
import { formatForContext } from "./context";

/**
 * Unified knowledge graph API object.
 *
 * Provides all knowledge operations through a single object for convenience.
 * All functions are also available as named exports for tree-shaking.
 */
export const knowledge = {
  // Store operations
  store,
  storePattern,
  storeMistake,
  storeWorkflowLearning,
  analyzeWorkflow,

  // Query operations
  query,
  getMistakesForFile,
  getPatternsForArea,

  // Semantic search
  searchSimilar,

  // Context injection
  formatForContext,
};
