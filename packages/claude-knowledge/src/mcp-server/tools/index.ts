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
import { outputTools, handleOutputToolCall } from "./output.js";
import { metricsTools, handleMetricsToolCall } from "./metrics.js";
import { planningTools, handlePlanningToolCall } from "./planning.js";

/**
 * All available MCP tools.
 */
export const tools: Tool[] = [
  ...knowledgeTools,
  ...graphTools,
  ...checkpointTools,
  ...outputTools,
  ...metricsTools,
  ...planningTools,
];

/**
 * Tool handler dispatch map.
 * Maps tool names to their handler functions.
 */
const toolHandlers: Record<
  string,
  (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }>
> = {
  // Graph
  callers: handleGraphToolCall,
  blast: handleGraphToolCall,
  defs: handleGraphToolCall,
  // Planning
  goal: handlePlanningToolCall,
  interrupt: handlePlanningToolCall,
  done: handlePlanningToolCall,
  stack: handlePlanningToolCall,
  plan: handlePlanningToolCall,
  steps: handlePlanningToolCall,
  planget: handlePlanningToolCall,
  plansteps: handlePlanningToolCall,
  // Knowledge
  recall: handleKnowledgeToolCall,
  learn: handleKnowledgeToolCall,
  search: handleKnowledgeToolCall,
  // Checkpoint
  wf: handleCheckpointToolCall,
  wfnew: handleCheckpointToolCall,
  wfupdate: handleCheckpointToolCall,
  recover: handleCheckpointToolCall,
  // Output
  save: handleOutputToolCall,
  // Metrics
  mlog: handleMetricsToolCall,
  mstats: handleMetricsToolCall,
  magg: handleMetricsToolCall,
  snaps: handleMetricsToolCall,
  tasks: handleMetricsToolCall,
  tree: handleMetricsToolCall,
  progress: handleMetricsToolCall,
  children: handleMetricsToolCall,
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
  // Find the handler for this tool by direct lookup
  const handler = toolHandlers[name];
  if (handler) {
    return handler(name, args);
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
export { outputTools, handleOutputToolCall } from "./output.js";
export { metricsTools, handleMetricsToolCall } from "./metrics.js";
export { planningTools, handlePlanningToolCall } from "./planning.js";
