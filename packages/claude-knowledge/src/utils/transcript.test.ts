/**
 * Tests for transcript path resolution.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getTranscriptPath, findTranscriptByTimeRange } from "./transcript";
import { mkdirSync, rmSync, writeFileSync, utimesSync } from "fs";
import { homedir } from "os";
import { join } from "path";

describe("getTranscriptPath", () => {
  it("should return null for empty session ID", () => {
    const result = getTranscriptPath("");
    expect(result).toBeNull();
  });

  it("should return null for non-existent transcript", () => {
    // Returns null when no transcript file exists in any project directory
    const result = getTranscriptPath("test-session-id");
    expect(result).toBeNull();
  });

  it("should return null for invalid session ID format", () => {
    // Path traversal prevention - rejects session IDs with slashes
    const result = getTranscriptPath("invalid/session/id");
    expect(result).toBeNull();
  });

  it("should return null for path traversal attempts", () => {
    // Rejects session IDs that could escape directory structure
    expect(getTranscriptPath("../../etc/passwd")).toBeNull();
    expect(getTranscriptPath("..")).toBeNull();
    expect(getTranscriptPath("foo/../bar")).toBeNull();
  });
});

describe("findTranscriptByTimeRange", () => {
  it("should return empty array when no transcripts in time range", () => {
    const startTime = new Date("2000-01-01T00:00:00Z");
    const endTime = new Date("2000-01-01T01:00:00Z");
    const result = findTranscriptByTimeRange(startTime, endTime);
    expect(result).toEqual([]);
  });

  it("should return empty array when .claude/projects does not exist", () => {
    // Mock a scenario where the directory doesn't exist by using a future time
    // (no transcripts will have mtime in the future)
    const startTime = new Date("2099-01-01T00:00:00Z");
    const endTime = new Date("2099-01-01T01:00:00Z");
    const result = findTranscriptByTimeRange(startTime, endTime);
    expect(result).toEqual([]);
  });

  describe("with transcript files", () => {
    let testProjectDir: string;
    let transcript1Path: string;
    let transcript2Path: string;
    let transcript3Path: string;

    beforeEach(() => {
      // Generate unique test directory
      const timestamp = Date.now();
      testProjectDir = join(
        homedir(),
        ".claude",
        "projects",
        `test-time-range-${timestamp}`,
      );

      // Create test directory
      mkdirSync(testProjectDir, { recursive: true });

      // Create three test transcripts with different modification times
      transcript1Path = join(testProjectDir, "session-old.jsonl");
      transcript2Path = join(testProjectDir, "session-middle.jsonl");
      transcript3Path = join(testProjectDir, "session-new.jsonl");

      writeFileSync(transcript1Path, "test content 1");
      writeFileSync(transcript2Path, "test content 2");
      writeFileSync(transcript3Path, "test content 3");

      // Set modification times: old (1 hour ago), middle (30 min ago), new (now)
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const thirtyMinAgo = now - 30 * 60 * 1000;

      utimesSync(transcript1Path, new Date(oneHourAgo), new Date(oneHourAgo));
      utimesSync(
        transcript2Path,
        new Date(thirtyMinAgo),
        new Date(thirtyMinAgo),
      );
      utimesSync(transcript3Path, new Date(now), new Date(now));
    });

    afterEach(() => {
      // Clean up test directory
      try {
        rmSync(testProjectDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should find transcripts modified within time range", () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // Query for transcripts from past hour
      const startTime = new Date(oneHourAgo - 5000); // Include old transcript
      const endTime = new Date(now + 5000); // Include all

      const result = findTranscriptByTimeRange(startTime, endTime);

      // Should find at least our three test transcripts
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result).toContain(transcript1Path);
      expect(result).toContain(transcript2Path);
      expect(result).toContain(transcript3Path);
    });

    it("should exclude transcripts outside time range", () => {
      const now = Date.now();
      const fortyMinAgo = now - 40 * 60 * 1000;
      const twentyMinAgo = now - 20 * 60 * 1000;

      // Query for a narrow window that only includes middle transcript
      const startTime = new Date(fortyMinAgo);
      const endTime = new Date(twentyMinAgo);

      const result = findTranscriptByTimeRange(startTime, endTime);

      // Should find middle transcript (and possibly some real ones in that window)
      expect(result).toContain(transcript2Path);
      // Should NOT find the old or new test transcripts
      expect(result).not.toContain(transcript1Path);
      expect(result).not.toContain(transcript3Path);
    });

    it("should return transcripts sorted by modification time (oldest first)", () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      // Query for all transcripts
      const startTime = new Date(twoHoursAgo);
      const endTime = new Date(now + 5000);

      const result = findTranscriptByTimeRange(startTime, endTime);

      // Filter to just our test transcripts
      const testTranscripts = result.filter((path) =>
        path.includes("test-time-range"),
      );

      // Should be sorted: old → middle → new
      expect(testTranscripts).toEqual([
        transcript1Path,
        transcript2Path,
        transcript3Path,
      ]);
    });

    it("should handle empty time range", () => {
      // Use a very specific millisecond in the past that won't match any file mtime
      const specificTime = new Date("2000-01-01T12:34:56.789Z");
      const result = findTranscriptByTimeRange(specificTime, specificTime);

      // No transcripts modified at this exact millisecond
      expect(result).toEqual([]);
    });

    it("should ignore non-jsonl files", () => {
      // Create a .txt file in the same directory
      const txtPath = join(testProjectDir, "notes.txt");
      writeFileSync(txtPath, "not a transcript");

      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      const result = findTranscriptByTimeRange(
        new Date(twoHoursAgo),
        new Date(now + 5000),
      );

      // Should only find .jsonl files
      expect(result.every((path) => path.endsWith(".jsonl"))).toBe(true);
      expect(result).not.toContain(txtPath);
    });
  });
});
