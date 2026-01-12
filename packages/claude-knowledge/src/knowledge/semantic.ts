import { getDatabase } from "../db/sqlite";
import type { Learning, Pattern, Mistake, QueryResult, Topic } from "../types";
// Buffer import needed for ESLint - it's also global in Bun runtime
import type { Buffer } from "buffer";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { bufferToFloatArray } from "../embeddings";
import { cosineSimilarity } from "../embeddings/similarity";
import { generateEmbedding } from "./helpers";

/**
 * Options for semantic similarity search.
 */
export interface SearchSimilarOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Minimum similarity threshold 0.0-1.0 (default: 0.3) */
  threshold?: number;
  /** Include related patterns and mistakes via 2-hop traversal (default: false) */
  includeRelated?: boolean;
}

/**
 * Row type for semantic search query.
 */
interface SearchRow {
  id: string;
  data: string;
  embedding: Buffer | null;
  created_at: string;
}

/**
 * Search for semantically similar learnings using vector similarity.
 *
 * Uses the default embedder to generate vector embeddings and find learnings
 * that are conceptually related to the query text, even if they don't share
 * exact keywords. Similarity is computed using cosine similarity.
 *
 * @param queryText - The search query text
 * @param options - Search options (limit, threshold, includeRelated)
 * @returns Array of QueryResult sorted by similarity (highest first)
 *
 * @example
 * ```typescript
 * // Find learnings about input validation
 * const results = await knowledge.searchSimilar("validate user input", {
 *   limit: 5,
 *   threshold: 0.4,
 * });
 * ```
 */
export async function searchSimilar(
  queryText: string,
  options: SearchSimilarOptions = {},
): Promise<QueryResult[]> {
  const { limit = 10, threshold = 0.3, includeRelated = false } = options;

  const db = getDatabase();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(queryText);
  if (!queryEmbedding) {
    logger.warn("Failed to generate query embedding, returning empty results", {
      queryLength: queryText.length,
      context: "knowledge.searchSimilar",
    });
    return [];
  }
  const queryVector = bufferToFloatArray(queryEmbedding);

  // Fetch all learnings with embeddings
  const sql = `
    SELECT id, data, embedding, created_at
    FROM entities
    WHERE type = 'Learning' AND embedding IS NOT NULL
  `;

  const rows = db.query<SearchRow, []>(sql).all();

  if (rows.length === 0) {
    logger.info("No learnings with embeddings found", {
      context: "knowledge.searchSimilar",
    });
    return [];
  }

  // Calculate similarity scores
  const scored: Array<{ row: SearchRow; similarity: number }> = [];

  for (const row of rows) {
    if (!row.embedding) continue;

    try {
      const rowVector = bufferToFloatArray(row.embedding);
      const similarity = cosineSimilarity(queryVector, rowVector);

      if (similarity >= threshold) {
        scored.push({ row, similarity });
      }
    } catch (error) {
      logger.warn("Failed to calculate similarity for learning", {
        id: row.id,
        error: error instanceof Error ? error.message : String(error),
        context: "knowledge.searchSimilar",
      });
      // Continue with other learnings
    }
  }

  // Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // Take top N
  const topResults = scored.slice(0, limit);

  // Build QueryResult array
  const results: QueryResult[] = [];

  for (const { row, similarity } of topResults) {
    let learning: Learning;
    try {
      learning = JSON.parse(row.data) as Learning;
    } catch (error) {
      logger.warn("Skipping corrupted learning data in semantic search", {
        id: row.id,
        error: error instanceof Error ? error.message : String(error),
        context: "knowledge.searchSimilar",
      });
      continue;
    }

    const result: QueryResult = {
      learning,
      relevanceScore: similarity,
    };

    // Optionally fetch related patterns and mistakes
    if (includeRelated) {
      try {
        // Fetch related patterns (2-hop: Pattern --LED_TO--> Learning)
        const patternSql = `
          SELECT p.data
          FROM entities p
          JOIN relationships r ON r.from_id = p.id AND r.type = 'LED_TO'
          WHERE p.type = 'Pattern' AND r.to_id = ?
        `;
        const patterns = db
          .query<{ data: string }, [string]>(patternSql)
          .all(row.id);
        if (patterns.length > 0) {
          result.relatedPatterns = patterns.map(
            (p) => JSON.parse(p.data) as Pattern,
          );
        }

        // Fetch related mistakes (2-hop: Mistake --LED_TO--> Learning)
        const mistakeSql = `
          SELECT m.data
          FROM entities m
          JOIN relationships r ON r.from_id = m.id AND r.type = 'LED_TO'
          WHERE m.type = 'Mistake' AND r.to_id = ?
        `;
        const mistakes = db
          .query<{ data: string }, [string]>(mistakeSql)
          .all(row.id);
        if (mistakes.length > 0) {
          result.relatedMistakes = mistakes.map(
            (m) => JSON.parse(m.data) as Mistake,
          );
        }
      } catch (error) {
        logger.warn("Failed to fetch related entities for learning", {
          learningId: row.id,
          error: error instanceof Error ? error.message : String(error),
          context: "knowledge.searchSimilar",
        });
        // Continue without related entities
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Result type for topic semantic search.
 */
export interface TopicSearchResult {
  /** The topic entity */
  topic: Topic;
  /** Similarity score (0.0 - 1.0) */
  similarity: number;
}

/**
 * Search for semantically similar topics using vector similarity.
 *
 * Uses neural embeddings (when available) or TF-IDF to find topics that are
 * conceptually related to the query text. This enables semantic matching
 * where "auth validation" can match topics about "credential verification".
 *
 * @param queryText - The search query text (e.g., code areas, concepts)
 * @param options - Search options (limit, threshold)
 * @returns Array of TopicSearchResult sorted by similarity (highest first)
 *
 * @example
 * ```typescript
 * // Find topics related to authentication
 * const topics = await searchSimilarTopics("user authentication login", {
 *   limit: 5,
 *   threshold: 0.4,
 * });
 *
 * // Use in session injection
 * const codeAreas = ["auth", "validation", "security"];
 * const relevantTopics = await searchSimilarTopics(codeAreas.join(" "));
 * ```
 */
export async function searchSimilarTopics(
  queryText: string,
  options: SearchSimilarOptions = {},
): Promise<TopicSearchResult[]> {
  const { limit = 10, threshold = 0.3 } = options;

  if (!queryText || queryText.trim().length === 0) {
    logger.debug("Empty query text for topic search, returning empty results", {
      context: "knowledge.searchSimilarTopics",
    });
    return [];
  }

  const db = getDatabase();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(queryText);
  if (!queryEmbedding) {
    logger.warn(
      "Failed to generate query embedding for topic search, returning empty results",
      {
        queryLength: queryText.length,
        context: "knowledge.searchSimilarTopics",
      },
    );
    return [];
  }
  const queryVector = bufferToFloatArray(queryEmbedding);

  // Fetch all topics with embeddings
  const sql = `
    SELECT id, data, embedding, created_at
    FROM entities
    WHERE type = 'Topic' AND embedding IS NOT NULL
  `;

  const rows = db.query<SearchRow, []>(sql).all();

  if (rows.length === 0) {
    logger.debug("No topics with embeddings found", {
      context: "knowledge.searchSimilarTopics",
    });
    return [];
  }

  // Calculate similarity scores
  const scored: Array<{ row: SearchRow; similarity: number }> = [];

  for (const row of rows) {
    if (!row.embedding) continue;

    try {
      const rowVector = bufferToFloatArray(row.embedding);
      const similarity = cosineSimilarity(queryVector, rowVector);

      if (similarity >= threshold) {
        scored.push({ row, similarity });
      }
    } catch (error) {
      logger.warn("Failed to calculate similarity for topic", {
        id: row.id,
        error: error instanceof Error ? error.message : String(error),
        context: "knowledge.searchSimilarTopics",
      });
      // Continue with other topics
    }
  }

  // Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // Take top N
  const topResults = scored.slice(0, limit);

  // Build result array
  const results: TopicSearchResult[] = [];

  for (const { row, similarity } of topResults) {
    try {
      const topic = JSON.parse(row.data) as Topic;
      results.push({ topic, similarity });
    } catch (error) {
      logger.warn("Skipping corrupted topic data in semantic search", {
        id: row.id,
        error: error instanceof Error ? error.message : String(error),
        context: "knowledge.searchSimilarTopics",
      });
      continue;
    }
  }

  logger.debug("Topic semantic search completed", {
    query: queryText.slice(0, 50),
    totalTopics: rows.length,
    matchingTopics: results.length,
    topSimilarity: results[0]?.similarity ?? 0,
    context: "knowledge.searchSimilarTopics",
  });

  return results;
}
