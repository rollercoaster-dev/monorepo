/**
 * Logs MCP Resources
 *
 * Provides resources for accessing saved output files (test logs, build logs, etc.)
 * from the .claude/output directory.
 */

import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Default output directory relative to working directory.
 */
const OUTPUT_DIR = ".claude/output";

/**
 * Resource definitions for logs browsing.
 */
export const logsResources: Resource[] = [
  {
    uri: "logs://test/latest",
    name: "Latest Test Output",
    description: "Most recent test output saved via output_save",
    mimeType: "text/plain",
  },
  {
    uri: "logs://list",
    name: "Available Logs",
    description: "List all saved output files",
    mimeType: "application/json",
  },
];

/**
 * Handle reading logs resources.
 *
 * @param uri - Resource URI
 * @returns Resource contents or null if not found
 */
export async function readLogsResource(
  uri: string,
): Promise<{ uri: string; mimeType: string; text: string } | null> {
  const outputDir = join(process.cwd(), OUTPUT_DIR);

  if (uri === "logs://list") {
    try {
      const files = await readdir(outputDir);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          try {
            const filePath = join(outputDir, file);
            const stats = await stat(filePath);
            return {
              name: file,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              uri: `logs://file/${file}`,
            };
          } catch {
            return null;
          }
        }),
      );

      const validFiles = fileStats.filter(
        (f): f is NonNullable<typeof f> => f !== null,
      );

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            directory: outputDir,
            count: validFiles.length,
            files: validFiles.sort(
              (a, b) =>
                new Date(b.modified).getTime() - new Date(a.modified).getTime(),
            ),
          },
          null,
          2,
        ),
      };
    } catch {
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          directory: outputDir,
          count: 0,
          files: [],
          message: "Output directory not found or empty",
        }),
      };
    }
  }

  if (uri === "logs://test/latest") {
    // Find the most recent test-*.txt file
    try {
      const files = await readdir(outputDir);
      const testFiles = files.filter(
        (f) => f.startsWith("test") && f.endsWith(".txt"),
      );

      if (testFiles.length === 0) {
        return {
          uri,
          mimeType: "text/plain",
          text: "No test output files found",
        };
      }

      // Get stats for all test files and find most recent
      const fileStats = await Promise.all(
        testFiles.map(async (file) => {
          const filePath = join(outputDir, file);
          const stats = await stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        }),
      );

      const latest = fileStats.sort(
        (a, b) => b.mtime.getTime() - a.mtime.getTime(),
      )[0];
      const content = await readFile(latest.path, "utf-8");

      return {
        uri,
        mimeType: "text/plain",
        text: `[File: ${latest.file}]\n[Modified: ${latest.mtime.toISOString()}]\n\n${content}`,
      };
    } catch {
      return {
        uri,
        mimeType: "text/plain",
        text: "No test output available",
      };
    }
  }

  // Handle logs://file/<filename> pattern
  if (uri.startsWith("logs://file/")) {
    const filename = uri.replace("logs://file/", "");
    // Sanitize to prevent path traversal
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = join(outputDir, sanitized);

    try {
      const content = await readFile(filePath, "utf-8");
      return {
        uri,
        mimeType: "text/plain",
        text: content,
      };
    } catch {
      return null;
    }
  }

  return null;
}
