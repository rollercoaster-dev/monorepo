/**
 * Session module - DEPRECATED
 *
 * This module previously provided session state tracking for the PreToolUse hook.
 * The session state functionality was removed in #571 because:
 * - CLAUDE_SESSION_ID environment variable is never set by Claude Code
 * - Session state across tool calls was not working
 *
 * Tool usage is now tracked via metrics (see checkpoint/metrics.ts)
 * and reported at session end.
 */

// This module is intentionally empty.
// Keeping it to avoid breaking any imports that haven't been updated.
