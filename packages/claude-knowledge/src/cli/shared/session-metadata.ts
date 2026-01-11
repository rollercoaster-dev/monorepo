import { homedir } from "os";
import { join } from "path";
import { mkdir, readdir, unlink } from "fs/promises";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import type { SessionMetadataFile } from "./types";

/**
 * Directory for session metadata files.
 * Uses a dedicated subdirectory to avoid scanning entire home directory.
 */
export const SESSION_METADATA_DIR = join(homedir(), ".claude-knowledge");
export const SESSION_METADATA_PREFIX = "session-";
export const SESSION_METADATA_SUFFIX = ".json";

/** Stale threshold: 24 hours */
export const STALE_THRESHOLD_HOURS = 24;
export const STALE_THRESHOLD_MS = STALE_THRESHOLD_HOURS * 60 * 60 * 1000;

/**
 * Validates that an object has the expected SessionMetadataFile structure.
 */
export function isValidSessionMetadata(
  obj: unknown,
): obj is SessionMetadataFile {
  if (
    typeof obj !== "object" ||
    obj === null ||
    typeof (obj as SessionMetadataFile).sessionId !== "string" ||
    typeof (obj as SessionMetadataFile).learningsInjected !== "number" ||
    typeof (obj as SessionMetadataFile).startTime !== "string"
  ) {
    return false;
  }

  // Validate optional issueNumber if present
  const metadata = obj as SessionMetadataFile;
  if (
    metadata.issueNumber !== undefined &&
    (typeof metadata.issueNumber !== "number" ||
      !Number.isInteger(metadata.issueNumber) ||
      metadata.issueNumber <= 0)
  ) {
    return false;
  }

  return true;
}

/**
 * Generates a session metadata file path with timestamp and optional sessionId.
 * Including sessionId prevents race conditions when multiple sessions run concurrently.
 */
export function getSessionMetadataPath(
  timestamp: number = Date.now(),
  sessionId?: string,
): string {
  const suffix = sessionId ? `-${sessionId}` : "";
  return join(
    SESSION_METADATA_DIR,
    `${SESSION_METADATA_PREFIX}${timestamp}${suffix}${SESSION_METADATA_SUFFIX}`,
  );
}

/**
 * Ensures the session metadata directory exists.
 */
export async function ensureMetadataDir(): Promise<void> {
  await mkdir(SESSION_METADATA_DIR, { recursive: true });
}

/**
 * Finds the most recent session metadata file.
 * Also cleans up stale files older than 24 hours.
 * Returns null if no files found.
 *
 * @param sessionId - Optional sessionId to match. If provided, only returns files
 *                    for that specific session, preventing cross-session correlation.
 */
export async function findLatestSessionMetadataFile(
  sessionId?: string,
): Promise<string | null> {
  try {
    await ensureMetadataDir();
    const files = await readdir(SESSION_METADATA_DIR);
    const now = Date.now();

    const sessionFiles = files
      .filter(
        (f) =>
          f.startsWith(SESSION_METADATA_PREFIX) &&
          f.endsWith(SESSION_METADATA_SUFFIX),
      )
      .map((f) => {
        // Extract the part between prefix and suffix: "{timestamp}" or "{timestamp}-{sessionId}"
        const middle = f.slice(
          SESSION_METADATA_PREFIX.length,
          -SESSION_METADATA_SUFFIX.length,
        );
        // Split to get timestamp (first part) and sessionId (rest, if any)
        const dashIndex = middle.indexOf("-");
        const timestampStr =
          dashIndex === -1 ? middle : middle.slice(0, dashIndex);
        const sessionId =
          dashIndex === -1 ? undefined : middle.slice(dashIndex + 1);
        return {
          name: f,
          timestamp: parseInt(timestampStr, 10),
          sessionId,
        };
      })
      .filter((f) => !isNaN(f.timestamp));

    // Clean up stale files (older than 24 hours)
    for (const f of sessionFiles) {
      if (now - f.timestamp > STALE_THRESHOLD_MS) {
        try {
          await unlink(join(SESSION_METADATA_DIR, f.name));
          logger.debug("Cleaned up stale session metadata file", {
            file: f.name,
            context: "findLatestSessionMetadataFile",
          });
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    // Filter to non-stale files and optionally by sessionId
    const validFiles = sessionFiles
      .filter((f) => now - f.timestamp <= STALE_THRESHOLD_MS)
      .filter((f) => (sessionId ? f.sessionId === sessionId : true))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (validFiles.length === 0) return null;

    return join(SESSION_METADATA_DIR, validFiles[0].name);
  } catch {
    return null;
  }
}
