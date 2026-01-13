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
 * A conversation topic that persists across sessions.
 * Topics capture key themes and conclusions from conversations.
 */
export interface Topic {
  id: string;
  content: string;
  keywords: string[];
  sourceSession?: string;
  confidence?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Entity types in the knowledge graph.
 */
export type EntityType =
  | "Learning"
  | "CodeArea"
  | "File"
  | "Pattern"
  | "Mistake"
  | "Topic";

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
  data: Learning | Pattern | Mistake | CodeAreaData | FileData | Topic;
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
  /** Conversation topics from previous sessions */
  topics?: Topic[];
  /** Formatted markdown summary for injection into context */
  summary: string;
  /** Session metadata for metrics tracking (populated by onSessionStart) */
  _sessionMetadata?: {
    sessionId: string;
    learningsInjected: number;
    startTime: string;
    issueNumber?: number;
  };
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
 * Shared context for prioritization, used by both FormatOptions and ContextInjectionOptions.
 */
export interface PrioritizationContext {
  issueNumber?: number;
  primaryCodeArea?: string;
  modifiedFiles?: string[];
}

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
  /** Minimum learning confidence threshold 0.0-1.0 (default: 0.3) */
  confidenceThreshold?: number;
  /** Minimum semantic similarity threshold 0.0-1.0 for semantic search (default: 0.3) */
  similarityThreshold?: number;
  /** Use semantic search instead of keyword matching (default: false) */
  useSemanticSearch?: boolean;
  /** Show file paths in output (default: true) */
  showFilePaths?: boolean;
  /** Context for prioritization */
  context?: PrioritizationContext;
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

// ============================================================================
// Workflow Retrospective Types
// ============================================================================

/**
 * A deviation between what was planned and what actually happened.
 * Captures the gap between intent and execution during a workflow.
 */
export interface Deviation {
  /** The planned step from the dev plan (e.g., commit message or action) */
  plannedStep: string;
  /** What actually happened during execution */
  actualOutcome: string;
  /** Why the deviation occurred (manual explanation or inferred) */
  reason: string;
}

/**
 * A review finding from code review agents during the review phase.
 */
export interface ReviewFinding {
  /** The agent that produced this finding (e.g., "code-reviewer", "silent-failure-hunter") */
  agent: string;
  /** Severity level of the finding */
  severity: "critical" | "high" | "medium" | "low";
  /** Description of what was found */
  description: string;
}

/**
 * A fix applied in response to a review finding.
 */
export interface AppliedFix {
  /** The finding that prompted this fix */
  finding: string;
  /** Description of the fix applied */
  fix: string;
  /** Whether the fix was successful */
  success: boolean;
}

/**
 * A pattern extracted from a workflow - a successful approach worth reusing.
 */
export interface ExtractedPattern {
  /** Short name for the pattern */
  name: string;
  /** Detailed description of the pattern */
  description: string;
  /** Code area where this pattern applies */
  codeArea?: string;
}

/**
 * A mistake extracted from a workflow - something to avoid in the future.
 */
export interface ExtractedMistake {
  /** Description of what went wrong */
  description: string;
  /** How the mistake was fixed */
  howFixed: string;
  /** File path where the mistake occurred */
  filePath?: string;
}

/**
 * Complete learning capture from a workflow execution.
 * Compares plan vs reality, captures problems and fixes,
 * and extracts patterns and mistakes for future sessions.
 */
export interface WorkflowLearning {
  /** Unique ID for this learning record */
  id: string;
  /** GitHub issue number this workflow addressed */
  issueNumber: number;
  /** Git branch name used for the work */
  branch: string;
  /** Workflow ID from checkpoint system */
  workflowId: string;

  // Plan vs Reality
  /** Commits that were planned in the dev plan */
  plannedCommits: string[];
  /** Commits that were actually made */
  actualCommits: string[];
  /** Deviations between plan and execution */
  deviations: Deviation[];

  // Problems encountered
  /** Findings from review agents */
  reviewFindings: ReviewFinding[];
  /** Fixes applied during the workflow */
  fixesApplied: AppliedFix[];

  // Extracted learnings
  /** Patterns worth reusing in future workflows */
  patterns: ExtractedPattern[];
  /** Mistakes to avoid in future workflows */
  mistakes: ExtractedMistake[];
  /** Suggested improvements for the workflow or codebase */
  improvements: string[];

  /** ISO timestamp when this learning was created */
  createdAt: string;
}

// ============================================================================
// Context Metrics Types (Dogfooding Validation)
// ============================================================================

/**
 * Breakdown of review findings by severity level.
 * Enables tracking of review quality over time.
 */
export interface ReviewFindingsSummary {
  /** Critical findings requiring immediate fix */
  critical: number;
  /** High-priority findings that should be addressed */
  high: number;
  /** Medium-priority findings to consider */
  medium: number;
  /** Low-priority findings (style, minor issues) */
  low: number;
  /** Total number of findings across all severities */
  total: number;
}

/**
 * Metrics captured during a session to validate knowledge system effectiveness.
 * Used for dogfooding to determine if the knowledge graph provides genuine value.
 */
export interface ContextMetrics {
  id?: number;
  /** Unique session identifier (UUID) */
  sessionId: string;
  /** GitHub issue number if working on an issue */
  issueNumber?: number;
  /** Number of files read during the session */
  filesRead: number;
  /** Whether context compaction occurred during the session */
  compacted: boolean;
  /** Session duration in minutes */
  durationMinutes?: number;
  /**
   * Review findings from CodeRabbit/Claude.
   * Can be a structured breakdown by severity or a legacy integer count.
   */
  reviewFindings: ReviewFindingsSummary | number;
  /** Number of learnings injected at session start */
  learningsInjected: number;
  /** Number of learnings captured at session end */
  learningsCaptured: number;
  /** ISO timestamp when metrics were recorded */
  createdAt: string;
}

/**
 * Metrics for a single graph query execution.
 * Used to track code graph usage patterns and measure effectiveness.
 */
export interface GraphQueryMetrics {
  id?: number;
  /** Optional session identifier (from CLAUDE_SESSION_ID env var) */
  sessionId?: string;
  /** Query origin: "cli" | "agent:{name}" | "skill:{name}" | "hook:{name}" | "unknown" */
  source: string;
  /** Associated workflow ID if running within a workflow */
  workflowId?: string;
  /** Type of graph query (what-calls, blast-radius, find, etc.) */
  queryType: string;
  /** JSON-serialized query parameters */
  queryParams: string;
  /** Number of results returned by the query */
  resultCount: number;
  /** Query execution time in milliseconds */
  durationMs: number;
  /** ISO timestamp when the query was executed */
  createdAt: string;
}
