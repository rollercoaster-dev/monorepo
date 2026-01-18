/**
 * TypeScript parser using ts-morph for entity and relationship extraction.
 * Part of Issue #394: ts-morph static analysis for codebase structure (Tier 1).
 *
 * Productionized from prototype in scripts/graph/parse-package.ts (#431).
 */

import { Project, SyntaxKind } from "ts-morph";
import type { SourceFile, Node, JSDoc } from "ts-morph";
import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative, dirname, resolve } from "path";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { parse as parseVueSFC } from "@vue/compiler-sfc";
import type {
  Entity,
  Relationship,
  ParseResult,
  ParseStats,
  IncrementalParseOptions,
} from "./types";

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
 * Find all TypeScript and Vue SFC files recursively, excluding test files.
 * Handles filesystem errors gracefully by logging and continuing.
 *
 * @param dir - Directory to search
 * @returns Array of TypeScript and Vue file paths
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
        (entry.endsWith(".ts") &&
          !entry.endsWith(".test.ts") &&
          !entry.endsWith(".spec.ts") &&
          !entry.endsWith(".d.ts")) ||
        (entry.endsWith(".vue") &&
          !entry.endsWith(".test.vue") &&
          !entry.endsWith(".spec.vue"))
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
 * Extract TypeScript content from a Vue SFC file.
 * Supports both <script lang="ts"> and <script setup lang="ts"> syntax.
 *
 * @param filePath - Path to the Vue file
 * @returns Object with script content and syntax type, or null if no TypeScript script found
 */
export function extractVueScript(
  filePath: string,
): { content: string; isSetupSyntax: boolean } | null {
  try {
    const fileContent = readFileSync(filePath, "utf-8");
    const { descriptor, errors } = parseVueSFC(fileContent, {
      filename: filePath,
    });

    // Log parse errors if any
    if (errors.length > 0) {
      logger.warn(`Failed to parse Vue file: ${filePath}`, {
        errors: errors.map((e: { message: string }) => e.message),
      });
      return null;
    }

    // Check <script setup> first (modern Vue 3 pattern)
    if (descriptor.scriptSetup && descriptor.scriptSetup.lang === "ts") {
      return {
        content: descriptor.scriptSetup.content,
        isSetupSyntax: true,
      };
    }

    // Fall back to regular <script>
    if (descriptor.script && descriptor.script.lang === "ts") {
      return {
        content: descriptor.script.content,
        isSetupSyntax: false,
      };
    }

    // No TypeScript script found
    return null;
  } catch (error) {
    logger.warn(`Error extracting script from Vue file: ${filePath}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Extract entities from a source file.
 *
 * @param sourceFile - ts-morph SourceFile to extract from
 * @param basePath - Base path for relative file paths
 * @param packageName - Package name for entity IDs
 * @param originalFilePath - Optional original file path (for Vue files, overrides sourceFile path)
 */
export function extractEntities(
  sourceFile: SourceFile,
  basePath: string,
  packageName: string,
  originalFilePath?: string,
): Entity[] {
  const entities: Entity[] = [];
  const filePath =
    originalFilePath || relative(basePath, sourceFile.getFilePath());

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
 * Resolve a call expression to its actual definition entity ID.
 * Uses multi-pass resolution strategy to minimize orphaned relationships.
 *
 * Pass 1: ts-morph type system resolution
 * Pass 2: Import-aware lookup (check if symbol was imported)
 * Pass 3: Entity lookup map (find matching entities in codebase)
 * Pass 4: Return null for unresolvable (external/dynamic calls)
 *
 * @param call - CallExpression to resolve
 * @param packageName - Package name for entity IDs
 * @param currentFilePath - Current file path (relative to basePath)
 * @param basePath - Base path for package
 * @param entityLookupMap - Map of entity names to entities (for Pass 3)
 * @param importMap - Map of imported symbols to file paths (for Pass 2)
 * @returns Entity ID of the called function, or null if unresolvable
 */
function resolveCallTarget(
  call: Node,
  packageName: string,
  currentFilePath: string,
  basePath: string,
  entityLookupMap: Map<string, Entity[]>,
  importMap: Map<string, string>,
): string | null {
  // Get the expression being called
  const expression = call.getChildAtIndex(0); // Left side of the call
  const calledName = expression.getText();

  // PASS 1: Try to resolve using ts-morph type system
  try {
    const definitions =
      expression.getType().getSymbol()?.getDeclarations() || [];

    if (definitions.length > 0) {
      const def = definitions[0];
      const defSourceFile = def.getSourceFile();
      const defFilePath = relative(basePath, defSourceFile.getFilePath());

      // Extract entity name from definition
      let defName: string | undefined;
      if (def.isKind(SyntaxKind.FunctionDeclaration)) {
        defName = def.getName();
      } else if (def.isKind(SyntaxKind.MethodDeclaration)) {
        const methodName = def.getName();
        const parentClass = def.getParentIfKind(SyntaxKind.ClassDeclaration);
        const className = parentClass?.getName();
        if (className && methodName) {
          defName = `${className}.${methodName}`;
        }
      } else if (def.isKind(SyntaxKind.VariableDeclaration)) {
        defName = def.getName();
      } else if (def.isKind(SyntaxKind.ClassDeclaration)) {
        defName = def.getName();
      }

      if (defName) {
        // Skip if definition is outside the package (e.g., node_modules)
        // relative() returns paths starting with '..' for files outside basePath
        if (defFilePath.startsWith("..")) {
          // External dependency - don't create relationship
          return null;
        }

        // Verify this entity exists in our entity map
        const entityId = makeEntityId(
          packageName,
          defFilePath,
          defName,
          "function",
        );
        const candidates = entityLookupMap.get(defName);
        if (candidates && candidates.some((e) => e.id === entityId)) {
          return entityId;
        }
      }
    }
  } catch {
    // Resolution failed - fall through to next pass
  }

  // PASS 2: Check import map for this symbol
  const importedFromPath = importMap.get(calledName);
  if (importedFromPath) {
    // Look up entities in the imported file
    const candidates = entityLookupMap.get(calledName);
    if (candidates) {
      // Find entity in the imported file - try all possible path variations
      // to handle cases where import './bar' could be bar.ts or bar/index.ts
      const possiblePaths = [
        importedFromPath,
        importedFromPath.replace(/\.ts$/, "/index.ts"),
        importedFromPath.replace(/\.ts$/, ""),
      ];
      const match = candidates.find((e) => possiblePaths.includes(e.filePath));
      if (match) {
        return match.id;
      }
    }
  }

  // PASS 3: Entity lookup map fallback
  // Skip method calls and property access (e.g., "obj.method", "this.helper")
  if (calledName.includes(".")) {
    return null; // Cannot resolve - skip this relationship
  }

  // Look up the called name in entity map
  const candidates = entityLookupMap.get(calledName);
  if (candidates && candidates.length > 0) {
    // Use findBestMatch to select most likely candidate
    const bestMatch = findBestMatch(candidates, currentFilePath, false);
    if (bestMatch) {
      return bestMatch.id;
    }
  }

  // PASS 4: Unresolvable - return null (don't create synthetic IDs)
  // This handles:
  // - External library calls (console.log, JSON.stringify)
  // - Dynamic calls (variables containing function references)
  // - Method calls we couldn't resolve
  return null;
}

/**
 * Extract relationships from a source file.
 *
 * @param sourceFile - ts-morph SourceFile to extract from
 * @param basePath - Base path for relative file paths
 * @param packageName - Package name for entity IDs
 * @param entityLookupMap - Map of entity names to entities for call resolution
 * @param originalFilePath - Original file path (for Vue files mapped to virtual .ts)
 */
export function extractRelationships(
  sourceFile: SourceFile,
  basePath: string,
  packageName: string,
  entityLookupMap: Map<string, Entity[]>,
  originalFilePath?: string,
): Relationship[] {
  const relationships: Relationship[] = [];
  const filePath =
    originalFilePath || relative(basePath, sourceFile.getFilePath());
  const fileId = makeFileId(packageName, filePath);

  // Build import map for this file
  const importMap = extractImportMap(sourceFile, basePath);

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

    // Resolve the called function to its definition
    const toId = resolveCallTarget(
      call,
      packageName,
      filePath,
      basePath,
      entityLookupMap,
      importMap,
    );

    // Skip unresolvable calls (e.g., method calls, property access)
    if (toId === null) {
      return;
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
 * Extract import map from a source file for call resolution.
 * Maps imported symbol names to their source file paths (best guess).
 *
 * @param sourceFile - ts-morph SourceFile to extract imports from
 * @param basePath - Base path for relative file resolution
 * @returns Map where key=imported symbol name, value=source file path
 */
export function extractImportMap(
  sourceFile: SourceFile,
  basePath: string,
): Map<string, string> {
  const importMap = new Map<string, string>();
  const currentFilePath = relative(basePath, sourceFile.getFilePath());

  sourceFile.getImportDeclarations().forEach((imp) => {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    const isRelative = moduleSpecifier.startsWith(".");

    if (!isRelative) {
      // Skip external imports (node_modules, etc.)
      return;
    }

    // Resolve the import target file path
    const resolvedPath = join(
      dirname(currentFilePath),
      moduleSpecifier,
    ).replace(/\\/g, "/");

    // Try with .ts extension (most common)
    const possiblePaths = [
      `${resolvedPath}.ts`,
      `${resolvedPath}/index.ts`,
      resolvedPath,
    ];

    // Use first possibility as best guess
    const targetPath = possiblePaths[0];

    // Named imports
    imp.getNamedImports().forEach((named) => {
      const importedName = named.getName();
      importMap.set(importedName, targetPath);
    });

    // Default imports
    const defaultImport = imp.getDefaultImport();
    if (defaultImport) {
      const importedName = defaultImport.getText();
      importMap.set(importedName, targetPath);
    }
  });

  return importMap;
}

/**
 * Build a lookup map of entities by name for fast call resolution.
 * Groups entities by their simple name (not full ID) to enable quick lookups.
 *
 * @param entities - Array of all entities
 * @returns Map where key=entity name, value=array of matching entities
 */
export function buildEntityLookupMap(
  entities: Entity[],
): Map<string, Entity[]> {
  const lookupMap = new Map<string, Entity[]>();

  for (const entity of entities) {
    // Skip file entities - we only care about code entities
    if (entity.type === "file") {
      continue;
    }

    const existing = lookupMap.get(entity.name) || [];
    existing.push(entity);
    lookupMap.set(entity.name, existing);
  }

  return lookupMap;
}

/**
 * Find the best matching entity from candidates based on context.
 * Prioritizes: same file > same package > exported > first match
 *
 * @param candidates - Array of potential entity matches
 * @param currentFile - Current file path for context
 * @param isImported - Whether this symbol was explicitly imported
 * @returns Best matching entity or null if no good match
 */
export function findBestMatch(
  candidates: Entity[],
  currentFile: string,
  isImported: boolean,
): Entity | null {
  if (candidates.length === 0) {
    return null;
  }

  // If only one candidate, use it
  if (candidates.length === 1) {
    return candidates[0];
  }

  // Scoring: same file (100) > same package (50) > exported (25) > first (0)
  let bestScore = -1;
  let bestMatch: Entity | null = null;

  for (const candidate of candidates) {
    let score = 0;

    // Prefer entities in the same file (unless explicitly imported)
    if (!isImported && candidate.filePath === currentFile) {
      score += 100;
    }

    // Prefer exported entities (more likely to be imported)
    if (candidate.exported) {
      score += 25;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch || candidates[0];
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
 * @param options - Optional incremental parsing options
 * @returns ParseResult with entities, relationships, and statistics
 *
 * @example
 * // Full parse
 * const result = parsePackage("packages/my-pkg");
 *
 * @example
 * // Incremental parse (only specific files)
 * const result = parsePackage("packages/my-pkg", "my-pkg", {
 *   files: ["src/foo.ts", "src/bar.ts"]
 * });
 */
export function parsePackage(
  packagePath: string,
  packageName?: string,
  options?: IncrementalParseOptions,
): ParseResult {
  // Derive package name once and pass explicitly (no global state)
  const pkgName = packageName || derivePackageName(packagePath);

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  // Use filtered file list if provided, otherwise find all TypeScript files
  const tsFiles = options?.files || findTsFiles(packagePath);
  const parseErrors: Array<{ file: string; error: string }> = [];
  let filesSkipped = 0;
  let vueFilesProcessed = 0;

  // Track Vue file mappings (virtual path -> original path)
  const vueFileMapping = new Map<string, string>();

  // Add all files to the project with error handling
  tsFiles.forEach((file) => {
    try {
      if (file.endsWith(".vue")) {
        const vueScript = extractVueScript(file);
        if (vueScript) {
          // Create virtual TypeScript file for ts-morph
          // Use absolute path so it matches sourceFile.getFilePath()
          const absoluteFile = resolve(file);
          const virtualPath = `${absoluteFile}.ts`;
          project.createSourceFile(virtualPath, vueScript.content);
          vueFileMapping.set(virtualPath, relative(packagePath, file));
          vueFilesProcessed++;
        }
      } else {
        project.addSourceFileAtPath(file);
      }
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
    const sourceFilePath = sourceFile.getFilePath();
    const originalVuePath = vueFileMapping.get(sourceFilePath);
    const entities = extractEntities(
      sourceFile,
      packagePath,
      pkgName,
      originalVuePath,
    );
    allEntities.push(...entities);
  });

  // Build entity lookup map for call resolution
  const entityLookupMap = buildEntityLookupMap(allEntities);

  // Second pass: extract relationships
  project.getSourceFiles().forEach((sourceFile) => {
    const sourceFilePath = sourceFile.getFilePath();
    const originalVuePath = vueFileMapping.get(sourceFilePath);
    const relationships = extractRelationships(
      sourceFile,
      packagePath,
      pkgName,
      entityLookupMap,
      originalVuePath,
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
    vueFilesProcessed,
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
