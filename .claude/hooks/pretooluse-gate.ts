#!/usr/bin/env bun
/**
 * PreToolUse Metrics Hook
 *
 * Logs tool usage metrics for analyzing Claude's tool selection patterns.
 * Always allows the tool call - this is an observer, not a gatekeeper.
 *
 * Usage: Called automatically by Claude Code before any tool use.
 *
 * Metrics collected:
 * - Tool name and category (graph, search, read, write, other)
 * - Timestamp for session grouping
 *
 * The graph-first pattern is encouraged via CLAUDE.md guidance, not enforcement.
 */

import { metrics } from "../../packages/claude-knowledge/src/checkpoint/metrics";

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

interface HookOutput {
  hookSpecificOutput: {
    permissionDecision: "allow" | "deny" | "ask";
    permissionDecisionReason?: string;
  };
}

/**
 * Create a hook output response.
 */
function createOutput(decision: "allow", reason?: string): HookOutput {
  return {
    hookSpecificOutput: {
      permissionDecision: decision,
      ...(reason && { permissionDecisionReason: reason }),
    },
  };
}

/**
 * Get a session identifier for grouping metrics.
 *
 * Priority:
 * 1. CLAUDE_SESSION_ID env var (if Claude Code ever provides it)
 * 2. Date-based ID (groups all tool calls per day)
 *
 * Using date-based grouping means we can see daily tool selection patterns.
 */
function getSessionId(): string {
  if (process.env.CLAUDE_SESSION_ID) {
    return process.env.CLAUDE_SESSION_ID;
  }

  // Use date-based session ID (YYYY-MM-DD format)
  // This groups all tool calls for a day together
  const today = new Date();
  return `daily-${today.toISOString().split("T")[0]}`;
}

/**
 * Output result and exit.
 */
function output(result: HookOutput): void {
  console.log(JSON.stringify(result));
}

async function main(): Promise<void> {
  const input = await Bun.stdin.text();

  let hookInput: HookInput;
  try {
    hookInput = JSON.parse(input) as HookInput;
  } catch {
    output(createOutput("allow", "Could not parse hook input"));
    return;
  }

  const { tool_name } = hookInput;
  const sessionId = getSessionId();

  // Log the tool usage for metrics (non-blocking, fire-and-forget)
  try {
    metrics.logToolUsage(sessionId, tool_name);
  } catch {
    // Non-critical - don't block tool usage if metrics fail
  }

  // Always allow - we're observing, not blocking
  output(createOutput("allow"));
}

main().catch((error) => {
  console.error("PreToolUse hook error:", error);
  console.log(
    JSON.stringify(createOutput("allow", "Hook error, allowing by default")),
  );
  process.exit(0);
});
