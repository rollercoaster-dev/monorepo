/**
 * Tests for session-end --dry-run diagnostic command.
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { handleSessionEnd } from "./session-commands";
import { resetDatabase, closeDatabase } from "../db/sqlite";
import { resetDefaultEmbedder } from "../embeddings";
import { unlinkSync, existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { ensureMetadataDir, getSessionMetadataPath } from "./shared";

describe("handleSessionEnd --dry-run", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let originalOutput: string[];
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = join(tmpdir(), `test-session-commands-${randomUUID()}.db`);
    resetDefaultEmbedder();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    resetDatabase(testDbPath);

    // Capture console.log output
    originalOutput = [];
    consoleLogSpy = spyOn(console, "log").mockImplementation(
      (...args: unknown[]) => {
        originalOutput.push(args.map(String).join(" "));
      },
    );
  });

  afterEach(() => {
    closeDatabase();
    resetDefaultEmbedder();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    consoleLogSpy.mockRestore();
  });

  it("should output diagnostics header and footer", async () => {
    await handleSessionEnd(["--dry-run"]);

    const output = originalOutput.join("\n");
    expect(output).toContain("=== Session End Dry-Run Diagnostics ===");
    expect(output).toContain("=== End of Dry-Run Diagnostics ===");
  });

  it("should show session metadata section", async () => {
    await handleSessionEnd(["--dry-run"]);

    const output = originalOutput.join("\n");
    expect(output).toContain("Session Metadata:");
    expect(output).toContain("Session ID:");
    expect(output).toContain("Start Time:");
    expect(output).toContain("Workflow ID:");
  });

  it("should show API configuration section", async () => {
    await handleSessionEnd(["--dry-run"]);

    const output = originalOutput.join("\n");
    expect(output).toContain("API Configuration:");
    expect(output).toContain("OPENROUTER_API_KEY:");
  });

  it("should show LLM extraction readiness section", async () => {
    await handleSessionEnd(["--dry-run"]);

    const output = originalOutput.join("\n");
    expect(output).toContain("LLM Extraction Readiness:");
    expect(output).toContain("Will extract:");
  });

  it("should show commit-based extraction section", async () => {
    await handleSessionEnd(["--dry-run"]);

    const output = originalOutput.join("\n");
    expect(output).toContain("Commit-based Extraction:");
    expect(output).toContain("Recent commits:");
    expect(output).toContain("Modified files:");
  });

  it("should not output 'Learnings stored' (extraction not run)", async () => {
    await handleSessionEnd(["--dry-run"]);

    const output = originalOutput.join("\n");
    expect(output).not.toContain("Learnings stored:");
  });

  it("should show fallback transcript discovery when no start time", async () => {
    // Use a nonexistent session-id to prevent matching real session metadata on disk
    await handleSessionEnd([
      "--dry-run",
      "--session-id",
      "nonexistent-test-session",
    ]);

    const output = originalOutput.join("\n");
    expect(output).toContain("Fallback time range (last 2h):");
    expect(output).toContain("Transcripts found:");
  });

  it("should show transcript discovery when start time provided", async () => {
    const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await handleSessionEnd(["--dry-run", "--start-time", startTime]);

    const output = originalOutput.join("\n");
    expect(output).toContain("Transcript Discovery:");
    expect(output).toContain("Transcripts found:");
    // Should NOT contain the fallback message
    expect(output).not.toContain("Fallback time range");
  });

  it("should indicate fallback when start time is missing", async () => {
    // Use a nonexistent session-id to prevent matching real session metadata on disk
    await handleSessionEnd([
      "--dry-run",
      "--session-id",
      "nonexistent-test-session",
    ]);

    const output = originalOutput.join("\n");
    expect(output).toContain("Will use fallback time window (last 2 hours)");
  });

  it("should hydrate metadata from temp file when available", async () => {
    // Create a metadata temp file
    await ensureMetadataDir();
    const metadataPath = getSessionMetadataPath(Date.now(), "test-session-123");
    const metadata = {
      sessionId: "test-session-123",
      learningsInjected: 5,
      startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    };
    writeFileSync(metadataPath, JSON.stringify(metadata));

    try {
      await handleSessionEnd(["--dry-run"]);

      const output = originalOutput.join("\n");
      expect(output).toContain("test-session-123");
      expect(output).toContain("Transcripts found:");
    } finally {
      // Clean up
      if (existsSync(metadataPath)) {
        unlinkSync(metadataPath);
      }
    }
  });
});
