/**
 * Session State Tracking
 *
 * Tracks tool usage within a Claude Code session to enforce graph-first patterns.
 * State is persisted to a file based on CLAUDE_SESSION_ID to survive across tool calls.
 *
 * Used by:
 * - PreToolUse hook: Check if graph was queried before allowing grep
 * - Graph/docs commands: Record when queries are made
 * - SessionStart hook: Initialize state
 * - Metrics: Understand tool usage patterns
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";

/** Represents the state of tool usage for a single session */
export interface SessionState {
  /** Session ID from CLAUDE_SESSION_ID */
  sessionId: string;
  /** Timestamp when session started */
  startedAt: string;
  /** Graph queries made in this session */
  graphQueries: GraphQuery[];
  /** Docs searches made in this session */
  docsSearches: DocsSearch[];
  /** Number of times grep was blocked */
  grepBlockCount: number;
  /** Number of times grep was allowed (after graph query) */
  grepAllowCount: number;
}

export interface GraphQuery {
  queryType: string;
  params: string;
  resultCount: number;
  timestamp: string;
}

export interface DocsSearch {
  query: string;
  resultCount: number;
  timestamp: string;
}

/** Directory for storing session state files */
const STATE_DIR = join(tmpdir(), "claude-code-sessions");

/**
 * Get the state file path for the current session.
 * @returns Path to the session state file, or null if no session ID
 */
function getStateFilePath(): string | null {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (!sessionId) return null;

  // Ensure state directory exists
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }

  return join(STATE_DIR, `${sessionId}.json`);
}

/**
 * Load the current session state.
 * Returns null if no session or state doesn't exist.
 */
export function loadState(): SessionState | null {
  const statePath = getStateFilePath();
  if (!statePath) return null;

  try {
    if (existsSync(statePath)) {
      const content = readFileSync(statePath, "utf-8");
      return JSON.parse(content) as SessionState;
    }
  } catch {
    // Ignore parse errors - will create fresh state
  }

  return null;
}

/**
 * Save session state to file.
 */
export function saveState(state: SessionState): void {
  const statePath = getStateFilePath();
  if (!statePath) return;

  // Ensure directory exists
  const dir = dirname(statePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Initialize a new session state.
 * Called at session start.
 */
export function initializeState(): SessionState {
  const sessionId = process.env.CLAUDE_SESSION_ID || "unknown";
  const state: SessionState = {
    sessionId,
    startedAt: new Date().toISOString(),
    graphQueries: [],
    docsSearches: [],
    grepBlockCount: 0,
    grepAllowCount: 0,
  };
  saveState(state);
  return state;
}

/**
 * Get or create session state.
 */
export function getOrCreateState(): SessionState {
  const existing = loadState();
  if (existing) return existing;
  return initializeState();
}

/**
 * Record a graph query in the session state.
 */
export function recordGraphQuery(
  queryType: string,
  params: string,
  resultCount: number,
): void {
  const state = getOrCreateState();
  state.graphQueries.push({
    queryType,
    params,
    resultCount,
    timestamp: new Date().toISOString(),
  });
  saveState(state);
}

/**
 * Record a docs search in the session state.
 */
export function recordDocsSearch(query: string, resultCount: number): void {
  const state = getOrCreateState();
  state.docsSearches.push({
    query,
    resultCount,
    timestamp: new Date().toISOString(),
  });
  saveState(state);
}

/**
 * Record when grep is blocked by the hook.
 */
export function recordGrepBlocked(): void {
  const state = getOrCreateState();
  state.grepBlockCount++;
  saveState(state);
}

/**
 * Record when grep is allowed after graph query.
 */
export function recordGrepAllowed(): void {
  const state = getOrCreateState();
  state.grepAllowCount++;
  saveState(state);
}

/**
 * Check if graph has been queried in this session.
 */
export function hasGraphBeenQueried(): boolean {
  const state = loadState();
  return state !== null && state.graphQueries.length > 0;
}

/**
 * Check if docs have been searched in this session.
 */
export function hasDocsBeenSearched(): boolean {
  const state = loadState();
  return state !== null && state.docsSearches.length > 0;
}

/**
 * Check if any knowledge tools have been used in this session.
 */
export function hasKnowledgeToolsBeenUsed(): boolean {
  const state = loadState();
  if (!state) return false;
  return state.graphQueries.length > 0 || state.docsSearches.length > 0;
}

/**
 * Get a summary of tool usage for this session.
 * Used by the PreToolUse hook to provide context in deny messages.
 */
export function getUsageSummary(): string {
  const state = loadState();
  if (!state) {
    return "No session state found. Consider running graph queries first.";
  }

  const graphCount = state.graphQueries.length;
  const docsCount = state.docsSearches.length;

  if (graphCount === 0 && docsCount === 0) {
    return (
      "No graph or docs queries made yet. Try:\n" +
      "  bun run g:calls <function>   → Find callers\n" +
      "  bun run g:deps <function>    → Find dependencies\n" +
      "  bun run g:find <name>        → Find entities by name\n" +
      "  bun run d:search <query>     → Search documentation"
    );
  }

  let summary = `Session tool usage:\n`;
  summary += `  Graph queries: ${graphCount}\n`;
  summary += `  Docs searches: ${docsCount}\n`;
  summary += `  Grep blocked: ${state.grepBlockCount}\n`;
  summary += `  Grep allowed: ${state.grepAllowCount}`;

  return summary;
}

/**
 * Clear session state (for testing or reset).
 */
export function clearState(): void {
  const statePath = getStateFilePath();
  if (statePath && existsSync(statePath)) {
    unlinkSync(statePath);
  }
}

/**
 * CLI command handler for session state commands.
 */
export async function handleStateCommands(
  command: string,
  _args: string[],
): Promise<void> {
  switch (command) {
    case "show": {
      const state = loadState();
      if (!state) {
        // eslint-disable-next-line no-console
        console.log("No session state found");
        return;
      }
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(state, null, 2));
      break;
    }

    case "summary": {
      // eslint-disable-next-line no-console
      console.log(getUsageSummary());
      break;
    }

    case "init": {
      const state = initializeState();
      // eslint-disable-next-line no-console
      console.log(`Initialized session state: ${state.sessionId}`);
      break;
    }

    case "clear": {
      clearState();
      // eslint-disable-next-line no-console
      console.log("Session state cleared");
      break;
    }

    case "has-graph": {
      const hasGraph = hasGraphBeenQueried();
      // eslint-disable-next-line no-console
      console.log(hasGraph ? "true" : "false");
      // Exit with code 0 if true, 1 if false (useful for shell conditionals)
      process.exit(hasGraph ? 0 : 1);
      break; // unreachable but satisfies linter
    }

    case "has-docs": {
      const hasDocs = hasDocsBeenSearched();
      // eslint-disable-next-line no-console
      console.log(hasDocs ? "true" : "false");
      process.exit(hasDocs ? 0 : 1);
      break; // unreachable but satisfies linter
    }

    case "has-knowledge": {
      const hasKnowledge = hasKnowledgeToolsBeenUsed();
      // eslint-disable-next-line no-console
      console.log(hasKnowledge ? "true" : "false");
      process.exit(hasKnowledge ? 0 : 1);
      break; // unreachable but satisfies linter
    }

    default:
      console.error("Unknown state command:", command);
      console.error(
        "Available commands: show, summary, init, clear, has-graph, has-docs, has-knowledge",
      );
      process.exit(1);
  }
}
