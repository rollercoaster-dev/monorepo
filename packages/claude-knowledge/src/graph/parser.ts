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
import { parse as parseVueSFC, compileTemplate } from "@vue/compiler-sfc";
import type {
  Entity,
  EntityMetadata,
  Relationship,
  ParseResult,
  ParseStats,
  MonorepoParseResult,
  ParseOptions,
} from "./types";

/**
 * Standard HTML5 element tags (module-scope for performance).
 * Used to distinguish custom Vue components from native HTML elements in templates.
 */
const HTML_TAGS = new Set([
  // Main root
  "html",
  // Document metadata
  "base",
  "head",
  "link",
  "meta",
  "style",
  "title",
  // Sectioning root
  "body",
  // Content sectioning
  "address",
  "article",
  "aside",
  "footer",
  "header",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hgroup",
  "main",
  "nav",
  "section",
  "search",
  // Text content
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "hr",
  "li",
  "menu",
  "ol",
  "p",
  "pre",
  "ul",
  // Inline text semantics
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "br",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "i",
  "kbd",
  "mark",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
  "wbr",
  // Image and multimedia
  "area",
  "audio",
  "img",
  "map",
  "track",
  "video",
  // Embedded content
  "embed",
  "iframe",
  "object",
  "param",
  "picture",
  "portal",
  "source",
  // SVG and MathML
  "svg",
  "math",
  // Scripting
  "canvas",
  "noscript",
  "script",
  // Demarcating edits
  "del",
  "ins",
  // Table content
  "caption",
  "col",
  "colgroup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  // Forms
  "button",
  "datalist",
  "fieldset",
  "form",
  "input",
  "label",
  "legend",
  "meter",
  "optgroup",
  "option",
  "output",
  "progress",
  "select",
  "textarea",
  // Interactive elements
  "details",
  "dialog",
  "summary",
  // Web Components
  "slot",
  "template",
  // Vue special elements
  "component",
  "transition",
  "transition-group",
  "keep-alive",
  "teleport",
  "suspense",
]);

/**
 * Convert kebab-case to PascalCase.
 * e.g., "my-component" -> "MyComponent"
 */
function kebabToPascalCase(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Check if a tag name is a custom Vue component (not a standard HTML tag).
 */
function isCustomComponent(tagName: string): boolean {
  // Check if it's an HTML tag (case-insensitive)
  if (HTML_TAGS.has(tagName.toLowerCase())) {
    return false;
  }

  // PascalCase components (e.g., MyComponent)
  if (/^[A-Z]/.test(tagName)) {
    return true;
  }

  // kebab-case components with a hyphen (e.g., my-component)
  if (tagName.includes("-")) {
    return true;
  }

  return false;
}

/**
 * Interface for template component calls extracted from Vue templates.
 */
interface TemplateComponentCall {
  /** Name of the component being used */
  componentName: string;
  /** Line number in the template */
  line: number;
  /** Column number in the template */
  column: number;
}

/**
 * Extract component usage from a Vue template AST.
 * Finds all custom component tags used in the template.
 *
 * @param templateContent - The template source code
 * @param filePath - Path to the Vue file (for error context)
 * @returns Array of component calls found in the template
 */
function extractTemplateComponentCalls(
  templateContent: string,
  filePath: string,
): TemplateComponentCall[] {
  const calls: TemplateComponentCall[] = [];

  try {
    // Compile template to get AST
    const compiled = compileTemplate({
      source: templateContent,
      filename: filePath,
      id: filePath,
    });

    // Walk the AST to find component usage
    // The compiled.ast contains the template AST
    if (compiled.ast && "children" in compiled.ast) {
      walkTemplateAst(compiled.ast, calls);
    }
  } catch (error) {
    logger.warn(`Failed to parse Vue template in ${filePath}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return calls;
}

/**
 * Recursively walk the template AST to find component usage.
 */
function walkTemplateAst(node: unknown, calls: TemplateComponentCall[]): void {
  if (!node || typeof node !== "object") return;

  const nodeObj = node as Record<string, unknown>;

  // Check if this is an element node
  if (nodeObj.type === 1 && typeof nodeObj.tag === "string") {
    const tagName = nodeObj.tag;

    if (isCustomComponent(tagName)) {
      // Get location info
      const loc = nodeObj.loc as
        | { start?: { line: number; column: number } }
        | undefined;
      const line = loc?.start?.line ?? 1;
      const column = loc?.start?.column ?? 1;

      // Normalize to PascalCase for lookup
      const componentName = tagName.includes("-")
        ? kebabToPascalCase(tagName)
        : tagName;

      calls.push({
        componentName,
        line,
        column,
      });
    }
  }

  // Recurse into children
  if (Array.isArray(nodeObj.children)) {
    for (const child of nodeObj.children) {
      walkTemplateAst(child, calls);
    }
  }
}

/**
 * Add metadata to an entity only if it has properties.
 * Avoids cluttering entities with empty metadata objects.
 */
function withMetadata<T extends object>(
  entity: T,
  metadata: EntityMetadata,
): T & { metadata?: EntityMetadata } {
  if (Object.keys(metadata).length > 0) {
    return { ...entity, metadata };
  }
  return entity;
}

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
 * Derive package name from a package root path.
 * e.g., "packages/rd-logger" -> "rd-logger"
 *
 * For container directories (packages/, apps/), returns the directory name
 * which signals that files should be grouped by their individual package paths.
 */
export function derivePackageName(packagePath: string): string {
  const parts = packagePath.replace(/\\/g, "/").split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1];

  // Look for "packages/X" or "apps/X" pattern
  const packagesIdx = parts.indexOf("packages");
  if (packagesIdx !== -1 && parts.length > packagesIdx + 1) {
    return parts[packagesIdx + 1];
  }
  const appsIdx = parts.indexOf("apps");
  if (appsIdx !== -1 && parts.length > appsIdx + 1) {
    return parts[appsIdx + 1];
  }

  // Fallback: use the directory name (for standalone repos or container dirs)
  return lastPart || "unknown";
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
 * Result of extracting content from a Vue SFC file.
 */
export interface VueExtractResult {
  /** TypeScript content from <script> or <script setup> */
  content: string;
  /** Whether the script uses <script setup> syntax */
  isSetupSyntax: boolean;
  /** Template content (if present) for component tracking */
  templateContent?: string;
}

/**
 * Extract TypeScript content from a Vue SFC file.
 * Supports both <script lang="ts"> and <script setup lang="ts"> syntax.
 * Also extracts template content for component usage tracking.
 *
 * @param filePath - Path to the Vue file
 * @returns Object with script content, syntax type, and template, or null if no TypeScript script found
 */
export function extractVueScript(filePath: string): VueExtractResult | null {
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

    // Get template content if present
    const templateContent = descriptor.template?.content;

    // Check <script setup> first (modern Vue 3 pattern)
    if (descriptor.scriptSetup && descriptor.scriptSetup.lang === "ts") {
      return {
        content: descriptor.scriptSetup.content,
        isSetupSyntax: true,
        templateContent,
      };
    }

    // Fall back to regular <script>
    if (descriptor.script && descriptor.script.lang === "ts") {
      return {
        content: descriptor.script.content,
        isSetupSyntax: false,
        templateContent,
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
 * Extract entities from a source file with rich metadata.
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

  // Functions with rich metadata
  sourceFile.getFunctions().forEach((fn) => {
    const name = fn.getName();
    if (name) {
      // Build rich metadata
      const metadata: EntityMetadata = {};

      if (fn.isAsync()) metadata.async = true;
      if (fn.isGenerator()) metadata.generator = true;

      const params = fn.getParameters();
      if (params.length > 0) {
        metadata.parameters = params.map((p) => p.getName());
      }

      const returnTypeNode = fn.getReturnTypeNode();
      if (returnTypeNode) {
        metadata.returnType = returnTypeNode.getText();
      }

      const typeParams = fn.getTypeParameters();
      if (typeParams.length > 0) {
        metadata.typeParameters = typeParams.map((tp) => tp.getName());
      }

      const baseEntity = {
        id: makeEntityId(packageName, filePath, name, "function"),
        type: "function" as const,
        name,
        filePath,
        lineNumber: fn.getStartLineNumber(),
        exported: fn.isExported(),
      };

      const entity: Entity = withMetadata(baseEntity, metadata);

      const jsDocContent = extractJsDocContent(fn);
      if (jsDocContent) {
        entity.jsDocContent = jsDocContent;
      }

      entities.push(entity);
    }
  });

  // Classes with rich metadata
  sourceFile.getClasses().forEach((cls) => {
    const name = cls.getName();
    if (name) {
      // Build class metadata
      const classMetadata: EntityMetadata = {};

      const typeParams = cls.getTypeParameters();
      if (typeParams.length > 0) {
        classMetadata.typeParameters = typeParams.map((tp) => tp.getName());
      }

      const baseClassEntity = {
        id: makeEntityId(packageName, filePath, name, "class"),
        type: "class" as const,
        name,
        filePath,
        lineNumber: cls.getStartLineNumber(),
        exported: cls.isExported(),
      };

      const classEntity: Entity = withMetadata(baseClassEntity, classMetadata);

      const classJsDocContent = extractJsDocContent(cls);
      if (classJsDocContent) {
        classEntity.jsDocContent = classJsDocContent;
      }

      entities.push(classEntity);

      // Class methods with rich metadata
      cls.getMethods().forEach((method) => {
        const methodName = method.getName();

        // Build method metadata
        const methodMetadata: EntityMetadata = {};

        if (method.isAsync()) methodMetadata.async = true;
        if (method.isStatic()) methodMetadata.static = true;

        const params = method.getParameters();
        if (params.length > 0) {
          methodMetadata.parameters = params.map((p) => p.getName());
        }

        const returnTypeNode = method.getReturnTypeNode();
        if (returnTypeNode) {
          methodMetadata.returnType = returnTypeNode.getText();
        }

        const typeParams = method.getTypeParameters();
        if (typeParams.length > 0) {
          methodMetadata.typeParameters = typeParams.map((tp) => tp.getName());
        }

        const baseMethodEntity = {
          id: makeEntityId(
            packageName,
            filePath,
            `${name}.${methodName}`,
            "function",
          ),
          type: "function" as const,
          name: `${name}.${methodName}`,
          filePath,
          lineNumber: method.getStartLineNumber(),
          exported: cls.isExported(),
        };

        const methodEntity: Entity = withMetadata(
          baseMethodEntity,
          methodMetadata,
        );

        const methodJsDocContent = extractJsDocContent(method);
        if (methodJsDocContent) {
          methodEntity.jsDocContent = methodJsDocContent;
        }

        entities.push(methodEntity);
      });
    }
  });

  // Type aliases with type parameters
  sourceFile.getTypeAliases().forEach((typeAlias) => {
    const name = typeAlias.getName();

    // Build metadata
    const metadata: EntityMetadata = {};
    const typeParams = typeAlias.getTypeParameters();
    if (typeParams.length > 0) {
      metadata.typeParameters = typeParams.map((tp) => tp.getName());
    }

    const baseEntity = {
      id: makeEntityId(packageName, filePath, name, "type"),
      type: "type" as const,
      name,
      filePath,
      lineNumber: typeAlias.getStartLineNumber(),
      exported: typeAlias.isExported(),
    };

    const entity: Entity = withMetadata(baseEntity, metadata);

    const jsDocContent = extractJsDocContent(typeAlias);
    if (jsDocContent) {
      entity.jsDocContent = jsDocContent;
    }

    entities.push(entity);
  });

  // Interfaces with type parameters
  sourceFile.getInterfaces().forEach((iface) => {
    const name = iface.getName();

    // Build metadata
    const metadata: EntityMetadata = {};
    const typeParams = iface.getTypeParameters();
    if (typeParams.length > 0) {
      metadata.typeParameters = typeParams.map((tp) => tp.getName());
    }

    const baseEntity = {
      id: makeEntityId(packageName, filePath, name, "interface"),
      type: "interface" as const,
      name,
      filePath,
      lineNumber: iface.getStartLineNumber(),
      exported: iface.isExported(),
    };

    const entity: Entity = withMetadata(baseEntity, metadata);

    const jsDocContent = extractJsDocContent(iface);
    if (jsDocContent) {
      entity.jsDocContent = jsDocContent;
    }

    entities.push(entity);
  });

  // Enums with members
  sourceFile.getEnums().forEach((enumDecl) => {
    const name = enumDecl.getName();

    // Build enum metadata
    const metadata: EntityMetadata = {};

    if (enumDecl.isConstEnum()) {
      metadata.const = true;
    }

    // Extract enum members
    const members = enumDecl.getMembers();
    if (members.length > 0) {
      metadata.members = members.map((member) => {
        const memberName = member.getName();
        const value = member.getValue();
        return {
          name: memberName,
          ...(value !== undefined && { value: String(value) }),
        };
      });
    }

    const baseEntity = {
      id: makeEntityId(packageName, filePath, name, "enum"),
      type: "enum" as const,
      name,
      filePath,
      lineNumber: enumDecl.getStartLineNumber(),
      exported: enumDecl.isExported(),
    };

    const entity: Entity = withMetadata(baseEntity, metadata);

    const jsDocContent = extractJsDocContent(enumDecl);
    if (jsDocContent) {
      entity.jsDocContent = jsDocContent;
    }

    entities.push(entity);
  });

  // Variable declarations with metadata
  sourceFile.getVariableDeclarations().forEach((decl) => {
    const name = decl.getName();
    const initializer = decl.getInitializer();
    const isArrowFn = initializer?.getKind() === SyntaxKind.ArrowFunction;

    // Build metadata
    const metadata: EntityMetadata = {};

    // Get variable kind (const, let, var)
    const varStatement = decl.getVariableStatement();
    if (varStatement) {
      const declarationKind = varStatement.getDeclarationKind();
      if (declarationKind) {
        metadata.kind = declarationKind.toLowerCase() as
          | "const"
          | "let"
          | "var";
      }
    }

    if (isArrowFn) {
      metadata.arrowFunction = true;

      // Extract arrow function metadata
      const arrowFn = initializer;
      if (arrowFn && arrowFn.isKind(SyntaxKind.ArrowFunction)) {
        if (arrowFn.isAsync()) metadata.async = true;

        const params = arrowFn.getParameters();
        if (params.length > 0) {
          metadata.parameters = params.map((p) => p.getName());
        }

        const returnTypeNode = arrowFn.getReturnTypeNode();
        if (returnTypeNode) {
          metadata.returnType = returnTypeNode.getText();
        }

        const typeParams = arrowFn.getTypeParameters();
        if (typeParams.length > 0) {
          metadata.typeParameters = typeParams.map((tp) => tp.getName());
        }
      }
    }

    const entityType = isArrowFn ? "function" : "variable";
    const baseEntity = {
      id: makeEntityId(packageName, filePath, name, entityType),
      type: entityType as "function" | "variable",
      name,
      filePath,
      lineNumber: decl.getStartLineNumber(),
      exported: decl.isExported(),
    };

    entities.push(withMetadata(baseEntity, metadata));
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
 * Extract template component relationships from Vue template content.
 * Resolves component usage to entity relationships using import map and entity lookup.
 *
 * @param templateContent - Vue template source
 * @param filePath - Relative file path for the Vue component
 * @param packageName - Package name for ID generation
 * @param sourceFile - ts-morph source file for import extraction
 * @param basePath - Base path for import resolution
 * @param entityLookupMap - Entity lookup map for resolution
 * @returns Array of template component call relationships
 */
function extractTemplateRelationships(
  templateContent: string,
  filePath: string,
  packageName: string,
  sourceFile: SourceFile,
  basePath: string,
  entityLookupMap: Map<string, Entity[]>,
): Relationship[] {
  const relationships: Relationship[] = [];
  const templateCalls = extractTemplateComponentCalls(
    templateContent,
    filePath,
  );

  if (templateCalls.length === 0) {
    return relationships;
  }

  const importMap = extractImportMap(sourceFile, basePath);
  const fileId = makeFileId(packageName, filePath);

  for (const call of templateCalls) {
    const candidates = entityLookupMap.get(call.componentName);
    if (!candidates || candidates.length === 0) {
      continue;
    }

    // Try import map first, then fall back to best match
    const importedFromPath = importMap.get(call.componentName);
    let targetId: string | null = null;

    if (importedFromPath) {
      // Normalize paths for comparison - extractImportMap() may return .ts paths
      // while the actual file is .vue, so check multiple variants
      const normalizedPaths = [
        importedFromPath,
        importedFromPath.replace(/\.ts$/, ".vue"),
        importedFromPath.replace(/\.ts$/, ""),
      ];
      const match = candidates.find((e) =>
        normalizedPaths.some(
          (p) => e.filePath === p || e.filePath.replace(/\.vue$/, "") === p,
        ),
      );
      if (match) {
        targetId = match.id;
      }
    }

    if (!targetId) {
      const bestMatch = findBestMatch(candidates, filePath, !!importedFromPath);
      if (bestMatch) {
        targetId = bestMatch.id;
      }
    }

    if (targetId) {
      relationships.push({
        from: fileId,
        to: targetId,
        type: "calls",
        metadata: JSON.stringify({
          usage: "template-component",
          line: call.line,
          column: call.column,
        }),
      });
    }
  }

  return relationships;
}

/**
 * Parse a TypeScript package and extract entities and relationships.
 *
 * @param packagePath - Path to the package source directory
 * @param packageName - Optional package name (derived from path if not provided)
 * @param options - Optional parsing options (files filter, progress callback)
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
 *
 * @example
 * // Parse with progress callback
 * const result = parsePackage("packages/my-pkg", "my-pkg", {
 *   onProgress: (phase, current, total, message) => {
 *     console.log(`[${phase}] ${current}/${total}: ${message}`);
 *   }
 * });
 */
export function parsePackage(
  packagePath: string,
  packageName?: string,
  options?: ParseOptions,
): ParseResult {
  // Derive package name once and pass explicitly (no global state)
  const pkgName = packageName || derivePackageName(packagePath);
  const onProgress = options?.onProgress;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  // Phase 1: Scan - Find all source files
  onProgress?.("scan", 0, 0, "Scanning for source files...");

  // Use filtered file list if provided, otherwise find all TypeScript files
  const tsFiles = options?.files || findTsFiles(packagePath);
  onProgress?.(
    "scan",
    tsFiles.length,
    tsFiles.length,
    `Found ${tsFiles.length} files`,
  );
  const parseErrors: Array<{ file: string; error: string }> = [];
  let filesSkipped = 0;
  let vueFilesProcessed = 0;

  // Track Vue file mappings (virtual path -> { original path, template content })
  const vueFileMapping = new Map<
    string,
    { originalPath: string; templateContent?: string }
  >();

  // Phase 2: Load - Add all files to the project
  tsFiles.forEach((file, index) => {
    onProgress?.(
      "load",
      index + 1,
      tsFiles.length,
      `Loading ${relative(packagePath, file)}`,
    );

    try {
      if (file.endsWith(".vue")) {
        const vueScript = extractVueScript(file);
        if (vueScript) {
          // Create virtual TypeScript file for ts-morph
          // Use absolute path so it matches sourceFile.getFilePath()
          const absoluteFile = resolve(file);
          const virtualPath = `${absoluteFile}.ts`;
          project.createSourceFile(virtualPath, vueScript.content);
          vueFileMapping.set(virtualPath, {
            originalPath: relative(packagePath, file),
            templateContent: vueScript.templateContent,
          });
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
      ...(parseErrors.length > 5 && {
        note: `${parseErrors.length - 5} more errors - use debug level to see all`,
      }),
    });
    // Log all errors at debug level for troubleshooting
    if (parseErrors.length > 5) {
      logger.debug("All parse errors", { errors: parseErrors });
    }
  }

  const allEntities: Entity[] = [];
  const allRelationships: Relationship[] = [];

  // Phase 3: Entities - Extract all entities
  const sourceFiles = project.getSourceFiles();
  sourceFiles.forEach((sourceFile, index) => {
    const sourceFilePath = sourceFile.getFilePath();
    const vueInfo = vueFileMapping.get(sourceFilePath);
    const displayPath =
      vueInfo?.originalPath || relative(packagePath, sourceFilePath);

    onProgress?.(
      "entities",
      index + 1,
      sourceFiles.length,
      `Extracting entities from ${displayPath}`,
    );

    const entities = extractEntities(
      sourceFile,
      packagePath,
      pkgName,
      vueInfo?.originalPath,
    );
    allEntities.push(...entities);
  });

  // Build entity lookup map for call resolution
  const entityLookupMap = buildEntityLookupMap(allEntities);

  // Phase 4: Relationships - Extract all relationships
  sourceFiles.forEach((sourceFile, index) => {
    const sourceFilePath = sourceFile.getFilePath();
    const vueInfo = vueFileMapping.get(sourceFilePath);
    const displayPath =
      vueInfo?.originalPath || relative(packagePath, sourceFilePath);

    onProgress?.(
      "relationships",
      index + 1,
      sourceFiles.length,
      `Extracting relationships from ${displayPath}`,
    );

    const relationships = extractRelationships(
      sourceFile,
      packagePath,
      pkgName,
      entityLookupMap,
      vueInfo?.originalPath,
    );
    allRelationships.push(...relationships);

    // Third pass (Vue only): extract template component calls
    if (vueInfo?.templateContent) {
      const templateRelationships = extractTemplateRelationships(
        vueInfo.templateContent,
        vueInfo.originalPath,
        pkgName,
        sourceFile,
        packagePath,
        entityLookupMap,
      );
      allRelationships.push(...templateRelationships);
    }
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

/**
 * Check if an error is a "file not found" error (ENOENT).
 */
function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}

/**
 * Discover all package directories in a monorepo.
 * Looks for directories in packages/ and apps/ that contain a package.json.
 *
 * @param rootPath - Path to the monorepo root
 * @returns Array of { name, path } for each discovered package
 */
export function discoverPackages(
  rootPath: string,
): Array<{ name: string; path: string }> {
  const packages: Array<{ name: string; path: string }> = [];

  for (const container of ["packages", "apps"]) {
    const containerPath = join(rootPath, container);
    try {
      const entries = readdirSync(containerPath);
      for (const entry of entries) {
        const pkgPath = join(containerPath, entry);
        try {
          const stat = statSync(pkgPath);
          if (stat.isDirectory()) {
            // Verify it's a package by checking for package.json
            try {
              const pkgJsonPath = join(pkgPath, "package.json");
              const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
              // Use actual package name from package.json, fall back to directory name
              packages.push({ name: pkgJson.name || entry, path: pkgPath });
            } catch (error) {
              // Only silently skip ENOENT (no package.json)
              if (!isNotFoundError(error)) {
                logger.warn(`Cannot read package.json for ${entry}`, {
                  path: pkgPath,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          }
        } catch (error) {
          // Only silently skip ENOENT
          if (!isNotFoundError(error)) {
            logger.warn(`Cannot stat directory entry ${entry}`, {
              path: pkgPath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    } catch (error) {
      // Only silently skip ENOENT (container doesn't exist)
      if (!isNotFoundError(error)) {
        logger.warn(`Cannot read ${container} directory`, {
          path: containerPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return packages;
}

/**
 * Parse an entire monorepo, extracting entities and relationships across all packages.
 * Uses a single ts-morph Project to enable cross-package relationship resolution.
 *
 * @param rootPath - Path to the monorepo root (directory containing packages/ and/or apps/)
 * @returns MonorepoParseResult with entities grouped by package
 *
 * @example
 * const result = parseMonorepo("/path/to/monorepo");
 * for (const [pkgName, pkgResult] of result.packages) {
 *   storeGraph(pkgResult, pkgName);
 * }
 */
export function parseMonorepo(rootPath: string): MonorepoParseResult {
  const packages = discoverPackages(rootPath);

  if (packages.length === 0) {
    throw new Error(
      `No packages found in ${rootPath}. ` +
        `Expected packages/ and/or apps/ directories containing package.json files.`,
    );
  }

  logger.info(`Discovered ${packages.length} packages`, {
    packages: packages.map((p) => p.name),
  });

  // Create a single ts-morph Project for cross-package resolution
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  // Collect all files across all packages
  const allFiles: Array<{ file: string; pkgName: string; pkgPath: string }> =
    [];
  const vueFileMapping = new Map<
    string,
    { original: string; pkgName: string; templateContent?: string }
  >();
  const parseErrors: Array<{ file: string; error: string; pkgName: string }> =
    [];

  for (const pkg of packages) {
    const tsFiles = findTsFiles(pkg.path);

    for (const file of tsFiles) {
      try {
        if (file.endsWith(".vue")) {
          const vueScript = extractVueScript(file);
          if (vueScript) {
            const absoluteFile = resolve(file);
            const virtualPath = `${absoluteFile}.ts`;
            project.createSourceFile(virtualPath, vueScript.content);
            vueFileMapping.set(virtualPath, {
              original: relative(pkg.path, file),
              pkgName: pkg.name,
              templateContent: vueScript.templateContent,
            });
          }
        } else {
          project.addSourceFileAtPath(file);
        }
        allFiles.push({ file, pkgName: pkg.name, pkgPath: pkg.path });
      } catch (error) {
        parseErrors.push({
          file,
          pkgName: pkg.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (parseErrors.length > 0) {
    logger.warn(`${parseErrors.length} file(s) failed to load`, {
      errors: parseErrors.slice(0, 5),
      ...(parseErrors.length > 5 && {
        note: `${parseErrors.length - 5} more errors - use debug level to see all`,
      }),
    });
    // Log all errors at debug level for troubleshooting
    if (parseErrors.length > 5) {
      logger.debug("All parse errors", { errors: parseErrors });
    }
  }

  // Build a map of absolute path -> package info for lookup
  const filePackageMap = new Map<
    string,
    { pkgName: string; pkgPath: string }
  >();
  for (const { file, pkgName, pkgPath } of allFiles) {
    filePackageMap.set(resolve(file), { pkgName, pkgPath });
  }

  // First pass: extract all entities, grouped by package
  const entitiesByPackage = new Map<string, Entity[]>();
  const allEntities: Entity[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    const sourceFilePath = sourceFile.getFilePath();
    const vueInfo = vueFileMapping.get(sourceFilePath);

    let pkgName: string;
    let pkgPath: string;
    let relativeFilePath: string;

    if (vueInfo) {
      // Vue file - use stored mapping
      pkgName = vueInfo.pkgName;
      const pkg = packages.find((p) => p.name === pkgName);
      pkgPath = pkg?.path || rootPath;
      relativeFilePath = vueInfo.original;
    } else {
      // Regular TS file - look up by absolute path
      const fileInfo = filePackageMap.get(sourceFilePath);
      if (!fileInfo) {
        // File not in any package (shouldn't happen)
        continue;
      }
      pkgName = fileInfo.pkgName;
      pkgPath = fileInfo.pkgPath;
      relativeFilePath = relative(pkgPath, sourceFilePath);
    }

    const entities = extractEntities(
      sourceFile,
      pkgPath,
      pkgName,
      vueInfo ? relativeFilePath : undefined,
    );

    // Group by package
    const existing = entitiesByPackage.get(pkgName) || [];
    existing.push(...entities);
    entitiesByPackage.set(pkgName, existing);
    allEntities.push(...entities);
  }

  // Build lookup map from ALL entities for cross-package resolution
  const entityLookupMap = buildEntityLookupMap(allEntities);

  // Second pass: extract relationships with cross-package awareness
  const relationshipsByPackage = new Map<string, Relationship[]>();

  for (const sourceFile of project.getSourceFiles()) {
    const sourceFilePath = sourceFile.getFilePath();
    const vueInfo = vueFileMapping.get(sourceFilePath);

    let pkgName: string;
    let pkgPath: string;
    let relativeFilePath: string | undefined;

    if (vueInfo) {
      pkgName = vueInfo.pkgName;
      const pkg = packages.find((p) => p.name === pkgName);
      pkgPath = pkg?.path || rootPath;
      relativeFilePath = vueInfo.original;
    } else {
      const fileInfo = filePackageMap.get(sourceFilePath);
      if (!fileInfo) continue;
      pkgName = fileInfo.pkgName;
      pkgPath = fileInfo.pkgPath;
    }

    const relationships = extractRelationships(
      sourceFile,
      pkgPath,
      pkgName,
      entityLookupMap,
      relativeFilePath,
    );

    // Group by package (source package)
    const existing = relationshipsByPackage.get(pkgName) || [];
    existing.push(...relationships);

    // Third pass (Vue only): extract template component calls
    if (vueInfo?.templateContent && relativeFilePath) {
      const templateRelationships = extractTemplateRelationships(
        vueInfo.templateContent,
        relativeFilePath,
        pkgName,
        sourceFile,
        pkgPath,
        entityLookupMap,
      );
      existing.push(...templateRelationships);
    }

    relationshipsByPackage.set(pkgName, existing);
  }

  // Build per-package results
  const results = new Map<string, ParseResult>();
  let totalEntities = 0;
  let totalRelationships = 0;

  for (const pkg of packages) {
    const entities = entitiesByPackage.get(pkg.name) || [];
    const relationships = relationshipsByPackage.get(pkg.name) || [];

    const entitiesByType: Record<string, number> = {};
    entities.forEach((e) => {
      entitiesByType[e.type] = (entitiesByType[e.type] || 0) + 1;
    });

    const relationshipsByType: Record<string, number> = {};
    relationships.forEach((r) => {
      relationshipsByType[r.type] = (relationshipsByType[r.type] || 0) + 1;
    });

    // Count files that failed to parse for this package
    const filesSkipped = parseErrors.filter(
      (e) => e.pkgName === pkg.name,
    ).length;

    results.set(pkg.name, {
      package: pkg.name,
      entities,
      relationships,
      stats: {
        filesScanned:
          allFiles.filter((f) => f.pkgName === pkg.name).length + filesSkipped,
        filesSkipped,
        vueFilesProcessed: [...vueFileMapping.values()].filter(
          (v) => v.pkgName === pkg.name,
        ).length,
        entitiesByType,
        relationshipsByType,
      },
    });

    totalEntities += entities.length;
    totalRelationships += relationships.length;
  }

  return {
    packages: results,
    stats: {
      totalFiles: allFiles.length,
      totalEntities,
      totalRelationships,
      packagesFound: packages.map((p) => p.name),
    },
  };
}
