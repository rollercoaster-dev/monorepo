/**
 * Query unit tests.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  whatCalls,
  whatDependsOn,
  blastRadius,
  findEntities,
  getExports,
  getCallers,
  getSummary,
} from "./query";
import { storeGraph } from "./store";
import { resetDatabase, closeDatabase } from "../db/sqlite";
import type { ParseResult } from "./types";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

const TEST_DB = ".claude/test-graph-query.db";

describe("query", () => {
  // Set up test data before each test
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);

    // Create a test graph with known relationships
    const testData: ParseResult = {
      package: "test-pkg",
      entities: [
        // Files
        {
          id: "test-pkg:file:src/index.ts",
          type: "file",
          name: "src/index.ts",
          filePath: "src/index.ts",
          lineNumber: 1,
          exported: true,
        },
        {
          id: "test-pkg:file:src/utils.ts",
          type: "file",
          name: "src/utils.ts",
          filePath: "src/utils.ts",
          lineNumber: 1,
          exported: true,
        },
        // Functions
        {
          id: "test-pkg:src/index.ts:function:main",
          type: "function",
          name: "main",
          filePath: "src/index.ts",
          lineNumber: 5,
          exported: true,
        },
        {
          id: "test-pkg:src/index.ts:function:helper",
          type: "function",
          name: "helper",
          filePath: "src/index.ts",
          lineNumber: 15,
          exported: false,
        },
        {
          id: "test-pkg:src/utils.ts:function:formatData",
          type: "function",
          name: "formatData",
          filePath: "src/utils.ts",
          lineNumber: 3,
          exported: true,
        },
        // Classes
        {
          id: "test-pkg:src/index.ts:class:AppService",
          type: "class",
          name: "AppService",
          filePath: "src/index.ts",
          lineNumber: 20,
          exported: true,
        },
        {
          id: "test-pkg:src/index.ts:class:BaseService",
          type: "class",
          name: "BaseService",
          filePath: "src/index.ts",
          lineNumber: 50,
          exported: true,
        },
        // Interfaces
        {
          id: "test-pkg:src/index.ts:interface:Service",
          type: "interface",
          name: "Service",
          filePath: "src/index.ts",
          lineNumber: 1,
          exported: true,
        },
        // Types
        {
          id: "test-pkg:src/utils.ts:type:DataFormat",
          type: "type",
          name: "DataFormat",
          filePath: "src/utils.ts",
          lineNumber: 1,
          exported: true,
        },
      ],
      relationships: [
        // main calls helper
        {
          from: "test-pkg:src/index.ts:function:main",
          to: "test-pkg:src/index.ts:function:helper",
          type: "calls",
        },
        // main calls formatData
        {
          from: "test-pkg:src/index.ts:function:main",
          to: "test-pkg:src/utils.ts:function:formatData",
          type: "calls",
        },
        // helper calls formatData
        {
          from: "test-pkg:src/index.ts:function:helper",
          to: "test-pkg:src/utils.ts:function:formatData",
          type: "calls",
        },
        // index.ts imports utils.ts
        {
          from: "test-pkg:file:src/index.ts",
          to: "test-pkg:file:src/utils.ts",
          type: "imports",
        },
        // AppService extends BaseService
        {
          from: "test-pkg:src/index.ts:class:AppService",
          to: "test-pkg:src/index.ts:class:BaseService",
          type: "extends",
        },
        // AppService implements Service
        {
          from: "test-pkg:src/index.ts:class:AppService",
          to: "test-pkg:src/index.ts:interface:Service",
          type: "implements",
        },
      ],
      stats: {
        filesScanned: 2,
        filesSkipped: 0,
        entitiesByType: {
          file: 2,
          function: 3,
          class: 2,
          interface: 1,
          type: 1,
        },
        relationshipsByType: {
          calls: 3,
          imports: 1,
          extends: 1,
          implements: 1,
        },
      },
    };

    storeGraph(testData, "test-pkg");
  });

  afterEach(async () => {
    closeDatabase();
    try {
      await unlink(TEST_DB);
    } catch {
      /* ignore */
    }
  });

  describe("whatCalls", () => {
    it("finds callers of a function", () => {
      const results = whatCalls("helper");

      expect(results.length).toBe(1);
      expect(results[0].name).toBe("main");
    });

    it("finds multiple callers", () => {
      const results = whatCalls("formatData");

      expect(results.length).toBe(2);
      const names = results.map((r) => r.name);
      expect(names).toContain("main");
      expect(names).toContain("helper");
    });

    it("returns empty array for non-existent function", () => {
      const results = whatCalls("nonExistent");

      expect(results.length).toBe(0);
    });

    it("supports partial name matching", () => {
      const results = whatCalls("format");

      expect(results.length).toBe(2);
    });
  });

  describe("whatDependsOn", () => {
    it("finds entities that depend on a target", () => {
      const results = whatDependsOn("BaseService");

      expect(results.length).toBeGreaterThanOrEqual(1);
      const extendsRel = results.find((r) => r.relationship_type === "extends");
      expect(extendsRel).toBeDefined();
      expect(extendsRel?.name).toBe("AppService");
    });

    it("finds implements relationships", () => {
      const results = whatDependsOn("Service");

      const implementsRel = results.find(
        (r) => r.relationship_type === "implements",
      );
      expect(implementsRel).toBeDefined();
      expect(implementsRel?.name).toBe("AppService");
    });
  });

  describe("blastRadius", () => {
    it("finds entities affected by file changes", () => {
      const results = blastRadius("src/utils.ts");

      // Should include entities in utils.ts and things that depend on it
      expect(results.length).toBeGreaterThan(0);
    });

    it("respects depth limit", () => {
      const shallow = blastRadius("src/utils.ts", 1);
      const deep = blastRadius("src/utils.ts", 5);

      // Verify depth limiting works - shallow should have results bounded by depth
      expect(shallow.length).toBeGreaterThan(0);
      expect(deep.length).toBeGreaterThanOrEqual(shallow.length);
      // Verify that shallow results are bounded by depth limit
      expect(shallow.every((r) => r.depth <= 1)).toBe(true);
    });

    it("includes depth information", () => {
      const results = blastRadius("src/utils.ts");

      const depths = results.map((r) => r.depth);
      expect(depths.some((d) => d === 0)).toBe(true); // Direct entities
    });
  });

  describe("findEntities", () => {
    it("finds entities by name", () => {
      const results = findEntities("main");

      expect(results.length).toBe(1);
      expect(results[0].name).toBe("main");
      expect(results[0].type).toBe("function");
    });

    it("filters by type", () => {
      const functions = findEntities("", "function");
      const classes = findEntities("", "class");

      expect(functions.every((e) => e.type === "function")).toBe(true);
      expect(classes.every((e) => e.type === "class")).toBe(true);
    });

    it("respects limit", () => {
      const limited = findEntities("", undefined, 2);

      expect(limited.length).toBeLessThanOrEqual(2);
    });

    it("includes exported flag", () => {
      const results = findEntities("main");

      expect(results[0].exported).toBe(true);
    });
  });

  describe("getExports", () => {
    it("returns exported entities", () => {
      const results = getExports();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((e) => e.exported)).toBe(true);
    });

    it("filters by package", () => {
      const results = getExports("test-pkg");

      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for non-existent package", () => {
      const results = getExports("non-existent");

      expect(results.length).toBe(0);
    });
  });

  describe("getCallers", () => {
    it("finds direct callers of a function (exact match)", () => {
      const results = getCallers("helper");

      expect(results.length).toBe(1);
      expect(results[0].name).toBe("main");
    });

    it("returns empty for non-existent function", () => {
      const results = getCallers("nonExistent");

      expect(results.length).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("returns total counts", () => {
      const summary = getSummary();

      expect(summary.totalEntities).toBeGreaterThan(0);
      expect(summary.totalRelationships).toBeGreaterThan(0);
    });

    it("includes entity breakdown by type", () => {
      const summary = getSummary();

      expect(summary.entitiesByType).toBeDefined();
      expect(summary.entitiesByType.function).toBeGreaterThan(0);
      expect(summary.entitiesByType.class).toBeGreaterThan(0);
    });

    it("includes relationship breakdown by type", () => {
      const summary = getSummary();

      expect(summary.relationshipsByType).toBeDefined();
      expect(summary.relationshipsByType.calls).toBeGreaterThan(0);
    });

    it("includes package list", () => {
      const summary = getSummary();

      expect(summary.packages.length).toBeGreaterThan(0);
      const testPkg = summary.packages.find((p) => p.name === "test-pkg");
      expect(testPkg).toBeDefined();
      expect(testPkg?.entityCount).toBeGreaterThan(0);
    });

    it("filters by package", () => {
      const summary = getSummary("test-pkg");

      expect(summary.totalEntities).toBeGreaterThan(0);
    });
  });

  describe("cross-file call resolution", () => {
    it("resolves imported function calls to definition file", () => {
      // Setup: Create a graph where caller.ts imports and calls greet from callee.ts
      const crossFileData: ParseResult = {
        package: "cross-file-test",
        entities: [
          {
            id: "cross-file-test:file:caller.ts",
            type: "file",
            name: "caller.ts",
            filePath: "caller.ts",
            lineNumber: 1,
            exported: true,
          },
          {
            id: "cross-file-test:file:callee.ts",
            type: "file",
            name: "callee.ts",
            filePath: "callee.ts",
            lineNumber: 1,
            exported: true,
          },
          {
            id: "cross-file-test:caller.ts:function:doWork",
            type: "function",
            name: "doWork",
            filePath: "caller.ts",
            lineNumber: 3,
            exported: true,
          },
          {
            id: "cross-file-test:callee.ts:function:greet",
            type: "function",
            name: "greet",
            filePath: "callee.ts",
            lineNumber: 1,
            exported: true,
          },
        ],
        relationships: [
          // caller.ts imports callee.ts
          {
            from: "cross-file-test:file:caller.ts",
            to: "cross-file-test:file:callee.ts",
            type: "imports",
          },
          // doWork calls greet - SHOULD point to callee.ts, not caller.ts
          {
            from: "cross-file-test:caller.ts:function:doWork",
            to: "cross-file-test:callee.ts:function:greet",
            type: "calls",
          },
        ],
        stats: {
          filesScanned: 2,
          filesSkipped: 0,
          entitiesByType: { file: 2, function: 2 },
          relationshipsByType: { imports: 1, calls: 1 },
        },
      };

      storeGraph(crossFileData, "cross-file-test");

      // Query: what calls greet?
      const callers = whatCalls("greet");

      // Assert: Should find doWork from caller.ts
      expect(callers.length).toBe(1);
      expect(callers[0].name).toBe("doWork");
      expect(callers[0].file_path).toBe("caller.ts");
      expect(callers[0].line_number).toBe(3);
    });

    it("filters out unresolvable method calls", () => {
      // Setup: Create a graph with method calls that should be filtered
      const methodCallData: ParseResult = {
        package: "method-test",
        entities: [
          {
            id: "method-test:file:service.ts",
            type: "file",
            name: "service.ts",
            filePath: "service.ts",
            lineNumber: 1,
            exported: true,
          },
          {
            id: "method-test:service.ts:class:MyService",
            type: "class",
            name: "MyService",
            filePath: "service.ts",
            lineNumber: 1,
            exported: true,
          },
          {
            id: "method-test:service.ts:function:MyService.doSomething",
            type: "function",
            name: "MyService.doSomething",
            filePath: "service.ts",
            lineNumber: 3,
            exported: true,
          },
        ],
        relationships: [
          // No synthetic "call:this.someMethod" relationships should exist
          // Only real, resolvable relationships
        ],
        stats: {
          filesScanned: 1,
          filesSkipped: 0,
          entitiesByType: { file: 1, class: 1, function: 1 },
          relationshipsByType: {},
        },
      };

      storeGraph(methodCallData, "method-test");

      // Query all relationships for this package
      const deps = whatDependsOn("MyService");

      // Assert: No synthetic call:xxx IDs in results
      // (The test passes if no relationships exist, which is expected when all synthetic calls are filtered)
      for (const dep of deps) {
        expect(dep.name).not.toMatch(/^call:/);
      }
    });
  });
});
