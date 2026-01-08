#!/usr/bin/env bun
/**
 * Claude Workflows CLI
 *
 * CLI wrapper for invoking workflow helpers from shell scripts.
 *
 * Usage:
 *   workflow telegram notify "message" --context "WORK-ON-ISSUE"
 *   workflow board move 123 inProgress --context "AUTO-ISSUE"
 *   workflow validate basic
 *   workflow validate full
 */

import { notifyTelegram, askTelegram } from "./helpers/telegram";
import { moveIssueToStatus } from "./helpers/board";
import type { BoardStatus } from "./types";
import { validateBasic, validateFull } from "./helpers/validation";
import {
  checkDependencies,
  formatDependencyReport,
} from "./helpers/dependencies";

async function main() {
  const [command, subcommand, ...args] = process.argv.slice(2);

  switch (command) {
    case "telegram":
      await handleTelegram(subcommand, args);
      break;

    case "board":
      await handleBoard(subcommand, args);
      break;

    case "validate":
      await handleValidate(subcommand);
      break;

    case "deps":
      await handleDeps(subcommand, args);
      break;

    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

async function handleTelegram(subcommand: string, args: string[]) {
  const context = getFlag(args, "--context") || "CLI";

  switch (subcommand) {
    case "notify": {
      const message = args.filter((a) => !a.startsWith("--")).join(" ");
      const result = await notifyTelegram(message, context);
      console.log(result.success ? "Sent" : "Failed");
      break;
    }

    case "ask": {
      const question = args.filter((a) => !a.startsWith("--")).join(" ");
      const response = await askTelegram(question, context);
      console.log(response);
      break;
    }

    default:
      console.error(`Unknown telegram subcommand: ${subcommand}`);
      process.exit(1);
  }
}

async function handleBoard(subcommand: string, args: string[]) {
  const context = getFlag(args, "--context") || "CLI";

  switch (subcommand) {
    case "move": {
      const [issueNumber, status] = args.filter((a) => !a.startsWith("--"));
      const result = await moveIssueToStatus(
        parseInt(issueNumber, 10),
        status as BoardStatus,
        context,
      );
      console.log(result.success ? "Updated" : `Failed: ${result.error}`);
      break;
    }

    default:
      console.error(`Unknown board subcommand: ${subcommand}`);
      process.exit(1);
  }
}

async function handleValidate(subcommand: string) {
  switch (subcommand) {
    case "basic": {
      const result = await validateBasic();
      if (!result.success) {
        console.error(`Validation failed at ${result.stage}:`);
        console.error(result.output);
        process.exit(1);
      }
      console.log("Basic validation passed");
      break;
    }

    case "full": {
      const result = await validateFull();
      if (!result.success) {
        console.error(`Validation failed at ${result.stage}:`);
        console.error(result.output);
        process.exit(1);
      }
      console.log("Full validation passed");
      break;
    }

    default:
      console.error(`Unknown validate subcommand: ${subcommand}`);
      process.exit(1);
  }
}

async function handleDeps(subcommand: string, args: string[]) {
  const context = getFlag(args, "--context") || "CLI";

  switch (subcommand) {
    case "check": {
      const issueBody = args.filter((a) => !a.startsWith("--")).join(" ");
      const result = await checkDependencies(issueBody, context);
      console.log(formatDependencyReport(result));
      process.exit(result.canProceed ? 0 : 1);
      break;
    }

    default:
      console.error(`Unknown deps subcommand: ${subcommand}`);
      process.exit(1);
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

function printHelp() {
  console.log(`
Claude Workflows CLI

Usage:
  workflow <command> <subcommand> [args]

Commands:
  telegram notify <message> [--context <ctx>]   Send Telegram notification
  telegram ask <question> [--context <ctx>]     Ask via Telegram (blocking)

  board move <issue> <status> [--context <ctx>] Move issue to status

  validate basic                                Run type-check + lint
  validate full                                 Run test + type-check + lint + build

  deps check <body> [--context <ctx>]           Check dependencies in issue body

Options:
  --context <ctx>    Context string for logging (default: CLI)
  --help, -h         Show this help message
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
