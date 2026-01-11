/**
 * Storage unit tests.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 */

import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { storeGraph, clearPackage } from "./store";
import { getDatabase, resetDatabase } from "../db/sqlite";
import type { ParseResult } from "./types";

describe("store", () => {
  beforeEach(() => {
    // Reset database before each test
    resetDatabase();
  });

  afterAll(() => {
    // Clean up
    resetDatabase();
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
});
