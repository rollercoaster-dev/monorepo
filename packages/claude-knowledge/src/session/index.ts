/**
 * Session module
 *
 * Provides session context building for session-start hooks.
 * The context builder primes Claude with planning stack, graph queries,
 * and relevant learnings.
 *
 * Previous session state tracking was removed in #571.
 * Tool usage is now tracked via metrics (see checkpoint/metrics.ts).
 */

export {
  buildSessionContext,
  type SessionContextBlock,
} from "./context-builder";
