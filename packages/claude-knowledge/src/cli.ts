#!/usr/bin/env bun
import { checkpoint } from "./checkpoint";
import type { MilestonePhase, WorkflowPhase, WorkflowStatus } from "./types";

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
