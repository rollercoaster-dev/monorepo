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
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { indexMonorepoDocs } from "../src/docs";

const monorepoRoot = resolve(import.meta.dir, "../../..");

/**
 * Main bootstrap function.
 */
async function bootstrap(): Promise<number> {
  logger.info("Starting documentation bootstrap...");

  const stats = await indexMonorepoDocs(monorepoRoot, {
    includePackageDocs: true,
    callbacks: {
      onPhase: (msg) => logger.info(`\n${msg}`),
      onIndexed: (label, sections) =>
        logger.info(`Indexed: ${label} (${sections} sections)`),
      onSkipped: (label) => logger.info(`Skipped (unchanged): ${label}`),
      onFailed: (label, error) => logger.error(`Failed: ${label}`, { error }),
    },
  });

  // Summary
  logger.info("\n========================================");
  logger.info("Documentation Bootstrap Complete");
  logger.info("========================================");
  logger.info(`Total files indexed: ${stats.indexed}`);
  logger.info(`Total sections created: ${stats.sections}`);
  logger.info(`Total failures: ${stats.failed}`);

  return stats.failed > 0 ? 1 : 0;
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
