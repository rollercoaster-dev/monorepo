/**
 * Knowledge MCP Resources
 *
 * Provides resources for browsing learnings and patterns in the knowledge graph.
 * Resources are read-only views that allow exploring the knowledge base.
 */

import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import { knowledge } from "../../knowledge/index.js";

/**
 * Resource definitions for knowledge browsing.
 */
export const knowledgeResources: Resource[] = [
  {
    uri: "knowledge://learnings",
    name: "All Learnings",
    description: "Browse all stored learnings in the knowledge graph",
    mimeType: "application/json",
  },
  {
    uri: "knowledge://patterns",
    name: "All Patterns",
    description: "Browse all recognized patterns in the knowledge graph",
    mimeType: "application/json",
  },
];

/**
 * Handle reading knowledge resources.
 *
 * @param uri - Resource URI
 * @returns Resource contents or null if not found
 */
export async function readKnowledgeResource(
  uri: string,
): Promise<{ uri: string; mimeType: string; text: string } | null> {
  // Parse the URI to extract area parameter if present
  let area: string | null = null;
  try {
    const url = new URL(uri);
    area = url.searchParams.get("area");
  } catch {
    // Malformed URI - return null per function contract
    return null;
  }

  if (uri.startsWith("knowledge://learnings")) {
    // Query learnings, optionally filtered by area
    const results = await knowledge.query({
      codeArea: area || undefined,
      limit: 100,
    });

    const content = {
      resourceType: "learnings",
      filter: area ? { codeArea: area } : null,
      count: results.length,
      learnings: results.map((r) => ({
        id: r.learning.id,
        content: r.learning.content,
        codeArea: r.learning.codeArea,
        filePath: r.learning.filePath,
        confidence: r.learning.confidence,
        sourceIssue: r.learning.sourceIssue,
        hasPatterns: (r.relatedPatterns?.length || 0) > 0,
        hasMistakes: (r.relatedMistakes?.length || 0) > 0,
      })),
    };

    return {
      uri,
      mimeType: "application/json",
      text: JSON.stringify(content, null, 2),
    };
  }

  if (uri.startsWith("knowledge://patterns")) {
    // Query patterns - get patterns via learnings that have related patterns
    const results = await knowledge.query({
      codeArea: area || undefined,
      limit: 100,
    });

    // Extract unique patterns from results
    const patternsMap = new Map<
      string,
      { id: string; name: string; description: string; codeArea?: string }
    >();
    for (const r of results) {
      for (const p of r.relatedPatterns || []) {
        if (!patternsMap.has(p.id)) {
          patternsMap.set(p.id, {
            id: p.id,
            name: p.name,
            description: p.description,
            codeArea: p.codeArea,
          });
        }
      }
    }

    const patterns = Array.from(patternsMap.values());

    const content = {
      resourceType: "patterns",
      filter: area ? { codeArea: area } : null,
      count: patterns.length,
      patterns,
    };

    return {
      uri,
      mimeType: "application/json",
      text: JSON.stringify(content, null, 2),
    };
  }

  return null;
}
