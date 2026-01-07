#!/usr/bin/env bun
/**
 * Checkpoint CLI - Lightweight wrapper for checkpoint API
 * Used by /auto-issue and /auto-milestone workflows
 *
 * Usage:
 *   bun scripts/checkpoint-cli.ts create <issue> <branch>
 *   bun scripts/checkpoint-cli.ts find <issue>
 *   bun scripts/checkpoint-cli.ts set-phase <workflowId> <phase>
 *   bun scripts/checkpoint-cli.ts set-status <workflowId> <status>
 *   bun scripts/checkpoint-cli.ts log-action <workflowId> <action> <result> [metadata]
 *   bun scripts/checkpoint-cli.ts log-commit <workflowId> <sha> <message>
 *   bun scripts/checkpoint-cli.ts increment-retry <workflowId>
 *   bun scripts/checkpoint-cli.ts list-active
 */

import { checkpoint } from "../packages/claude-knowledge/src/checkpoint.ts";
import type {
  WorkflowPhase,
  WorkflowStatus,
} from "../packages/claude-knowledge/src/types.ts";

const VALID_PHASES: readonly WorkflowPhase[] = [
  "research",
  "implement",
  "review",
  "finalize",
  "planning",
  "execute",
  "merge",
  "cleanup",
] as const;

const VALID_STATUSES: readonly WorkflowStatus[] = [
  "running",
  "paused",
  "completed",
  "failed",
] as const;

const VALID_RESULTS = ["success", "failed", "pending"] as const;
type ActionResult = (typeof VALID_RESULTS)[number];

function isValidPhase(phase: string): phase is WorkflowPhase {
  return VALID_PHASES.includes(phase as WorkflowPhase);
}

function isValidStatus(status: string): status is WorkflowStatus {
  return VALID_STATUSES.includes(status as WorkflowStatus);
}

function isValidResult(result: string): result is ActionResult {
  return VALID_RESULTS.includes(result as ActionResult);
}

const [cmd, ...args] = process.argv.slice(2);

try {
  switch (cmd) {
    case "create": {
      const [issue, branch, worktree] = args;
      if (!issue || !branch) {
        console.error(
          "Error: 'create' requires <issue> and <branch> arguments",
        );
        process.exit(1);
      }
      const issueNum = parseInt(issue, 10);
      if (isNaN(issueNum)) {
        console.error(`Error: Invalid issue number '${issue}'`);
        process.exit(1);
      }
      const result = checkpoint.create(issueNum, branch, worktree || null);
      console.log(JSON.stringify(result));
      break;
    }

    case "find": {
      const [issue] = args;
      if (!issue) {
        console.error("Error: 'find' requires <issue> argument");
        process.exit(1);
      }
      const issueNum = parseInt(issue, 10);
      if (isNaN(issueNum)) {
        console.error(`Error: Invalid issue number '${issue}'`);
        process.exit(1);
      }
      const result = checkpoint.findByIssue(issueNum);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "set-phase": {
      const [workflowId, phase] = args;
      if (!workflowId || !phase) {
        console.error(
          "Error: 'set-phase' requires <workflowId> and <phase> arguments",
        );
        process.exit(1);
      }
      if (!isValidPhase(phase)) {
        console.error(
          `Error: Invalid phase '${phase}'. Valid phases: ${VALID_PHASES.join(", ")}`,
        );
        process.exit(1);
      }
      checkpoint.setPhase(workflowId, phase);
      console.log(`Phase set to: ${phase}`);
      break;
    }

    case "set-status": {
      const [workflowId, status] = args;
      if (!workflowId || !status) {
        console.error(
          "Error: 'set-status' requires <workflowId> and <status> arguments",
        );
        process.exit(1);
      }
      if (!isValidStatus(status)) {
        console.error(
          `Error: Invalid status '${status}'. Valid statuses: ${VALID_STATUSES.join(", ")}`,
        );
        process.exit(1);
      }
      checkpoint.setStatus(workflowId, status);
      console.log(`Status set to: ${status}`);
      break;
    }

    case "log-action": {
      const [workflowId, action, result, metadataJson] = args;
      if (!workflowId || !action || !result) {
        console.error(
          "Error: 'log-action' requires <workflowId>, <action>, and <result> arguments",
        );
        process.exit(1);
      }
      if (!isValidResult(result)) {
        console.error(
          `Error: Invalid result '${result}'. Valid results: ${VALID_RESULTS.join(", ")}`,
        );
        process.exit(1);
      }
      let metadata: Record<string, unknown> | undefined;
      if (metadataJson) {
        try {
          metadata = JSON.parse(metadataJson) as Record<string, unknown>;
        } catch (e) {
          console.error(
            `Error: Invalid JSON metadata: ${e instanceof Error ? e.message : e}`,
          );
          process.exit(1);
        }
      }
      checkpoint.logAction(workflowId, action, result, metadata);
      console.log(`Action logged: ${action} (${result})`);
      break;
    }

    case "log-commit": {
      const [workflowId, sha, message] = args;
      if (!workflowId || !sha || !message) {
        console.error(
          "Error: 'log-commit' requires <workflowId>, <sha>, and <message> arguments",
        );
        process.exit(1);
      }
      checkpoint.logCommit(workflowId, sha, message);
      console.log(`Commit logged: ${sha.slice(0, 7)}`);
      break;
    }

    case "increment-retry": {
      const [workflowId] = args;
      if (!workflowId) {
        console.error(
          "Error: 'increment-retry' requires <workflowId> argument",
        );
        process.exit(1);
      }
      const count = checkpoint.incrementRetry(workflowId);
      console.log(`Retry count: ${count}`);
      break;
    }

    case "list-active": {
      const result = checkpoint.listActive();
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      console.error(
        "Commands: create, find, set-phase, set-status, log-action, log-commit, increment-retry, list-active",
      );
      process.exit(1);
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
