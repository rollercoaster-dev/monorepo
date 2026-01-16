/**
 * MCP Tools Registry
 *
 * Central registry for all MCP tools provided by claude-knowledge.
 * Each tool module exports its tool definitions and handler function.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { knowledgeTools, handleKnowledgeToolCall } from "./knowledge.js";

/**
 * All available MCP tools.
 */
export const tools: Tool[] = [
  ...knowledgeTools,
  // Graph tools will be added in commit 3
  // Checkpoint tools will be added in commit 4
  // Output tool will be added in commit 5
];

/**
 * Tool handler dispatch map.
 * Maps tool name prefixes to their handler functions.
 */
const toolHandlers: Record<
  string,
  (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }>
> = {
  knowledge_: handleKnowledgeToolCall,
  // graph_: handleGraphToolCall (commit 3)
  // checkpoint_: handleCheckpointToolCall (commit 4)
  // output_: handleOutputToolCall (commit 5)
};

/**
 * Handle a tool call by dispatching to the appropriate handler.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool result
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  // Find the handler for this tool based on name prefix
  for (const [prefix, handler] of Object.entries(toolHandlers)) {
    if (name.startsWith(prefix)) {
      return handler(name, args);
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: `Unknown tool: ${name}` }),
      },
    ],
    isError: true,
  };
}

// Re-export individual tool modules for direct imports
export { knowledgeTools, handleKnowledgeToolCall } from "./knowledge.js";
