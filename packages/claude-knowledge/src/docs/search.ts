/**
 * Documentation Search Module
 *
 * Provides semantic search over indexed documentation (DocSection + CodeDoc entities).
 * Uses embeddings and cosine similarity for relevance ranking.
 */

// Buffer import needed for ESLint - it's also global in Bun runtime
import type { Buffer } from "buffer";
import { getDatabase } from "../db/sqlite";
import { generateEmbedding } from "../knowledge/helpers";
import { bufferToFloatArray } from "../embeddings";
import { cosineSimilarity } from "../embeddings/similarity";
import type { DocSearchResult, DocSection, CodeDoc } from "../types";

/**
 * Options for documentation search.
 */
export interface SearchOptions {
  /** Maximum results (default: 10) */
  limit?: number;
  /** Minimum similarity threshold (default: 0.3) */
  threshold?: number;
  /** Filter to specific file paths */
  filePaths?: string[];
  /** Include only DocSections (default: false) */
  docsOnly?: boolean;
  /** Include only CodeDocs (default: false) */
  codeDocsOnly?: boolean;
}

/**
 * Semantic search over indexed documentation.
 * Searches both DocSection and CodeDoc entities unless filtered.
 *
 * @param query - Natural language search query
 * @param options - Search options
 * @returns Array of matching docs sorted by similarity (highest first)
 */
export async function searchDocs(
  query: string,
  options: SearchOptions = {},
): Promise<DocSearchResult[]> {
  const {
    limit = 10,
    threshold = 0.3,
    filePaths,
    docsOnly = false,
    codeDocsOnly = false,
  } = options;

  const db = getDatabase();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    return [];
  }
  const queryVector = bufferToFloatArray(queryEmbedding);

  // Build entity type filter
  const entityTypes: string[] = [];
  if (docsOnly) {
    entityTypes.push("DocSection");
  } else if (codeDocsOnly) {
    entityTypes.push("CodeDoc");
  } else {
    entityTypes.push("DocSection", "CodeDoc");
  }

  // Build SQL query
  let sql = `
    SELECT id, type, data, embedding
    FROM entities
    WHERE type IN (${entityTypes.map(() => "?").join(",")})
      AND embedding IS NOT NULL
  `;

  const params: string[] = [...entityTypes];

  // Add file path filter if specified
  if (filePaths && filePaths.length > 0) {
    sql += ` AND json_extract(data, '$.filePath') IN (${filePaths.map(() => "?").join(",")})`;
    params.push(...filePaths);
  }

  const rows = db
    .query<
      { id: string; type: string; data: string; embedding: Buffer },
      string[]
    >(sql)
    .all(...params);

  // Score and rank results
  const scored: Array<{
    row: (typeof rows)[0];
    similarity: number;
  }> = [];

  for (const row of rows) {
    if (!row.embedding) continue;

    const rowVector = bufferToFloatArray(row.embedding);
    const similarity = cosineSimilarity(queryVector, rowVector);

    if (similarity >= threshold) {
      scored.push({ row, similarity });
    }
  }

  // Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // Build results
  const results: DocSearchResult[] = [];
  for (const { row, similarity } of scored.slice(0, limit)) {
    const section = JSON.parse(row.data) as DocSection | CodeDoc;
    const entityType = row.type as "DocSection" | "CodeDoc";

    let location: string;
    if (entityType === "DocSection") {
      const docSection = section as DocSection;
      location = `${docSection.filePath}${docSection.anchor ? "#" + docSection.anchor : ""}`;
    } else {
      // CodeDoc: link to the code entity file
      const codeDoc = section as CodeDoc;
      // EntityId format: package:filePath:type:name
      // Extract filePath (second component)
      const parts = codeDoc.entityId.split(":");
      const filePath = parts.length > 1 ? parts[1] : "unknown";
      location = filePath;
    }

    results.push({
      section,
      similarity,
      location,
      entityType,
    });
  }

  return results;
}
