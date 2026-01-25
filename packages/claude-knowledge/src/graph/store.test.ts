/**
 * Storage unit tests.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  storeGraph,
  clearPackage,
  getStoredFileMetadata,
  updateFileMetadata,
  deleteFileMetadata,
} from "./store";
import { getDatabase, resetDatabase, closeDatabase } from "../db/sqlite";
import type { ParseResult } from "./types";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";

const TEST_DB = ".claude/test-graph-store.db";

describe("store", () => {
  beforeEach(async () => {
    // Reset database before each test
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    // Clean up
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  const createTestParseResult = (
    packageName: string,
    entityCount: number = 3,
  ): ParseResult => ({
    package: packageName,
    entities: [
      {
        id: `${packageName}:src/index.ts:file:src/index.ts`,
        type: "file",
        name: "src/index.ts",
        filePath: "src/index.ts",
        lineNumber: 1,
        exported: true,
      },
      {
        id: `${packageName}:src/index.ts:function:greet`,
        type: "function",
        name: "greet",
        filePath: "src/index.ts",
        lineNumber: 5,
        exported: true,
      },
      {
        id: `${packageName}:src/index.ts:class:Greeter`,
        type: "class",
        name: "Greeter",
        filePath: "src/index.ts",
        lineNumber: 10,
        exported: true,
      },
      ...Array.from({ length: Math.max(0, entityCount - 3) }, (_, i) => ({
        id: `${packageName}:src/utils.ts:function:helper${i}`,
        type: "function" as const,
        name: `helper${i}`,
        filePath: "src/utils.ts",
        lineNumber: i + 1,
        exported: false,
      })),
    ],
    relationships: [
      {
        from: `${packageName}:src/index.ts:function:greet`,
        to: `${packageName}:src/index.ts:class:Greeter`,
        type: "calls",
      },
      {
        from: `${packageName}:src/index.ts:file:src/index.ts`,
        to: "external:fs",
        type: "imports",
      },
    ],
    stats: {
      filesScanned: 2,
      filesSkipped: 0,
      entitiesByType: {
        file: 1,
        function: 1 + Math.max(0, entityCount - 3),
        class: 1,
      },
      relationshipsByType: { calls: 1, imports: 1 },
    },
  });

  describe("storeGraph", () => {
    it("stores entities and relationships", () => {
      const data = createTestParseResult("test-package");
      const result = storeGraph(data, "test-package");

      expect(result.success).toBe(true);
      expect(result.package).toBe("test-package");
      expect(result.entitiesStored).toBe(3);
      expect(result.relationshipsStored).toBe(2);
    });

    it("verifies entities are in database", () => {
      const data = createTestParseResult("test-package");
      storeGraph(data, "test-package");

      const db = getDatabase();
      const entities = db
        .query("SELECT * FROM graph_entities WHERE package = ?")
        .all("test-package");

      expect(entities.length).toBe(3);
    });

    it("verifies relationships are in database", () => {
      const data = createTestParseResult("test-package");
      storeGraph(data, "test-package");

      const db = getDatabase();
      const relationships = db
        .query("SELECT * FROM graph_relationships WHERE from_entity LIKE ?")
        .all("test-package%");

      expect(relationships.length).toBe(2);
    });

    it("is idempotent - re-storing replaces data", () => {
      const data1 = createTestParseResult("test-package", 3);
      const data2 = createTestParseResult("test-package", 5);

      storeGraph(data1, "test-package");
      const result2 = storeGraph(data2, "test-package");

      expect(result2.entitiesStored).toBe(5);

      const db = getDatabase();
      const entities = db
        .query("SELECT * FROM graph_entities WHERE package = ?")
        .all("test-package");

      expect(entities.length).toBe(5);
    });

    it("stores multiple packages independently", () => {
      const dataA = createTestParseResult("package-a");
      const dataB = createTestParseResult("package-b");

      storeGraph(dataA, "package-a");
      storeGraph(dataB, "package-b");

      const db = getDatabase();
      const entitiesA = db
        .query("SELECT * FROM graph_entities WHERE package = ?")
        .all("package-a");
      const entitiesB = db
        .query("SELECT * FROM graph_entities WHERE package = ?")
        .all("package-b");

      expect(entitiesA.length).toBe(3);
      expect(entitiesB.length).toBe(3);
    });

    it("handles empty parse result", () => {
      const emptyData: ParseResult = {
        package: "empty-package",
        entities: [],
        relationships: [],
        stats: {
          filesScanned: 0,
          filesSkipped: 0,
          entitiesByType: {},
          relationshipsByType: {},
        },
      };

      const result = storeGraph(emptyData, "empty-package");

      expect(result.success).toBe(true);
      expect(result.entitiesStored).toBe(0);
      expect(result.relationshipsStored).toBe(0);
    });
  });

  describe("clearPackage", () => {
    it("removes all entities for a package", () => {
      const data = createTestParseResult("test-package");
      storeGraph(data, "test-package");

      clearPackage("test-package");

      const db = getDatabase();
      const entities = db
        .query("SELECT * FROM graph_entities WHERE package = ?")
        .all("test-package");

      expect(entities.length).toBe(0);
    });

    it("removes relationships for a package", () => {
      const data = createTestParseResult("test-package");
      storeGraph(data, "test-package");

      clearPackage("test-package");

      const db = getDatabase();
      const relationships = db
        .query("SELECT * FROM graph_relationships WHERE from_entity LIKE ?")
        .all("test-package%");

      expect(relationships.length).toBe(0);
    });

    it("preserves other packages", () => {
      const dataA = createTestParseResult("package-a");
      const dataB = createTestParseResult("package-b");

      storeGraph(dataA, "package-a");
      storeGraph(dataB, "package-b");

      clearPackage("package-a");

      const db = getDatabase();
      const entitiesA = db
        .query("SELECT * FROM graph_entities WHERE package = ?")
        .all("package-a");
      const entitiesB = db
        .query("SELECT * FROM graph_entities WHERE package = ?")
        .all("package-b");

      expect(entitiesA.length).toBe(0);
      expect(entitiesB.length).toBe(3);
    });

    it("handles non-existent package gracefully", () => {
      // Should not throw
      expect(() => clearPackage("non-existent")).not.toThrow();
    });
  });

  describe("file metadata", () => {
    it("stores and retrieves file metadata", () => {
      const now = Date.now();
      updateFileMetadata("test-pkg", "src/index.ts", now, 5);

      const metadata = getStoredFileMetadata("test-pkg");
      expect(metadata.size).toBe(1);
      expect(metadata.get("src/index.ts")).toBeDefined();
      expect(metadata.get("src/index.ts")?.mtimeMs).toBe(now);
      expect(metadata.get("src/index.ts")?.entityCount).toBe(5);
    });

    it("updates existing file metadata", () => {
      const time1 = Date.now();
      updateFileMetadata("test-pkg", "src/index.ts", time1, 5);

      const time2 = time1 + 1000;
      updateFileMetadata("test-pkg", "src/index.ts", time2, 7);

      const metadata = getStoredFileMetadata("test-pkg");
      expect(metadata.size).toBe(1);
      expect(metadata.get("src/index.ts")?.mtimeMs).toBe(time2);
      expect(metadata.get("src/index.ts")?.entityCount).toBe(7);
    });

    it("deletes file metadata", () => {
      const now = Date.now();
      updateFileMetadata("test-pkg", "src/index.ts", now, 5);
      updateFileMetadata("test-pkg", "src/utils.ts", now, 3);

      deleteFileMetadata("test-pkg", ["src/index.ts"]);

      const metadata = getStoredFileMetadata("test-pkg");
      expect(metadata.size).toBe(1);
      expect(metadata.has("src/index.ts")).toBe(false);
      expect(metadata.has("src/utils.ts")).toBe(true);
    });

    it("returns empty map for unknown package", () => {
      const metadata = getStoredFileMetadata("unknown");
      expect(metadata.size).toBe(0);
    });
  });

  describe("incremental storage", () => {
    it("preserves existing entities when incremental=true", () => {
      // Store initial data with 2 files
      const initial = createTestParseResult("test-pkg");
      storeGraph(initial, "test-pkg");

      const db = getDatabase();
      const initialCount = db
        .query("SELECT COUNT(*) as count FROM graph_entities WHERE package = ?")
        .get("test-pkg") as { count: number };

      // Create data for just one file (incremental update)
      const incremental: ParseResult = {
        package: "test-pkg",
        entities: [
          {
            id: "test-pkg:src/new.ts:file:src/new.ts",
            type: "file",
            name: "src/new.ts",
            filePath: "src/new.ts",
            lineNumber: 1,
            exported: true,
          },
          {
            id: "test-pkg:src/new.ts:function:newFunc",
            type: "function",
            name: "newFunc",
            filePath: "src/new.ts",
            lineNumber: 5,
            exported: true,
          },
        ],
        relationships: [],
        stats: {
          filesScanned: 1,
          filesSkipped: 0,
          entitiesByType: { file: 1, function: 1 },
          relationshipsByType: {},
        },
      };

      storeGraph(incremental, "test-pkg", { incremental: true });

      const afterCount = db
        .query("SELECT COUNT(*) as count FROM graph_entities WHERE package = ?")
        .get("test-pkg") as { count: number };

      // Should have initial entities + new entities
      expect(afterCount.count).toBe(initialCount.count + 2);
    });

    it("deletes entities for reparsed files in incremental mode", () => {
      // Store initial data
      const initial = createTestParseResult("test-pkg");
      storeGraph(initial, "test-pkg");

      // Update one file (src/index.ts) with different entities
      const updated: ParseResult = {
        package: "test-pkg",
        entities: [
          {
            id: "test-pkg:src/index.ts:file:src/index.ts",
            type: "file",
            name: "src/index.ts",
            filePath: "src/index.ts",
            lineNumber: 1,
            exported: true,
          },
          {
            id: "test-pkg:src/index.ts:function:newFunc",
            type: "function",
            name: "newFunc",
            filePath: "src/index.ts",
            lineNumber: 5,
            exported: true,
          },
        ],
        relationships: [],
        stats: {
          filesScanned: 1,
          filesSkipped: 0,
          entitiesByType: { file: 1, function: 1 },
          relationshipsByType: {},
        },
      };

      storeGraph(updated, "test-pkg", { incremental: true });

      const db = getDatabase();
      const indexEntities = db
        .query(
          "SELECT * FROM graph_entities WHERE package = ? AND file_path = ?",
        )
        .all("test-pkg", "src/index.ts");

      // Should have new entities (file + newFunc), not old ones
      expect(indexEntities.length).toBe(2);
      const names = indexEntities.map((e: { name: string }) => e.name);
      expect(names).toContain("newFunc");
      expect(names).not.toContain("greet");
      expect(names).not.toContain("Greeter");
    });

    it("deletes entities for deleted files", () => {
      // Store initial data
      const initial = createTestParseResult("test-pkg");
      storeGraph(initial, "test-pkg");

      const db = getDatabase();
      const beforeCount = db
        .query("SELECT COUNT(*) as count FROM graph_entities WHERE package = ?")
        .get("test-pkg") as { count: number };

      // Store empty result but mark src/index.ts as deleted
      const empty: ParseResult = {
        package: "test-pkg",
        entities: [],
        relationships: [],
        stats: {
          filesScanned: 0,
          filesSkipped: 0,
          entitiesByType: {},
          relationshipsByType: {},
        },
      };

      storeGraph(empty, "test-pkg", {
        incremental: true,
        deletedFiles: ["src/index.ts"],
      });

      const afterCount = db
        .query("SELECT COUNT(*) as count FROM graph_entities WHERE package = ?")
        .get("test-pkg") as { count: number };

      // Should have fewer entities (deleted src/index.ts entities)
      expect(afterCount.count).toBeLessThan(beforeCount.count);

      // Verify specific file entities were deleted
      const indexEntities = db
        .query(
          "SELECT * FROM graph_entities WHERE package = ? AND file_path = ?",
        )
        .all("test-pkg", "src/index.ts");
      expect(indexEntities.length).toBe(0);
    });
  });
});
