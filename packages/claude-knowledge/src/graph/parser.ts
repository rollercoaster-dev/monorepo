/**
 * TypeScript parser using ts-morph for entity and relationship extraction.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * Productionized from prototype in scripts/graph/parse-package.ts (#431).
 */

import { Project, SyntaxKind } from "ts-morph";
import type { SourceFile, Node, JSDoc } from "ts-morph";
import { readdirSync, statSync } from "fs";
import { join, relative, dirname } from "path";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import type { Entity, Relationship, ParseResult, ParseStats } from "./types";

/**
 * Generate a globally unique ID for an entity.
 * Format: `{package}:{filePath}:{type}:{name}`
 *
 * @param packageName - Package name for ID prefix
 * @param filePath - File path relative to package root
 * @param name - Entity name
 * @param type - Entity type (function, class, etc.)
 */
export function makeEntityId(
  packageName: string,
  filePath: string,
  name: string,
  type: string,
): string {
  const cleanPath = filePath.replace(/\\/g, "/");
  return `${packageName}:${cleanPath}:${type}:${name}`;
}

/**
 * Generate a file entity ID.
 * Format: `{package}:file:{filePath}`
 *
 * @param packageName - Package name for ID prefix
 * @param filePath - File path relative to package root
 */
export function makeFileId(packageName: string, filePath: string): string {
  return `${packageName}:file:${filePath.replace(/\\/g, "/")}`;
}

/**
 * Derive package name from path.
 * e.g., "packages/rd-logger/src" -> "rd-logger"
 */
export function derivePackageName(packagePath: string): string {
  const parts = packagePath.replace(/\\/g, "/").split("/");
  // Look for "packages/X" pattern
  const packagesIdx = parts.indexOf("packages");
  if (packagesIdx !== -1 && parts.length > packagesIdx + 1) {
    return parts[packagesIdx + 1];
  }
  // Fallback: use the directory name
  return parts.filter(Boolean).pop() || "unknown";
}

/**
 * Find all TypeScript files recursively, excluding test files.
 * Handles filesystem errors gracefully by logging and continuing.
 *
 * @param dir - Directory to search
 * @returns Array of TypeScript file paths
 */
export function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  function walk(currentDir: string) {
    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch (error) {
      errors.push({
        path: currentDir,
        error: error instanceof Error ? error.message : String(error),
      });
      return; // Skip this directory, continue with others
    }

    for (const entry of entries) {
      const path = join(currentDir, entry);

      let stat;
      try {
        stat = statSync(path);
      } catch (error) {
        errors.push({
          path,
          error: error instanceof Error ? error.message : String(error),
        });
        continue; // Skip this file, continue with others
      }

      if (stat.isDirectory()) {
        // Skip test directories and node_modules
        if (
          entry === "__tests__" ||
          entry === "test" ||
          entry === "tests" ||
          entry === "node_modules"
        ) {
          continue;
        }
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

  // Log errors if any occurred (for debugging)
  if (errors.length > 0) {
    logger.warn(`${errors.length} file system error(s) during scan`, {
      errors: errors.slice(0, 5),
    });
  }

  return files;
}

/**
 * Extract entities from a source file.
 *
 * @param sourceFile - ts-morph SourceFile to extract from
 * @param basePath - Base path for relative file paths
 * @param packageName - Package name for entity IDs
 */
export function extractEntities(
  sourceFile: SourceFile,
  basePath: string,
  packageName: string,
): Entity[] {
  const entities: Entity[] = [];
  const filePath = relative(basePath, sourceFile.getFilePath());

  // Add file as an entity
  entities.push({
    id: makeFileId(packageName, filePath),
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
      const entity: Entity = {
        id: makeEntityId(packageName, filePath, name, "function"),
        type: "function",
        name,
        filePath,
        lineNumber: fn.getStartLineNumber(),
        exported: fn.isExported(),
      };

      const jsDocContent = extractJsDocContent(fn);
      if (jsDocContent) {
        entity.jsDocContent = jsDocContent;
      }

      entities.push(entity);
    }
  });

  // Classes
  sourceFile.getClasses().forEach((cls) => {
    const name = cls.getName();
    if (name) {
      const classEntity: Entity = {
        id: makeEntityId(packageName, filePath, name, "class"),
        type: "class",
        name,
        filePath,
        lineNumber: cls.getStartLineNumber(),
        exported: cls.isExported(),
      };

      const classJsDocContent = extractJsDocContent(cls);
      if (classJsDocContent) {
        classEntity.jsDocContent = classJsDocContent;
      }

      entities.push(classEntity);

      // Class methods as separate entities
      cls.getMethods().forEach((method) => {
        const methodName = method.getName();
        const methodEntity: Entity = {
          id: makeEntityId(
            packageName,
            filePath,
            `${name}.${methodName}`,
            "function",
          ),
          type: "function",
          name: `${name}.${methodName}`,
          filePath,
          lineNumber: method.getStartLineNumber(),
          exported: cls.isExported(),
        };

        const methodJsDocContent = extractJsDocContent(method);
        if (methodJsDocContent) {
          methodEntity.jsDocContent = methodJsDocContent;
        }

        entities.push(methodEntity);
      });
    }
  });

  // Type aliases
  sourceFile.getTypeAliases().forEach((typeAlias) => {
    const name = typeAlias.getName();
    const entity: Entity = {
      id: makeEntityId(packageName, filePath, name, "type"),
      type: "type",
      name,
      filePath,
      lineNumber: typeAlias.getStartLineNumber(),
      exported: typeAlias.isExported(),
    };

    const jsDocContent = extractJsDocContent(typeAlias);
    if (jsDocContent) {
      entity.jsDocContent = jsDocContent;
    }

    entities.push(entity);
  });

  // Interfaces
  sourceFile.getInterfaces().forEach((iface) => {
    const name = iface.getName();
    const entity: Entity = {
      id: makeEntityId(packageName, filePath, name, "interface"),
      type: "interface",
      name,
      filePath,
      lineNumber: iface.getStartLineNumber(),
      exported: iface.isExported(),
    };

    const jsDocContent = extractJsDocContent(iface);
    if (jsDocContent) {
      entity.jsDocContent = jsDocContent;
    }

    entities.push(entity);
  });

  // Variable declarations (especially arrow functions)
  sourceFile.getVariableDeclarations().forEach((decl) => {
    const name = decl.getName();
    const initializer = decl.getInitializer();
    const isArrowFn = initializer?.getKind() === SyntaxKind.ArrowFunction;

    entities.push({
      id: makeEntityId(
        packageName,
        filePath,
        name,
        isArrowFn ? "function" : "variable",
      ),
      type: isArrowFn ? "function" : "variable",
      name,
      filePath,
      lineNumber: decl.getStartLineNumber(),
      exported: decl.isExported(),
    });
  });

  return entities;
}

/**
 * Extract relationships from a source file.
 *
 * @param sourceFile - ts-morph SourceFile to extract from
 * @param basePath - Base path for relative file paths
 * @param packageName - Package name for entity IDs
 */
export function extractRelationships(
  sourceFile: SourceFile,
  basePath: string,
  packageName: string,
): Relationship[] {
  const relationships: Relationship[] = [];
  const filePath = relative(basePath, sourceFile.getFilePath());
  const fileId = makeFileId(packageName, filePath);

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

      if (isRelative) {
        // Try to find the entity
        const resolvedPath = join(dirname(filePath), moduleSpecifier).replace(
          /\\/g,
          "/",
        );
        // TODO: #394 Phase 2 - Improve named import resolution to check actual entity types
        // Currently uses "best guess" which may create orphan references
        const possibleIds = [
          makeEntityId(
            packageName,
            `${resolvedPath}.ts`,
            importedName,
            "function",
          ),
          makeEntityId(
            packageName,
            `${resolvedPath}.ts`,
            importedName,
            "class",
          ),
          makeEntityId(packageName, `${resolvedPath}.ts`, importedName, "type"),
          makeEntityId(
            packageName,
            `${resolvedPath}.ts`,
            importedName,
            "interface",
          ),
          makeEntityId(
            packageName,
            `${resolvedPath}/index.ts`,
            importedName,
            "function",
          ),
          makeEntityId(
            packageName,
            `${resolvedPath}/index.ts`,
            importedName,
            "class",
          ),
        ];

        relationships.push({
          from: fileId,
          to: possibleIds[0], // Best guess - may not resolve
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
        makeEntityId(packageName, filePath, exportedName, "function"),
        makeEntityId(packageName, filePath, exportedName, "class"),
        makeEntityId(packageName, filePath, exportedName, "type"),
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
          fromId = makeEntityId(packageName, filePath, fnName, "function");
        }
      } else if (containingFn.isKind(SyntaxKind.MethodDeclaration)) {
        const methodName = containingFn.getName();
        const parentClass = containingFn.getParentIfKind(
          SyntaxKind.ClassDeclaration,
        );
        const className = parentClass?.getName();
        if (className && methodName) {
          fromId = makeEntityId(
            packageName,
            filePath,
            `${className}.${methodName}`,
            "function",
          );
        }
      } else if (containingFn.isKind(SyntaxKind.ArrowFunction)) {
        // Get name from parent variable declaration
        const varDecl = containingFn.getParentIfKind(
          SyntaxKind.VariableDeclaration,
        );
        const varName = varDecl?.getName();
        if (varName) {
          fromId = makeEntityId(packageName, filePath, varName, "function");
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
        makeEntityId(packageName, filePath, calledName, "function"),
        makeEntityId(packageName, filePath, calledName, "class"),
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
        from: makeEntityId(packageName, filePath, className, "class"),
        to: `class:${baseClassName}`,
        type: "extends",
      });
    }

    // Implements relationships
    cls.getImplements().forEach((impl) => {
      const interfaceName = impl.getText();
      if (className) {
        relationships.push({
          from: makeEntityId(packageName, filePath, className, "class"),
          to: `interface:${interfaceName}`,
          type: "implements",
        });
      }
    });
  });

  return relationships;
}

/**
 * Extract JSDoc content from a declaration node.
 * Returns null if no JSDoc exists or content is empty.
 *
 * @param node - ts-morph declaration node with JSDoc
 * @returns Formatted JSDoc content or null
 */
export function extractJsDocContent(node: {
  getJsDocs(): JSDoc[];
}): string | null {
  const jsDocs = node.getJsDocs();
  if (jsDocs.length === 0) {
    return null;
  }

  // Use first JSDoc block (standard pattern)
  const jsDoc = jsDocs[0];
  const description = jsDoc.getDescription().trim();
  const tags = jsDoc.getTags();

  // Skip empty JSDoc
  if (!description && tags.length === 0) {
    return null;
  }

  // Format: description + tags
  const tagLines = tags.map((tag) => {
    const tagName = tag.getTagName();
    const comment = tag.getCommentText() || "";
    return `@${tagName} ${comment}`.trim();
  });

  return [description, ...tagLines].filter(Boolean).join("\n");
}

/**
 * Parse a TypeScript package and extract entities and relationships.
 *
 * @param packagePath - Path to the package source directory
 * @param packageName - Optional package name (derived from path if not provided)
 * @returns ParseResult with entities, relationships, and statistics
 */
export function parsePackage(
  packagePath: string,
  packageName?: string,
): ParseResult {
  // Derive package name once and pass explicitly (no global state)
  const pkgName = packageName || derivePackageName(packagePath);

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  const tsFiles = findTsFiles(packagePath);
  const parseErrors: Array<{ file: string; error: string }> = [];
  let filesSkipped = 0;

  // Add all files to the project with error handling
  tsFiles.forEach((file) => {
    try {
      project.addSourceFileAtPath(file);
    } catch (error) {
      parseErrors.push({
        file,
        error: error instanceof Error ? error.message : String(error),
      });
      filesSkipped++;
    }
  });

  // Log parse errors if any
  if (parseErrors.length > 0) {
    logger.warn(`${parseErrors.length} file(s) failed to parse`, {
      errors: parseErrors.slice(0, 5),
    });
  }

  const allEntities: Entity[] = [];
  const allRelationships: Relationship[] = [];

  // First pass: extract all entities
  project.getSourceFiles().forEach((sourceFile) => {
    const entities = extractEntities(sourceFile, packagePath, pkgName);
    allEntities.push(...entities);
  });

  // Second pass: extract relationships
  project.getSourceFiles().forEach((sourceFile) => {
    const relationships = extractRelationships(
      sourceFile,
      packagePath,
      pkgName,
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

  const stats: ParseStats = {
    filesScanned: tsFiles.length,
    filesSkipped,
    entitiesByType,
    relationshipsByType,
  };

  return {
    package: pkgName,
    entities: allEntities,
    relationships: allRelationships,
    stats,
  };
}
