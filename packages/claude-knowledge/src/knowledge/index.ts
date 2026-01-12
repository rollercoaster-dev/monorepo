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
export { store, storePattern, storeMistake, storeTopic } from "./store";

// Re-export retrospective functions directly (not through store)
export { storeWorkflowLearning, analyzeWorkflow } from "../retrospective";

// Re-export all query operations
export {
  query,
  getMistakesForFile,
  getPatternsForArea,
  queryTopics,
  type TopicQueryContext,
} from "./query";

// Re-export semantic search
export { searchSimilar, type SearchSimilarOptions } from "./semantic";

// Re-export context injection
export { formatForContext } from "./context";

// Import for unified knowledge object
import { store, storePattern, storeMistake, storeTopic } from "./store";
import { storeWorkflowLearning, analyzeWorkflow } from "../retrospective";
import {
  query,
  getMistakesForFile,
  getPatternsForArea,
  queryTopics,
} from "./query";
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
  storeTopic,
  storeWorkflowLearning,
  analyzeWorkflow,

  // Query operations
  query,
  getMistakesForFile,
  getPatternsForArea,
  queryTopics,

  // Semantic search
  searchSimilar,

  // Context injection
  formatForContext,
};
