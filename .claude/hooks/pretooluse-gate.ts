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

  // Log the tool usage for metrics
  // logToolUsage has internal timeout protection (3s) and logs errors to stderr
  // We await it but don't block on errors - metrics are non-critical
  try {
    await metrics.logToolUsage(sessionId, tool_name);
  } catch (error) {
    // Log error to stderr for debugging (visible in Claude Code logs)
    // This catches any errors not handled by logToolUsage's internal timeout
    const timestamp = new Date().toISOString();
    console.error(
      `[${timestamp}] WARN: PreToolUse hook metrics error for tool="${tool_name}" session="${sessionId}": ${error instanceof Error ? error.message : String(error)}`,
    );
    // Don't rethrow - always allow the tool to proceed
  }

  // Always allow - we're just observing for metrics
  output(createOutput("allow"));
}

main().catch((error) => {
  console.error("PreToolUse hook error:", error);
  console.log(JSON.stringify(createOutput("allow")));
});
