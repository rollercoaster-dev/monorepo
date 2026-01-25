#!/usr/bin/env bun
/**
 * PreToolUse Metrics Hook
 *
 * Logs tool usage metrics for analyzing Claude's tool selection patterns.
 *
 * Usage: Called automatically by Claude Code before Grep/Glob tool use.
 *
 * Metrics collected:
 * - Tool name and category (graph, search, read, write, other)
 * - Timestamp for session grouping
 */

import { metrics } from "../../packages/claude-knowledge/src/checkpoint/metrics";

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "allow" | "deny" | "ask";
  };
}

/**
 * Create a hook output response.
 */
function createOutput(decision: "allow"): HookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
    },
  };
}

/**
 * Get a session identifier for grouping metrics.
 *
 * Priority:
 * 1. CLAUDE_SESSION_ID env var (if Claude Code ever provides it)
 * 2. Date-based ID (groups all tool calls per day)
 */
function getSessionId(): string {
  if (process.env.CLAUDE_SESSION_ID) {
    return process.env.CLAUDE_SESSION_ID;
  }
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
  const hookInput = JSON.parse(input) as HookInput;

  const { tool_name } = hookInput;
  const sessionId = getSessionId();

  // Log the tool usage for metrics (non-blocking, fire-and-forget)
  try {
    metrics.logToolUsage(sessionId, tool_name);
  } catch {
    // Non-critical - don't block tool usage if metrics fail
  }

  // Always allow - we're just observing for metrics
  output(createOutput("allow"));
}

main().catch((error) => {
  console.error("PreToolUse hook error:", error);
  console.log(JSON.stringify(createOutput("allow")));
});
