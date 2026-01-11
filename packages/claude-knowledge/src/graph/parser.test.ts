/**
 * Parser unit tests.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import {
  parsePackage,
  extractEntities,
  extractRelationships,
  makeEntityId,
  makeFileId,
  derivePackageName,
} from "./parser";
import { Project } from "ts-morph";

// Test fixtures directory
const FIXTURES_DIR = join(import.meta.dir, "__fixtures__");

describe("parser", () => {
  beforeAll(() => {
    // Create test fixtures directory
    mkdirSync(FIXTURES_DIR, { recursive: true });

    // Create test files
    writeFileSync(
      join(FIXTURES_DIR, "simple.ts"),
      `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export const VERSION = "1.0.0";

function privateHelper() {
  return "internal";
}
`,
    );

    writeFileSync(
      join(FIXTURES_DIR, "classes.ts"),
      `
export interface Greeter {
  greet(): string;
}

export class HelloGreeter implements Greeter {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  greet(): string {
    return \`Hello, \${this.name}!\`;
  }
}

export class FormalGreeter extends HelloGreeter {
  greet(): string {
    return \`Good day, \${super.greet()}\`;
  }
}
`,
    );

    writeFileSync(
      join(FIXTURES_DIR, "types.ts"),
      `
export type UserId = string;

export interface User {
  id: UserId;
  name: string;
  email?: string;
}

export type UserWithRole = User & { role: string };
`,
    );

    writeFileSync(
      join(FIXTURES_DIR, "calls.ts"),
      `
import { greet } from "./simple";

export function sayHello(name: string): void {
  const message = greet(name);
  console.log(message);
}

export const greeter = (name: string) => {
  return greet(name);
};
`,
    );
  });

  afterAll(() => {
    // Clean up test fixtures
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
  });

  describe("derivePackageName", () => {
    it("extracts package name from packages/X/src path", () => {
      expect(derivePackageName("packages/rd-logger/src")).toBe("rd-logger");
      expect(derivePackageName("packages/claude-knowledge/src")).toBe(
        "claude-knowledge",
      );
    });

    it("falls back to directory name", () => {
      expect(derivePackageName("src")).toBe("src");
      expect(derivePackageName("/some/path/mypackage")).toBe("mypackage");
    });
  });

  describe("makeEntityId", () => {
    it("generates correct entity ID format", () => {
      const id = makeEntityId(
        "test-pkg",
        "src/index.ts",
        "myFunction",
        "function",
      );
      expect(id).toBe("test-pkg:src/index.ts:function:myFunction");
    });
  });

  describe("makeFileId", () => {
    it("generates correct file ID format", () => {
      const id = makeFileId("test-pkg", "src/utils/helper.ts");
      expect(id).toBe("test-pkg:file:src/utils/helper.ts");
    });

    it("normalizes Windows paths", () => {
      const id = makeFileId("test-pkg", "src\\utils\\helper.ts");
      expect(id).toContain("src/utils/helper.ts");
      expect(id).not.toContain("\\");
    });
  });

  describe("extractEntities", () => {
    const TEST_PKG = "test-fixtures";

    it("extracts functions", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "simple.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);

      const functions = entities.filter((e) => e.type === "function");
      expect(functions.length).toBeGreaterThanOrEqual(2); // greet, privateHelper

      const greetFn = functions.find((f) => f.name === "greet");
      expect(greetFn).toBeDefined();
      expect(greetFn?.exported).toBe(true);

      const privateFn = functions.find((f) => f.name === "privateHelper");
      expect(privateFn).toBeDefined();
      expect(privateFn?.exported).toBe(false);
    });

    it("extracts variables including arrow functions", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "simple.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);

      const version = entities.find((e) => e.name === "VERSION");
      expect(version).toBeDefined();
      expect(version?.type).toBe("variable");
      expect(version?.exported).toBe(true);
    });

    it("extracts classes and methods", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "classes.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);

      const classes = entities.filter((e) => e.type === "class");
      expect(classes.length).toBe(2); // HelloGreeter, FormalGreeter

      const helloGreeter = classes.find((c) => c.name === "HelloGreeter");
      expect(helloGreeter).toBeDefined();
      expect(helloGreeter?.exported).toBe(true);

      // Methods should be extracted as functions
      const methods = entities.filter(
        (e) => e.type === "function" && e.name.includes("."),
      );
      expect(methods.length).toBeGreaterThanOrEqual(2); // greet methods
    });

    it("extracts interfaces", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "classes.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);

      const interfaces = entities.filter((e) => e.type === "interface");
      expect(interfaces.length).toBe(1);
      expect(interfaces[0].name).toBe("Greeter");
      expect(interfaces[0].exported).toBe(true);
    });

    it("extracts type aliases", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "types.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);

      const types = entities.filter((e) => e.type === "type");
      expect(types.length).toBe(2); // UserId, UserWithRole

      const userId = types.find((t) => t.name === "UserId");
      expect(userId).toBeDefined();
      expect(userId?.exported).toBe(true);
    });

    it("creates file entity", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "simple.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);

      const fileEntity = entities.find((e) => e.type === "file");
      expect(fileEntity).toBeDefined();
      expect(fileEntity?.name).toBe("simple.ts");
    });
  });

  describe("extractRelationships", () => {
    const TEST_PKG = "test-fixtures";

    it("extracts import relationships", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      project.addSourceFileAtPath(join(FIXTURES_DIR, "simple.ts"));
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "calls.ts"),
      );

      const relationships = extractRelationships(
        sourceFile,
        FIXTURES_DIR,
        TEST_PKG,
      );

      const imports = relationships.filter((r) => r.type === "imports");
      expect(imports.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts call relationships", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      project.addSourceFileAtPath(join(FIXTURES_DIR, "simple.ts"));
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "calls.ts"),
      );

      const relationships = extractRelationships(
        sourceFile,
        FIXTURES_DIR,
        TEST_PKG,
      );

      const calls = relationships.filter((r) => r.type === "calls");
      expect(calls.length).toBeGreaterThanOrEqual(2); // greet called twice
    });

    it("extracts extends relationships", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "classes.ts"),
      );

      const relationships = extractRelationships(
        sourceFile,
        FIXTURES_DIR,
        TEST_PKG,
      );

      const extends_ = relationships.filter((r) => r.type === "extends");
      expect(extends_.length).toBe(1);
      expect(extends_[0].to).toContain("HelloGreeter");
    });

    it("extracts implements relationships", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "classes.ts"),
      );

      const relationships = extractRelationships(
        sourceFile,
        FIXTURES_DIR,
        TEST_PKG,
      );

      const implements_ = relationships.filter((r) => r.type === "implements");
      expect(implements_.length).toBe(1);
      expect(implements_[0].to).toContain("Greeter");
    });
  });

  describe("parsePackage", () => {
    it("parses a package and returns entities and relationships", () => {
      const result = parsePackage(FIXTURES_DIR, "test-fixtures");

      expect(result.package).toBe("test-fixtures");
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.relationships.length).toBeGreaterThan(0);
    });

    it("includes stats in result", () => {
      const result = parsePackage(FIXTURES_DIR, "test-fixtures");

      expect(result.stats).toBeDefined();
      expect(result.stats.filesScanned).toBeGreaterThan(0);
      expect(result.stats.entitiesByType).toBeDefined();
      expect(result.stats.relationshipsByType).toBeDefined();
    });

    it("derives package name from path if not provided", () => {
      const result = parsePackage(FIXTURES_DIR);

      // Path contains packages/claude-knowledge, so derives claude-knowledge
      expect(result.package).toBe("claude-knowledge");
    });
  });
});
