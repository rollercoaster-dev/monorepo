#!/usr/bin/env bun
/**
 * Test script to verify ts-morph works with TypeScript parsing.
 * Part of Issue #431 Experiment 3: Code Graph Prototype.
 */

import { Project, SyntaxKind } from "ts-morph";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

async function main() {
  // Create a ts-morph project (in-memory for testing)
  const project = new Project({
    useInMemoryFileSystem: true,
  });

  // Test code
  const code = `
function hello(name: string): void {
  console.log("Hello", name);
}

export class Logger {
  private level: string;

  constructor(level: string) {
    this.level = level;
  }

  log(message: string): void {
    console.log(\`[\${this.level}] \${message}\`);
  }
}

export const createLogger = (level: string): Logger => {
  return new Logger(level);
};

import { readFileSync } from "fs";
`;

  // Create a source file
  const sourceFile = project.createSourceFile("test.ts", code);

  logger.info("=== ts-morph Test ===");
  logger.info(`File path: ${sourceFile.getFilePath()}`);
  logger.info(`Statements: ${sourceFile.getStatements().length}`);

  logger.info("--- Top-level statements ---");
  sourceFile.getStatements().forEach((stmt, i) => {
    logger.info(
      `${i}: ${SyntaxKind[stmt.getKind()]} at line ${stmt.getStartLineNumber()}`,
    );
  });

  logger.info("--- Functions found ---");
  sourceFile.getFunctions().forEach((fn) => {
    logger.info(
      `- ${fn.getName() || "anonymous"} at line ${fn.getStartLineNumber()}`,
    );
    logger.info(
      `  Parameters: ${fn
        .getParameters()
        .map((p) => p.getName())
        .join(", ")}`,
    );
    logger.info(`  Return type: ${fn.getReturnType().getText()}`);
    logger.info(`  Exported: ${fn.isExported()}`);
  });

  logger.info("--- Classes found ---");
  sourceFile.getClasses().forEach((cls) => {
    logger.info(
      `- ${cls.getName() || "anonymous"} at line ${cls.getStartLineNumber()}`,
    );
    logger.info(`  Exported: ${cls.isExported()}`);

    cls.getMethods().forEach((method) => {
      logger.info(`  - method: ${method.getName()}`);
    });

    cls.getProperties().forEach((prop) => {
      logger.info(`  - property: ${prop.getName()} (${prop.getScope()})`);
    });
  });

  logger.info("--- Variable declarations ---");
  sourceFile.getVariableDeclarations().forEach((decl) => {
    const initializer = decl.getInitializer();
    const isArrowFn = initializer?.getKind() === SyntaxKind.ArrowFunction;
    logger.info(`- ${decl.getName()} at line ${decl.getStartLineNumber()}`);
    logger.info(`  Is arrow function: ${isArrowFn}`);
    logger.info(`  Exported: ${decl.isExported()}`);
  });

  logger.info("--- Imports found ---");
  sourceFile.getImportDeclarations().forEach((imp) => {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    const namedImports = imp.getNamedImports().map((n) => n.getName());
    logger.info(
      `- from "${moduleSpecifier}" at line ${imp.getStartLineNumber()}`,
    );
    logger.info(`  Named imports: ${namedImports.join(", ") || "none"}`);
  });

  logger.info("--- Call expressions (function calls) ---");
  const callExpressions = sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression,
  );
  callExpressions.forEach((call) => {
    const expression = call.getExpression();
    logger.info(
      `- ${expression.getText()} at line ${call.getStartLineNumber()}`,
    );
  });

  logger.info("✅ ts-morph is working!");
}

main().catch((err) => logger.error(String(err)));
