/**
 * Document Indexing Store
 *
 * Implements content-hash based incremental updates for documentation files.
 * Extracts hierarchical sections, generates embeddings, and creates relationships.
 */

import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { Buffer } from "buffer";
import { Glob } from "bun";
import type { Database } from "bun:sqlite";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { getDatabase } from "../db/sqlite";
import { parseMarkdown } from "./parser";
import {
  createOrMergeEntity,
  createRelationship,
  generateEmbedding,
} from "../knowledge/helpers";
import type { DocSection, FileData } from "../types";

/**
 * Options for indexing documents.
 */
export interface IndexOptions {
  /** Link to code entities mentioned in content */
  linkToCode?: boolean;
  /** Minimum section length to index (skip tiny sections) */
  minContentLength?: number;
  /** Force re-index even if hash matches */
  force?: boolean;
}

/**
 * Result of indexing a single document.
 */
export interface IndexResult {
  status: "indexed" | "unchanged" | "updated";
  sectionsIndexed: number;
  linkedToCode: number;
  crossRefsCreated: number;
}

/**
 * Result of indexing a directory.
 */
export interface DirectoryIndexResult {
  filesIndexed: number;
  filesSkipped: number;
  filesFailed: number;
  totalSections: number;
  failures: Array<{ path: string; error: string }>;
}

/**
 * Generate SHA-256 hash for content.
 *
 * @param content - Content to hash
 * @returns SHA-256 hash as hex string
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Extract code references from markdown content.
 * Looks for backtick-wrapped code mentions and links them to code entities.
 *
 * @param content - Markdown content to scan
 * @param db - Database handle
 * @returns Array of code entity IDs that were linked
 */
export function extractCodeReferences(content: string, db: Database): string[] {
  const codeRefRegex = /`([a-zA-Z_][a-zA-Z0-9_]*(?:\(\))?)`/g;
  const matches = [...content.matchAll(codeRefRegex)];
  const linkedEntityIds = new Set<string>();

  for (const match of matches) {
    const codeName = match[1].replace(/\(\)$/, ""); // Strip () for function names

    // Query code graph for matching entity
    const entity = db
      .query<
        { id: string },
        [string]
      >("SELECT id FROM graph_entities WHERE name = ? LIMIT 1")
      .get(codeName);

    if (entity) {
      linkedEntityIds.add(entity.id);
    }
  }

  return [...linkedEntityIds];
}

/**
 * Extract cross-document links from markdown content.
 * Parses markdown links to other .md files and resolves relative paths.
 *
 * @param content - Markdown content to scan
 * @param currentFilePath - Absolute path to current file (for resolving relative links)
 * @param db - Database handle
 * @returns Array of target file paths that were linked
 */
export function extractCrossDocLinks(
  content: string,
  currentFilePath: string,
  _db: Database,
): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.md(?:#[^)]*)?)\)/g;
  const matches = [...content.matchAll(linkRegex)];
  const linkedFilePaths: string[] = [];

  for (const match of matches) {
    const targetPath = match[2];
    const [filePath] = targetPath.split("#"); // Strip anchor

    // Resolve relative path
    const absolutePath = resolve(dirname(currentFilePath), filePath);
    linkedFilePaths.push(absolutePath);
  }

  return linkedFilePaths;
}

/**
 * Index a single markdown document.
 * Parses sections, generates embeddings, and creates entities/relationships.
 * Uses content hashing for incremental updates.
 *
 * @param filePath - Absolute path to markdown file
 * @param options - Indexing options
 * @returns Index result with status and counts
 */
export async function indexDocument(
  filePath: string,
  options?: IndexOptions,
): Promise<IndexResult> {
  const db = getDatabase();
  const minContentLength = options?.minContentLength ?? 50;
  const linkToCode = options?.linkToCode ?? true;
  const force = options?.force ?? false;

  // Read file content
  const file = Bun.file(filePath);
  const exists = await file.exists();

  if (!exists) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = await file.text();
  const contentHash = hashContent(content);

  // Check if file has changed since last index
  if (!force) {
    const existingIndex = db
      .query<
        { content_hash: string },
        [string]
      >("SELECT content_hash FROM doc_index WHERE file_path = ?")
      .get(filePath);

    if (existingIndex && existingIndex.content_hash === contentHash) {
      // Content unchanged, skip re-indexing
      return {
        status: "unchanged",
        sectionsIndexed: 0,
        linkedToCode: 0,
        crossRefsCreated: 0,
      };
    }
  }

  // Parse markdown into sections
  const sections = parseMarkdown(content);
  const now = new Date().toISOString();

  let sectionsIndexed = 0;
  let linkedToCode = 0;
  let crossRefsCreated = 0;

  // Begin transaction for atomicity
  db.run("BEGIN TRANSACTION");

  try {
    // Create/update File entity
    const fileEntityId = `file-${Buffer.from(filePath).toString("base64url")}`;
    createOrMergeEntity(db, "File", fileEntityId, {
      path: filePath,
    } satisfies FileData);

    // Filter sections that meet minimum content length
    const filteredSections = sections.filter(
      (s) => s.content.length >= minContentLength,
    );

    // Generate embeddings for all filtered sections in parallel
    const embeddings = await Promise.all(
      filteredSections.map((s) =>
        generateEmbedding(`${s.heading}\n\n${s.content}`),
      ),
    );

    // Process each filtered section with matching embedding
    for (let i = 0; i < filteredSections.length; i++) {
      const section = filteredSections[i];
      const embedding = embeddings[i];

      // Create DocSection entity
      const sectionId = `doc-${Buffer.from(filePath).toString("base64url")}-${section.anchor}`;

      createOrMergeEntity(
        db,
        "DocSection",
        sectionId,
        {
          id: sectionId,
          heading: section.heading,
          content: section.content,
          level: section.level,
          anchor: section.anchor,
          filePath,
        } satisfies DocSection,
        embedding,
      );

      sectionsIndexed++;

      // Create IN_DOC relationship (DocSection → File)
      createRelationship(db, sectionId, fileEntityId, "IN_DOC");

      // Create CHILD_OF relationship if parent exists and was indexed
      if (section.parentAnchor) {
        const parentId = `doc-${Buffer.from(filePath).toString("base64url")}-${section.parentAnchor}`;
        // Only create relationship if parent was indexed (may have been filtered by minContentLength)
        const parentExists = db
          .query<
            { id: string },
            [string]
          >("SELECT id FROM entities WHERE id = ? AND type = 'DocSection'")
          .get(parentId);
        if (parentExists) {
          createRelationship(db, sectionId, parentId, "CHILD_OF");
        }
      }

      // Extract and link code references
      if (linkToCode) {
        const codeEntityIds = extractCodeReferences(section.content, db);
        for (const codeEntityId of codeEntityIds) {
          // Verify entity exists in knowledge graph (extractCodeReferences queries
          // graph_entities, but relationships FK requires entities table)
          const codeEntityExists = db
            .query<
              { id: string },
              [string]
            >("SELECT id FROM entities WHERE id = ?")
            .get(codeEntityId);
          if (codeEntityExists) {
            createRelationship(db, sectionId, codeEntityId, "DOCUMENTS");
            linkedToCode++;
          } else {
            logger.debug(
              "Skipped code ref: entity in graph_entities but not entities",
              {
                codeEntityId,
                section: section.heading,
              },
            );
          }
        }
      }

      // Extract and link cross-document references
      const crossDocPaths = extractCrossDocLinks(section.content, filePath, db);
      for (const targetPath of crossDocPaths) {
        const targetFileId = `file-${Buffer.from(targetPath).toString("base64url")}`;

        // Check if target file entity exists
        const targetExists = db
          .query<
            { id: string },
            [string]
          >("SELECT id FROM entities WHERE id = ? AND type = 'File'")
          .get(targetFileId);

        if (targetExists) {
          createRelationship(db, sectionId, targetFileId, "REFERENCES");
          crossRefsCreated++;
        } else {
          logger.debug("Cross-doc link target not indexed yet", {
            source: filePath,
            target: targetPath,
            suggestion:
              "Re-index to create relationship after target is indexed",
          });
        }
      }
    }

    // Update doc_index table
    const existingIndex = db
      .query<
        { file_path: string },
        [string]
      >("SELECT file_path FROM doc_index WHERE file_path = ?")
      .get(filePath);

    if (existingIndex) {
      db.run(
        "UPDATE doc_index SET content_hash = ?, indexed_at = ? WHERE file_path = ?",
        [contentHash, now, filePath],
      );
    } else {
      db.run(
        "INSERT INTO doc_index (file_path, content_hash, indexed_at) VALUES (?, ?, ?)",
        [filePath, contentHash, now],
      );
    }

    db.run("COMMIT");

    return {
      status: existingIndex ? "updated" : "indexed",
      sectionsIndexed,
      linkedToCode,
      crossRefsCreated,
    };
  } catch (error) {
    db.run("ROLLBACK");
    // Clean up doc_index to force re-index on retry (avoid stale hash)
    try {
      db.run("DELETE FROM doc_index WHERE file_path = ?", [filePath]);
    } catch {
      // Ignore cleanup errors - the main error is more important
    }
    logger.error("Failed to index document", {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Index all markdown files in a directory.
 * Supports glob patterns for filtering files.
 *
 * @param dirPath - Absolute path to directory
 * @param options - Indexing options with optional glob pattern
 * @returns Directory index result with counts
 */
export async function indexDirectory(
  dirPath: string,
  options?: IndexOptions & { pattern?: string },
): Promise<DirectoryIndexResult> {
  const pattern = options?.pattern ?? "**/*.md";

  // Find all markdown files using Bun's Glob
  const glob = new Glob(pattern);
  const files: string[] = [];

  for await (const file of glob.scan({ cwd: dirPath, absolute: true })) {
    files.push(file);
  }

  let filesIndexed = 0;
  let filesSkipped = 0;
  let totalSections = 0;
  const failures: Array<{ path: string; error: string }> = [];

  for (const filePath of files) {
    try {
      const result = await indexDocument(filePath, options);

      if (result.status === "unchanged") {
        filesSkipped++;
      } else {
        filesIndexed++;
        totalSections += result.sectionsIndexed;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to index file in directory", {
        filePath,
        error: errorMessage,
      });
      failures.push({ path: filePath, error: errorMessage });
    }
  }

  return {
    filesIndexed,
    filesSkipped,
    filesFailed: failures.length,
    totalSections,
    failures,
  };
}
