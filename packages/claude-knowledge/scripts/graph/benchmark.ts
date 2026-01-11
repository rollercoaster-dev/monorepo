#!/usr/bin/env bun
/**
 * Benchmark graph queries vs grep+read approach.
 * Part of Issue #431 Experiment 3: Code Graph Prototype.
 *
 * Measures:
 * 1. Query execution time
 * 2. Simulated token usage (characters read)
 *
 * Usage: bun benchmark.ts [package-path]
 */

import { getDatabase } from "../../src/db/sqlite";
import { execSync } from "child_process";
import { readFileSync, statSync } from "fs";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

interface BenchmarkResult {
  name: string;
  graphTimeMs: number;
  grepTimeMs: number;
  speedup: number;
  graphResultCount: number;
  grepResultCount: number;
  grepBytesRead: number;
}

// Time a function execution
function timeExecution<T>(fn: () => T): { result: T; timeMs: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, timeMs: end - start };
}

// Run graph query
function runGraphQuery(
  query: string,
  args: string[],
): { results: unknown[]; timeMs: number } {
  const db = getDatabase();

  if (query === "what-depends-on") {
    const name = args[0];
    const { result, timeMs } = timeExecution(() =>
      db
        .query(
          `
        SELECT DISTINCT ge.name, ge.file_path, gr.type as relationship_type
        FROM graph_relationships gr
        JOIN graph_entities ge ON gr.from_entity = ge.id
        WHERE gr.to_entity LIKE ?
          AND gr.type IN ('imports', 'extends', 'implements', 'calls')
      `,
        )
        .all(`%${name}%`),
    );
    return { results: result as unknown[], timeMs };
  }

  if (query === "find") {
    const name = args[0];
    const { result, timeMs } = timeExecution(() =>
      db
        .query(
          `
        SELECT id, name, type, file_path, line_number
        FROM graph_entities
        WHERE name LIKE ?
      `,
        )
        .all(`%${name}%`),
    );
    return { results: result as unknown[], timeMs };
  }

  if (query === "blast-radius") {
    const file = args[0];
    const { result, timeMs } = timeExecution(() =>
      db
        .query(
          `
        WITH RECURSIVE dependents AS (
          SELECT id, name, file_path, type, 0 as depth
          FROM graph_entities
          WHERE file_path LIKE ?
          UNION
          SELECT ge.id, ge.name, ge.file_path, ge.type, d.depth + 1
          FROM graph_entities ge
          JOIN graph_relationships gr ON gr.from_entity = ge.id
          JOIN dependents d ON gr.to_entity = d.id
          WHERE d.depth < 5
            AND gr.type IN ('imports', 'calls', 'extends', 'implements')
        )
        SELECT DISTINCT name, file_path, type, depth
        FROM dependents
        ORDER BY depth, file_path
      `,
        )
        .all(`%${file}%`),
    );
    return { results: result as unknown[], timeMs };
  }

  throw new Error(`Unknown query: ${query}`);
}

// Run grep-based equivalent
function runGrepQuery(
  query: string,
  args: string[],
  packagePath: string,
): { results: string[]; timeMs: number; bytesRead: number } {
  if (query === "what-depends-on") {
    const name = args[0];
    const { result, timeMs } = timeExecution(() => {
      try {
        // grep for import statements that reference the name
        const grepResult = execSync(
          `grep -r "import.*${name}" "${packagePath}" --include="*.ts" 2>/dev/null || true`,
          { encoding: "utf-8" },
        );
        return grepResult.split("\n").filter(Boolean);
      } catch {
        return [];
      }
    });

    // Estimate bytes read (grep reads all matching files)
    let bytesRead = 0;
    try {
      const allFiles = execSync(
        `find "${packagePath}" -name "*.ts" 2>/dev/null || true`,
        { encoding: "utf-8" },
      )
        .split("\n")
        .filter(Boolean);
      bytesRead = allFiles.reduce((sum, file) => {
        try {
          return sum + statSync(file).size;
        } catch {
          return sum;
        }
      }, 0);
    } catch {
      // ignore
    }

    return { results: result, timeMs, bytesRead };
  }

  if (query === "find") {
    const name = args[0];
    const { result, timeMs } = timeExecution(() => {
      try {
        // grep for the name (function, class, etc.)
        const grepResult = execSync(
          `grep -rn "${name}" "${packagePath}" --include="*.ts" 2>/dev/null || true`,
          { encoding: "utf-8" },
        );
        return grepResult.split("\n").filter(Boolean);
      } catch {
        return [];
      }
    });

    let bytesRead = 0;
    try {
      const allFiles = execSync(
        `find "${packagePath}" -name "*.ts" 2>/dev/null || true`,
        { encoding: "utf-8" },
      )
        .split("\n")
        .filter(Boolean);
      bytesRead = allFiles.reduce((sum, file) => {
        try {
          return sum + statSync(file).size;
        } catch {
          return sum;
        }
      }, 0);
    } catch {
      // ignore
    }

    return { results: result, timeMs, bytesRead };
  }

  if (query === "blast-radius") {
    const file = args[0];
    const { result, timeMs } = timeExecution(() => {
      // For blast radius, we need to:
      // 1. Find the file
      // 2. Get all exports from the file
      // 3. For each export, grep for imports
      // This is a simplified simulation - real blast radius is much harder with grep

      try {
        // Find files that import from this file
        const grepResult = execSync(
          `grep -rln "from.*${file}" "${packagePath}" --include="*.ts" 2>/dev/null || true`,
          { encoding: "utf-8" },
        );
        const importingFiles = grepResult.split("\n").filter(Boolean);

        // For each importing file, we'd need to read it to understand what's imported
        // This is where the complexity explodes
        const results: string[] = [];
        for (const importFile of importingFiles) {
          try {
            const content = readFileSync(importFile, "utf-8");
            results.push(`${importFile}: ${content.length} bytes`);
          } catch {
            // ignore
          }
        }
        return results;
      } catch {
        return [];
      }
    });

    // Estimate bytes read - for blast radius, we need to read many files
    let bytesRead = 0;
    try {
      const allFiles = execSync(
        `find "${packagePath}" -name "*.ts" 2>/dev/null || true`,
        { encoding: "utf-8" },
      )
        .split("\n")
        .filter(Boolean);
      // Assume we read all files at least once for blast radius analysis
      bytesRead = allFiles.reduce((sum, file) => {
        try {
          return sum + statSync(file).size;
        } catch {
          return sum;
        }
      }, 0);
    } catch {
      // ignore
    }

    return { results: result, timeMs, bytesRead };
  }

  throw new Error(`Unknown query: ${query}`);
}

// Main benchmark
async function runBenchmark(packagePath: string): Promise<void> {
  logger.info("=== Code Graph Benchmark ===");
  logger.info(`Package: ${packagePath}`);

  const testCases: Array<{ name: string; query: string; args: string[] }> = [
    { name: "Find Logger class", query: "find", args: ["Logger"] },
    {
      name: "Find createLogger function",
      query: "find",
      args: ["createLogger"],
    },
    {
      name: "What depends on logger.service",
      query: "what-depends-on",
      args: ["logger.service"],
    },
    {
      name: "What depends on Logger",
      query: "what-depends-on",
      args: ["Logger"],
    },
    {
      name: "Blast radius of logger.service",
      query: "blast-radius",
      args: ["logger.service"],
    },
    {
      name: "Blast radius of formatters",
      query: "blast-radius",
      args: ["formatter"],
    },
  ];

  const results: BenchmarkResult[] = [];

  for (const testCase of testCases) {
    logger.info(`Test: ${testCase.name}`);

    // Run graph query
    const graphResult = runGraphQuery(testCase.query, testCase.args);

    // Run grep equivalent
    const grepResult = runGrepQuery(testCase.query, testCase.args, packagePath);

    const speedup =
      grepResult.timeMs > 0 ? grepResult.timeMs / graphResult.timeMs : 1;

    results.push({
      name: testCase.name,
      graphTimeMs: graphResult.timeMs,
      grepTimeMs: grepResult.timeMs,
      speedup,
      graphResultCount: graphResult.results.length,
      grepResultCount: grepResult.results.length,
      grepBytesRead: grepResult.bytesRead,
    });

    logger.info(
      `  Graph: ${graphResult.timeMs.toFixed(2)}ms, ${graphResult.results.length} results`,
    );
    logger.info(
      `  Grep:  ${grepResult.timeMs.toFixed(2)}ms, ${grepResult.results.length} results, ${(grepResult.bytesRead / 1024).toFixed(1)}KB read`,
    );
    logger.info(`  Speedup: ${speedup.toFixed(1)}x`);
  }

  // Summary
  logger.info("=== Summary ===");
  logger.info(
    "| Test | Graph (ms) | Grep (ms) | Speedup | Graph Results | Grep Results |",
  );
  logger.info(
    "|------|------------|-----------|---------|---------------|--------------|",
  );

  for (const result of results) {
    logger.info(
      `| ${result.name.padEnd(30)} | ${result.graphTimeMs.toFixed(2).padStart(10)} | ${result.grepTimeMs.toFixed(2).padStart(9)} | ${result.speedup.toFixed(1).padStart(7)}x | ${String(result.graphResultCount).padStart(13)} | ${String(result.grepResultCount).padStart(12)} |`,
    );
  }

  const avgSpeedup =
    results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
  const totalGraphTime = results.reduce((sum, r) => sum + r.graphTimeMs, 0);
  const totalGrepTime = results.reduce((sum, r) => sum + r.grepTimeMs, 0);
  const totalBytesRead = results.reduce((sum, r) => sum + r.grepBytesRead, 0);

  logger.info("--- Totals ---");
  logger.info(`Total Graph Time: ${totalGraphTime.toFixed(2)}ms`);
  logger.info(`Total Grep Time: ${totalGrepTime.toFixed(2)}ms`);
  logger.info(`Average Speedup: ${avgSpeedup.toFixed(1)}x`);
  logger.info(
    `Total Bytes Read by Grep: ${(totalBytesRead / 1024).toFixed(1)}KB`,
  );

  // Token estimation
  const tokensPerKB = 250; // rough estimate: ~4 chars per token
  const estimatedGrepTokens = (totalBytesRead / 1024) * tokensPerKB;
  const estimatedGraphTokens = results.reduce(
    (sum, r) => sum + r.graphResultCount * 50,
    0,
  ); // ~50 tokens per result

  logger.info("--- Token Estimation ---");
  logger.info(
    `Grep approach would read ~${estimatedGrepTokens.toFixed(0)} tokens of source code`,
  );
  logger.info(
    `Graph approach returns ~${estimatedGraphTokens.toFixed(0)} tokens of structured results`,
  );
  logger.info(
    `Potential token savings: ${(((estimatedGrepTokens - estimatedGraphTokens) / estimatedGrepTokens) * 100).toFixed(0)}%`,
  );

  // Output JSON
  logger.info("--- JSON Output ---");
  logger.info(
    JSON.stringify(
      {
        packagePath,
        results,
        summary: {
          avgSpeedup,
          totalGraphTimeMs: totalGraphTime,
          totalGrepTimeMs: totalGrepTime,
          totalBytesRead,
          estimatedGrepTokens,
          estimatedGraphTokens,
          tokenSavingsPercent:
            ((estimatedGrepTokens - estimatedGraphTokens) /
              estimatedGrepTokens) *
            100,
        },
      },
      null,
      2,
    ),
  );
}

// Main
const packagePath = process.argv[2] || "packages/rd-logger/src";
runBenchmark(packagePath).catch((err) => logger.error(String(err)));
