#!/usr/bin/env bun
/**
 * PreToolUse Gate Hook
 *
 * Enforces graph-first tool selection pattern by blocking Grep/Glob
 * until at least one graph or docs query has been made in the session.
 *
 * Usage: Called automatically by Claude Code before Grep/Glob tool use.
 *
 * Returns JSON with permissionDecision:
 * - "allow": Graph/docs have been queried, grep is allowed
 * - "deny": No graph/docs queries yet, explain why and suggest alternatives
 *
 * Note: The "deny" message IS shown to Claude, enabling it to learn and adapt.
 */

import {
  hasKnowledgeToolsBeenUsed,
  recordGrepBlocked,
  recordGrepAllowed,
  getUsageSummary,
} from "../../packages/claude-knowledge/src/session";

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
function createOutput(decision: "allow" | "deny", reason?: string): HookOutput {
  return {
    hookSpecificOutput: {
      permissionDecision: decision,
      ...(reason && { permissionDecisionReason: reason }),
    },
  };
}

/**
 * Check if this Grep/Glob call should be blocked.
 *
 * Blocking criteria:
 * - No graph queries made yet in this session
 * - No docs searches made yet in this session
 *
 * Exceptions (always allow):
 * - Reading specific files (known paths)
 * - Simple directory listings
 * - Searching in .claude/ directory (meta operations)
 */
function shouldBlock(
  toolName: string,
  toolInput: Record<string, unknown>,
): boolean {
  // Allow if graph or docs have been used
  if (hasKnowledgeToolsBeenUsed()) {
    return false;
  }

  // Check for exception patterns
  const pattern = toolInput.pattern as string | undefined;
  const path = toolInput.path as string | undefined;

  // Allow .claude/ directory operations (meta operations)
  if (path?.includes(".claude/") || pattern?.includes(".claude/")) {
    return false;
  }

  // Allow specific file types that are unlikely to benefit from graph
  // (e.g., config files, package.json, README)
  const configPatterns = [
    "package.json",
    "tsconfig.json",
    "*.config.*",
    "README*",
    "CLAUDE.md",
    ".env*",
    "*.lock",
  ];

  if (pattern) {
    const isConfigPattern = configPatterns.some((cfg) => {
      // IMPORTANT: Escape dots FIRST, then replace asterisks with .*
      // Wrong order would escape the dot in .* causing broken regex
      const regex = new RegExp(
        "^" + cfg.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
        "i",
      );
      return regex.test(pattern);
    });
    if (isConfigPattern) return false;
  }

  // Block by default if no graph/docs queries made
  return true;
}

/**
 * Generate the deny message with helpful guidance.
 */
function generateDenyMessage(
  toolName: string,
  toolInput: Record<string, unknown>,
): string {
  const pattern = toolInput.pattern as string | undefined;
  const query = toolInput.query as string | undefined;

  const searchTarget = pattern || query || "unknown";

  return `
🚫 **Graph-First Required**

Before using ${toolName}, try these graph tools first:

\`\`\`bash
# Find entities by name
bun run g:find "${searchTarget}"

# Find what calls a function
bun run g:calls "${searchTarget}"

# Find dependencies of an entity
bun run g:deps "${searchTarget}"

# Search documentation
bun run d:search "${searchTarget}"
\`\`\`

**Why?**
- Graph queries: 1 call, ~500 tokens, AST-precise
- Grep/Glob: 3-10 calls, 2000-8000 tokens, text-based

After running a graph query, ${toolName} will be allowed.

${getUsageSummary()}
`.trim();
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

  const { tool_name, tool_input } = hookInput;

  if (shouldBlock(tool_name, tool_input)) {
    try {
      recordGrepBlocked();
    } catch {
      // Non-critical - metrics only
    }
    output(createOutput("deny", generateDenyMessage(tool_name, tool_input)));
    return;
  }

  try {
    recordGrepAllowed();
  } catch {
    // Non-critical - metrics only
  }
  output(createOutput("allow"));
}

main().catch((error) => {
  console.error("PreToolUse hook error:", error);
  console.log(
    JSON.stringify(createOutput("allow", "Hook error, allowing by default")),
  );
  process.exit(0);
});
