import { checkpoint } from "../checkpoint";
import {
  parseIntSafe,
  validateEnum,
  VALID_MILESTONE_PHASES,
  VALID_STATUSES,
} from "./shared";

/**
 * Handle milestone and baseline commands.
 */
export async function handleMilestoneCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "create") {
    if (args.length < 1) {
      throw new Error("Usage: milestone create <name> [github-number]");
    }
    const name = args[0];
    const githubNumber = args[1];
    if (!name) {
      throw new Error("Milestone name is required");
    }
    const milestone = checkpoint.createMilestone(
      name,
      githubNumber ? parseIntSafe(githubNumber, "github-number") : undefined,
    );
    console.log(JSON.stringify(milestone, null, 2));
  } else if (command === "get") {
    if (args.length < 1) {
      throw new Error("Usage: milestone get <id>");
    }
    const id = args[0];
    if (!id) {
      throw new Error("Milestone ID is required");
    }
    const data = checkpoint.getMilestone(id);
    if (!data) {
      throw new Error(`Milestone not found: ${id}`);
    }
    console.log(JSON.stringify(data, null, 2));
  } else if (command === "find") {
    if (args.length < 1) {
      throw new Error("Usage: milestone find <name>");
    }
    const name = args[0];
    if (!name) {
      throw new Error("Milestone name is required");
    }
    const data = checkpoint.findMilestoneByName(name);
    if (!data) {
      throw new Error(`Milestone not found: ${name}`);
    }
    console.log(JSON.stringify(data, null, 2));
  } else if (command === "set-phase") {
    if (args.length < 2) {
      throw new Error("Usage: milestone set-phase <id> <phase>");
    }
    const id = args[0];
    const phase = args[1];
    if (!id || !phase) {
      throw new Error("Milestone ID and phase are required");
    }
    checkpoint.setMilestonePhase(
      id,
      validateEnum(phase, VALID_MILESTONE_PHASES, "milestone phase"),
    );
    console.log(JSON.stringify({ success: true }));
  } else if (command === "set-status") {
    if (args.length < 2) {
      throw new Error("Usage: milestone set-status <id> <status>");
    }
    const id = args[0];
    const status = args[1];
    if (!id || !status) {
      throw new Error("Milestone ID and status are required");
    }
    checkpoint.setMilestoneStatus(
      id,
      validateEnum(status, VALID_STATUSES, "status"),
    );
    console.log(JSON.stringify({ success: true }));
  } else if (command === "list-active") {
    const milestones = checkpoint.listActiveMilestones();
    console.log(JSON.stringify(milestones, null, 2));
  } else if (command === "delete") {
    if (args.length < 1) {
      throw new Error("Usage: milestone delete <id>");
    }
    const id = args[0];
    if (!id) {
      throw new Error("Milestone ID is required");
    }
    checkpoint.deleteMilestone(id);
    console.log(JSON.stringify({ success: true }));
  } else {
    throw new Error(`Unknown milestone command: ${command}`);
  }
}

/**
 * Handle baseline commands.
 */
export async function handleBaselineCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "save") {
    if (args.length < 6) {
      throw new Error(
        "Usage: baseline save <milestone-id> <lint-exit> <lint-warnings> <lint-errors> <typecheck-exit> <typecheck-errors>",
      );
    }
    const milestoneId = args[0];
    const lintExit = args[1];
    const lintWarnings = args[2];
    const lintErrors = args[3];
    const typecheckExit = args[4];
    const typecheckErrors = args[5];

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
  } else {
    throw new Error(`Unknown baseline command: ${command}`);
  }
}
