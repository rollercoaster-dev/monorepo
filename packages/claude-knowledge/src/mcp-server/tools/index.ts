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
  // Checkpoint (consolidated: wf handles find/create/update)
  wf: handleCheckpointToolCall,
  wfnew: handleCheckpointToolCall, // backward compat → wf action=create
  wfupdate: handleCheckpointToolCall, // backward compat → wf action=update
  recover: handleCheckpointToolCall,
  // Output
  save: handleOutputToolCall,
  // Metrics (consolidated: metrics handles log/summary/aggregate, taskinfo handles queries)
  metrics: handleMetricsToolCall,
  taskinfo: handleMetricsToolCall,
  mlog: handleMetricsToolCall, // backward compat → metrics action=log
  mstats: handleMetricsToolCall, // backward compat → metrics action=summary
  magg: handleMetricsToolCall, // backward compat → metrics action=aggregate
  snaps: handleMetricsToolCall, // backward compat → taskinfo query=snapshots
  tasks: handleMetricsToolCall, // backward compat → taskinfo query=metrics
  tree: handleMetricsToolCall, // backward compat → taskinfo query=tree
  progress: handleMetricsToolCall, // backward compat → taskinfo query=progress
  children: handleMetricsToolCall, // backward compat → taskinfo query=children
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
