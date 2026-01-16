/**
 * MCP Tools Registry
 *
 * Central registry for all MCP tools provided by claude-knowledge.
 * Each tool module exports its tool definitions and handler function.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { knowledgeTools, handleKnowledgeToolCall } from "./knowledge.js";
import { graphTools, handleGraphToolCall } from "./graph.js";
import { checkpointTools, handleCheckpointToolCall } from "./checkpoint.js";

/**
 * All available MCP tools.
 */
export const tools: Tool[] = [
  ...knowledgeTools,
  ...graphTools,
  ...checkpointTools,
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
  graph_: handleGraphToolCall,
  checkpoint_: handleCheckpointToolCall,
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
export { graphTools, handleGraphToolCall } from "./graph.js";
export { checkpointTools, handleCheckpointToolCall } from "./checkpoint.js";
