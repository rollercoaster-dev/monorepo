#!/usr/bin/env bun
/**
 * PreToolUse Metrics + Graph Augmentation Hook
 *
 * Two responsibilities:
 * 1. Logs tool usage metrics for analyzing Claude's tool selection patterns.
 * 2. Augments Grep calls with graph_find results (passive knowledge injection).
 *
 * Usage: Called automatically by Claude Code before any tool use.
 *
 * Metrics collected:
 * - Tool name and category (graph, search, read, write, other)
 * - Timestamp for session grouping
 *
 * Graph augmentation:
 * - When Grep is called, extract the pattern
 * - If pattern looks like an identifier, run graph_find
 * - Output graph results as additional context (non-blocking)
 *
 * The graph-first pattern is encouraged via passive augmentation, not blocking.
 */

import { metrics } from "../../packages/claude-knowledge/src/checkpoint/metrics";
import { graph } from "../../packages/claude-knowledge/src/graph/index";

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

/**
 * Check if a pattern looks like an identifier (function/class/variable name).
 * Identifiers are typically camelCase, PascalCase, or snake_case.
 */
function looksLikeIdentifier(pattern: string): boolean {
  // Skip if pattern has regex metacharacters (likely a regex, not an identifier)
  if (/[.*+?^${}()|[\]\\]/.test(pattern)) {
    return false;
  }
  // Skip if pattern is very short (likely too generic)
  if (pattern.length < 3) {
    return false;
  }
  // Match typical identifier patterns: camelCase, PascalCase, snake_case
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(pattern);
}

/**
 * Augment Grep calls with graph_find results.
 * Outputs graph context as stderr (visible in hook output) before allowing Grep.
 */
async function augmentGrepWithGraph(
  pattern: string,
): Promise<string | undefined> {
  if (!looksLikeIdentifier(pattern)) {
    return undefined;
  }

  try {
    const results = graph.findEntities(pattern, undefined, 5);
    if (results.length === 0) {
      return undefined;
    }

    const lines = [
      `\n🕸️ Graph augmentation for "${pattern}":`,
      ...results.map(
        (r) =>
          `  → ${r.type} ${r.name} in ${r.filePath}:${r.lineNumber ?? "?"}`,
      ),
      "",
    ];
    return lines.join("\n");
  } catch {
    // Graph lookup failed - don't block Grep
    return undefined;
  }
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

  const { tool_name, tool_input } = hookInput;
  const sessionId = getSessionId();

  // Log the tool usage for metrics (non-blocking, fire-and-forget)
  try {
    metrics.logToolUsage(sessionId, tool_name);
  } catch {
    // Non-critical - don't block tool usage if metrics fail
  }

  // Augment Grep calls with graph results (passive knowledge injection)
  if (tool_name === "Grep" && tool_input.pattern) {
    const pattern = String(tool_input.pattern);
    const graphContext = await augmentGrepWithGraph(pattern);
    if (graphContext) {
      // Output to stderr so it appears in hook feedback but doesn't interfere with JSON
      console.error(graphContext);
    }
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
