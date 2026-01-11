import { getDatabase } from "../db/sqlite";
import type {
  Learning,
  Pattern,
  Mistake,
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
