/**
 * Type definitions for the code graph module.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * These types align with the SQLite schema in src/db/sqlite.ts (graph_entities, graph_relationships).
 */

/** Types of code entities we track */
export type EntityType =
  | "function"
  | "class"
  | "type"
  | "interface"
  | "variable"
  | "file"
  | "enum";

/**
 * Richer metadata for entities extracted from code.
 * Stored as JSON in the metadata column.
 */
export interface EntityMetadata {
  /** Whether function is async */
  async?: boolean;
  /** Whether function is a generator */
  generator?: boolean;
  /** Whether this is an arrow function */
  arrowFunction?: boolean;
  /** Parameter names */
  parameters?: string[];
  /** Return type annotation */
  returnType?: string;
  /** Generic type parameters (e.g., ['T', 'U']) */
  typeParameters?: string[];
  /** Variable declaration kind (const, let, var) */
  kind?: "const" | "let" | "var";
  /** Whether class method is static */
  static?: boolean;
  /** For enums: whether it's a const enum */
  const?: boolean;
  /** For enums: array of member definitions */
  members?: Array<{ name: string; value?: string }>;
  /** Vue component type (composition or options API) */
  componentType?: "composition" | "options";
  /** For Vue template relationships: marks component usage in template */
  usage?: "template-component";
  /** Any additional custom metadata */
  [key: string]: unknown;
}

/** Types of relationships between entities */
export type RelationshipType =
  | "calls"
  | "imports"
  | "exports"
  | "extends"
  | "implements"
  | "defines";

/**
 * A code entity (function, class, type, interface, variable, file, or enum).
 * Stored in graph_entities table.
 */
export interface Entity {
  /** Globally unique ID: `{package}:{filePath}:{type}:{name}` or `{package}:file:{filePath}` */
  id: string;
  /** The kind of entity */
  type: EntityType;
  /** Entity name (e.g., function name, class name) */
  name: string;
  /** Relative path to the file containing this entity */
  filePath: string;
  /** Line number where the entity is defined */
  lineNumber: number;
  /** Whether the entity is exported from its module */
  exported: boolean;
  /** Optional package name (set during storage) */
  package?: string;
  /** Optional metadata (async, parameters, returnType, etc.) */
  metadata?: EntityMetadata;
  /** JSDoc content if present */
  jsDocContent?: string;
}

/**
 * A relationship between two entities.
 * Stored in graph_relationships table.
 */
export interface Relationship {
  /** Source entity ID */
  from: string;
  /** Target entity ID or external reference (e.g., "external:fs") */
  to: string;
  /** Type of relationship */
  type: RelationshipType;
  /** Optional metadata JSON */
  metadata?: string;
}

/**
 * Statistics about parsed entities and relationships.
 */
export interface ParseStats {
  /** Number of TypeScript files scanned */
  filesScanned: number;
  /** Number of files skipped (tests, declarations, etc.) */
  filesSkipped: number;
  /** Number of Vue SFC files processed */
  vueFilesProcessed?: number;
  /** Entity counts by type */
  entitiesByType: Record<string, number>;
  /** Relationship counts by type */
  relationshipsByType: Record<string, number>;
}

/**
 * Result of parsing a package with ts-morph.
 */
export interface ParseResult {
  /** Package name */
  package: string;
  /** All extracted entities */
  entities: Entity[];
  /** All extracted relationships */
  relationships: Relationship[];
  /** Parsing statistics */
  stats: ParseStats;
}

/**
 * Result of storing parsed data to SQLite.
 */
export interface StoreResult {
  /** Whether storage succeeded */
  success: boolean;
  /** Package name */
  package: string;
  /** Number of entities stored */
  entitiesStored: number;
  /** Number of relationships stored */
  relationshipsStored: number;
}

/**
 * Result from a graph query (common fields).
 */
export interface QueryResult {
  /** Entity name */
  name: string;
  /** File path */
  file_path: string;
  /** Line number (optional) */
  line_number?: number;
  /** Entity type (optional) */
  type?: string;
}

/**
 * Result from dependency queries.
 */
export interface DependencyResult extends QueryResult {
  /** Type of dependency relationship */
  relationship_type: string;
}

/**
 * Result from blast radius queries.
 */
export interface BlastRadiusResult extends QueryResult {
  /** Depth in the dependency graph (0 = direct, 1+ = transitive) */
  depth: number;
}

/**
 * Summary statistics for the code graph.
 */
export interface GraphSummary {
  /** Total entity count */
  totalEntities: number;
  /** Total relationship count */
  totalRelationships: number;
  /** Entity counts by type */
  entitiesByType: Record<string, number>;
  /** Relationship counts by type */
  relationshipsByType: Record<string, number>;
  /** Packages in the graph */
  packages: Array<{ name: string; entityCount: number }>;
}

/**
 * File metadata for incremental parsing.
 * Tracks parse state per file to enable change detection.
 */
export interface FileMetadata {
  /** File path relative to package root */
  filePath: string;
  /** Package name */
  package: string;
  /** File modification time in milliseconds */
  mtimeMs: number;
  /** ISO timestamp of last successful parse */
  lastParsed: string;
  /** Number of entities extracted from this file */
  entityCount: number;
}

/**
 * Options for incremental parsing.
 */
export interface IncrementalParseOptions {
  /** Only parse these specific files (filtered list) */
  files?: string[];
  /** Package name for metadata lookups */
  package?: string;
}

/**
 * Result of parsing an entire monorepo.
 * Contains results grouped by package for proper storage.
 */
export interface MonorepoParseResult {
  /** Results per package */
  packages: Map<string, ParseResult>;
  /** Combined statistics */
  stats: {
    totalFiles: number;
    totalEntities: number;
    totalRelationships: number;
    packagesFound: string[];
  };
}

/**
 * Progress callback phases for parsing operations.
 */
export type ParseProgressPhase = "scan" | "load" | "entities" | "relationships";

/**
 * Progress callback type for reporting parsing progress.
 * Called at each phase of the parsing process.
 *
 * @param phase - Current parsing phase
 * @param current - Current item number (0-indexed)
 * @param total - Total number of items in this phase
 * @param message - Human-readable progress message
 */
export type ProgressCallback = (
  phase: ParseProgressPhase,
  current: number,
  total: number,
  message: string,
) => void;

/**
 * Options for parsing operations.
 */
export interface ParseOptions extends IncrementalParseOptions {
  /** Progress callback for reporting parsing status */
  onProgress?: ProgressCallback;
}
