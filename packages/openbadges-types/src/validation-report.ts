/**
 * Validation Report Types
 *
 * Types aligned with the 1EdTech/openbadges-validator-core format
 * for standardized validation responses across the Open Badges ecosystem.
 *
 * @see https://github.com/1EdTech/openbadges-validator-core
 */

/**
 * Message severity levels aligned with 1EdTech validator
 * - ERROR: Critical violations that make the badge invalid
 * - WARNING: Non-critical issues (badge remains valid)
 * - INFO: Informational messages
 */
export type MessageLevel = 'ERROR' | 'WARNING' | 'INFO';

/**
 * Individual validation message following 1EdTech format
 */
export interface ValidationMessage {
  /** Task codename (e.g., "VALIDATE_TYPE_PROPERTY", "VALIDATE_IRI_IMAGE") */
  name?: string;
  /** Severity: ERROR (critical), WARNING (non-critical), INFO (informational) */
  messageLevel: MessageLevel;
  /** Path to nested properties (e.g., ["criteria", "narrative"]) */
  node_path?: Array<string | number>;
  /** Whether task succeeded - only included if task failed (false) */
  success?: boolean;
  /** Human-readable description of the problem or message */
  result: string;
}

/**
 * Validation report content structure aligned with 1EdTech validator
 */
export interface ValidationReportContent {
  /** Whether the object passed all required validation tests */
  valid: boolean;
  /** Count of ERROR level messages */
  errorCount: number;
  /** Count of WARNING level messages */
  warningCount: number;
  /** Array of validation messages */
  messages: ValidationMessage[];
  /** Optional: Detected Open Badges version */
  openBadgesVersion?: '2.0' | '3.0';
}
