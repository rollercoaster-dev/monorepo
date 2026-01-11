import type {
  Pattern,
  Mistake,
  QueryContext,
  QueryResult,
  ContextInjectionOptions,
  ContextInjectionResult,
} from "../types";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { formatByType, estimateTokens } from "../formatter";
import { query } from "./query";
import { getMistakesForFile, getPatternsForArea } from "./query";
import { searchSimilar } from "./semantic";

/**
 * Query and format knowledge for injection into agent prompts.
 *
 * This is the primary entry point for agents to get context-ready knowledge.
 * It combines querying, filtering, and formatting in a single call.
 *
 * @param queryContext - Query parameters (QueryContext object or string for search)
 * @param options - Formatting and filtering options
 * @returns Formatted content with metadata
 *
 * @example
 * ```typescript
 * // Query by code area
 * const result = await knowledge.formatForContext(
 *   { codeArea: "API Development", limit: 5 },
 *   { format: "markdown", maxTokens: 1000 }
 * );
 *
 * // Semantic search
 * const result = await knowledge.formatForContext(
 *   "How do I validate user input?",
 *   { format: "bullets", useSemanticSearch: true }
 * );
 * ```
 */
export async function formatForContext(
  queryContext: QueryContext | string,
  options: ContextInjectionOptions = {},
): Promise<ContextInjectionResult> {
  const {
    format = "markdown",
    maxTokens = 2000,
    limit = 10,
    confidenceThreshold = 0.3,
    similarityThreshold = 0.3,
    useSemanticSearch = false,
    showFilePaths = true,
    context,
  } = options;

  try {
    let queryResults: QueryResult[] = [];

    // Execute query based on input type
    if (typeof queryContext === "string") {
      if (useSemanticSearch) {
        // Semantic search for conceptual relevance
        // Use similarityThreshold for semantic matching, not confidenceThreshold
        queryResults = await searchSimilar(queryContext, {
          limit,
          threshold: similarityThreshold,
          includeRelated: true,
        });
      } else {
        // Keyword search
        queryResults = await query({
          keywords: [queryContext],
          limit,
        });
      }
    } else {
      // Direct query with QueryContext object
      queryResults = await query({
        ...queryContext,
        limit: queryContext.limit ?? limit,
      });
    }

    // Filter by learning confidence threshold (separate from similarity threshold)
    const originalCount = queryResults.length;
    const filteredResults = queryResults.filter(
      (result) =>
        result.learning.confidence === undefined ||
        result.learning.confidence >= confidenceThreshold,
    );
    const wasFiltered = filteredResults.length < originalCount;

    // Extract unique code areas and file paths from results
    const codeAreas = new Set<string>();
    const filePaths = new Set<string>();

    for (const result of filteredResults) {
      if (result.learning.codeArea) {
        codeAreas.add(result.learning.codeArea);
      }
      if (result.learning.filePath) {
        filePaths.add(result.learning.filePath);
      }
    }

    // Fetch related patterns for code areas (2-hop traversal) - parallelized
    const patternsById = new Map<string, Pattern>();
    const patternsLists = await Promise.all(
      Array.from(codeAreas).map((area) => getPatternsForArea(area)),
    );
    for (const list of patternsLists) {
      for (const p of list) {
        patternsById.set(p.id, p);
      }
    }
    const patterns = Array.from(patternsById.values());

    // Fetch related mistakes for file paths (2-hop traversal) - parallelized
    const mistakesById = new Map<string, Mistake>();
    const mistakesLists = await Promise.all(
      Array.from(filePaths).map((p) => getMistakesForFile(p)),
    );
    for (const list of mistakesLists) {
      for (const m of list) {
        mistakesById.set(m.id, m);
      }
    }
    const mistakes = Array.from(mistakesById.values());

    // Format the results
    const content = formatByType(format, filteredResults, patterns, mistakes, {
      maxTokens,
      showFilePaths,
      context,
    });

    // Calculate token count
    const tokenCount = estimateTokens(content);

    return {
      content,
      tokenCount,
      resultCount: filteredResults.length,
      wasFiltered,
    };
  } catch (error) {
    // Graceful degradation - return empty result on error
    logger.warn("formatForContext failed, returning empty result", {
      error: error instanceof Error ? error.message : String(error),
      queryContext:
        typeof queryContext === "string" ? queryContext : "QueryContext object",
      context: "knowledge.formatForContext",
    });

    return {
      content: "",
      tokenCount: 0,
      resultCount: 0,
      wasFiltered: false,
    };
  }
}
