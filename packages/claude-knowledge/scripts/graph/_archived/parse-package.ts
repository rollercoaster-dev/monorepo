#!/usr/bin/env bun
/**
 * Parse a TypeScript package and extract entities + relationships.
 * Part of Issue #431 Experiment 3: Code Graph Prototype.
 *
 * Usage: bun parse-package.ts <package-path>
 * Example: bun parse-package.ts packages/rd-logger/src
 */

import { Project, SyntaxKind } from "ts-morph";
import type { SourceFile, Node } from "ts-morph";
import { readdirSync, statSync } from "fs";
import { join, relative, dirname } from "path";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

// Entity types we track
interface Entity {
  id: string;
  type: "function" | "class" | "type" | "interface" | "variable" | "file";
  name: string;
  filePath: string;
  lineNumber: number;
  exported: boolean;
}

// Relationship types we track
interface Relationship {
  from: string; // entity id
  to: string; // entity id or external name (e.g., "fs:readFileSync")
  type: "calls" | "imports" | "exports" | "extends" | "implements" | "defines";
}

interface ParseResult {
  package: string;
  entities: Entity[];
  relationships: Relationship[];
  stats: {
    filesScanned: number;
    filesSkipped: number;
    entitiesByType: Record<string, number>;
    relationshipsByType: Record<string, number>;
  };
}

// Package name for globally unique IDs (set from command line or derived from path)
let packageName: string = "";

// Generate a globally unique ID for an entity (includes package prefix)
function makeEntityId(filePath: string, name: string, type: string): string {
  const cleanPath = filePath.replace(/\\/g, "/");
  return `${packageName}:${cleanPath}:${type}:${name}`;
}

// Generate a file entity ID (includes package prefix)
function makeFileId(filePath: string): string {
  return `${packageName}:file:${filePath.replace(/\\/g, "/")}`;
}

// Derive package name from path (e.g., "packages/rd-logger/src" -> "rd-logger")
function derivePackageName(packagePath: string): string {
  const parts = packagePath.replace(/\\/g, "/").split("/");
  // Look for "packages/X" pattern
  const packagesIdx = parts.indexOf("packages");
  if (packagesIdx !== -1 && parts.length > packagesIdx + 1) {
    return parts[packagesIdx + 1];
  }
  // Fallback: use the directory name
  return parts.filter(Boolean).pop() || "unknown";
}

// Find all .ts files recursively, excluding test files
function findTsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    for (const entry of readdirSync(currentDir)) {
      const path = join(currentDir, entry);
      const stat = statSync(path);

      if (stat.isDirectory()) {
        // Skip test directories
        if (entry === "__tests__" || entry === "test" || entry === "tests")
          continue;
        walk(path);
      } else if (
        entry.endsWith(".ts") &&
        !entry.endsWith(".test.ts") &&
        !entry.endsWith(".spec.ts") &&
        !entry.endsWith(".d.ts")
      ) {
        files.push(path);
      }
    }
  }

  walk(dir);
  return files;
}

// Extract entities from a source file
function extractEntities(sourceFile: SourceFile, basePath: string): Entity[] {
  const entities: Entity[] = [];
  const filePath = relative(basePath, sourceFile.getFilePath());

  // Add file as an entity
  entities.push({
    id: makeFileId(filePath),
    type: "file",
    name: filePath,
    filePath,
    lineNumber: 1,
    exported: true,
  });

  // Functions
  sourceFile.getFunctions().forEach((fn) => {
    const name = fn.getName();
    if (name) {
      entities.push({
        id: makeEntityId(filePath, name, "function"),
        type: "function",
        name,
        filePath,
        lineNumber: fn.getStartLineNumber(),
        exported: fn.isExported(),
      });
    }
  });

  // Classes
  sourceFile.getClasses().forEach((cls) => {
    const name = cls.getName();
    if (name) {
      entities.push({
        id: makeEntityId(filePath, name, "class"),
        type: "class",
        name,
        filePath,
        lineNumber: cls.getStartLineNumber(),
        exported: cls.isExported(),
      });

      // Class methods as separate entities
      cls.getMethods().forEach((method) => {
        const methodName = method.getName();
        entities.push({
          id: makeEntityId(filePath, `${name}.${methodName}`, "function"),
          type: "function",
          name: `${name}.${methodName}`,
          filePath,
          lineNumber: method.getStartLineNumber(),
          exported: cls.isExported(),
        });
      });
    }
  });

  // Type aliases
  sourceFile.getTypeAliases().forEach((typeAlias) => {
    const name = typeAlias.getName();
    entities.push({
      id: makeEntityId(filePath, name, "type"),
      type: "type",
      name,
      filePath,
      lineNumber: typeAlias.getStartLineNumber(),
      exported: typeAlias.isExported(),
    });
  });

  // Interfaces
  sourceFile.getInterfaces().forEach((iface) => {
    const name = iface.getName();
    entities.push({
      id: makeEntityId(filePath, name, "interface"),
      type: "interface",
      name,
      filePath,
      lineNumber: iface.getStartLineNumber(),
      exported: iface.isExported(),
    });
  });

  // Variable declarations (especially arrow functions)
  sourceFile.getVariableDeclarations().forEach((decl) => {
    const name = decl.getName();
    const initializer = decl.getInitializer();
    const isArrowFn = initializer?.getKind() === SyntaxKind.ArrowFunction;

    entities.push({
      id: makeEntityId(filePath, name, isArrowFn ? "function" : "variable"),
      type: isArrowFn ? "function" : "variable",
      name,
      filePath,
      lineNumber: decl.getStartLineNumber(),
      exported: decl.isExported(),
    });
  });

  return entities;
}

// Extract relationships from a source file
function extractRelationships(
  sourceFile: SourceFile,
  basePath: string,
  _entityMap: Map<string, Entity>,
): Relationship[] {
  const relationships: Relationship[] = [];
  const filePath = relative(basePath, sourceFile.getFilePath());
  const fileId = makeFileId(filePath);

  // Import relationships
  sourceFile.getImportDeclarations().forEach((imp) => {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    const isRelative = moduleSpecifier.startsWith(".");

    // Resolve the import target
    let targetId: string;
    if (isRelative) {
      // Relative import - resolve to actual file
      const resolvedPath = join(dirname(filePath), moduleSpecifier).replace(
        /\\/g,
        "/",
      );
      // Try with .ts extension
      const possiblePaths = [
        `${resolvedPath}.ts`,
        `${resolvedPath}/index.ts`,
        resolvedPath,
      ];
      targetId = `file:${possiblePaths[0]}`; // Use first possibility
    } else {
      // External import
      targetId = `external:${moduleSpecifier}`;
    }

    relationships.push({
      from: fileId,
      to: targetId,
      type: "imports",
    });

    // Named imports
    imp.getNamedImports().forEach((named) => {
      const importedName = named.getName();
      const _aliasName = named.getAliasNode()?.getText() || importedName;

      if (isRelative) {
        // Try to find the entity
        const resolvedPath = join(dirname(filePath), moduleSpecifier).replace(
          /\\/g,
          "/",
        );
        const possibleIds = [
          makeEntityId(`${resolvedPath}.ts`, importedName, "function"),
          makeEntityId(`${resolvedPath}.ts`, importedName, "class"),
          makeEntityId(`${resolvedPath}.ts`, importedName, "type"),
          makeEntityId(`${resolvedPath}.ts`, importedName, "interface"),
          makeEntityId(`${resolvedPath}/index.ts`, importedName, "function"),
          makeEntityId(`${resolvedPath}/index.ts`, importedName, "class"),
        ];

        relationships.push({
          from: fileId,
          to: possibleIds[0], // Best guess
          type: "imports",
        });
      }
    });
  });

  // Export relationships
  sourceFile.getExportDeclarations().forEach((exp) => {
    exp.getNamedExports().forEach((named) => {
      const exportedName = named.getName();
      const possibleIds = [
        makeEntityId(filePath, exportedName, "function"),
        makeEntityId(filePath, exportedName, "class"),
        makeEntityId(filePath, exportedName, "type"),
      ];

      relationships.push({
        from: fileId,
        to: possibleIds[0],
        type: "exports",
      });
    });
  });

  // Call relationships - find all function calls
  sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
    const expression = call.getExpression();
    const calledName = expression.getText();

    // Find the containing function/method
    let containingFn: Node | undefined = call;
    while (
      containingFn &&
      !containingFn.isKind(SyntaxKind.FunctionDeclaration) &&
      !containingFn.isKind(SyntaxKind.MethodDeclaration) &&
      !containingFn.isKind(SyntaxKind.ArrowFunction)
    ) {
      containingFn = containingFn.getParent();
    }

    let fromId = fileId;
    if (containingFn) {
      if (containingFn.isKind(SyntaxKind.FunctionDeclaration)) {
        const fnName = containingFn.getName();
        if (fnName) {
          fromId = makeEntityId(filePath, fnName, "function");
        }
      } else if (containingFn.isKind(SyntaxKind.MethodDeclaration)) {
        const methodName = containingFn.getName();
        const parentClass = containingFn.getParentIfKind(
          SyntaxKind.ClassDeclaration,
        );
        const className = parentClass?.getName();
        if (className && methodName) {
          fromId = makeEntityId(
            filePath,
            `${className}.${methodName}`,
            "function",
          );
        }
      }
    }

    // Try to resolve the called function
    let toId: string;
    if (calledName.includes(".")) {
      // Method call or property access
      toId = `call:${calledName}`;
    } else {
      // Direct function call - could be local or imported
      const possibleIds = [
        makeEntityId(filePath, calledName, "function"),
        makeEntityId(filePath, calledName, "class"),
      ];
      toId = possibleIds[0];
    }

    relationships.push({
      from: fromId,
      to: toId,
      type: "calls",
    });
  });

  // Class extends relationships
  sourceFile.getClasses().forEach((cls) => {
    const className = cls.getName();
    const extendsClause = cls.getExtends();

    if (className && extendsClause) {
      const baseClassName = extendsClause.getText();
      relationships.push({
        from: makeEntityId(filePath, className, "class"),
        to: `class:${baseClassName}`,
        type: "extends",
      });
    }

    // Implements relationships
    cls.getImplements().forEach((impl) => {
      const interfaceName = impl.getText();
      if (className) {
        relationships.push({
          from: makeEntityId(filePath, className, "class"),
          to: `interface:${interfaceName}`,
          type: "implements",
        });
      }
    });
  });

  return relationships;
}

// Main parsing function
function parsePackage(packagePath: string): ParseResult {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  const tsFiles = findTsFiles(packagePath);
  logger.info(`Found ${tsFiles.length} TypeScript files to parse`);

  // Add all files to the project
  tsFiles.forEach((file) => {
    project.addSourceFileAtPath(file);
  });

  const allEntities: Entity[] = [];
  const allRelationships: Relationship[] = [];
  const entityMap = new Map<string, Entity>();

  // First pass: extract all entities
  project.getSourceFiles().forEach((sourceFile) => {
    const entities = extractEntities(sourceFile, packagePath);
    entities.forEach((e) => {
      allEntities.push(e);
      entityMap.set(e.id, e);
    });
  });

  // Second pass: extract relationships
  project.getSourceFiles().forEach((sourceFile) => {
    const relationships = extractRelationships(
      sourceFile,
      packagePath,
      entityMap,
    );
    allRelationships.push(...relationships);
  });

  // Calculate stats
  const entitiesByType: Record<string, number> = {};
  allEntities.forEach((e) => {
    entitiesByType[e.type] = (entitiesByType[e.type] || 0) + 1;
  });

  const relationshipsByType: Record<string, number> = {};
  allRelationships.forEach((r) => {
    relationshipsByType[r.type] = (relationshipsByType[r.type] || 0) + 1;
  });

  return {
    package: packageName,
    entities: allEntities,
    relationships: allRelationships,
    stats: {
      filesScanned: tsFiles.length,
      filesSkipped: 0,
      entitiesByType,
      relationshipsByType,
    },
  };
}

// Main
const packagePath = process.argv[2] || "packages/rd-logger/src";
// Package name can be provided as second arg, or derived from path
packageName = process.argv[3] || derivePackageName(packagePath);
logger.info(`Parsing package: ${packagePath} (name: ${packageName})`);

const result = parsePackage(packagePath);

logger.info("=== Parse Results ===");
logger.info(`Files scanned: ${result.stats.filesScanned}`);
logger.info(`Entities found: ${result.entities.length}`);
logger.info(`  By type: ${JSON.stringify(result.stats.entitiesByType)}`);
logger.info(`Relationships found: ${result.relationships.length}`);
logger.info(`  By type: ${JSON.stringify(result.stats.relationshipsByType)}`);

// Output JSON to stdout (program output, not logging)
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
