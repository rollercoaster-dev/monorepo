/**
 * Tests for document indexing store.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resetDatabase, getDatabase } from "../db/sqlite";
import {
  indexDocument,
  indexDirectory,
  hashContent,
  extractCodeReferences,
  extractCrossDocLinks,
} from "./store";

describe("Document Indexing", () => {
  let tempDir: string;

  beforeEach(() => {
    resetDatabase(":memory:");
    tempDir = mkdtempSync(join(tmpdir(), "docs-test-"));
  });

  test("hashContent generates deterministic SHA-256 hash", () => {
    const content = "# Test Document\n\nThis is a test.";
    const hash1 = hashContent(content);
    const hash2 = hashContent(content);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
  });

  test("hashContent produces different hashes for different content", () => {
    const content1 = "# Document 1";
    const content2 = "# Document 2";

    const hash1 = hashContent(content1);
    const hash2 = hashContent(content2);

    expect(hash1).not.toBe(hash2);
  });

  test("indexDocument creates DocSection entities with embeddings", async () => {
    const filePath = join(tempDir, "test.md");
    const content = `# Introduction

This is the introduction section with enough content to pass the minimum length threshold.

## Subsection

This is a subsection with more content that also exceeds the minimum length requirement.`;

    writeFileSync(filePath, content);

    const result = await indexDocument(filePath);

    expect(result.status).toBe("indexed");
    expect(result.sectionsIndexed).toBe(2); // Two sections above minContentLength

    // Verify entities were created
    const db = getDatabase();
    const sections = db
      .query("SELECT * FROM entities WHERE type = 'DocSection'")
      .all();

    expect(sections).toHaveLength(2);
  });

  test("indexDocument skips unchanged files based on content hash", async () => {
    const filePath = join(tempDir, "test.md");
    const content =
      "# Test\n\nContent with enough text to pass the minimum length threshold for indexing.";
    writeFileSync(filePath, content);

    // First index
    const result1 = await indexDocument(filePath);
    expect(result1.status).toBe("indexed");
    expect(result1.sectionsIndexed).toBe(1);

    // Second index without changes
    const result2 = await indexDocument(filePath);
    expect(result2.status).toBe("unchanged");
    expect(result2.sectionsIndexed).toBe(0);

    // Verify doc_index table has entry
    const db = getDatabase();
    const indexRecord = db
      .query<
        { file_path: string; content_hash: string },
        [string]
      >("SELECT file_path, content_hash FROM doc_index WHERE file_path = ?")
      .get(filePath);

    expect(indexRecord).toBeDefined();
    expect(indexRecord?.content_hash).toBe(hashContent(content));
  });

  test("indexDocument force flag overrides hash check", async () => {
    const filePath = join(tempDir, "test.md");
    const content =
      "# Test\n\nContent with enough text to pass the minimum length threshold for indexing.";
    writeFileSync(filePath, content);

    // First index
    await indexDocument(filePath);

    // Second index with force flag
    const result = await indexDocument(filePath, { force: true });
    expect(result.status).toBe("updated");
    expect(result.sectionsIndexed).toBeGreaterThan(0);
  });

  test("extractCodeReferences creates DOCUMENTS relationships", async () => {
    const db = getDatabase();

    // Create a fake code entity
    db.run(
      "INSERT INTO graph_entities (id, type, name, file_path, line_number, exported) VALUES (?, ?, ?, ?, ?, ?)",
      ["test-fn-id", "function", "testFunction", "/test.ts", 10, 1],
    );

    const content = "This document describes `testFunction()` in detail.";
    const codeEntityIds = extractCodeReferences(content, db);

    expect(codeEntityIds).toHaveLength(1);
    expect(codeEntityIds[0]).toBe("test-fn-id");
  });

  test("extractCodeReferences handles non-existent code entities", async () => {
    const db = getDatabase();
    const content =
      "This mentions `nonExistentFunction()` which doesn't exist.";
    const codeEntityIds = extractCodeReferences(content, db);

    expect(codeEntityIds).toHaveLength(0);
  });

  test("extractCrossDocLinks resolves relative paths", async () => {
    const db = getDatabase();
    const currentFile = join(tempDir, "docs", "guide.md");
    const content = "See [API Reference](./api/reference.md) for details.";

    const linkedPaths = extractCrossDocLinks(content, currentFile, db);

    expect(linkedPaths).toHaveLength(1);
    expect(linkedPaths[0]).toContain("api/reference.md");
  });

  test("extractCrossDocLinks handles anchors in links", async () => {
    const db = getDatabase();
    const currentFile = join(tempDir, "guide.md");
    const content = "See [Introduction](./intro.md#overview) for details.";

    const linkedPaths = extractCrossDocLinks(content, currentFile, db);

    expect(linkedPaths).toHaveLength(1);
    // Anchor should be stripped from path
    expect(linkedPaths[0]).not.toContain("#");
  });

  test("indexDirectory processes multiple files with glob pattern", async () => {
    const docsDir = mkdtempSync(join(tempDir, "docs-"));

    writeFileSync(
      join(docsDir, "intro.md"),
      "# Introduction\n\nWelcome to our documentation with enough content to pass minimum length.",
    );
    writeFileSync(
      join(docsDir, "guide.md"),
      "# Guide\n\nThis is a comprehensive guide with sufficient content for indexing.",
    );
    writeFileSync(
      join(docsDir, "api.md"),
      "# API Reference\n\nAPI documentation with detailed information about the API.",
    );

    const result = await indexDirectory(docsDir);

    expect(result.filesIndexed).toBe(3);
    expect(result.filesSkipped).toBe(0);
    expect(result.totalSections).toBeGreaterThan(0);
  });

  test("indexDirectory skips unchanged files on second run", async () => {
    const docsDir = mkdtempSync(join(tempDir, "docs-"));

    writeFileSync(
      join(docsDir, "test.md"),
      "# Test\n\nContent with enough text to pass minimum length threshold.",
    );

    // First index
    const result1 = await indexDirectory(docsDir);
    expect(result1.filesIndexed).toBe(1);
    expect(result1.filesSkipped).toBe(0);

    // Second index (no changes)
    const result2 = await indexDirectory(docsDir);
    expect(result2.filesIndexed).toBe(0);
    expect(result2.filesSkipped).toBe(1);
  });

  test("indexDocument creates CHILD_OF relationships for hierarchy", async () => {
    const filePath = join(tempDir, "test.md");
    const content = `# Parent

Parent content with enough text to pass minimum length threshold for indexing purposes.

## Child

Child content with sufficient length to be indexed and create relationships.`;

    writeFileSync(filePath, content);
    await indexDocument(filePath);

    const db = getDatabase();
    const childOfRels = db
      .query("SELECT * FROM relationships WHERE type = 'CHILD_OF'")
      .all();

    expect(childOfRels).toHaveLength(1);
  });

  test("indexDocument creates IN_DOC relationships to file entity", async () => {
    const filePath = join(tempDir, "test.md");
    const content =
      "# Test\n\nContent with enough text to pass minimum length threshold for indexing.";

    writeFileSync(filePath, content);
    await indexDocument(filePath);

    const db = getDatabase();
    const inDocRels = db
      .query("SELECT * FROM relationships WHERE type = 'IN_DOC'")
      .all();

    expect(inDocRels).toHaveLength(1);
  });

  test("transaction rollback on error leaves database unchanged", async () => {
    const filePath = join(tempDir, "test.md");
    const content = "# Test\n\nContent.";
    writeFileSync(filePath, content);

    // Get initial entity count
    const db = getDatabase();
    const initialCount = db
      .query<{ count: number }, []>("SELECT COUNT(*) as count FROM entities")
      .get();

    // Try to index with invalid path (will fail)
    try {
      await indexDocument("/nonexistent/file.md");
    } catch {
      // Expected to fail
    }

    // Verify no entities were created
    const finalCount = db
      .query<{ count: number }, []>("SELECT COUNT(*) as count FROM entities")
      .get();

    expect(finalCount?.count).toBe(initialCount?.count);
  });

  test("indexDocument respects minContentLength option", async () => {
    const filePath = join(tempDir, "test.md");
    const content = `# Section 1

Tiny.

# Section 2

This section has much more content that exceeds the minimum length threshold.`;

    writeFileSync(filePath, content);

    const result = await indexDocument(filePath, { minContentLength: 50 });

    // Only the second section should be indexed
    expect(result.sectionsIndexed).toBe(1);
  });

  // Cleanup after tests
  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});
