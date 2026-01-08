/**
 * Shared type definitions for workflow helpers
 *
 * Note: WorkflowPhase and WorkflowStatus are re-exported from claude-knowledge
 * via the checkpoint module.
 */

// ============================================================================
// Telegram Types
// ============================================================================

/**
 * Result of a Telegram notification attempt
 * Uses discriminated union to enforce success/error relationship
 */
export type TelegramResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Response from Telegram question
 * Either a user message or a sentinel indicating unavailability
 */
export type TelegramResponse = string | "TELEGRAM_UNAVAILABLE";

// ============================================================================
// Board Types
// ============================================================================

export type BoardStatus =
  | "backlog"
  | "next"
  | "inProgress"
  | "blocked"
  | "done";

export interface BoardConfig {
  projectId: string;
  statusFieldId: string;
  statusOptions: Record<BoardStatus, string>;
}

/**
 * Result of a board update operation
 * Uses discriminated union to enforce success/error relationship
 */
export type BoardUpdateResult =
  | { success: true; itemId: string }
  | { success: false; error: string };

// ============================================================================
// Phase Metadata Types
// ============================================================================

export interface PhaseMetadata {
  from?: string;
  to?: string;
  issueNumber?: number;
  branch?: string;
  [key: string]: unknown;
}

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationStage = "test" | "type-check" | "lint" | "build";

/**
 * Result of a validation operation
 * Uses discriminated union to enforce success/error relationship
 */
export type ValidationResult =
  | { success: true }
  | { success: false; stage: ValidationStage; output: string };

// ============================================================================
// Dependency Types
// ============================================================================

export type DependencyType = "blocker" | "depends" | "after" | "checkbox";

export interface Dependency {
  issueNumber: number;
  type: DependencyType;
  state: "OPEN" | "CLOSED";
}

export interface DependencyCheckResult {
  blockers: Dependency[];
  softDeps: Dependency[];
  canProceed: boolean;
}

// ============================================================================
// Escalation Types
// ============================================================================

export type EscalationTrigger =
  | "max_retry"
  | "max_fix_commits"
  | "validation_failed"
  | "test_failed"
  | "build_failed"
  | "agent_failed";

export type EscalationOption =
  | "continue"
  | "force-pr"
  | "abort"
  | "reset"
  | "skip";

export interface Finding {
  file: string;
  line?: number;
  issue: string;
  agent: string;
  confidence?: number;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface EscalationReport {
  issueNumber: number;
  title: string;
  branch: string;
  retryCount: number;
  maxRetry: number;
  trigger: EscalationTrigger;
  findings: Finding[];
}

// ============================================================================
// Execution Types
// ============================================================================

export interface ExecResult {
  status: number;
  stdout: string;
  stderr: string;
}
