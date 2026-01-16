/**
 * MCP Resources Registry
 *
 * Central registry for all MCP resources provided by claude-knowledge.
 * Each resource module exports its resource definitions and read handler.
 */

import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import { knowledgeResources, readKnowledgeResource } from "./knowledge.js";

/**
 * All available MCP resources.
 */
export const resources: Resource[] = [
  ...knowledgeResources,
  // Logs and workflow resources will be added in commit 7
];

/**
 * Resource read handler dispatch.
 * Maps URI schemes to their read handlers.
 */
const resourceHandlers: Record<
  string,
  (
    uri: string,
  ) => Promise<{ uri: string; mimeType: string; text: string } | null>
> = {
  "knowledge://": readKnowledgeResource,
  // logs://: readLogsResource (commit 7)
  // workflows://: readWorkflowsResource (commit 7)
};

/**
 * Read a resource by URI.
 *
 * @param uri - Resource URI
 * @returns Resource contents or error
 */
export async function readResource(
  uri: string,
): Promise<
  | { contents: { uri: string; mimeType: string; text: string }[] }
  | { error: string }
> {
  // Find the handler for this URI based on scheme
  for (const [scheme, handler] of Object.entries(resourceHandlers)) {
    if (uri.startsWith(scheme)) {
      const result = await handler(uri);
      if (result) {
        return { contents: [result] };
      }
      return { error: `Resource not found: ${uri}` };
    }
  }

  return { error: `Unknown resource scheme: ${uri}` };
}

// Re-export individual resource modules for direct imports
export { knowledgeResources, readKnowledgeResource } from "./knowledge.js";
