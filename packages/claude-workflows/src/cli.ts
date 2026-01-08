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

const VALID_BOARD_STATUSES: BoardStatus[] = [
  "backlog",
  "next",
  "inProgress",
  "blocked",
  "done",
];

function isValidBoardStatus(value: string): value is BoardStatus {
  return VALID_BOARD_STATUSES.includes(value as BoardStatus);
}

async function main() {
  const [command, subcommand, ...args] = process.argv.slice(2);

  // Handle no arguments
  if (!command) {
    printHelp();
    process.exit(0);
  }

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
  if (!subcommand) {
    console.error("Usage: workflow telegram <notify|ask> <message>");
    process.exit(1);
  }

  const context = getFlag(args, "--context") || "CLI";

  switch (subcommand) {
    case "notify": {
      const message = args.filter((a) => !a.startsWith("--")).join(" ");
      if (!message) {
        console.error("Usage: workflow telegram notify <message>");
        process.exit(1);
      }
      const result = await notifyTelegram(message, context);
      console.log(result.success ? "Sent" : `Failed: ${result.error}`);
      process.exit(result.success ? 0 : 1);
      break;
    }

    case "ask": {
      const question = args.filter((a) => !a.startsWith("--")).join(" ");
      if (!question) {
        console.error("Usage: workflow telegram ask <question>");
        process.exit(1);
      }
      const response = await askTelegram(question, context);
      console.log(response);
      break;
    }

    default:
      console.error(`Unknown telegram subcommand: ${subcommand}`);
      console.error("Valid subcommands: notify, ask");
      process.exit(1);
  }
}

async function handleBoard(subcommand: string, args: string[]) {
  if (!subcommand) {
    console.error("Usage: workflow board <move> <issue> <status>");
    process.exit(1);
  }

  const context = getFlag(args, "--context") || "CLI";

  switch (subcommand) {
    case "move": {
      const positionalArgs = args.filter((a) => !a.startsWith("--"));
      const [issueNumberStr, status] = positionalArgs;

      // Validate issue number
      if (!issueNumberStr) {
        console.error("Usage: workflow board move <issue-number> <status>");
        console.error(`Valid statuses: ${VALID_BOARD_STATUSES.join(", ")}`);
        process.exit(1);
      }

      const issueNumber = parseInt(issueNumberStr, 10);
      if (Number.isNaN(issueNumber) || issueNumber <= 0) {
        console.error(`Invalid issue number: "${issueNumberStr}"`);
        console.error("Issue number must be a positive integer");
        process.exit(1);
      }

      // Validate status
      if (!status) {
        console.error("Usage: workflow board move <issue-number> <status>");
        console.error(`Valid statuses: ${VALID_BOARD_STATUSES.join(", ")}`);
        process.exit(1);
      }

      if (!isValidBoardStatus(status)) {
        console.error(`Invalid status: "${status}"`);
        console.error(`Valid statuses: ${VALID_BOARD_STATUSES.join(", ")}`);
        process.exit(1);
      }

      const result = await moveIssueToStatus(issueNumber, status, context);
      console.log(result.success ? "Updated" : `Failed: ${result.error}`);
      process.exit(result.success ? 0 : 1);
      break;
    }

    default:
      console.error(`Unknown board subcommand: ${subcommand}`);
      console.error("Valid subcommands: move");
      process.exit(1);
  }
}

async function handleValidate(subcommand: string) {
  if (!subcommand) {
    console.error("Usage: workflow validate <basic|full>");
    process.exit(1);
  }

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
      console.error("Valid subcommands: basic, full");
      process.exit(1);
  }
}

async function handleDeps(subcommand: string, args: string[]) {
  if (!subcommand) {
    console.error("Usage: workflow deps <check> <body>");
    process.exit(1);
  }

  const context = getFlag(args, "--context") || "CLI";

  switch (subcommand) {
    case "check": {
      const issueBody = args.filter((a) => !a.startsWith("--")).join(" ");
      if (!issueBody) {
        console.error("Usage: workflow deps check <issue-body>");
        process.exit(1);
      }
      const result = await checkDependencies(issueBody, context);
      console.log(formatDependencyReport(result));
      process.exit(result.canProceed ? 0 : 1);
      break;
    }

    default:
      console.error(`Unknown deps subcommand: ${subcommand}`);
      console.error("Valid subcommands: check");
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
    Statuses: ${VALID_BOARD_STATUSES.join(", ")}

  validate basic                                Run type-check + lint
  validate full                                 Run test + type-check + lint + build

  deps check <body> [--context <ctx>]           Check dependencies in issue body

Options:
  --context <ctx>    Context string for logging (default: CLI)
  --help, -h         Show this help message
`);
}

main().catch((error) => {
  const [command, subcommand] = process.argv.slice(2);
  console.error(
    `[workflow] Fatal error in "${command || "unknown"} ${subcommand || ""}":`,
    error,
  );
  process.exit(1);
});
