/**
 * Transcript path resolution utilities for session transcripts.
 *
 * Claude Code stores session transcripts as JSONL files in:
 * ~/.claude/projects/{project-path-hash}/{session-id}.jsonl
 *
 * This module provides utilities to locate and access these transcripts.
 */

import { existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

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
 * const path = getTranscriptPath("session-abc-123");
 * if (path) {
 *   const content = readFileSync(path, 'utf-8');
 * }
 * ```
 */
export function getTranscriptPath(sessionId: string): string | null {
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
    const projectDirs = readdirSync(claudeDir, { withFileTypes: true });

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
 * const transcripts = findTranscriptByTimeRange(start, end);
 * // Returns: ['/path/to/transcript1.jsonl', '/path/to/transcript2.jsonl']
 * ```
 */
export function findTranscriptByTimeRange(
  startTime: Date,
  endTime: Date,
): string[] {
  const claudeDir = join(homedir(), ".claude", "projects");

  // Return empty array if directory doesn't exist
  if (!existsSync(claudeDir)) {
    return [];
  }

  const matchingTranscripts: Array<{ path: string; mtime: number }> = [];

  try {
    const projectDirs = readdirSync(claudeDir, { withFileTypes: true });

    for (const dir of projectDirs) {
      if (!dir.isDirectory()) continue;

      const projectPath = join(claudeDir, dir.name);
      const files = readdirSync(projectPath, { withFileTypes: true });

      for (const file of files) {
        // Only process .jsonl files
        if (!file.isFile() || !file.name.endsWith(".jsonl")) continue;

        const transcriptPath = join(projectPath, file.name);
        const stats = statSync(transcriptPath);
        const mtime = stats.mtimeMs;

        // Check if file was modified within time range
        if (mtime >= startTime.getTime() && mtime <= endTime.getTime()) {
          matchingTranscripts.push({ path: transcriptPath, mtime });
        }
      }
    }
  } catch {
    // Directory read failed, return empty array gracefully
    return [];
  }

  // Sort by modification time (oldest first)
  return matchingTranscripts
    .sort((a, b) => a.mtime - b.mtime)
    .map((t) => t.path);
}
