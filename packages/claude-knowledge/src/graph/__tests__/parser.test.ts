/**
 * Tests for parser improvements:
 * - Richer metadata extraction (async, parameters, returnType, etc.)
 * - Enum support
 * - Vue template component tracking
 * - Progress callbacks
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Project } from "ts-morph";
import {
  extractEntities,
  makeEntityId,
  makeFileId,
  extractVueScript,
  parsePackage,
} from "../parser";
import { addToEntityCache, type EntityCache } from "../store";
import type { ProgressCallback } from "../types";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("extractEntities - richer metadata", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({
      skipAddingFilesFromTsConfig: true,
      useInMemoryFileSystem: true,
    });
  });

  it("should extract async flag for async functions", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export async function fetchData(): Promise<string> {
        return "data";
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const fn = entities.find((e) => e.name === "fetchData");

    expect(fn).toBeDefined();
    expect(fn?.metadata?.async).toBe(true);
    expect(fn?.metadata?.returnType).toBe("Promise<string>");
  });

  it("should extract generator flag for generator functions", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export function* generateNumbers() {
        yield 1;
        yield 2;
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const fn = entities.find((e) => e.name === "generateNumbers");

    expect(fn).toBeDefined();
    expect(fn?.metadata?.generator).toBe(true);
  });

  it("should extract parameters array", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export function greet(name: string, age: number): string {
        return \`Hello \${name}, you are \${age}\`;
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const fn = entities.find((e) => e.name === "greet");

    expect(fn).toBeDefined();
    expect(fn?.metadata?.parameters).toEqual(["name", "age"]);
    expect(fn?.metadata?.returnType).toBe("string");
  });

  it("should extract type parameters from generic functions", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export function identity<T, U>(value: T, other: U): T {
        return value;
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const fn = entities.find((e) => e.name === "identity");

    expect(fn).toBeDefined();
    expect(fn?.metadata?.typeParameters).toEqual(["T", "U"]);
  });

  it("should extract type parameters from generic classes", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export class Container<T> {
        private value: T;
        constructor(value: T) {
          this.value = value;
        }
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const cls = entities.find(
      (e) => e.type === "class" && e.name === "Container",
    );

    expect(cls).toBeDefined();
    expect(cls?.metadata?.typeParameters).toEqual(["T"]);
  });

  it("should extract static flag for static methods", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export class Utils {
        static formatDate(date: Date): string {
          return date.toISOString();
        }
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const method = entities.find((e) => e.name === "Utils.formatDate");

    expect(method).toBeDefined();
    expect(method?.metadata?.static).toBe(true);
    expect(method?.metadata?.parameters).toEqual(["date"]);
    expect(method?.metadata?.returnType).toBe("string");
  });

  it("should extract arrow function metadata", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export const add = async (a: number, b: number): Promise<number> => a + b;
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const fn = entities.find((e) => e.name === "add");

    expect(fn).toBeDefined();
    expect(fn?.type).toBe("function");
    expect(fn?.metadata?.arrowFunction).toBe(true);
    expect(fn?.metadata?.async).toBe(true);
    expect(fn?.metadata?.parameters).toEqual(["a", "b"]);
    expect(fn?.metadata?.returnType).toBe("Promise<number>");
  });

  it("should extract variable kind (const/let/var)", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export const CONFIG = { debug: true };
      export let counter = 0;
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const config = entities.find((e) => e.name === "CONFIG");
    const counter = entities.find((e) => e.name === "counter");

    expect(config).toBeDefined();
    expect(config?.metadata?.kind).toBe("const");

    expect(counter).toBeDefined();
    expect(counter?.metadata?.kind).toBe("let");
  });
});

describe("extractEntities - enum support", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({
      skipAddingFilesFromTsConfig: true,
      useInMemoryFileSystem: true,
    });
  });

  it("should extract enum entities with members", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export enum Status {
        Pending = 0,
        Active = 1,
        Completed = 2,
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const enumEntity = entities.find((e) => e.type === "enum");

    expect(enumEntity).toBeDefined();
    expect(enumEntity?.name).toBe("Status");
    expect(enumEntity?.exported).toBe(true);
    expect(enumEntity?.metadata?.members).toEqual([
      { name: "Pending", value: "0" },
      { name: "Active", value: "1" },
      { name: "Completed", value: "2" },
    ]);
  });

  it("should extract const enum with const flag", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export const enum Direction {
        Up,
        Down,
        Left,
        Right,
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const enumEntity = entities.find((e) => e.type === "enum");

    expect(enumEntity).toBeDefined();
    expect(enumEntity?.metadata?.const).toBe(true);
    expect(enumEntity?.metadata?.members?.length).toBe(4);
  });

  it("should extract string enum members", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      export enum Color {
        Red = "RED",
        Green = "GREEN",
        Blue = "BLUE",
      }
    `,
    );

    const entities = extractEntities(sourceFile, "/pkg", "test-pkg");
    const enumEntity = entities.find((e) => e.type === "enum");

    expect(enumEntity).toBeDefined();
    expect(enumEntity?.metadata?.members).toEqual([
      { name: "Red", value: "RED" },
      { name: "Green", value: "GREEN" },
      { name: "Blue", value: "BLUE" },
    ]);
  });
});

describe("extractVueScript - template content", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "vue-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should extract template content from Vue SFC", () => {
    const vueContent = `
<template>
  <div>
    <MyComponent />
    <AnotherComponent />
  </div>
</template>

<script lang="ts">
export default {
  name: 'TestComponent',
};
</script>
`;
    const vuePath = join(tempDir, "Test.vue");
    writeFileSync(vuePath, vueContent);

    const result = extractVueScript(vuePath);

    expect(result).not.toBeNull();
    expect(result?.templateContent).toBeDefined();
    expect(result?.templateContent).toContain("MyComponent");
    expect(result?.templateContent).toContain("AnotherComponent");
  });

  it("should extract template content from script setup", () => {
    const vueContent = `
<template>
  <UserCard />
</template>

<script setup lang="ts">
import UserCard from './UserCard.vue';
</script>
`;
    const vuePath = join(tempDir, "Test.vue");
    writeFileSync(vuePath, vueContent);

    const result = extractVueScript(vuePath);

    expect(result).not.toBeNull();
    expect(result?.isSetupSyntax).toBe(true);
    expect(result?.templateContent).toContain("UserCard");
  });
});

describe("parsePackage - progress callbacks", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "parse-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should call progress callback at each phase", () => {
    // Create a simple TypeScript file
    const tsContent = `
      export function hello(): string {
        return "world";
      }
    `;
    writeFileSync(join(tempDir, "index.ts"), tsContent);

    const progressCalls: Array<{
      phase: string;
      current: number;
      total: number;
      message: string;
    }> = [];

    const onProgress: ProgressCallback = (phase, current, total, message) => {
      progressCalls.push({ phase, current, total, message });
    };

    const result = parsePackage(tempDir, "test-pkg", { onProgress });

    expect(result).toBeDefined();
    expect(result.entities.length).toBeGreaterThan(0);

    // Check that all phases were called
    const phases = progressCalls.map((c) => c.phase);
    expect(phases).toContain("scan");
    expect(phases).toContain("load");
    expect(phases).toContain("entities");
    expect(phases).toContain("relationships");
  });

  it("should report correct file counts in progress", () => {
    // Create two TypeScript files
    writeFileSync(join(tempDir, "a.ts"), "export const a = 1;");
    writeFileSync(join(tempDir, "b.ts"), "export const b = 2;");

    let scanTotal = 0;
    let loadTotal = 0;

    const onProgress: ProgressCallback = (phase, _current, total) => {
      if (phase === "scan") scanTotal = total;
      if (phase === "load") loadTotal = total;
    };

    parsePackage(tempDir, "test-pkg", { onProgress });

    expect(scanTotal).toBe(2);
    expect(loadTotal).toBe(2);
  });
});

describe("makeEntityId and makeFileId", () => {
  it("should create correct entity IDs", () => {
    const id = makeEntityId("my-pkg", "src/utils.ts", "formatDate", "function");
    expect(id).toBe("my-pkg:src/utils.ts:function:formatDate");
  });

  it("should create correct file IDs", () => {
    const id = makeFileId("my-pkg", "src/index.ts");
    expect(id).toBe("my-pkg:file:src/index.ts");
  });

  it("should normalize Windows paths", () => {
    const id = makeEntityId("pkg", "src\\utils\\helper.ts", "fn", "function");
    expect(id).toBe("pkg:src/utils/helper.ts:function:fn");
  });
});

describe("addToEntityCache", () => {
  it("should create new file entry when none exists", () => {
    const cache: EntityCache = new Map();
    const entity = {
      filePath: "src/utils.ts",
      name: "formatDate",
      id: "pkg:src/utils.ts:function:formatDate",
    };

    const isNew = addToEntityCache(cache, entity);

    expect(isNew).toBe(true);
    expect(cache.has("src/utils.ts")).toBe(true);
    expect(cache.get("src/utils.ts")?.get("formatDate")).toBe(
      "pkg:src/utils.ts:function:formatDate",
    );
  });

  it("should add to existing file entry", () => {
    const cache: EntityCache = new Map();
    const entity1 = {
      filePath: "src/utils.ts",
      name: "formatDate",
      id: "pkg:src/utils.ts:function:formatDate",
    };
    const entity2 = {
      filePath: "src/utils.ts",
      name: "parseDate",
      id: "pkg:src/utils.ts:function:parseDate",
    };

    addToEntityCache(cache, entity1);
    const isNew = addToEntityCache(cache, entity2);

    expect(isNew).toBe(true);
    expect(cache.get("src/utils.ts")?.size).toBe(2);
    expect(cache.get("src/utils.ts")?.get("parseDate")).toBe(
      "pkg:src/utils.ts:function:parseDate",
    );
  });

  it("should return false when overwriting existing entry", () => {
    const cache: EntityCache = new Map();
    const entity1 = {
      filePath: "src/utils.ts",
      name: "formatDate",
      id: "pkg:src/utils.ts:function:formatDate",
    };
    const entity2 = {
      filePath: "src/utils.ts",
      name: "formatDate",
      id: "pkg:src/utils.ts:function:formatDate-v2",
    };

    addToEntityCache(cache, entity1);
    const isNew = addToEntityCache(cache, entity2);

    expect(isNew).toBe(false);
    expect(cache.get("src/utils.ts")?.get("formatDate")).toBe(
      "pkg:src/utils.ts:function:formatDate-v2",
    );
  });

  it("should handle multiple files independently", () => {
    const cache: EntityCache = new Map();
    const entity1 = {
      filePath: "src/a.ts",
      name: "fnA",
      id: "pkg:src/a.ts:function:fnA",
    };
    const entity2 = {
      filePath: "src/b.ts",
      name: "fnB",
      id: "pkg:src/b.ts:function:fnB",
    };

    addToEntityCache(cache, entity1);
    addToEntityCache(cache, entity2);

    expect(cache.size).toBe(2);
    expect(cache.get("src/a.ts")?.get("fnA")).toBe("pkg:src/a.ts:function:fnA");
    expect(cache.get("src/b.ts")?.get("fnB")).toBe("pkg:src/b.ts:function:fnB");
  });
});

describe("Vue template component relationship extraction", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "vue-rel-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should extract PascalCase component usage from template", () => {
    // Create a component that uses another component
    // Note: For the relationship to be created, the child component must have
    // a named entity that matches the component name used in the template
    const childComponent = `
<template>
  <div>Child</div>
</template>

<script setup lang="ts">
// Export a constant matching the component name for entity lookup
export const ChildComponent = { name: 'ChildComponent' };
</script>
`;
    const parentComponent = `
<template>
  <div>
    <ChildComponent />
  </div>
</template>

<script setup lang="ts">
import { ChildComponent } from './ChildComponent.vue';
</script>
`;
    writeFileSync(join(tempDir, "ChildComponent.vue"), childComponent);
    writeFileSync(join(tempDir, "ParentComponent.vue"), parentComponent);

    const result = parsePackage(tempDir, "test-pkg");

    // Find the relationship from parent to child
    const templateRelationship = result.relationships.find(
      (r) =>
        r.from.includes("ParentComponent") &&
        r.to.includes("ChildComponent") &&
        r.type === "calls",
    );

    expect(templateRelationship).toBeDefined();
  });

  it("should convert kebab-case to PascalCase for component lookup", () => {
    // Child component with a named export matching the PascalCase name
    const childComponent = `
<template>
  <div>Child</div>
</template>

<script setup lang="ts">
// Export a constant matching the PascalCase name for entity lookup
export const MyComponent = { name: 'MyComponent' };
</script>
`;
    const parentComponent = `
<template>
  <div>
    <my-component />
  </div>
</template>

<script setup lang="ts">
import { MyComponent } from './MyComponent.vue';
</script>
`;
    writeFileSync(join(tempDir, "MyComponent.vue"), childComponent);
    writeFileSync(join(tempDir, "Parent.vue"), parentComponent);

    const result = parsePackage(tempDir, "test-pkg");

    // Find the relationship - kebab-case in template should resolve to PascalCase component
    const templateRelationship = result.relationships.find(
      (r) =>
        r.from.includes("Parent") &&
        r.to.includes("MyComponent") &&
        r.type === "calls",
    );

    expect(templateRelationship).toBeDefined();
  });

  it("should not create relationships for standard HTML tags", () => {
    const component = `
<template>
  <div>
    <span>Text</span>
    <button>Click</button>
    <input type="text" />
  </div>
</template>

<script setup lang="ts">
</script>
`;
    writeFileSync(join(tempDir, "Test.vue"), component);

    const result = parsePackage(tempDir, "test-pkg");

    // Should not have relationships to div, span, button, input
    const htmlTagRelationships = result.relationships.filter(
      (r) =>
        r.to.includes("div") ||
        r.to.includes("span") ||
        r.to.includes("button") ||
        r.to.includes("input"),
    );

    expect(htmlTagRelationships.length).toBe(0);
  });

  it("should not create relationships for Vue built-in elements", () => {
    const component = `
<template>
  <transition>
    <teleport to="body">
      <suspense>
        <keep-alive>
          <component :is="dynamic" />
        </keep-alive>
      </suspense>
    </teleport>
  </transition>
</template>

<script setup lang="ts">
const dynamic = 'div';
</script>
`;
    writeFileSync(join(tempDir, "Test.vue"), component);

    const result = parsePackage(tempDir, "test-pkg");

    // Should not have relationships to Vue built-in elements
    const vueBuiltinRelationships = result.relationships.filter(
      (r) =>
        r.to.includes("transition") ||
        r.to.includes("teleport") ||
        r.to.includes("suspense") ||
        r.to.includes("keep-alive") ||
        r.to.includes("component"),
    );

    expect(vueBuiltinRelationships.length).toBe(0);
  });

  it("should handle templates with no custom components", () => {
    const component = `
<template>
  <div>
    <p>Just text</p>
  </div>
</template>

<script setup lang="ts">
const msg = 'hello';
</script>
`;
    writeFileSync(join(tempDir, "Test.vue"), component);

    // Should not throw, and should have no template-component relationships
    const result = parsePackage(tempDir, "test-pkg");

    const templateRelationships = result.relationships.filter(
      (r) => r.type === "calls" && r.from.includes("Test.vue"),
    );

    // Should not have any "calls" relationships from this file (no custom components)
    expect(templateRelationships.length).toBe(0);
  });
});
