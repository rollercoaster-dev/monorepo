/**
 * Workflows MCP Resources
 *
 * Provides resources for browsing active workflow checkpoints.
 * Shows currently running and recently completed workflows.
 */

import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import { checkpoint } from "../../checkpoint/index.js";

/**
 * Resource definitions for workflow browsing.
 */
export const workflowsResources: Resource[] = [
  {
    uri: "workflows://active",
    name: "Active Workflows",
    description: "Currently running workflow checkpoints",
    mimeType: "application/json",
  },
];

/**
 * Handle reading workflow resources.
 *
 * @param uri - Resource URI
 * @returns Resource contents or null if not found
 */
export async function readWorkflowsResource(
  uri: string,
): Promise<{ uri: string; mimeType: string; text: string } | null> {
  if (uri === "workflows://active") {
    try {
      const activeWorkflows = checkpoint.listActive();

      const content = {
        resourceType: "active-workflows",
        count: activeWorkflows.length,
        workflows: activeWorkflows.map((w) => ({
          id: w.id,
          issueNumber: w.issueNumber,
          branch: w.branch,
          phase: w.phase,
          status: w.status,
          retryCount: w.retryCount,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        })),
      };

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(content, null, 2),
      };
    } catch (error) {
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          resourceType: "active-workflows",
          count: 0,
          workflows: [],
          error: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  return null;
}
