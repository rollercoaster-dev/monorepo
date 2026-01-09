import { getDatabase } from "./db/sqlite";
import type { Database } from "bun:sqlite";
import type {
  Learning,
  Pattern,
  Mistake,
  EntityType,
  RelationshipType,
  QueryContext,
  QueryResult,
  ContextInjectionOptions,
  ContextInjectionResult,
} from "./types";
import { randomUUID } from "crypto";
// Buffer import needed for ESLint - it's also global in Bun runtime
import { Buffer } from "buffer";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  getDefaultEmbedder,
  floatArrayToBuffer,
  bufferToFloatArray,
} from "./embeddings";
import { cosineSimilarity } from "./embeddings/similarity";
import { formatByType, estimateTokens } from "./formatter";

/**
 * Create or merge an entity in the knowledge graph.
 * If entity with same ID exists, updates it. Otherwise creates new.
 *
 * @param db - Database handle (passed for transaction consistency)
 * @param type - Entity type
 * @param id - Entity ID
 * @param data - Entity data
 * @param embedding - Optional embedding vector for semantic search
 * @returns The entity ID (existing or new)
 */
function createOrMergeEntity(
  db: Database,
  type: EntityType,
  id: string,
  data: unknown,
  embedding?: Buffer,
): string {
  const now = new Date().toISOString();

  const existing = db
    .query<
      { id: string; type: string },
      [string]
    >("SELECT id, type FROM entities WHERE id = ?")
    .get(id);

  if (existing) {
    if (existing.type !== type) {
      throw new Error(
        `Entity "${id}" already exists with type "${existing.type}", cannot update as "${type}"`,
      );
    }
    // Update existing entity (including embedding if provided)
    if (embedding) {
      db.run(
        "UPDATE entities SET data = ?, embedding = ?, updated_at = ? WHERE id = ?",
        [JSON.stringify(data), embedding, now, id],
      );
    } else {
      db.run("UPDATE entities SET data = ?, updated_at = ? WHERE id = ?", [
        JSON.stringify(data),
        now,
        id,
      ]);
    }
    return existing.id;
  }

  // Insert new entity (with or without embedding)
  if (embedding) {
    db.run(
      "INSERT INTO entities (id, type, data, embedding, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, type, JSON.stringify(data), embedding, now, now],
    );
  } else {
    db.run(
      "INSERT INTO entities (id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, type, JSON.stringify(data), now, now],
    );
  }

  return id;
}

/**
 * Generate an embedding for text content.
 * Returns undefined if embedding generation fails (non-blocking).
 *
 * @param content - The text content to embed
 * @returns Buffer containing the embedding, or undefined if generation fails
 */
async function generateEmbedding(content: string): Promise<Buffer | undefined> {
  if (!content || content.trim().length === 0) {
    return undefined;
  }

  try {
    const embedder = getDefaultEmbedder();
    const embedding = await embedder.generate(content);
    return floatArrayToBuffer(embedding);
  } catch (error) {
    logger.warn("Failed to generate embedding, storing entity without it", {
      error: error instanceof Error ? error.message : String(error),
      contentLength: content.length,
      context: "knowledge.generateEmbedding",
    });
    return undefined;
  }
}

/**
 * Create a relationship between two entities.
 * Idempotent - no-op if relationship already exists.
 *
 * @param db - Database handle (passed for transaction consistency)
 * @param fromId - Source entity ID
 * @param toId - Target entity ID
 * @param type - Relationship type
 * @param data - Optional relationship metadata
 */
function createRelationship(
  db: Database,
  fromId: string,
  toId: string,
  type: RelationshipType,
  data?: Record<string, unknown>,
): void {
  const now = new Date().toISOString();

  const existing = db
    .query<
      { id: number },
      [string, string, string]
    >("SELECT id FROM relationships WHERE from_id = ? AND to_id = ? AND type = ?")
    .get(fromId, toId, type);

  if (existing) {
    // Relationship already exists - idempotent
    return;
  }

  db.run(
    "INSERT INTO relationships (from_id, to_id, type, data, created_at) VALUES (?, ?, ?, ?, ?)",
    [fromId, toId, type, data ? JSON.stringify(data) : null, now],
  );
}

/**
 * Store learnings in the knowledge graph.
 *
 * Creates Learning entities and auto-creates/merges related CodeArea and File entities.
 * Establishes ABOUT and IN_FILE relationships.
 * Generates embeddings for semantic search.
 *
 * @param learnings - Array of learnings to store
 * @throws Error if storage fails (transaction is rolled back)
 */
export async function store(learnings: Learning[]): Promise<void> {
  if (learnings.length === 0) {
    return;
  }

  const db = getDatabase();

  // Generate embeddings before starting transaction (async operations)
  const embeddings = await Promise.all(
    learnings.map((learning) => generateEmbedding(learning.content)),
  );

  // Use transaction for batch insert efficiency and atomicity
  db.run("BEGIN TRANSACTION");

  try {
    for (let i = 0; i < learnings.length; i++) {
      const learning = learnings[i];
      const embedding = embeddings[i];

      // Ensure learning has an ID
      const learningId = learning.id || `learning-${randomUUID()}`;

      // Create Learning entity with embedding
      createOrMergeEntity(
        db,
        "Learning",
        learningId,
        {
          ...learning,
          id: learningId,
        },
        embedding,
      );

      // Auto-create/merge CodeArea entity if specified
      if (learning.codeArea) {
        const codeAreaId = `codearea-${learning.codeArea.toLowerCase().replace(/\s+/g, "-")}`;
        createOrMergeEntity(db, "CodeArea", codeAreaId, {
          name: learning.codeArea,
        });

        // Create ABOUT relationship
        createRelationship(db, learningId, codeAreaId, "ABOUT");
      }

      // Auto-create/merge File entity if specified
      if (learning.filePath) {
        // Buffer is global in Bun
        const fileId = `file-${Buffer.from(learning.filePath).toString("base64url")}`;
        createOrMergeEntity(db, "File", fileId, {
          path: learning.filePath,
        });

        // Create IN_FILE relationship
        createRelationship(db, learningId, fileId, "IN_FILE");
      }
    }

    db.run("COMMIT");
  } catch (error) {
    try {
      db.run("ROLLBACK");
    } catch (rollbackError) {
      logger.error("CRITICAL: ROLLBACK failed after transaction error", {
        originalError: error instanceof Error ? error.message : String(error),
        rollbackError:
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
        context: "knowledge.store",
      });
    }
    throw new Error(
      `Failed to store learnings: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Store a pattern in the knowledge graph.
 *
 * Creates Pattern entity and optionally links to Learning entities.
 * Establishes APPLIES_TO relationship to CodeArea if specified.
 * Generates embedding for semantic search.
 *
 * @param pattern - The pattern to store
 * @param learningIds - Optional array of learning IDs this pattern is derived from
 * @throws Error if storage fails or referenced learnings don't exist
 */
export async function storePattern(
  pattern: Pattern,
  learningIds?: string[],
): Promise<void> {
  const db = getDatabase();

  // Generate embedding from pattern name and description
  const textToEmbed = [pattern.name, pattern.description]
    .filter(Boolean)
    .join(" ");
  const embedding = await generateEmbedding(textToEmbed);

  db.run("BEGIN TRANSACTION");

  try {
    // Ensure pattern has an ID
    const patternId = pattern.id || `pattern-${randomUUID()}`;

    // Create Pattern entity with embedding
    createOrMergeEntity(
      db,
      "Pattern",
      patternId,
      {
        ...pattern,
        id: patternId,
      },
      embedding,
    );

    // Link to CodeArea if specified
    if (pattern.codeArea) {
      const codeAreaId = `codearea-${pattern.codeArea.toLowerCase().replace(/\s+/g, "-")}`;
      createOrMergeEntity(db, "CodeArea", codeAreaId, {
        name: pattern.codeArea,
      });

      createRelationship(db, patternId, codeAreaId, "APPLIES_TO");
    }

    // Link to related learnings (LED_TO: pattern derived from learnings)
    if (learningIds && learningIds.length > 0) {
      for (const learningId of learningIds) {
        // Verify learning exists
        const exists = db
          .query<
            { id: string },
            [string]
          >("SELECT id FROM entities WHERE id = ? AND type = 'Learning'")
          .get(learningId);

        if (!exists) {
          throw new Error(`Learning with ID "${learningId}" does not exist`);
        }

        createRelationship(db, patternId, learningId, "LED_TO");
      }
    }

    db.run("COMMIT");
  } catch (error) {
    try {
      db.run("ROLLBACK");
    } catch (rollbackError) {
      logger.error("CRITICAL: ROLLBACK failed after transaction error", {
        originalError: error instanceof Error ? error.message : String(error),
        rollbackError:
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
        context: "knowledge.storePattern",
      });
    }
    throw new Error(
      `Failed to store pattern: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Store a mistake in the knowledge graph.
 *
 * Creates Mistake entity and optionally links to Learning that resolved it.
 * Establishes IN_FILE relationship if filePath specified.
 * Establishes LED_TO relationship to the Learning (mistake led to learning).
 * Generates embedding for semantic search.
 *
 * @param mistake - The mistake to store
 * @param learningId - Optional ID of the learning that fixed this mistake
 * @throws Error if storage fails or referenced learning doesn't exist
 */
export async function storeMistake(
  mistake: Mistake,
  learningId?: string,
): Promise<void> {
  const db = getDatabase();

  // Generate embedding from mistake description and how it was fixed
  const textToEmbed = [mistake.description, mistake.howFixed]
    .filter(Boolean)
    .join(" ");
  const embedding = await generateEmbedding(textToEmbed);

  db.run("BEGIN TRANSACTION");

  try {
    // Ensure mistake has an ID
    const mistakeId = mistake.id || `mistake-${randomUUID()}`;

    // Create Mistake entity with embedding
    createOrMergeEntity(
      db,
      "Mistake",
      mistakeId,
      {
        ...mistake,
        id: mistakeId,
      },
      embedding,
    );

    // Link to File if specified
    if (mistake.filePath) {
      // Buffer is global in Bun
      const fileId = `file-${Buffer.from(mistake.filePath).toString("base64url")}`;
      createOrMergeEntity(db, "File", fileId, {
        path: mistake.filePath,
      });

      createRelationship(db, mistakeId, fileId, "IN_FILE");
    }

    // Link to learning (LED_TO: mistake led to learning that fixed it)
    if (learningId) {
      const exists = db
        .query<
          { id: string },
          [string]
        >("SELECT id FROM entities WHERE id = ? AND type = 'Learning'")
        .get(learningId);

      if (!exists) {
        throw new Error(`Learning with ID "${learningId}" does not exist`);
      }

      createRelationship(db, mistakeId, learningId, "LED_TO");
    }

    db.run("COMMIT");
  } catch (error) {
    try {
      db.run("ROLLBACK");
    } catch (rollbackError) {
      logger.error("CRITICAL: ROLLBACK failed after transaction error", {
        originalError: error instanceof Error ? error.message : String(error),
        rollbackError:
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
        context: "knowledge.storeMistake",
      });
    }
    throw new Error(
      `Failed to store mistake: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ============================================================================
// Query API
// ============================================================================

/**
 * Row type returned from the query SQL.
 */
interface QueryRow {
  id: string;
  data: string;
  created_at: string;
  patterns: string | null;
  mistakes: string | null;
}

/**
 * Query the knowledge graph for learnings based on context filters.
 *
 * Supports filtering by:
 * - codeArea: Learnings related to a specific code area (1-hop via ABOUT)
 * - filePath: Learnings related to a specific file (1-hop via IN_FILE)
 * - keywords: Content search across learning content
 * - issueNumber: Filter by source issue number
 *
 * Results include related patterns and mistakes via 2-hop traversal (LED_TO).
 *
 * @param context - Query filters (at least one should be provided)
 * @returns Array of QueryResult with learnings and related entities
 */
export async function query(context: QueryContext): Promise<QueryResult[]> {
  const db = getDatabase();
  const { codeArea, filePath, keywords, issueNumber, limit = 50 } = context;

  // Build dynamic WHERE conditions and parameters
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Base CTE to find target learnings
  let baseCte = `
    SELECT DISTINCT e.id, e.data, e.created_at
    FROM entities e
  `;

  // Join for code area filter (1-hop)
  if (codeArea) {
    baseCte += `
      JOIN relationships r_ca ON r_ca.from_id = e.id AND r_ca.type = 'ABOUT'
      JOIN entities ca ON ca.id = r_ca.to_id AND ca.type = 'CodeArea'
    `;
    conditions.push(`json_extract(ca.data, '$.name') = ?`);
    params.push(codeArea);
  }

  // Join for file path filter (1-hop)
  if (filePath) {
    baseCte += `
      JOIN relationships r_f ON r_f.from_id = e.id AND r_f.type = 'IN_FILE'
      JOIN entities f ON f.id = r_f.to_id AND f.type = 'File'
    `;
    conditions.push(`json_extract(f.data, '$.path') = ?`);
    params.push(filePath);
  }

  // Base condition: must be a Learning
  baseCte += ` WHERE e.type = 'Learning'`;

  // Add keyword search conditions
  if (keywords && keywords.length > 0) {
    for (const keyword of keywords) {
      conditions.push(`json_extract(e.data, '$.content') LIKE ? ESCAPE '\\'`);
      // Escape SQL LIKE special characters to prevent injection
      const escapedKeyword = keyword.replace(/[%_\\]/g, "\\$&");
      params.push(`%${escapedKeyword}%`);
    }
  }

  // Add issue number filter
  if (issueNumber !== undefined) {
    conditions.push(`json_extract(e.data, '$.sourceIssue') = ?`);
    params.push(issueNumber);
  }

  // Combine conditions with AND
  if (conditions.length > 0) {
    baseCte += ` AND ${conditions.join(" AND ")}`;
  }

  // Full query with 2-hop traversal for related patterns and mistakes
  const sql = `
    WITH target_learnings AS (
      ${baseCte}
    ),
    related_patterns AS (
      SELECT
        tl.id as learning_id,
        GROUP_CONCAT(p.data, '|||') as pattern_data
      FROM target_learnings tl
      JOIN relationships r ON r.to_id = tl.id AND r.type = 'LED_TO'
      JOIN entities p ON p.id = r.from_id AND p.type = 'Pattern'
      GROUP BY tl.id
    ),
    related_mistakes AS (
      SELECT
        tl.id as learning_id,
        GROUP_CONCAT(m.data, '|||') as mistake_data
      FROM target_learnings tl
      JOIN relationships r ON r.to_id = tl.id AND r.type = 'LED_TO'
      JOIN entities m ON m.id = r.from_id AND m.type = 'Mistake'
      GROUP BY tl.id
    )
    SELECT
      tl.id,
      tl.data,
      tl.created_at,
      rp.pattern_data as patterns,
      rm.mistake_data as mistakes
    FROM target_learnings tl
    LEFT JOIN related_patterns rp ON rp.learning_id = tl.id
    LEFT JOIN related_mistakes rm ON rm.learning_id = tl.id
    ORDER BY tl.created_at DESC
    LIMIT ?
  `;

  params.push(limit);

  const rows = db.query<QueryRow, (string | number)[]>(sql).all(...params);

  // Transform rows to QueryResult, skipping corrupted entries
  const results: QueryResult[] = [];
  for (const row of rows) {
    // Parse learning data - skip entire row if corrupted
    let learning: Learning;
    try {
      learning = JSON.parse(row.data) as Learning;
    } catch (error) {
      logger.warn("Skipping corrupted learning data", {
        id: row.id,
        error: error instanceof Error ? error.message : String(error),
        context: "knowledge.query",
      });
      continue;
    }

    const result: QueryResult = { learning };

    // Parse related patterns (separated by |||) - granular error handling
    if (row.patterns) {
      try {
        result.relatedPatterns = row.patterns
          .split("|||")
          .map((p) => JSON.parse(p) as Pattern);
      } catch (error) {
        logger.warn("Skipping corrupted pattern data for learning", {
          learningId: row.id,
          error: error instanceof Error ? error.message : String(error),
          context: "knowledge.query",
        });
        // Continue without patterns - learning is still valid
      }
    }

    // Parse related mistakes (separated by |||) - granular error handling
    if (row.mistakes) {
      try {
        result.relatedMistakes = row.mistakes
          .split("|||")
          .map((m) => JSON.parse(m) as Mistake);
      } catch (error) {
        logger.warn("Skipping corrupted mistake data for learning", {
          learningId: row.id,
          error: error instanceof Error ? error.message : String(error),
          context: "knowledge.query",
        });
        // Continue without mistakes - learning is still valid
      }
    }

    results.push(result);
  }
  return results;
}

/**
 * Get all mistakes associated with a specific file path.
 *
 * Useful for pre-commit checks to warn about past mistakes in files being modified.
 *
 * @param filePath - The file path to query mistakes for
 * @returns Array of Mistake objects (empty if none found)
 */
export async function getMistakesForFile(filePath: string): Promise<Mistake[]> {
  const db = getDatabase();

  const sql = `
    SELECT m.data
    FROM entities m
    JOIN relationships r ON r.from_id = m.id AND r.type = 'IN_FILE'
    JOIN entities f ON f.id = r.to_id AND f.type = 'File'
    WHERE m.type = 'Mistake'
      AND json_extract(f.data, '$.path') = ?
    ORDER BY m.created_at DESC
  `;

  const rows = db.query<{ data: string }, [string]>(sql).all(filePath);

  return rows.map((row) => JSON.parse(row.data) as Mistake);
}

/**
 * Get all patterns that apply to a specific code area.
 *
 * Useful for scaffolding and code generation to apply known patterns.
 *
 * @param codeArea - The code area name to query patterns for
 * @returns Array of Pattern objects (empty if none found)
 */
export async function getPatternsForArea(codeArea: string): Promise<Pattern[]> {
  const db = getDatabase();

  const sql = `
    SELECT p.data
    FROM entities p
    JOIN relationships r ON r.from_id = p.id AND r.type = 'APPLIES_TO'
    JOIN entities ca ON ca.id = r.to_id AND ca.type = 'CodeArea'
    WHERE p.type = 'Pattern'
      AND json_extract(ca.data, '$.name') = ?
    ORDER BY p.created_at DESC
  `;

  const rows = db.query<{ data: string }, [string]>(sql).all(codeArea);

  return rows.map((row) => JSON.parse(row.data) as Pattern);
}

// ============================================================================
// Semantic Search API
// ============================================================================

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
 * Uses TF-IDF embeddings to find learnings that are conceptually related
 * to the query text, even if they don't share exact keywords.
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

// ============================================================================
// Context Injection API
// ============================================================================

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

/**
 * Knowledge graph API for storing and querying learnings, patterns, and mistakes.
 */
export const knowledge = {
  store,
  storePattern,
  storeMistake,
  query,
  getMistakesForFile,
  getPatternsForArea,
  searchSimilar,
  formatForContext,
};
