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

// Storage
export { storeGraph, clearPackage } from "./store";

// Query
export {
  whatCalls,
  whatDependsOn,
  blastRadius,
  findEntities,
  getExports,
  getCallers,
  getSummary,
} from "./query";

// Import for graph object
import { parsePackage } from "./parser";
import { storeGraph, clearPackage } from "./store";
import {
  whatCalls,
  whatDependsOn,
  blastRadius,
  findEntities,
  getExports,
  getCallers,
  getSummary,
} from "./query";

/**
 * Unified graph API object.
 * Methods will be added as parser, store, and query modules are implemented.
 */
export const graph = {
  // Parser
  parsePackage,

  // Storage
  storeGraph,
  clearPackage,

  // Queries
  whatCalls,
  whatDependsOn,
  blastRadius,
  findEntities,
  getExports,
  getCallers,
  getSummary,
};
