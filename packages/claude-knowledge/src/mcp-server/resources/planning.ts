/**
 * Planning MCP Resources
 *
 * Provides a browsable view of the planning stack.
 * Read-only access to current stack state with stale warnings.
 */

import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import { peekStack } from "../../planning/stack.js";
import { detectStaleItems } from "../../planning/stale.js";
import type { Goal, Interrupt } from "../../types.js";

/**
 * Resource definitions for planning stack browsing.
 */
export const planningResources: Resource[] = [
  {
    uri: "planning://stack",
    name: "Planning Stack",
    description:
      "Browse the current planning stack - goals, interrupts, and stale items",
    mimeType: "text/markdown",
  },
];

/**
 * Handle reading planning resources.
 */
export async function readPlanningResource(
  uri: string,
): Promise<{ uri: string; mimeType: string; text: string } | null> {
  if (!uri.startsWith("planning://")) return null;

  if (uri === "planning://stack") {
    const stack = peekStack();
    // Stale detection is now async because it checks plan step completion
    // via external APIs (GitHub, etc.) through the completion resolver
    const staleItems = await detectStaleItems();

    if (stack.depth === 0) {
      return {
        uri,
        mimeType: "text/markdown",
        text: "# Planning Stack\n\nStack is empty. Use `/goal` to start tracking work.",
      };
    }

    const lines: string[] = [`# Planning Stack (depth: ${stack.depth})`, ""];

    for (const item of stack.items) {
      const stale = staleItems.find((s) => s.item.id === item.id);
      const statusIcon = item.status === "active" ? "**Active**" : "Paused";
      const ageMs = Date.now() - new Date(item.createdAt).getTime();
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
      const ageStr = ageDays > 0 ? `${ageDays}d` : `${ageHours}h`;

      lines.push(`## ${statusIcon}: [${item.type}] ${item.title}`);

      if (item.type === "Goal") {
        const goal = item as Goal;
        if (goal.issueNumber) lines.push(`- Issue: #${goal.issueNumber}`);
        if (goal.description) lines.push(`- ${goal.description}`);
      } else {
        const interrupt = item as Interrupt;
        if (interrupt.reason) lines.push(`- Reason: ${interrupt.reason}`);
        if (interrupt.interruptedId) {
          lines.push(`- Interrupted previous work`);
        }
      }

      lines.push(`- Started: ${ageStr} ago`);

      if (stale) {
        lines.push(`- :warning: ${stale.reason}`);
      }

      lines.push("");
    }

    return {
      uri,
      mimeType: "text/markdown",
      text: lines.join("\n"),
    };
  }

  return null;
}
