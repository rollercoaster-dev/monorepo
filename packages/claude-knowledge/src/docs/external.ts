/**
 * External Documentation Fetcher
 *
 * Fetches and caches external specification documentation (e.g., Open Badges, Verifiable Credentials).
 * Converts HTML to markdown and indexes with source attribution.
 */

import { resolve } from "path";
import { Buffer } from "buffer";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { getDatabase } from "../db/sqlite";
import { parseMarkdown } from "./parser";
import { hashContent } from "./store";
import type { IndexResult } from "./store";
import type { DocSection, FileData } from "../types";
import {
  createOrMergeEntity,
  createRelationship,
  generateEmbedding,
} from "../knowledge/helpers";

/**
 * Specification definition for external documentation.
 */
export interface ExternalDocSpec {
  /** Source URL of the documentation */
  url: string;
  /** Type identifier (e.g., "ob3", "ob2", "vc") */
  sourceType: string;
  /** Optional version identifier (e.g., "3.0", "2.0") */
  specVersion?: string;
}

/**
 * Predefined specification definitions for Open Badges and related specs.
 */
export const SPEC_DEFINITIONS: Record<string, ExternalDocSpec> = {
  ob3: {
    url: "https://1edtech.github.io/openbadges-specification/ob_v3p0.html",
    sourceType: "ob3",
    specVersion: "3.0",
  },
  ob2: {
    url: "https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html",
    sourceType: "ob2",
    specVersion: "2.0",
  },
  vc: {
    url: "https://www.w3.org/TR/vc-data-model/",
    sourceType: "vc",
  },
};

/**
 * Get a predefined spec definition by name.
 *
 * @param name - Spec name (e.g., "ob3", "ob2", "vc")
 * @returns The spec definition or undefined if not found
 */
export function getSpecDefinition(name: string): ExternalDocSpec | undefined {
  return SPEC_DEFINITIONS[name];
}

/**
 * Fetch external documentation and cache it locally.
 *
 * Checks the external_docs table for a cached version. If cached and less than 90 days old,
 * returns the cached path. Otherwise, fetches from the URL and updates the cache.
 *
 * @param spec - External doc specification
 * @returns Path to the cached file
 * @throws Error if fetch fails or file cannot be written
 */
export async function fetchExternalDoc(spec: ExternalDocSpec): Promise<string> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const CACHE_TTL_DAYS = 90;

  // Check for cached version
  const cached = db
    .query<
      { cached_path: string; fetched_at: string },
      [string]
    >("SELECT cached_path, fetched_at FROM external_docs WHERE url = ?")
    .get(spec.url);

  if (cached) {
    const fetchedAt = new Date(cached.fetched_at);
    const ageInDays =
      (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < CACHE_TTL_DAYS) {
      // Check if file still exists
      const file = Bun.file(cached.cached_path);
      if (await file.exists()) {
        logger.info(`Using cached external doc: ${cached.cached_path}`);
        return cached.cached_path;
      }
    }
  }

  // Fetch from URL
  logger.info(`Fetching external doc from: ${spec.url}`);
  const response = await fetch(spec.url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${spec.url}: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();

  // Save to cache directory
  const cacheDir = resolve(
    process.cwd(),
    "packages/claude-knowledge/data/external-docs",
  );
  const filename = spec.specVersion
    ? `${spec.sourceType}-${spec.specVersion}.html`
    : `${spec.sourceType}.html`;
  const cachedPath = resolve(cacheDir, filename);

  await Bun.write(cachedPath, html);
  logger.info(`Cached external doc to: ${cachedPath}`);

  // Update cache table
  if (cached) {
    db.run(
      "UPDATE external_docs SET cached_path = ?, fetched_at = ? WHERE url = ?",
      [cachedPath, now, spec.url],
    );
  } else {
    db.run(
      "INSERT INTO external_docs (url, cached_path, fetched_at, spec_version, source_type) VALUES (?, ?, ?, ?, ?)",
      [cachedPath, cachedPath, now, spec.specVersion ?? null, spec.sourceType],
    );
  }

  return cachedPath;
}

/**
 * Convert HTML to markdown.
 *
 * Simple regex-based conversion that preserves structure but doesn't require heavy dependencies.
 * Converts headings, code blocks, links, and strips scripts/styles/navigation.
 *
 * @param html - HTML content to convert
 * @returns Markdown content
 */
export function convertHtmlToMarkdown(html: string): string {
  let markdown = html;

  // Remove scripts, styles, and navigation elements
  markdown = markdown.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
  markdown = markdown.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    "",
  );
  markdown = markdown.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "");
  markdown = markdown.replace(
    /<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi,
    "",
  );
  markdown = markdown.replace(
    /<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi,
    "",
  );

  // Convert headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n");
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n");
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n");
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n");
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "\n##### $1\n");
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "\n###### $1\n");

  // Convert code blocks
  markdown = markdown.replace(
    /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis,
    "\n```\n$1\n```\n",
  );
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gis, "\n```\n$1\n```\n");
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");

  // Convert links
  markdown = markdown.replace(
    /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi,
    "[$2]($1)",
  );

  // Convert lists
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  markdown = markdown.replace(/<\/ul>|<\/ol>/gi, "\n");
  markdown = markdown.replace(/<ul[^>]*>|<ol[^>]*>/gi, "\n");

  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n");

  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, "\n");

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  markdown = markdown.replace(/&lt;/g, "<");
  markdown = markdown.replace(/&gt;/g, ">");
  markdown = markdown.replace(/&amp;/g, "&");
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#39;/g, "'");
  markdown = markdown.replace(/&nbsp;/g, " ");

  // Clean up excessive whitespace
  markdown = markdown.replace(/\n{3,}/g, "\n\n");
  markdown = markdown.trim();

  return markdown;
}

/**
 * Index external documentation with source attribution.
 *
 * Fetches or retrieves cached HTML, converts to markdown, and indexes with source attribution.
 *
 * @param spec - External doc specification
 * @returns Index result with statistics
 * @throws Error if fetch, conversion, or indexing fails
 */
export async function indexExternalDoc(
  spec: ExternalDocSpec,
): Promise<IndexResult> {
  try {
    // Fetch or get cached HTML
    const htmlPath = await fetchExternalDoc(spec);
    const html = await Bun.file(htmlPath).text();

    // Convert HTML to markdown
    logger.info(`Converting HTML to markdown for: ${spec.sourceType}`);
    const markdown = convertHtmlToMarkdown(html);

    // Save markdown to temp file for indexing
    const cacheDir = resolve(
      process.cwd(),
      "packages/claude-knowledge/data/external-docs",
    );
    const filename = spec.specVersion
      ? `${spec.sourceType}-${spec.specVersion}.md`
      : `${spec.sourceType}.md`;
    const markdownPath = resolve(cacheDir, filename);
    await Bun.write(markdownPath, markdown);

    // Parse markdown to get sections
    const sections = parseMarkdown(markdown);

    // Index using existing indexDocument, but need to manually handle sections
    // since we've already parsed them with attribution
    const db = getDatabase();
    const contentHash = hashContent(markdown);
    const now = new Date().toISOString();

    // Check if already indexed
    const existingIndex = db
      .query<
        { content_hash: string },
        [string]
      >("SELECT content_hash FROM doc_index WHERE file_path = ?")
      .get(markdownPath);

    let status: "indexed" | "unchanged" | "updated" = "indexed";
    if (existingIndex && existingIndex.content_hash === contentHash) {
      logger.info(
        `External doc unchanged: ${spec.sourceType} (hash: ${contentHash})`,
      );
      return {
        status: "unchanged",
        sectionsIndexed: 0,
        linkedToCode: 0,
        crossRefsCreated: 0,
      };
    }

    if (existingIndex) {
      status = "updated";
      // Remove old sections
      const fileEntityId = `file-${Buffer.from(markdownPath).toString("base64url")}`;
      const oldSections = db
        .query<
          { id: string },
          [string, string]
        >("SELECT from_id as id FROM relationships WHERE to_id = ? AND type = ?")
        .all(fileEntityId, "IN_DOC");

      for (const section of oldSections) {
        db.run("DELETE FROM entities WHERE id = ?", [section.id]);
      }
    }

    // Create file entity
    const fileEntityId = `file-${Buffer.from(markdownPath).toString("base64url")}`;
    createOrMergeEntity(db, "File", fileEntityId, {
      path: markdownPath,
    } satisfies FileData);

    // Index sections with embeddings
    for (const section of sections) {
      const sectionId = `doc-${Buffer.from(markdownPath).toString("base64url")}-${section.anchor}`;

      // Build parent ID if parent exists
      let parentId: string | undefined;
      if (section.parentAnchor) {
        parentId = `doc-${Buffer.from(markdownPath).toString("base64url")}-${section.parentAnchor}`;
      }

      // Create DocSection with source attribution
      const docSection: DocSection = {
        id: sectionId,
        filePath: markdownPath,
        heading: section.heading,
        content: section.content,
        level: section.level,
        parentId,
        anchor: section.anchor,
        source: "external",
        sourceUrl: spec.url,
        sourceType: spec.sourceType,
        specVersion: spec.specVersion,
      };

      createOrMergeEntity(db, "DocSection", sectionId, docSection);

      // Generate embedding for search
      const embeddingText = `${section.heading}\n\n${section.content}`;
      const embedding = await generateEmbedding(embeddingText);
      if (embedding) {
        db.run("UPDATE entities SET embedding = ? WHERE id = ?", [
          embedding,
          sectionId,
        ]);
      }

      // Link section to file
      createRelationship(db, sectionId, fileEntityId, "IN_DOC");

      // Link to parent section if exists
      if (parentId) {
        createRelationship(db, sectionId, parentId, "CHILD_OF");
      }
    }

    // Update index
    if (existingIndex) {
      db.run(
        "UPDATE doc_index SET content_hash = ?, indexed_at = ? WHERE file_path = ?",
        [contentHash, now, markdownPath],
      );
    } else {
      db.run(
        "INSERT INTO doc_index (file_path, content_hash, indexed_at) VALUES (?, ?, ?)",
        [markdownPath, contentHash, now],
      );
    }

    logger.info(
      `Indexed external doc: ${spec.sourceType} (${sections.length} sections)`,
    );

    return {
      status,
      sectionsIndexed: sections.length,
      linkedToCode: 0,
      crossRefsCreated: 0,
    };
  } catch (error) {
    logger.error("Failed to index external doc", {
      spec,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
