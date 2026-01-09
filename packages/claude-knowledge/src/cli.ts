#!/usr/bin/env bun
import { checkpoint } from "./checkpoint";
import { hooks } from "./hooks";
import {
  analyzeWorkflow,
  storeWorkflowLearning,
  query,
  knowledge,
} from "./knowledge";
import { parseModifiedFiles, parseRecentCommits, mineMergedPRs } from "./utils";
import type { MilestonePhase, WorkflowPhase, WorkflowStatus } from "./types";
import { $ } from "bun";
import { homedir } from "os";
import { join } from "path";

/**
 * Path to the session metadata file.
 * Used to persist session state between session-start and session-end hooks.
 */
const SESSION_METADATA_FILE = join(homedir(), ".claude-knowledge-session.json");

/**
 * Session metadata structure stored in the temp file.
 */
interface SessionMetadataFile {
  sessionId: string;
  learningsInjected: number;
  startTime: string;
  issueNumber?: number;
}

// Valid enum values for validation
const VALID_MILESTONE_PHASES: MilestonePhase[] = [
  "planning",
  "execute",
  "review",
  "merge",
  "cleanup",
];
const VALID_WORKFLOW_PHASES: WorkflowPhase[] = [
  "research",
  "implement",
  "review",
  "finalize",
  "planning",
  "execute",
  "merge",
  "cleanup",
];
const VALID_STATUSES: WorkflowStatus[] = [
  "running",
  "paused",
  "completed",
  "failed",
];
const VALID_ACTION_RESULTS = ["success", "failed", "pending"] as const;

// Helper: Parse integer with NaN validation
function parseIntSafe(value: string, name: string): number {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid integer`);
  }
  return parsed;
}

// Helper: Validate enum value
function validateEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  name: string,
): T {
  if (!validValues.includes(value as T)) {
    throw new Error(
      `Invalid ${name}: "${value}". Valid values: ${validValues.join(", ")}`,
    );
  }
  return value as T;
}

// Helper: Parse JSON safely with helpful error
function parseJsonSafe(value: string, name: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("must be a JSON object, not an array or primitive");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid ${name}: ${error.message}. Example: '{"key": "value"}'`,
      );
    }
    throw new Error(
      `Invalid ${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: checkpoint <command> [args...]");
  console.error("\nCommands:");
  console.error("  milestone create <name> [github-number]");
  console.error("  milestone get <id>");
  console.error("  milestone find <name>");
  console.error("  milestone set-phase <id> <phase>");
  console.error("  milestone set-status <id> <status>");
  console.error("  milestone list-active");
  console.error("  milestone delete <id>");
  console.error(
    "  baseline save <milestone-id> <lint-exit> <lint-warnings> <lint-errors> <typecheck-exit> <typecheck-errors>",
  );
  console.error("  workflow create <issue-number> <branch> [worktree]");
  console.error("  workflow get <id>");
  console.error("  workflow find <issue-number>");
  console.error("  workflow set-phase <id> <phase>");
  console.error("  workflow set-status <id> <status>");
  console.error("  workflow log-action <id> <action> <result> [metadata-json]");
  console.error("  workflow log-commit <id> <sha> <message>");
  console.error("  workflow list-active");
  console.error("  workflow delete <id>");
  console.error("  workflow link <workflow-id> <milestone-id> [wave]");
  console.error("  workflow list <milestone-id>");
  console.error("  session-start [--branch <name>] [--issue <number>]");
  console.error(
    "  session-end [--workflow-id <id>] [--session-id <id>] [--learnings-injected <n>] [--start-time <iso>] [--compacted] [--review-findings <n>] [--files-read <n>]",
  );
  console.error("  learning analyze <workflow-id> <dev-plan-path>");
  console.error(
    "  learning query [--code-area <area>] [--file <path>] [--issue <number>]",
  );
  console.error("  metrics list [issue-number]");
  console.error("  metrics summary");
  console.error("  bootstrap mine-prs [limit]");
  process.exit(1);
}

const [category, command, ...commandArgs] = args;

try {
  if (category === "milestone") {
    switch (command) {
      case "create": {
        if (commandArgs.length < 1) {
          throw new Error("Usage: milestone create <name> [github-number]");
        }
        const name = commandArgs[0];
        const githubNumber = commandArgs[1];
        if (!name) {
          throw new Error("Milestone name is required");
        }
        const milestone = checkpoint.createMilestone(
          name,
          githubNumber
            ? parseIntSafe(githubNumber, "github-number")
            : undefined,
        );
        console.log(JSON.stringify(milestone, null, 2));
        break;
      }

      case "get": {
        if (commandArgs.length < 1) {
          throw new Error("Usage: milestone get <id>");
        }
        const id = commandArgs[0];
        if (!id) {
          throw new Error("Milestone ID is required");
        }
        const data = checkpoint.getMilestone(id);
        if (!data) {
          throw new Error(`Milestone not found: ${id}`);
        }
        console.log(JSON.stringify(data, null, 2));
        break;
      }

      case "find": {
        if (commandArgs.length < 1) {
          throw new Error("Usage: milestone find <name>");
        }
        const name = commandArgs[0];
        if (!name) {
          throw new Error("Milestone name is required");
        }
        const data = checkpoint.findMilestoneByName(name);
        if (!data) {
          throw new Error(`Milestone not found: ${name}`);
        }
        console.log(JSON.stringify(data, null, 2));
        break;
      }

      case "set-phase": {
        if (commandArgs.length < 2) {
          throw new Error("Usage: milestone set-phase <id> <phase>");
        }
        const id = commandArgs[0];
        const phase = commandArgs[1];
        if (!id || !phase) {
          throw new Error("Milestone ID and phase are required");
        }
        checkpoint.setMilestonePhase(
          id,
          validateEnum(phase, VALID_MILESTONE_PHASES, "milestone phase"),
        );
        console.log(JSON.stringify({ success: true }));
        break;
      }

      case "set-status": {
        if (commandArgs.length < 2) {
          throw new Error("Usage: milestone set-status <id> <status>");
        }
        const id = commandArgs[0];
        const status = commandArgs[1];
        if (!id || !status) {
          throw new Error("Milestone ID and status are required");
        }
        checkpoint.setMilestoneStatus(
          id,
          validateEnum(status, VALID_STATUSES, "status"),
        );
        console.log(JSON.stringify({ success: true }));
        break;
      }

      case "list-active": {
        const milestones = checkpoint.listActiveMilestones();
        console.log(JSON.stringify(milestones, null, 2));
        break;
      }

      case "delete": {
        if (commandArgs.length < 1) {
          throw new Error("Usage: milestone delete <id>");
        }
        const id = commandArgs[0];
        if (!id) {
          throw new Error("Milestone ID is required");
        }
        checkpoint.deleteMilestone(id);
        console.log(JSON.stringify({ success: true }));
        break;
      }

      default:
        throw new Error(`Unknown milestone command: ${command}`);
    }
  } else if (category === "baseline") {
    switch (command) {
      case "save": {
        if (commandArgs.length < 6) {
          throw new Error(
            "Usage: baseline save <milestone-id> <lint-exit> <lint-warnings> <lint-errors> <typecheck-exit> <typecheck-errors>",
          );
        }
        const milestoneId = commandArgs[0];
        const lintExit = commandArgs[1];
        const lintWarnings = commandArgs[2];
        const lintErrors = commandArgs[3];
        const typecheckExit = commandArgs[4];
        const typecheckErrors = commandArgs[5];

        if (
          !milestoneId ||
          !lintExit ||
          !lintWarnings ||
          !lintErrors ||
          !typecheckExit ||
          !typecheckErrors
        ) {
          throw new Error("All baseline parameters are required");
        }

        checkpoint.saveBaseline(milestoneId, {
          capturedAt: new Date().toISOString(),
          lintExitCode: parseIntSafe(lintExit, "lint-exit"),
          lintWarnings: parseIntSafe(lintWarnings, "lint-warnings"),
          lintErrors: parseIntSafe(lintErrors, "lint-errors"),
          typecheckExitCode: parseIntSafe(typecheckExit, "typecheck-exit"),
          typecheckErrors: parseIntSafe(typecheckErrors, "typecheck-errors"),
        });
        console.log(JSON.stringify({ success: true }));
        break;
      }

      default:
        throw new Error(`Unknown baseline command: ${command}`);
    }
  } else if (category === "workflow") {
    switch (command) {
      case "create": {
        if (commandArgs.length < 2) {
          throw new Error(
            "Usage: workflow create <issue-number> <branch> [worktree]",
          );
        }
        const issueNumber = commandArgs[0];
        const branch = commandArgs[1];
        const worktree = commandArgs[2];
        if (!issueNumber || !branch) {
          throw new Error("Issue number and branch are required");
        }
        const workflow = checkpoint.create(
          parseIntSafe(issueNumber, "issue-number"),
          branch,
          worktree,
        );
        console.log(JSON.stringify(workflow, null, 2));
        break;
      }

      case "get": {
        if (commandArgs.length < 1) {
          throw new Error("Usage: workflow get <id>");
        }
        const id = commandArgs[0];
        if (!id) {
          throw new Error("Workflow ID is required");
        }
        const data = checkpoint.load(id);
        if (!data) {
          throw new Error(`Workflow not found: ${id}`);
        }
        console.log(JSON.stringify(data, null, 2));
        break;
      }

      case "find": {
        if (commandArgs.length < 1) {
          throw new Error("Usage: workflow find <issue-number>");
        }
        const issueNumber = commandArgs[0];
        if (!issueNumber) {
          throw new Error("Issue number is required");
        }
        const data = checkpoint.findByIssue(
          parseIntSafe(issueNumber, "issue-number"),
        );
        if (!data) {
          throw new Error(`Workflow not found for issue: ${issueNumber}`);
        }
        console.log(JSON.stringify(data, null, 2));
        break;
      }

      case "set-phase": {
        if (commandArgs.length < 2) {
          throw new Error("Usage: workflow set-phase <id> <phase>");
        }
        const id = commandArgs[0];
        const phase = commandArgs[1];
        if (!id || !phase) {
          throw new Error("Workflow ID and phase are required");
        }
        checkpoint.setPhase(
          id,
          validateEnum(phase, VALID_WORKFLOW_PHASES, "workflow phase"),
        );
        console.log(JSON.stringify({ success: true }));
        break;
      }

      case "set-status": {
        if (commandArgs.length < 2) {
          throw new Error("Usage: workflow set-status <id> <status>");
        }
        const id = commandArgs[0];
        const status = commandArgs[1];
        if (!id || !status) {
          throw new Error("Workflow ID and status are required");
        }
        checkpoint.setStatus(
          id,
          validateEnum(status, VALID_STATUSES, "status"),
        );
        console.log(JSON.stringify({ success: true }));
        break;
      }

      case "log-action": {
        if (commandArgs.length < 3) {
          throw new Error(
            "Usage: workflow log-action <id> <action> <result> [metadata-json]",
          );
        }
        const id = commandArgs[0];
        const action = commandArgs[1];
        const result = commandArgs[2];
        const metadataJson = commandArgs[3];
        if (!id || !action || !result) {
          throw new Error("Workflow ID, action, and result are required");
        }
        const metadata = metadataJson
          ? parseJsonSafe(metadataJson, "metadata")
          : undefined;
        checkpoint.logAction(
          id,
          action,
          validateEnum(result, VALID_ACTION_RESULTS, "result"),
          metadata,
        );
        console.log(JSON.stringify({ success: true }));
        break;
      }

      case "log-commit": {
        if (commandArgs.length < 3) {
          throw new Error("Usage: workflow log-commit <id> <sha> <message>");
        }
        const id = commandArgs[0];
        const sha = commandArgs[1];
        if (!id || !sha) {
          throw new Error("Workflow ID and SHA are required");
        }
        const messageParts = commandArgs.slice(2);
        const message = messageParts.join(" ");
        checkpoint.logCommit(id, sha, message);
        console.log(JSON.stringify({ success: true }));
        break;
      }

      case "list-active": {
        const workflows = checkpoint.listActive();
        console.log(JSON.stringify(workflows, null, 2));
        break;
      }

      case "delete": {
        if (commandArgs.length < 1) {
          throw new Error("Usage: workflow delete <id>");
        }
        const id = commandArgs[0];
        if (!id) {
          throw new Error("Workflow ID is required");
        }
        checkpoint.delete(id);
        console.log(JSON.stringify({ success: true }));
        break;
      }

      case "link": {
        if (commandArgs.length < 2) {
          throw new Error(
            "Usage: workflow link <workflow-id> <milestone-id> [wave]",
          );
        }
        const workflowId = commandArgs[0];
        const milestoneId = commandArgs[1];
        const wave = commandArgs[2];
        if (!workflowId || !milestoneId) {
          throw new Error("Workflow ID and milestone ID are required");
        }
        checkpoint.linkWorkflowToMilestone(
          workflowId,
          milestoneId,
          wave ? parseIntSafe(wave, "wave") : undefined,
        );
        console.log(JSON.stringify({ success: true }));
        break;
      }

      case "list": {
        if (commandArgs.length < 1) {
          throw new Error("Usage: workflow list <milestone-id>");
        }
        const milestoneId = commandArgs[0];
        if (!milestoneId) {
          throw new Error("Milestone ID is required");
        }
        const workflows = checkpoint.listMilestoneWorkflows(milestoneId);
        console.log(JSON.stringify(workflows, null, 2));
        break;
      }

      default:
        throw new Error(`Unknown workflow command: ${command}`);
    }
  } else if (category === "session-start") {
    // session-start [--branch <name>] [--issue <number>]
    // Parse optional arguments
    let branch: string | undefined;
    let issueNumber: number | undefined;

    // The "command" variable contains the first arg after category
    const allArgs = command ? [command, ...commandArgs] : commandArgs;

    for (let i = 0; i < allArgs.length; i++) {
      const arg = allArgs[i];
      const nextArg = allArgs[i + 1];
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

      // Write metadata to temp file for session-end to read
      // This enables metrics correlation between session-start and session-end hooks
      try {
        await Bun.write(
          SESSION_METADATA_FILE,
          JSON.stringify(metadata, null, 2),
        );
      } catch (error) {
        // Non-fatal: session-end can still work without the file
        console.warn(
          `Warning: Could not write session metadata file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Exit with appropriate code
    process.exit(0);
  } else if (category === "session-end") {
    // session-end [--workflow-id <id>] [--session-id <id>] [--learnings-injected <count>] [--start-time <iso>]
    let workflowId: string | undefined;
    let sessionId: string | undefined;
    let learningsInjected: number | undefined;
    let startTime: string | undefined;
    let compacted: boolean | undefined;
    let reviewFindings: number | undefined;
    let filesRead: number | undefined;

    // Parse optional arguments
    const allArgs = command ? [command, ...commandArgs] : commandArgs;

    for (let i = 0; i < allArgs.length; i++) {
      const arg = allArgs[i];
      const nextArg = allArgs[i + 1];
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
      } else if (arg === "--review-findings" && nextArg) {
        reviewFindings = parseIntSafe(nextArg, "review-findings");
        i++;
      } else if (arg === "--files-read" && nextArg) {
        filesRead = parseIntSafe(nextArg, "files-read");
        i++;
      }
    }

    // If no session metadata provided via args, try to read from temp file
    // This enables automatic correlation with session-start hook
    if (!sessionId) {
      try {
        const file = Bun.file(SESSION_METADATA_FILE);
        if (await file.exists()) {
          const content = await file.text();
          const savedMetadata = JSON.parse(content) as SessionMetadataFile;

          // Use saved metadata for any values not explicitly provided
          sessionId = savedMetadata.sessionId;
          learningsInjected =
            learningsInjected ?? savedMetadata.learningsInjected;
          startTime = startTime ?? savedMetadata.startTime;

          // Log that we found saved session data
          console.log(
            `Found session metadata from session-start: ${sessionId}`,
          );
        }
      } catch (error) {
        // Non-fatal: continue without session correlation
        console.warn(
          `Warning: Could not read session metadata file: ${error instanceof Error ? error.message : String(error)}`,
        );
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
        const result =
          await $`git log --name-only --pretty=format: -10`.quiet();
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
    });

    // Output result
    console.log(`Learnings stored: ${result.learningsStored}`);
    if (result.learningIds.length > 0) {
      console.log(`Learning IDs: ${result.learningIds.join(", ")}`);
    }
    if (sessionId) {
      console.log(`Session metrics saved for: ${sessionId}`);

      // Clean up the session metadata file after successful recording
      try {
        const file = Bun.file(SESSION_METADATA_FILE);
        if (await file.exists()) {
          const { unlink } = await import("fs/promises");
          await unlink(SESSION_METADATA_FILE);
        }
      } catch {
        // Non-fatal: file cleanup is best-effort
      }
    }

    process.exit(0);
  } else if (category === "learning") {
    switch (command) {
      case "analyze": {
        if (commandArgs.length < 2) {
          throw new Error(
            "Usage: learning analyze <workflow-id> <dev-plan-path>",
          );
        }
        const workflowId = commandArgs[0];
        const devPlanPath = commandArgs[1];
        if (!workflowId || !devPlanPath) {
          throw new Error("Workflow ID and dev plan path are required");
        }

        // Analyze the workflow
        const learning = await analyzeWorkflow(workflowId, devPlanPath);

        // Store the learning
        await storeWorkflowLearning(learning);

        // Output summary
        console.log("Workflow Learning Analysis Complete");
        console.log("===================================");
        console.log(`Issue: #${learning.issueNumber}`);
        console.log(`Branch: ${learning.branch}`);
        console.log(`Planned commits: ${learning.plannedCommits.length}`);
        console.log(`Actual commits: ${learning.actualCommits.length}`);
        console.log(`Deviations: ${learning.deviations.length}`);
        console.log(`Review findings: ${learning.reviewFindings.length}`);
        console.log(`Fixes applied: ${learning.fixesApplied.length}`);
        console.log(`Patterns extracted: ${learning.patterns.length}`);
        console.log(`Mistakes extracted: ${learning.mistakes.length}`);

        if (learning.improvements.length > 0) {
          console.log("\nImprovement suggestions:");
          for (const imp of learning.improvements) {
            console.log(`  - ${imp}`);
          }
        }

        console.log(`\nLearning stored with ID: ${learning.id}`);
        break;
      }

      case "query": {
        // learning query [--code-area <area>] [--file <path>] [--issue <number>]
        let codeArea: string | undefined;
        let filePath: string | undefined;
        let issueNumber: number | undefined;

        // Parse optional arguments
        const allArgs = commandArgs;

        for (let i = 0; i < allArgs.length; i++) {
          const arg = allArgs[i];
          const nextArg = allArgs[i + 1];
          if (arg === "--code-area" && nextArg) {
            codeArea = nextArg;
            i++;
          } else if (arg === "--file" && nextArg) {
            filePath = nextArg;
            i++;
          } else if (arg === "--issue" && nextArg) {
            issueNumber = parseIntSafe(nextArg, "issue");
            i++;
          }
        }

        // At least one filter should be provided
        if (!codeArea && !filePath && issueNumber === undefined) {
          throw new Error(
            "At least one filter is required: --code-area, --file, or --issue",
          );
        }

        // Query the knowledge graph
        const results = await query({
          codeArea,
          filePath,
          issueNumber,
          limit: 20,
        });

        if (results.length === 0) {
          console.log("No learnings found matching the criteria.");
        } else {
          console.log(`Found ${results.length} learning(s):\n`);

          for (const result of results) {
            console.log("---");
            console.log(`ID: ${result.learning.id}`);
            console.log(`Content: ${result.learning.content}`);
            if (result.learning.sourceIssue) {
              console.log(`Source Issue: #${result.learning.sourceIssue}`);
            }
            if (result.learning.codeArea) {
              console.log(`Code Area: ${result.learning.codeArea}`);
            }
            if (result.learning.filePath) {
              console.log(`File: ${result.learning.filePath}`);
            }
            if (result.learning.confidence !== undefined) {
              console.log(
                `Confidence: ${(result.learning.confidence * 100).toFixed(0)}%`,
              );
            }

            if (result.relatedPatterns && result.relatedPatterns.length > 0) {
              console.log("Related Patterns:");
              for (const p of result.relatedPatterns) {
                console.log(`  - ${p.name}: ${p.description}`);
              }
            }

            if (result.relatedMistakes && result.relatedMistakes.length > 0) {
              console.log("Related Mistakes:");
              for (const m of result.relatedMistakes) {
                console.log(`  - ${m.description}`);
                console.log(`    Fix: ${m.howFixed}`);
              }
            }
            console.log("");
          }
        }
        break;
      }

      default:
        throw new Error(`Unknown learning command: ${command}`);
    }
  } else if (category === "metrics") {
    switch (command) {
      case "list": {
        // metrics list [issue-number]
        const issueNumber = commandArgs[0]
          ? parseIntSafe(commandArgs[0], "issue-number")
          : undefined;

        const metrics = checkpoint.getContextMetrics(issueNumber);

        if (metrics.length === 0) {
          console.log(
            issueNumber
              ? `No metrics found for issue #${issueNumber}.`
              : "No metrics recorded yet.",
          );
        } else {
          console.log(`Found ${metrics.length} session(s):\n`);

          for (const m of metrics) {
            console.log("---");
            console.log(`Session: ${m.sessionId}`);
            if (m.issueNumber) {
              console.log(`Issue: #${m.issueNumber}`);
            }
            console.log(`Files Read: ${m.filesRead}`);
            console.log(`Compacted: ${m.compacted ? "Yes" : "No"}`);
            if (m.durationMinutes !== undefined) {
              console.log(`Duration: ${m.durationMinutes} minutes`);
            }
            console.log(`Review Findings: ${m.reviewFindings}`);
            console.log(`Learnings Injected: ${m.learningsInjected}`);
            console.log(`Learnings Captured: ${m.learningsCaptured}`);
            console.log(`Recorded: ${m.createdAt}`);
            console.log("");
          }
        }
        break;
      }

      case "summary": {
        const summary = checkpoint.getMetricsSummary();

        if (summary.totalSessions === 0) {
          console.log("No metrics recorded yet.");
        } else {
          // totalSessions > 0 guaranteed by early return above
          const compactedPercent = (
            (summary.compactedSessions / summary.totalSessions) *
            100
          ).toFixed(1);

          console.log("Context Metrics Summary");
          console.log("=======================");
          console.log(`Total Sessions: ${summary.totalSessions}`);
          console.log(
            `Compacted Sessions: ${summary.compactedSessions} (${compactedPercent}%)`,
          );
          console.log(`Avg Files Read: ${summary.avgFilesRead}`);
          console.log(
            `Avg Learnings Injected: ${summary.avgLearningsInjected}`,
          );
          console.log(
            `Avg Learnings Captured: ${summary.avgLearningsCaptured}`,
          );
          console.log(`Total Review Findings: ${summary.totalReviewFindings}`);
        }
        break;
      }

      default:
        throw new Error(`Unknown metrics command: ${command}`);
    }
  } else if (category === "bootstrap") {
    switch (command) {
      case "mine-prs": {
        // bootstrap mine-prs [limit]
        const limit = commandArgs[0]
          ? parseIntSafe(commandArgs[0], "limit")
          : 50;

        console.log(`Mining up to ${limit} merged PRs for learnings...`);

        const learnings = await mineMergedPRs(limit);

        if (learnings.length === 0) {
          console.log(
            "No learnings extracted. PRs may not have conventional commit titles or summaries.",
          );
        } else {
          // Store the learnings
          await knowledge.store(learnings);

          // Group by code area for summary
          const byArea = new Map<string, number>();
          let withIssue = 0;

          for (const l of learnings) {
            const area = l.codeArea || "unknown";
            byArea.set(area, (byArea.get(area) || 0) + 1);
            if (l.sourceIssue) withIssue++;
          }

          console.log(`\nBootstrap Complete`);
          console.log(`==================`);
          console.log(`Learnings extracted: ${learnings.length}`);
          console.log(`Linked to issues: ${withIssue}`);
          console.log(`\nBy code area:`);

          for (const [area, count] of byArea.entries()) {
            console.log(`  ${area}: ${count}`);
          }
        }
        break;
      }

      default:
        throw new Error(`Unknown bootstrap command: ${command}`);
    }
  } else {
    throw new Error(`Unknown category: ${category}`);
  }

  process.exit(0);
} catch (error) {
  console.error(
    `Error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
