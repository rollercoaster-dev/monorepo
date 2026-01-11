import { checkpoint } from "../checkpoint";
import { hooks } from "../hooks";
import { parseModifiedFiles, parseRecentCommits } from "../utils";
import type { Workflow } from "../types";
import { $ } from "bun";
import { unlink } from "fs/promises";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  parseIntSafe,
  isValidSessionMetadata,
  getSessionMetadataPath,
  ensureMetadataDir,
  findLatestSessionMetadataFile,
  STALE_THRESHOLD_HOURS,
  STALE_THRESHOLD_MS,
} from "./shared";

/**
 * Outputs prompt for resuming running workflows.
 * Shows workflow details and asks user to respond with y/n/abandon.
 * @param workflows - List of active workflows to prompt about
 */
function promptWorkflowResume(workflows: Workflow[]): void {
  const now = Date.now();

  // Filter to recent workflows (updated within 24 hours)
  const recentWorkflows = workflows.filter((wf) => {
    const age = now - new Date(wf.updatedAt).getTime();
    return age <= STALE_THRESHOLD_MS;
  });

  if (recentWorkflows.length === 0) {
    return;
  }

  console.log("\n=== Running Workflow(s) Detected ===\n");

  for (const wf of recentWorkflows) {
    const age = now - new Date(wf.updatedAt).getTime();
    const hours = Math.floor(age / (1000 * 60 * 60));
    const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`Workflow found: Issue #${wf.issueNumber}`);
    console.log(`  Branch: ${wf.branch}`);
    console.log(`  Phase: ${wf.phase}`);
    console.log(`  Status: ${wf.status}`);
    console.log(
      `  Last updated: ${hours > 0 ? `${hours}h ` : ""}${minutes}m ago`,
    );
    console.log(`  Resume this workflow? [y/n/abandon]\n`);
  }

  console.log(
    "Reply with the issue number and action, e.g.: '414 y' to resume, '414 n' to skip, '414 abandon' to mark failed",
  );
  console.log("=================================\n");
}

/**
 * Handle session-start command.
 */
export async function handleSessionStart(args: string[]): Promise<void> {
  // session-start [--branch <name>] [--issue <number>]
  let branch: string | undefined;
  let issueNumber: number | undefined;

  // Parse optional arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    if (arg === "--branch" && nextArg) {
      branch = nextArg;
      i++;
    } else if (arg === "--issue" && nextArg) {
      issueNumber = parseIntSafe(nextArg, "issue");
      i++;
    }
  }

  // Get git context
  const cwd = process.cwd();

  // Get current branch if not provided
  if (!branch) {
    try {
      const result = await $`git branch --show-current`.quiet();
      branch = result.text().trim();
    } catch (error) {
      // Distinguish between "not a git repo" and actual errors
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes("not a git repository")) {
        console.warn(
          `Warning: Could not get current branch: ${errorMsg}. Session will continue with limited context.`,
        );
      }
    }
  }

  // Get modified files from git status
  let modifiedFiles: string[] = [];
  try {
    const result = await $`git status --porcelain`.quiet();
    modifiedFiles = parseModifiedFiles(result.text());
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!errorMsg.includes("not a git repository")) {
      console.warn(
        `Warning: Could not get modified files: ${errorMsg}. Session will continue without file context.`,
      );
    }
  }

  // Call onSessionStart
  const context = await hooks.onSessionStart({
    workingDir: cwd,
    branch,
    modifiedFiles,
    issueNumber,
  });

  // Clean up stale workflows before checking for resume
  try {
    const cleanedUp = checkpoint.cleanupStaleWorkflows(STALE_THRESHOLD_HOURS);
    if (cleanedUp > 0) {
      console.log(`Cleaned up ${cleanedUp} stale workflow(s)`);
    }
  } catch (error) {
    // Non-fatal: continue without cleanup
    logger.warn("Could not cleanup stale workflows", {
      error: error instanceof Error ? error.message : String(error),
      context: "session-start",
    });
  }

  // Check for running workflows and prompt for resume
  try {
    const activeWorkflows = checkpoint.listActive();
    if (activeWorkflows.length > 0) {
      promptWorkflowResume(activeWorkflows);
    }
  } catch (error) {
    // Non-fatal: session continues without resume prompt
    logger.warn("Could not check for running workflows", {
      error: error instanceof Error ? error.message : String(error),
      context: "session-start",
    });
  }

  // Output the summary (for injection into context)
  console.log(context.summary);

  // Output session metadata for session-end to consume
  // This is output as a special marker that can be captured
  const metadata = (
    context as typeof context & {
      _sessionMetadata?: {
        sessionId: string;
        learningsInjected: number;
        startTime: string;
        issueNumber?: number;
      };
    }
  )._sessionMetadata;
  if (metadata) {
    console.log(`\n<!-- SESSION_METADATA: ${JSON.stringify(metadata)} -->`);

    // Write metadata to timestamped temp file for session-end to read
    // Uses timestamp + sessionId to handle concurrent sessions
    try {
      // Validate metadata structure before writing
      if (!isValidSessionMetadata(metadata)) {
        throw new Error("Session metadata has invalid structure");
      }
      await ensureMetadataDir();
      const metadataPath = getSessionMetadataPath(
        Date.now(),
        metadata.sessionId,
      );
      await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      // Non-fatal: session-end can still work without the file
      logger.warn("Could not write session metadata file", {
        error: error instanceof Error ? error.message : String(error),
        context: "session-start",
      });
    }
  }
  // Note: process.exit handled by main CLI entry point
}

/**
 * Handle session-end command.
 */
export async function handleSessionEnd(args: string[]): Promise<void> {
  // session-end [--workflow-id <id>] [--session-id <id>] [--learnings-injected <count>] [--start-time <iso>] [--interrupted]
  let workflowId: string | undefined;
  let sessionId: string | undefined;
  let learningsInjected: number | undefined;
  let startTime: string | undefined;
  let compacted: boolean | undefined;
  let reviewFindings: number | undefined;
  let filesRead: number | undefined;
  let interrupted: boolean | undefined;

  // Parse optional arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    if (arg === "--workflow-id" && nextArg) {
      workflowId = nextArg;
      i++;
    } else if (arg === "--session-id" && nextArg) {
      sessionId = nextArg;
      i++;
    } else if (arg === "--learnings-injected" && nextArg) {
      learningsInjected = parseIntSafe(nextArg, "learnings-injected");
      i++;
    } else if (arg === "--start-time" && nextArg) {
      startTime = nextArg;
      i++;
    } else if (arg === "--compacted") {
      compacted = true;
    } else if (arg === "--interrupted") {
      interrupted = true;
    } else if (arg === "--review-findings" && nextArg) {
      reviewFindings = parseIntSafe(nextArg, "review-findings");
      i++;
    } else if (arg === "--files-read" && nextArg) {
      filesRead = parseIntSafe(nextArg, "files-read");
      i++;
    }
  }

  // Track the metadata file path for cleanup later
  let metadataFilePath: string | null = null;

  // If any session metadata is missing, try to hydrate from temp file
  // This enables automatic correlation with session-start hook
  if (!sessionId || startTime == null || learningsInjected == null) {
    try {
      metadataFilePath = await findLatestSessionMetadataFile();
      if (metadataFilePath) {
        const file = Bun.file(metadataFilePath);
        const content = await file.text();
        const parsed = JSON.parse(content);

        // Validate structure before using
        if (isValidSessionMetadata(parsed)) {
          sessionId = sessionId ?? parsed.sessionId;
          learningsInjected = learningsInjected ?? parsed.learningsInjected;
          startTime = startTime ?? parsed.startTime;

          console.log(
            `Found session metadata from session-start: ${sessionId}`,
          );
        } else {
          logger.warn("Session metadata file has invalid structure", {
            file: metadataFilePath,
            context: "session-end",
          });
          metadataFilePath = null;
        }
      }
    } catch (error) {
      // Non-fatal: continue without session correlation
      logger.warn("Could not read session metadata file", {
        error: error instanceof Error ? error.message : String(error),
        context: "session-end",
      });
      metadataFilePath = null;
    }
  }

  // Get recent commits
  let commits: Array<{ sha: string; message: string }> = [];
  try {
    const result = await $`git log --oneline -10`.quiet();
    commits = parseRecentCommits(result.text());
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!errorMsg.includes("not a git repository")) {
      console.warn(
        `Warning: Could not get recent commits: ${errorMsg}. Learning extraction may be limited.`,
      );
    }
  }

  // Get modified files (files changed in recent commits)
  let modifiedFiles: string[] = [];
  try {
    // Try to get files from last 10 commits
    const result = await $`git diff --name-only HEAD~10..HEAD`.quiet();
    modifiedFiles = result.text().trim().split("\n").filter(Boolean);
  } catch {
    // Fallback: repo may have fewer than 10 commits - get all commits from root
    try {
      const result = await $`git log --name-only --pretty=format: -10`.quiet();
      modifiedFiles = [
        ...new Set(result.text().trim().split("\n").filter(Boolean)),
      ]; // O(n) deduplication with Set
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes("not a git repository")) {
        console.warn(
          `Warning: Could not get modified files: ${errorMsg}. Learning extraction may be limited.`,
        );
      }
    }
  }

  // Call onSessionEnd with session metadata if provided
  const result = await hooks.onSessionEnd({
    workflowId,
    commits,
    modifiedFiles,
    sessionId,
    learningsInjected,
    startTime,
    compacted,
    reviewFindings,
    filesRead,
    interrupted,
  });

  // Output result
  console.log(`Learnings stored: ${result.learningsStored}`);
  if (result.learningIds.length > 0) {
    console.log(`Learning IDs: ${result.learningIds.join(", ")}`);
  }
  if (sessionId) {
    console.log(`Session metrics saved for: ${sessionId}`);

    // Clean up the session metadata file after successful recording
    if (metadataFilePath) {
      try {
        await unlink(metadataFilePath);
      } catch (error) {
        // Non-fatal: file cleanup is best-effort
        logger.debug("Could not clean up session metadata file", {
          file: metadataFilePath,
          error: error instanceof Error ? error.message : String(error),
          context: "session-end",
        });
      }
    }
  }
}
