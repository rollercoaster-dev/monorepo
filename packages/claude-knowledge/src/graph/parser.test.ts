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
  findTsFiles,
  buildEntityLookupMap,
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

    writeFileSync(
      join(FIXTURES_DIR, "documented.ts"),
      `
/**
 * Greets a user by name.
 *
 * @param name - The name of the user to greet
 * @returns A greeting message
 */
export function greetUser(name: string): string {
  return \`Hello, \${name}!\`;
}

/**
 * User management service.
 * Handles user CRUD operations.
 */
export class UserService {
  /**
   * Finds a user by their unique ID.
   *
   * @param _id - The user ID to search for
   * @returns The user object or null if not found
   * @throws {Error} If the database connection fails
   */
  findById(_id: string): User | null {
    return null;
  }

  // Method without JSDoc
  deleteAll(): void {}
}

/**
 * Configuration options for the application.
 */
export interface AppConfig {
  port: number;
  host: string;
}

/**
 * Unique identifier for a user.
 */
export type UserId = string;

/**
 * User entity type.
 */
export type User = {
  id: UserId;
  name: string;
};

// Function without JSDoc (should not have jsDocContent)
export function helperFunction(): number {
  return 42;
}

/**
 * @deprecated Use greetUser instead
 */
export function oldGreet(): string {
  return "Hi";
}
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
      const simpleFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "simple.ts"),
      );
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "calls.ts"),
      );

      // Build entity lookup map from both files
      const entities = [
        ...extractEntities(simpleFile, FIXTURES_DIR, TEST_PKG),
        ...extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG),
      ];
      const entityLookupMap = buildEntityLookupMap(entities);

      const relationships = extractRelationships(
        sourceFile,
        FIXTURES_DIR,
        TEST_PKG,
        entityLookupMap,
      );

      const imports = relationships.filter((r) => r.type === "imports");
      expect(imports.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts call relationships", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const simpleFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "simple.ts"),
      );
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "calls.ts"),
      );

      // Build entity lookup map from both files
      const entities = [
        ...extractEntities(simpleFile, FIXTURES_DIR, TEST_PKG),
        ...extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG),
      ];
      const entityLookupMap = buildEntityLookupMap(entities);

      const relationships = extractRelationships(
        sourceFile,
        FIXTURES_DIR,
        TEST_PKG,
        entityLookupMap,
      );

      const calls = relationships.filter((r) => r.type === "calls");
      expect(calls.length).toBeGreaterThanOrEqual(2); // greet called twice
    });

    it("extracts extends relationships", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "classes.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const entityLookupMap = buildEntityLookupMap(entities);

      const relationships = extractRelationships(
        sourceFile,
        FIXTURES_DIR,
        TEST_PKG,
        entityLookupMap,
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

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const entityLookupMap = buildEntityLookupMap(entities);

      const relationships = extractRelationships(
        sourceFile,
        FIXTURES_DIR,
        TEST_PKG,
        entityLookupMap,
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

  describe("JSDoc extraction", () => {
    const TEST_PKG = "test-fixtures";

    it("extracts JSDoc from functions with description and tags", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "documented.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const greetUser = entities.find((e) => e.name === "greetUser");

      expect(greetUser).toBeDefined();
      expect(greetUser?.jsDocContent).toBeDefined();
      expect(greetUser?.jsDocContent).toContain("Greets a user by name");
      expect(greetUser?.jsDocContent).toContain("@param");
      expect(greetUser?.jsDocContent).toContain("@returns");
    });

    it("extracts JSDoc from classes", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "documented.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const userService = entities.find((e) => e.name === "UserService");

      expect(userService).toBeDefined();
      expect(userService?.jsDocContent).toBeDefined();
      expect(userService?.jsDocContent).toContain("User management service");
    });

    it("extracts JSDoc from class methods", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "documented.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const findById = entities.find((e) => e.name === "UserService.findById");

      expect(findById).toBeDefined();
      expect(findById?.jsDocContent).toContain("Finds a user");
      expect(findById?.jsDocContent).toContain("@throws");
    });

    it("extracts JSDoc from interfaces", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "documented.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const appConfig = entities.find((e) => e.name === "AppConfig");

      expect(appConfig).toBeDefined();
      expect(appConfig?.jsDocContent).toContain("Configuration options");
    });

    it("extracts JSDoc from type aliases", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "documented.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const userId = entities.find((e) => e.name === "UserId");

      expect(userId).toBeDefined();
      expect(userId?.jsDocContent).toContain("Unique identifier");
    });

    it("does not add jsDocContent for entities without JSDoc", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "documented.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const helperFn = entities.find((e) => e.name === "helperFunction");

      expect(helperFn).toBeDefined();
      expect(helperFn?.jsDocContent).toBeUndefined();
    });

    it("does not add jsDocContent for methods without JSDoc", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "documented.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const deleteAll = entities.find(
        (e) => e.name === "UserService.deleteAll",
      );

      expect(deleteAll).toBeDefined();
      expect(deleteAll?.jsDocContent).toBeUndefined();
    });

    it("handles JSDoc with only tags (no description)", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const sourceFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "documented.ts"),
      );

      const entities = extractEntities(sourceFile, FIXTURES_DIR, TEST_PKG);
      const oldGreet = entities.find((e) => e.name === "oldGreet");

      expect(oldGreet).toBeDefined();
      expect(oldGreet?.jsDocContent).toContain("@deprecated");
    });
  });

  describe("findTsFiles", () => {
    it("excludes node_modules directories", () => {
      const files = findTsFiles(FIXTURES_DIR);

      // Should not include any files from node_modules
      const nodeModulesFiles = files.filter((f) => f.includes("node_modules"));
      expect(nodeModulesFiles.length).toBe(0);
    });

    it("excludes test directories", () => {
      const files = findTsFiles(FIXTURES_DIR);

      // Should not include test files
      const testFiles = files.filter(
        (f) =>
          f.includes("__tests__") ||
          f.includes("/test/") ||
          f.includes("/tests/"),
      );
      expect(testFiles.length).toBe(0);
    });
  });

  describe("extractRelationships - cross-file calls", () => {
    const TEST_PKG = "test-fixtures";

    it("resolves imported function calls to definition file", () => {
      // Parse both files (need both for ts-morph to resolve imports)
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const callsFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "calls.ts"),
      );
      const simpleFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "simple.ts"),
      );

      // Build entity lookup map from both files
      const entities = [
        ...extractEntities(callsFile, FIXTURES_DIR, TEST_PKG),
        ...extractEntities(simpleFile, FIXTURES_DIR, TEST_PKG),
      ];
      const entityLookupMap = buildEntityLookupMap(entities);

      // Extract relationships from calls.ts
      const relationships = extractRelationships(
        callsFile,
        FIXTURES_DIR,
        TEST_PKG,
        entityLookupMap,
      );

      // Find the relationship where doWork calls greet
      const greetCall = relationships.find(
        (r) =>
          r.type === "calls" &&
          r.to.includes("simple.ts") &&
          r.to.includes("greet"),
      );

      // Should resolve to simple.ts:function:greet, not calls.ts:function:greet
      expect(greetCall).toBeDefined();
      expect(greetCall?.to).toContain("simple.ts");
      expect(greetCall?.to).not.toContain("calls.ts");
    });

    it("filters out unresolvable method calls", () => {
      const project = new Project({ skipAddingFilesFromTsConfig: true });
      const classFile = project.addSourceFileAtPath(
        join(FIXTURES_DIR, "classes.ts"),
      );

      const entities = extractEntities(classFile, FIXTURES_DIR, TEST_PKG);
      const entityLookupMap = buildEntityLookupMap(entities);

      const relationships = extractRelationships(
        classFile,
        FIXTURES_DIR,
        TEST_PKG,
        entityLookupMap,
      );

      // Should not have any synthetic "call:xxx" IDs
      const syntheticCalls = relationships.filter((r) =>
        r.to.startsWith("call:"),
      );
      expect(syntheticCalls.length).toBe(0);
    });
  });
});
