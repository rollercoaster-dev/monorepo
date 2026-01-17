/**
 * Transcript path resolution utilities for session transcripts.
 *
 * Claude Code stores session transcripts as JSONL files in:
 * ~/.claude/projects/{project-path-hash}/{session-id}.jsonl
 *
 * This module provides utilities to locate and access these transcripts.
 */

import { existsSync, readdirSync } from "fs";
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
