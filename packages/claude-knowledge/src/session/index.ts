/**
 * Session tracking module
 *
 * Provides state tracking for Claude Code sessions to enforce
 * graph-first tool selection patterns.
 */

export {
  // Types
  type SessionState,
  type GraphQuery,
  type DocsSearch,
  // State management
  loadState,
  saveState,
  initializeState,
  getOrCreateState,
  clearState,
  // Recording functions (called by graph/docs commands)
  recordGraphQuery,
  recordDocsSearch,
  recordGrepBlocked,
  recordGrepAllowed,
  // Query functions (called by PreToolUse hook)
  hasGraphBeenQueried,
  hasDocsBeenSearched,
  hasKnowledgeToolsBeenUsed,
  getUsageSummary,
  // CLI handler
  handleStateCommands,
} from "./state";
