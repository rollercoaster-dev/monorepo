/**
 * Code Graph Module - Tier 1 Static Analysis
 *
 * Provides ts-morph based static analysis for TypeScript codebases.
 * Extracts entities (functions, classes, types, interfaces, variables, files)
 * and relationships (calls, imports, exports, extends, implements).
 *
 * Part of Issue #394: ts-morph static analysis for codebase structure.
 *
 * @example
 * ```typescript
 * import { graph } from 'claude-knowledge';
 *
 * // Parse a package
 * const result = graph.parsePackage('packages/my-package/src');
 *
 * // Store the results
 * graph.storeGraph(result, 'my-package');
 *
 * // Query the graph
 * const callers = graph.whatCalls('myFunction');
 * const radius = graph.blastRadius('src/index.ts');
 * ```
 */

// Export all types
export * from "./types";

// Parser
export { parsePackage } from "./parser";

// Storage and query will be added in subsequent commits
// export { storeGraph, clearPackage } from './store';
// export { whatCalls, whatDependsOn, blastRadius, findEntities, getExports, getCallers, getSummary } from './query';

// Import for graph object
import { parsePackage } from "./parser";

/**
 * Unified graph API object.
 * Methods will be added as parser, store, and query modules are implemented.
 */
export const graph = {
  // Parser (Step 2)
  parsePackage,

  // Storage (Step 3)
  // storeGraph: ...,
  // clearPackage: ...,

  // Queries (Step 4)
  // whatCalls: ...,
  // whatDependsOn: ...,
  // blastRadius: ...,
  // findEntities: ...,
  // getExports: ...,
  // getCallers: ...,
  // getSummary: ...,
};
