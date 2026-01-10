import { checkpoint } from "../checkpoint";
import {
  parseIntSafe,
  validateEnum,
  parseJsonSafe,
  VALID_WORKFLOW_PHASES,
  VALID_STATUSES,
  VALID_ACTION_RESULTS,
} from "./shared";

/**
 * Handle workflow commands.
 */
export async function handleWorkflowCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "create") {
    if (args.length < 2) {
      throw new Error(
        "Usage: workflow create <issue-number> <branch> [worktree]",
      );
    }
    const issueNumber = args[0];
    const branch = args[1];
    const worktree = args[2];
    if (!issueNumber || !branch) {
      throw new Error("Issue number and branch are required");
    }
    const workflow = checkpoint.create(
      parseIntSafe(issueNumber, "issue-number"),
      branch,
      worktree,
    );
    console.log(JSON.stringify(workflow, null, 2));
  } else if (command === "get") {
    if (args.length < 1) {
      throw new Error("Usage: workflow get <id>");
    }
    const id = args[0];
    if (!id) {
      throw new Error("Workflow ID is required");
    }
    const data = checkpoint.load(id);
    if (!data) {
      throw new Error(`Workflow not found: ${id}`);
    }
    console.log(JSON.stringify(data, null, 2));
  } else if (command === "find") {
    if (args.length < 1) {
      throw new Error("Usage: workflow find <issue-number>");
    }
    const issueNumber = args[0];
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
  } else if (command === "set-phase") {
    if (args.length < 2) {
      throw new Error("Usage: workflow set-phase <id> <phase>");
    }
    const id = args[0];
    const phase = args[1];
    if (!id || !phase) {
      throw new Error("Workflow ID and phase are required");
    }
    checkpoint.setPhase(
      id,
      validateEnum(phase, VALID_WORKFLOW_PHASES, "workflow phase"),
    );
    console.log(JSON.stringify({ success: true }));
  } else if (command === "set-status") {
    if (args.length < 2) {
      throw new Error("Usage: workflow set-status <id> <status>");
    }
    const id = args[0];
    const status = args[1];
    if (!id || !status) {
      throw new Error("Workflow ID and status are required");
    }
    checkpoint.setStatus(id, validateEnum(status, VALID_STATUSES, "status"));
    console.log(JSON.stringify({ success: true }));
  } else if (command === "log-action") {
    if (args.length < 3) {
      throw new Error(
        "Usage: workflow log-action <id> <action> <result> [metadata-json]",
      );
    }
    const id = args[0];
    const action = args[1];
    const result = args[2];
    const metadataJson = args[3];
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
  } else if (command === "log-commit") {
    if (args.length < 3) {
      throw new Error("Usage: workflow log-commit <id> <sha> <message>");
    }
    const id = args[0];
    const sha = args[1];
    if (!id || !sha) {
      throw new Error("Workflow ID and SHA are required");
    }
    const messageParts = args.slice(2);
    const message = messageParts.join(" ");
    checkpoint.logCommit(id, sha, message);
    console.log(JSON.stringify({ success: true }));
  } else if (command === "list-active") {
    const workflows = checkpoint.listActive();
    console.log(JSON.stringify(workflows, null, 2));
  } else if (command === "delete") {
    if (args.length < 1) {
      throw new Error("Usage: workflow delete <id>");
    }
    const id = args[0];
    if (!id) {
      throw new Error("Workflow ID is required");
    }
    checkpoint.delete(id);
    console.log(JSON.stringify({ success: true }));
  } else if (command === "link") {
    if (args.length < 2) {
      throw new Error(
        "Usage: workflow link <workflow-id> <milestone-id> [wave]",
      );
    }
    const workflowId = args[0];
    const milestoneId = args[1];
    const wave = args[2];
    if (!workflowId || !milestoneId) {
      throw new Error("Workflow ID and milestone ID are required");
    }
    checkpoint.linkWorkflowToMilestone(
      workflowId,
      milestoneId,
      wave ? parseIntSafe(wave, "wave") : undefined,
    );
    console.log(JSON.stringify({ success: true }));
  } else if (command === "list") {
    if (args.length < 1) {
      throw new Error("Usage: workflow list <milestone-id>");
    }
    const milestoneId = args[0];
    if (!milestoneId) {
      throw new Error("Milestone ID is required");
    }
    const workflows = checkpoint.listMilestoneWorkflows(milestoneId);
    console.log(JSON.stringify(workflows, null, 2));
  } else if (command === "cleanup") {
    // workflow cleanup [hours]
    const hours = args[0] ? parseIntSafe(args[0], "hours") : 24;
    const count = checkpoint.cleanupStaleWorkflows(hours);
    console.log(JSON.stringify({ cleaned: count, thresholdHours: hours }));
  } else {
    throw new Error(`Unknown workflow command: ${command}`);
  }
}
