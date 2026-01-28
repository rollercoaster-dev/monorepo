/**
 * Transcript path resolution utilities for session transcripts.
 *
 * Claude Code stores session transcripts as JSONL files in:
 * ~/.claude/projects/{project-path-hash}/{session-id}.jsonl
 *
 * This module provides utilities to locate and access these transcripts.
 */

import { existsSync } from "fs";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

/** Maximum number of project directories to scan (safety limit) */
const MAX_PROJECT_DIRS = 100;

/** Maximum number of transcript files to scan per project (safety limit) */
const MAX_FILES_PER_PROJECT = 500;

/**
 * Get the path to a session transcript file.
 *
 * Claude Code stores transcripts in ~/.claude/projects/{hash}/{sessionId}.jsonl
 * For now, we search for the transcript across all project directories.
 *
 * @param sessionId - Session identifier (UUID)
 * @returns Path to transcript file, or null if not found
 *
 * @example
 * ```typescript
 * const path = await getTranscriptPath("session-abc-123");
 * if (path) {
 *   const content = readFileSync(path, 'utf-8');
 * }
 * ```
 */
export async function getTranscriptPath(
  sessionId: string,
): Promise<string | null> {
  if (!sessionId) {
    return null;
  }

  // Validate sessionId format to prevent path traversal attacks
  // Only allow alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    return null;
  }

  // Expand ~ to home directory
  const claudeDir = join(homedir(), ".claude", "projects");

  // Check if .claude/projects exists
  if (!existsSync(claudeDir)) {
    return null;
  }

  // Search all project directories for the transcript file
  // Pattern: ~/.claude/projects/{hash}/{sessionId}.jsonl
  try {
    const entries = await readdir(claudeDir, { withFileTypes: true });

    // Apply safety limit
    const projectDirs = entries.slice(0, MAX_PROJECT_DIRS);

    for (const dir of projectDirs) {
      if (!dir.isDirectory()) continue;

      const transcriptPath = join(claudeDir, dir.name, `${sessionId}.jsonl`);
      if (existsSync(transcriptPath)) {
        return transcriptPath;
      }
    }
  } catch {
    // Directory read failed, return null gracefully
    return null;
  }

  return null;
}

/**
 * Find transcript files modified within a time range.
 *
 * Uses file modification time (mtime) to find transcripts that were active
 * during the specified time window. This is more reliable than session ID
 * lookup since Claude's internal session IDs don't match file names.
 *
 * @param startTime - Start of time range
 * @param endTime - End of time range
 * @returns Array of transcript file paths, sorted by modification time (oldest first)
 *
 * @example
 * ```typescript
 * const start = new Date('2026-01-25T10:00:00Z');
 * const end = new Date('2026-01-25T11:00:00Z');
 * const transcripts = await findTranscriptByTimeRange(start, end);
 * // Returns: ['/path/to/transcript1.jsonl', '/path/to/transcript2.jsonl']
 * ```
 */
/** Buffer added to endTime to catch transcripts still being written during session-end */
const END_TIME_BUFFER_MS = 60_000;

export async function findTranscriptByTimeRange(
  startTime: Date,
  endTime: Date,
): Promise<string[]> {
  // Add buffer to end time to catch transcripts that are still being written
  // during session-end hook execution (mtime may lag slightly behind endTime)
  const bufferedEndTime = new Date(endTime.getTime() + END_TIME_BUFFER_MS);

  const claudeDir = join(homedir(), ".claude", "projects");

  // Return empty array if directory doesn't exist
  if (!existsSync(claudeDir)) {
    logger.info("No Claude projects directory found", {
      expectedPath: claudeDir,
      context: "findTranscriptByTimeRange",
    });
    return [];
  }

  const matchingTranscripts: Array<{ path: string; mtime: number }> = [];
  let filesScanned = 0;
  let projectDirsScanned = 0;

  try {
    const entries = await readdir(claudeDir, { withFileTypes: true });

    // Apply safety limit
    const projectDirs = entries.slice(0, MAX_PROJECT_DIRS);

    for (const dir of projectDirs) {
      if (!dir.isDirectory()) continue;
      projectDirsScanned++;

      const projectPath = join(claudeDir, dir.name);

      let files;
      try {
        files = await readdir(projectPath, { withFileTypes: true });
      } catch {
        // Skip inaccessible directories
        continue;
      }

      // Apply safety limit per project
      const limitedFiles = files.slice(0, MAX_FILES_PER_PROJECT);

      for (const file of limitedFiles) {
        // Only process .jsonl files
        if (!file.isFile() || !file.name.endsWith(".jsonl")) continue;
        filesScanned++;

        const transcriptPath = join(projectPath, file.name);

        try {
          const stats = await stat(transcriptPath);
          const mtime = stats.mtimeMs;

          // Check if file was modified within time range (with buffer on end)
          if (
            mtime >= startTime.getTime() &&
            mtime <= bufferedEndTime.getTime()
          ) {
            matchingTranscripts.push({ path: transcriptPath, mtime });
          }
        } catch {
          // Skip inaccessible files
          continue;
        }
      }
    }
  } catch {
    // Directory read failed, return empty array gracefully
    return [];
  }

  logger.info("Transcript discovery completed", {
    timeRange: `${startTime.toISOString()} - ${bufferedEndTime.toISOString()}`,
    endTimeBufferMs: END_TIME_BUFFER_MS,
    filesScanned,
    filesInRange: matchingTranscripts.length,
    projectDirsScanned,
    context: "findTranscriptByTimeRange",
  });

  // Sort by modification time (oldest first)
  return matchingTranscripts
    .sort((a, b) => a.mtime - b.mtime)
    .map((t) => t.path);
}
