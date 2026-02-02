import { withDatabase } from "../db/sqlite";
import type {
  Learning,
  Pattern,
  Mistake,
  Topic,
  QueryContext,
  QueryResult,
} from "../types";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

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
 * If no filters are provided, returns the most recent learnings (up to limit).
 * Results include related patterns and mistakes via 2-hop traversal (LED_TO).
 *
 * @param context - Query filters and options (filters are optional)
 * @returns Array of QueryResult with learnings and related entities
 */
export async function query(context: QueryContext): Promise<QueryResult[]> {
  return withDatabase((db) => {
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
          GROUP_CONCAT(p.data, char(31)) as pattern_data
        FROM target_learnings tl
        JOIN relationships r ON r.to_id = tl.id AND r.type = 'LED_TO'
        JOIN entities p ON p.id = r.from_id AND p.type = 'Pattern'
        GROUP BY tl.id
      ),
      related_mistakes AS (
        SELECT
          tl.id as learning_id,
          GROUP_CONCAT(m.data, char(31)) as mistake_data
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

      // Parse related patterns (separated by Unit Separator \x1F) - granular error handling
      if (row.patterns) {
        try {
          result.relatedPatterns = row.patterns
            .split("\x1F")
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

      // Parse related mistakes (separated by Unit Separator \x1F) - granular error handling
      if (row.mistakes) {
        try {
          result.relatedMistakes = row.mistakes
            .split("\x1F")
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
  });
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
  return withDatabase((db) => {
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

    // Transform rows to Mistake objects, skipping corrupted entries
    const mistakes: Mistake[] = [];
    for (const row of rows) {
      try {
        mistakes.push(JSON.parse(row.data) as Mistake);
      } catch (error) {
        logger.warn("Skipping corrupted mistake data", {
          error: error instanceof Error ? error.message : String(error),
          context: "knowledge.getMistakesForFile",
          filePath,
        });
        // Continue with other rows - don't let one corrupted row break everything
      }
    }
    return mistakes;
  });
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
  return withDatabase((db) => {
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

    // Transform rows to Pattern objects, skipping corrupted entries
    const patterns: Pattern[] = [];
    for (const row of rows) {
      try {
        patterns.push(JSON.parse(row.data) as Pattern);
      } catch (error) {
        logger.warn("Skipping corrupted pattern data", {
          error: error instanceof Error ? error.message : String(error),
          context: "knowledge.getPatternsForArea",
          codeArea,
        });
        // Continue with other rows - don't let one corrupted row break everything
      }
    }
    return patterns;
  });
}

/**
 * Query context for topic retrieval.
 */
export interface TopicQueryContext {
  /** Keywords to search for in topic content and keywords */
  keywords?: string[];
  /** Maximum number of topics to return (default: 10) */
  limit?: number;
}

/**
 * Query the knowledge graph for conversation topics.
 *
 * Retrieves topics matching the provided keywords, sorted by recency.
 * If no keywords provided, returns the most recent topics.
 *
 * @param context - Query filters and options
 * @returns Array of Topic objects
 */
export async function queryTopics(
  context: TopicQueryContext = {},
): Promise<Topic[]> {
  return withDatabase((db) => {
    const { keywords, limit = 10 } = context;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    let sql = `
      SELECT data, created_at
      FROM entities
      WHERE type = 'Topic'
    `;

    // Add keyword search conditions (OR logic - match ANY keyword)
    if (keywords && keywords.length > 0) {
      const keywordConditions: string[] = [];
      for (const keyword of keywords) {
        // Search in both content and keywords array
        const escapedKeyword = keyword.replace(/[%_\\]/g, "\\$&");
        keywordConditions.push(
          `(json_extract(data, '$.content') LIKE ? ESCAPE '\\' OR data LIKE ? ESCAPE '\\')`,
        );
        params.push(`%${escapedKeyword}%`, `%${escapedKeyword}%`);
      }
      // Use OR to match topics with ANY of the keywords
      conditions.push(`(${keywordConditions.join(" OR ")})`);
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(" AND ")}`;
    }

    // Order by topic's timestamp (from JSON data) for correct recency ordering,
    // falling back to created_at if timestamp is not present
    sql += ` ORDER BY COALESCE(json_extract(data, '$.timestamp'), created_at) DESC LIMIT ?`;
    params.push(limit);

    const rows = db
      .query<{ data: string; created_at: string }, (string | number)[]>(sql)
      .all(...params);

    // Transform rows to Topic objects, skipping corrupted entries
    const topics: Topic[] = [];
    for (const row of rows) {
      try {
        topics.push(JSON.parse(row.data) as Topic);
      } catch (error) {
        logger.warn("Skipping corrupted topic data", {
          error: error instanceof Error ? error.message : String(error),
          context: "knowledge.queryTopics",
        });
      }
    }
    return topics;
  });
}
