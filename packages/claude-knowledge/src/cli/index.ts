#!/usr/bin/env bun
import {
  handleMilestoneCommands,
  handleBaselineCommands,
} from "./milestone-commands";
import { handleWorkflowCommands } from "./workflow-commands";
import { handleSessionStart, handleSessionEnd } from "./session-commands";
import { handleLearningCommands } from "./learning-commands";
import { handleMetricsCommands } from "./metrics-commands";
import { handleBootstrapCommands } from "./bootstrap-commands";

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
  console.error("  workflow cleanup [hours]");
  console.error("  session-start [--branch <name>] [--issue <number>]");
  console.error(
    "  session-end [--workflow-id <id>] [--session-id <id>] [--learnings-injected <n>] [--start-time <iso>] [--compacted] [--interrupted] [--review-findings <n>] [--files-read <n>]",
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
    await handleMilestoneCommands(command, commandArgs);
  } else if (category === "baseline") {
    await handleBaselineCommands(command, commandArgs);
  } else if (category === "workflow") {
    await handleWorkflowCommands(command, commandArgs);
  } else if (category === "session-start") {
    // session-start doesn't use command/commandArgs split the same way
    // The "command" variable contains the first arg after category
    const allArgs = command ? [command, ...commandArgs] : commandArgs;
    await handleSessionStart(allArgs);
  } else if (category === "session-end") {
    // session-end doesn't use command/commandArgs split the same way
    const allArgs = command ? [command, ...commandArgs] : commandArgs;
    await handleSessionEnd(allArgs);
  } else if (category === "learning") {
    await handleLearningCommands(command, commandArgs);
  } else if (category === "metrics") {
    await handleMetricsCommands(command, commandArgs);
  } else if (category === "bootstrap") {
    await handleBootstrapCommands(command, commandArgs);
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
