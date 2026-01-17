/**
 * Tests for transcript path resolution.
 */

import { describe, it, expect } from "bun:test";
import { getTranscriptPath } from "./transcript";

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
