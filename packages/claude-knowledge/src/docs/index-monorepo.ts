/**
 * Monorepo documentation indexing.
 *
 * Shared logic for indexing project documentation with priority ordering.
 * Used by both session-start (incremental) and bootstrap-docs (verbose).
 */

import { resolve } from "path";
import { Glob } from "bun";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import { indexDocument, indexDirectory } from "./store";

/** Glob patterns for files/directories to skip during doc indexing. */
export const DOC_SKIP_PATTERNS = [
  "**/node_modules/**",
  "**/.bun-cache/**",
  ".changeset/README.md",
  ".claude/dev-plans/**",
];

const SKIP_GLOBS = DOC_SKIP_PATTERNS.map((p) => new Glob(p));

/** Check if a path matches any doc skip pattern. */
export function shouldSkipDoc(path: string): boolean {
  return SKIP_GLOBS.some((glob) => glob.match(path));
}

/** Stats returned from monorepo doc indexing. */
export interface DocIndexStats {
  indexed: number;
  skipped: number;
  failed: number;
  sections: number;
  failures: Array<{ path: string; error: string }>;
}

/** Callback for per-file indexing events. */
export interface DocIndexCallbacks {
  onIndexed?: (label: string, sections: number) => void;
  onSkipped?: (label: string) => void;
  onFailed?: (label: string, error: string) => void;
  onPhase?: (phase: string) => void;
}

/**
 * Index all monorepo documentation with priority ordering.
 *
 * Priority 1: Root context files (CLAUDE.md, README.md)
 * Priority 2: docs/ directory
 * Priority 3: Package and app CLAUDE.md files
 * Priority 4: Package docs/ directories (optional)
 *
 * Uses content-hash caching so unchanged files are skipped instantly.
 */
export async function indexMonorepoDocs(
  monorepoRoot: string,
  options?: {
    // Include package docs directories (default: false)
    includePackageDocs?: boolean;
    // Callbacks for verbose logging
    callbacks?: DocIndexCallbacks;
  },
): Promise<DocIndexStats> {
  const stats: DocIndexStats = {
    indexed: 0,
    skipped: 0,
    failed: 0,
    sections: 0,
    failures: [],
  };
  const cb = options?.callbacks;

  // Priority 1: Root context files
  cb?.onPhase?.("[Priority 1] Indexing root context files...");
  for (const name of ["CLAUDE.md", "README.md"]) {
    await indexSingleFile(resolve(monorepoRoot, name), name, stats, cb);
  }

  // Priority 2: docs/ directory
  cb?.onPhase?.("[Priority 2] Indexing monorepo docs/...");
  try {
    const docsDir = resolve(monorepoRoot, "docs");
    const result = await indexDirectory(docsDir);
    stats.indexed += result.filesIndexed;
    stats.skipped += result.filesSkipped;
    stats.failed += result.filesFailed;
    stats.sections += result.totalSections;
    stats.failures.push(...result.failures);
    cb?.onPhase?.(
      `Monorepo docs: ${result.filesIndexed} indexed, ${result.filesSkipped} skipped, ${result.filesFailed} failed`,
    );
  } catch (error) {
    logger.debug("Could not index docs/ directory", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Priority 3: Package and app CLAUDE.md files
  cb?.onPhase?.("[Priority 3] Indexing package and app CLAUDE.md files...");
  for (const prefix of ["packages", "apps"]) {
    const claudeGlob = new Glob(`${prefix}/*/CLAUDE.md`);
    for await (const file of claudeGlob.scan({
      cwd: monorepoRoot,
      absolute: true,
    })) {
      if (shouldSkipDoc(file)) continue;
      const name = file.split(`/${prefix}/`)[1]?.split("/")[0] || "?";
      await indexSingleFile(file, `${prefix}/${name}/CLAUDE.md`, stats, cb);
    }
  }

  // Priority 4: Package docs/ directories (optional, used by bootstrap)
  if (options?.includePackageDocs) {
    cb?.onPhase?.("[Priority 4] Indexing package docs/...");
    const packageDocsGlob = new Glob("packages/*/docs");
    for await (const dir of packageDocsGlob.scan({
      cwd: monorepoRoot,
      absolute: true,
    })) {
      if (shouldSkipDoc(dir)) continue;
      const pkgName = dir.split("/packages/")[1]?.split("/")[0] || "?";
      cb?.onPhase?.(`Indexing packages/${pkgName}/docs/...`);
      try {
        const result = await indexDirectory(dir);
        stats.indexed += result.filesIndexed;
        stats.skipped += result.filesSkipped;
        stats.failed += result.filesFailed;
        stats.sections += result.totalSections;
        stats.failures.push(...result.failures);
        cb?.onPhase?.(
          `  ${result.filesIndexed} indexed, ${result.filesSkipped} skipped, ${result.filesFailed} failed`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.debug("Could not index package docs directory", {
          dir,
          error: msg,
        });
        stats.failed++;
        stats.failures.push({ path: dir, error: msg });
      }
    }
  }

  return stats;
}

/**
 * Index a single file, updating stats and invoking callbacks.
 */
async function indexSingleFile(
  filePath: string,
  label: string,
  stats: DocIndexStats,
  cb?: DocIndexCallbacks,
): Promise<void> {
  try {
    const result = await indexDocument(filePath);
    if (result.status === "unchanged") {
      stats.skipped++;
      cb?.onSkipped?.(label);
    } else {
      stats.indexed++;
      stats.sections += result.sectionsIndexed;
      cb?.onIndexed?.(label, result.sectionsIndexed);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stats.failed++;
    stats.failures.push({ path: filePath, error: msg });
    cb?.onFailed?.(label, msg);
  }
}
