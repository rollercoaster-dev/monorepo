// Auto-issue phases: research → implement → review → finalize
// Auto-milestone phases: planning → execute → review → merge → cleanup
export type WorkflowPhase =
  | "research"
  | "implement"
  | "review"
  | "finalize"
  | "planning"
  | "execute"
  | "merge"
  | "cleanup";
export type WorkflowStatus = "running" | "paused" | "completed" | "failed";

export type MilestonePhase =
  | "planning"
  | "execute"
  | "review"
  | "merge"
  | "cleanup";

export interface Workflow {
  id: string;
  issueNumber: number;
  branch: string;
  worktree: string | null;
  phase: WorkflowPhase;
  status: WorkflowStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Action {
  id?: number;
  workflowId: string;
  action: string;
  result: "success" | "failed" | "pending";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Commit {
  id?: number;
  workflowId: string;
  sha: string;
  message: string;
  createdAt: string;
}

export interface CheckpointData {
  workflow: Workflow;
  actions: Action[];
  commits: Commit[];
}

export interface Milestone {
  id: string;
  name: string;
  githubMilestoneNumber: number | null;
  phase: MilestonePhase;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Baseline {
  id?: number;
  milestoneId: string;
  capturedAt: string;
  lintExitCode: number;
  lintWarnings: number;
  lintErrors: number;
  typecheckExitCode: number;
  typecheckErrors: number;
}

export interface MilestoneCheckpointData {
  milestone: Milestone;
  baseline: Baseline | null;
  workflows: Workflow[];
}

// ============================================================================
// Knowledge Graph Types
// ============================================================================

/**
 * A learning captured during a workflow session.
 * Learnings are the primary knowledge units in the graph.
 */
export interface Learning {
  id: string;
  content: string;
  sourceIssue?: number;
  codeArea?: string;
  filePath?: string;
  confidence?: number; // 0.0-1.0
  metadata?: Record<string, unknown>;
}

/**
 * A recognized pattern derived from learnings.
 * Patterns represent reusable knowledge applicable to code areas.
 */
export interface Pattern {
  id: string;
  name: string;
  description: string;
  codeArea?: string;
}

/**
 * A mistake made during development and how it was fixed.
 * Mistakes help prevent repeating the same errors.
 */
export interface Mistake {
  id: string;
  description: string;
  howFixed: string;
  filePath?: string;
}

/**
 * Entity types in the knowledge graph.
 */
export type EntityType =
  | "Learning"
  | "CodeArea"
  | "File"
  | "Pattern"
  | "Mistake";

/**
 * Relationship types in the knowledge graph.
 * - ABOUT: Learning → CodeArea (learning relates to a code area)
 * - IN_FILE: Learning/Mistake → File (located in a file)
 * - LED_TO: Pattern/Mistake → Learning (derived from / fixed by)
 * - APPLIES_TO: Pattern → CodeArea (pattern applies to area)
 * - SUPERSEDES: Learning → Learning (for updates)
 */
export type RelationshipType =
  | "ABOUT"
  | "IN_FILE"
  | "LED_TO"
  | "APPLIES_TO"
  | "SUPERSEDES";

/**
 * Data for a CodeArea entity.
 */
export interface CodeAreaData {
  name: string;
  description?: string;
}

/**
 * Data for a File entity.
 */
export interface FileData {
  path: string;
  packageName?: string;
}

/**
 * A generic entity in the knowledge graph.
 */
export interface Entity {
  id: string;
  type: EntityType;
  data: Learning | Pattern | Mistake | CodeAreaData | FileData;
  embedding?: Uint8Array;
  createdAt: string;
  updatedAt: string;
}

/**
 * A relationship (edge) between two entities in the knowledge graph.
 */
export interface Relationship {
  id?: number;
  fromId: string;
  toId: string;
  type: RelationshipType;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// Query API Types
// ============================================================================

/**
 * Context for querying the knowledge graph.
 * All fields are optional - at least one should be provided for meaningful results.
 */
export interface QueryContext {
  /** Query learnings related to a specific code area (1-hop traversal) */
  codeArea?: string;
  /** Query learnings related to a specific file path (1-hop traversal) */
  filePath?: string;
  /** Search for keywords in learning content */
  keywords?: string[];
  /** Filter by source issue number */
  issueNumber?: number;
  /** Maximum number of results to return (default: 50) */
  limit?: number;
}

/**
 * Result from a knowledge graph query.
 * Includes the primary learning and optionally related patterns/mistakes via 2-hop traversal.
 */
export interface QueryResult {
  /** The primary learning result */
  learning: Learning;
  /** Patterns that led to this learning (via LED_TO relationship) */
  relatedPatterns?: Pattern[];
  /** Mistakes that led to this learning (via LED_TO relationship) */
  relatedMistakes?: Mistake[];
  /** Future: relevance score based on confidence and other factors */
  relevanceScore?: number;
}

// ============================================================================
// Session Hook Types
// ============================================================================

/**
 * Context provided to onSessionStart hook.
 * Describes the current working environment for knowledge queries.
 */
export interface SessionContext {
  /** Current working directory */
  workingDir: string;
  /** Current git branch name */
  branch?: string;
  /** Recently modified files (from git status) */
  modifiedFiles?: string[];
  /** Issue number parsed from branch name */
  issueNumber?: number;
}

/**
 * Knowledge context returned from onSessionStart hook.
 * Contains relevant knowledge to inject into the session.
 */
export interface KnowledgeContext {
  /** Relevant learnings from the knowledge graph */
  learnings: QueryResult[];
  /** Applicable patterns for the current code areas */
  patterns: Pattern[];
  /** Mistakes to avoid for the current files */
  mistakes: Mistake[];
  /** Formatted markdown summary for injection into context */
  summary: string;
}

/**
 * Summary of a session provided to onSessionEnd hook.
 * Used to extract and store learnings from the session.
 */
export interface SessionSummary {
  /** Optional checkpoint workflow ID for linking */
  workflowId?: string;
  /** Commits made during the session */
  commits: Array<{ sha: string; message: string }>;
  /** High-level actions taken during the session */
  actions?: string[];
  /** Files modified during the session */
  modifiedFiles: string[];
}

/**
 * Result from onSessionEnd hook.
 * Reports what was captured and stored.
 */
export interface SessionEndResult {
  /** Number of learnings stored */
  learningsStored: number;
  /** IDs of the stored learnings */
  learningIds: string[];
}

// ============================================================================
// Context Injection Types
// ============================================================================

/**
 * Output format for context injection.
 * - markdown: Human-readable, structured with headers (best for Claude)
 * - bullets: Compact flat list (good for token-constrained agents)
 * - xml: Structured tags for machine parsing (good for tool agents)
 */
export type ContextFormat = "markdown" | "bullets" | "xml";

/**
 * Options for the formatForContext method.
 * Controls how knowledge is queried, filtered, and formatted.
 */
export interface ContextInjectionOptions {
  /** Output format (default: "markdown") */
  format?: ContextFormat;
  /** Maximum token budget for output (default: 2000) */
  maxTokens?: number;
  /** Maximum number of learnings to include (default: 10) */
  limit?: number;
  /** Minimum confidence threshold 0.0-1.0 (default: 0.3) */
  confidenceThreshold?: number;
  /** Use semantic search instead of keyword matching (default: false) */
  useSemanticSearch?: boolean;
  /** Show file paths in output (default: true) */
  showFilePaths?: boolean;
  /** Context for prioritization (same as FormatOptions) */
  context?: {
    issueNumber?: number;
    primaryCodeArea?: string;
    modifiedFiles?: string[];
  };
}

/**
 * Result from formatForContext method.
 * Contains the formatted output and metadata about what was included.
 */
export interface ContextInjectionResult {
  /** Formatted knowledge content ready for prompt injection */
  content: string;
  /** Estimated token count of the content */
  tokenCount: number;
  /** Number of learnings included in the result */
  resultCount: number;
  /** True if results were filtered by threshold or limit */
  wasFiltered: boolean;
}
