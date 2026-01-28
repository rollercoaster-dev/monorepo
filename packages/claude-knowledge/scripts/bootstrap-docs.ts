#!/usr/bin/env bun
/**
 * Documentation Bootstrap Script
 *
 * Indexes the monorepo's documentation into claude-knowledge system.
 * Uses priority-ordered indexing with incremental updates.
 *
 * Usage:
 *   bun packages/claude-knowledge/scripts/bootstrap-docs.ts
 */

import { resolve } from "path";
import { Glob } from "bun";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { indexDocument, indexDirectory } from "../src/docs";

const monorepoRoot = resolve(import.meta.dir, "../../..");

// Skip patterns (pre-compiled for efficiency)
const SKIP_GLOBS = [
  new Glob("**/node_modules/**"),
  new Glob("**/.bun-cache/**"),
  new Glob(".changeset/README.md"),
  new Glob(".claude/dev-plans/**"),
];

/**
 * Check if a path matches any skip pattern.
 */
function shouldSkip(path: string): boolean {
  for (const glob of SKIP_GLOBS) {
    if (glob.match(path)) {
      return true;
    }
  }
  return false;
}

/**
 * Index a single document with error handling.
 * Returns indexed: true only when file was actually re-indexed (not skipped).
 */
async function indexSingleDoc(
  filePath: string,
  label: string,
): Promise<{ success: boolean; indexed: boolean; sections: number }> {
  try {
    const result = await indexDocument(filePath);
    if (result.status === "unchanged") {
      logger.info(`Skipped (unchanged): ${label}`);
      return { success: true, indexed: false, sections: 0 };
    }
    logger.info(`Indexed: ${label} (${result.sectionsIndexed} sections)`);
    return { success: true, indexed: true, sections: result.sectionsIndexed };
  } catch (error) {
    logger.error(`Failed: ${label}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, indexed: false, sections: 0 };
  }
}

/**
 * Main bootstrap function.
 */
async function bootstrap(): Promise<number> {
  logger.info("Starting documentation bootstrap...");

  let totalFiles = 0;
  let totalSections = 0;
  let totalFailed = 0;

  // Priority 1: Root context files
  logger.info("\n[Priority 1] Indexing root context files...");

  const claudeMd = resolve(monorepoRoot, "CLAUDE.md");
  const readmeMd = resolve(monorepoRoot, "README.md");

  const claudeResult = await indexSingleDoc(claudeMd, "CLAUDE.md");
  if (claudeResult.indexed) {
    totalFiles++;
    totalSections += claudeResult.sections;
  } else if (!claudeResult.success) {
    totalFailed++;
  }

  const readmeResult = await indexSingleDoc(readmeMd, "README.md");
  if (readmeResult.indexed) {
    totalFiles++;
    totalSections += readmeResult.sections;
  } else if (!readmeResult.success) {
    totalFailed++;
  }

  // Priority 2: Monorepo docs directory
  logger.info("\n[Priority 2] Indexing monorepo docs/...");
  const docsDir = resolve(monorepoRoot, "docs");
  const docsResult = await indexDirectory(docsDir);
  totalFiles += docsResult.filesIndexed;
  totalSections += docsResult.totalSections;
  totalFailed += docsResult.filesFailed;
  logger.info(
    `Monorepo docs: ${docsResult.filesIndexed} indexed, ${docsResult.filesSkipped} skipped, ${docsResult.filesFailed} failed`,
  );

  // Priority 3: Package and app CLAUDE.md files
  logger.info("\n[Priority 3] Indexing package and app CLAUDE.md files...");
  for (const prefix of ["packages", "apps"]) {
    const claudeGlob = new Glob(`${prefix}/*/CLAUDE.md`);
    for await (const file of claudeGlob.scan({
      cwd: monorepoRoot,
      absolute: true,
    })) {
      if (shouldSkip(file)) continue;
      const name = file.split(`/${prefix}/`)[1]?.split("/")[0] || "?";
      const result = await indexSingleDoc(file, `${prefix}/${name}/CLAUDE.md`);
      if (result.indexed) {
        totalFiles++;
        totalSections += result.sections;
      } else if (!result.success) {
        totalFailed++;
      }
    }
  }

  // Priority 4: Package docs directories
  logger.info("\n[Priority 4] Indexing package docs/...");
  const packageDocsGlob = new Glob("packages/*/docs");
  const packageDocsDirs: string[] = [];
  for await (const dir of packageDocsGlob.scan({
    cwd: monorepoRoot,
    absolute: true,
  })) {
    if (!shouldSkip(dir)) {
      packageDocsDirs.push(dir);
    }
  }

  for (const dirPath of packageDocsDirs) {
    const packageName = dirPath.split("/packages/")[1]?.split("/")[0] || "?";
    logger.info(`Indexing packages/${packageName}/docs/...`);
    const result = await indexDirectory(dirPath);
    totalFiles += result.filesIndexed;
    totalSections += result.totalSections;
    totalFailed += result.filesFailed;
    logger.info(
      `  ${result.filesIndexed} indexed, ${result.filesSkipped} skipped, ${result.filesFailed} failed`,
    );
  }

  // Summary
  logger.info("\n========================================");
  logger.info("Documentation Bootstrap Complete");
  logger.info("========================================");
  logger.info(`Total files indexed: ${totalFiles}`);
  logger.info(`Total sections created: ${totalSections}`);
  logger.info(`Total failures: ${totalFailed}`);

  return totalFailed > 0 ? 1 : 0;
}

// Run bootstrap
bootstrap()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    logger.error("Bootstrap failed with uncaught error", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
