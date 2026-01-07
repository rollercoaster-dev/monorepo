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

const [cmd, ...args] = process.argv.slice(2);

try {
  switch (cmd) {
    case "create": {
      const [issue, branch, worktree] = args;
      const result = checkpoint.create(+issue, branch, worktree || null);
      console.log(JSON.stringify(result));
      break;
    }

    case "find": {
      const [issue] = args;
      const result = checkpoint.findByIssue(+issue);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "set-phase": {
      const [workflowId, phase] = args;
      checkpoint.setPhase(
        workflowId,
        phase as "research" | "implement" | "review" | "finalize",
      );
      console.log(`Phase set to: ${phase}`);
      break;
    }

    case "set-status": {
      const [workflowId, status] = args;
      checkpoint.setStatus(
        workflowId,
        status as "running" | "completed" | "failed",
      );
      console.log(`Status set to: ${status}`);
      break;
    }

    case "log-action": {
      const [workflowId, action, result, metadataJson] = args;
      const metadata = metadataJson ? JSON.parse(metadataJson) : undefined;
      checkpoint.logAction(
        workflowId,
        action,
        result as "success" | "failed" | "pending",
        metadata,
      );
      console.log(`Action logged: ${action} (${result})`);
      break;
    }

    case "log-commit": {
      const [workflowId, sha, message] = args;
      checkpoint.logCommit(workflowId, sha, message);
      console.log(`Commit logged: ${sha.slice(0, 7)}`);
      break;
    }

    case "increment-retry": {
      const [workflowId] = args;
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
