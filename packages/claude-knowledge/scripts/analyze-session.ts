#!/usr/bin/env bun
/**
 * Session Token Analysis Script
 *
 * Parses Claude Code session JSONL files and analyzes token usage by tool type.
 * Part of Issue #431 research: evaluating context strategies.
 */

import { readFileSync, existsSync } from "fs";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";

// Tool categories
const EXPLORATION_TOOLS = new Set(["Read", "Grep", "Glob", "LS", "LSP"]);

const IMPLEMENTATION_TOOLS = new Set([
  "Edit",
  "Write",
  "MultiEdit",
  "NotebookEdit",
]);

const RESEARCH_TOOLS = new Set(["WebSearch", "WebFetch", "Task"]);

const META_TOOLS = new Set(["TodoWrite", "Skill", "AskUserQuestion"]);

interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface ContentBlock {
  type: string;
  name?: string;
  input?: Record<string, unknown>;
  text?: string;
}

interface Message {
  type: string;
  role?: string;
  content?: ContentBlock[];
  usage?: Usage;
}

interface SessionEntry {
  type: string;
  message?: Message;
  timestamp?: string;
}

interface ToolStats {
  count: number;
  outputTokens: number;
  examples: string[];
}

function categorizeTool(name: string, input?: Record<string, unknown>): string {
  // Special handling for Bash - categorize by command
  if (name === "Bash") {
    const command = (input?.command as string) || "";
    if (command.startsWith("gh ")) return "GitHub";
    if (command.includes("ls ") || command.startsWith("ls"))
      return "Exploration";
    if (
      command.includes("cat ") ||
      command.includes("head ") ||
      command.includes("tail ")
    )
      return "Exploration";
    if (
      command.includes("git status") ||
      command.includes("git log") ||
      command.includes("git diff")
    )
      return "Exploration";
    if (command.includes("git commit") || command.includes("git push"))
      return "Implementation";
    if (command.includes("bun test") || command.includes("bun run"))
      return "Validation";
    if (
      command.includes("jq") ||
      command.includes("grep") ||
      command.includes("find")
    )
      return "Exploration";
    return "Bash:Other";
  }

  if (EXPLORATION_TOOLS.has(name)) return "Exploration";
  if (IMPLEMENTATION_TOOLS.has(name)) return "Implementation";
  if (RESEARCH_TOOLS.has(name)) return "Research";
  if (META_TOOLS.has(name)) return "Meta";

  return "Other";
}

function analyzeSession(filePath: string): void {
  if (!existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");

  // Stats
  const toolsByCategory: Record<string, ToolStats> = {};
  const toolsByName: Record<string, ToolStats> = {};
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;
  let messageCount = 0;
  let toolCallCount = 0;

  for (const line of lines) {
    try {
      const entry: SessionEntry = JSON.parse(line);

      if (entry.type !== "assistant" || !entry.message) continue;

      const msg = entry.message;
      messageCount++;

      // Aggregate usage
      if (msg.usage) {
        totalInputTokens += msg.usage.input_tokens || 0;
        totalOutputTokens += msg.usage.output_tokens || 0;
        totalCacheCreation += msg.usage.cache_creation_input_tokens || 0;
        totalCacheRead += msg.usage.cache_read_input_tokens || 0;
      }

      // Count tool calls
      if (msg.content && Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "tool_use" && block.name) {
            toolCallCount++;
            const name = block.name;
            const category = categorizeTool(name, block.input);

            // Per-tool stats
            if (!toolsByName[name]) {
              toolsByName[name] = { count: 0, outputTokens: 0, examples: [] };
            }
            toolsByName[name].count++;
            toolsByName[name].outputTokens += msg.usage?.output_tokens || 0;

            // Per-category stats
            if (!toolsByCategory[category]) {
              toolsByCategory[category] = {
                count: 0,
                outputTokens: 0,
                examples: [],
              };
            }
            toolsByCategory[category].count++;
            toolsByCategory[category].outputTokens +=
              msg.usage?.output_tokens || 0;

            // Save example (first 3)
            if (toolsByCategory[category].examples.length < 3) {
              if (name === "Bash" && block.input?.command) {
                const cmd = (block.input.command as string).slice(0, 60);
                toolsByCategory[category].examples.push(`${name}: ${cmd}...`);
              } else if (name === "Read" && block.input?.file_path) {
                toolsByCategory[category].examples.push(
                  `${name}: ${block.input.file_path}`,
                );
              } else {
                toolsByCategory[category].examples.push(name);
              }
            }
          }
        }
      }
    } catch (e) {
      // Skip malformed lines
    }
  }

  // Calculate exploration ratio
  const explorationTokens =
    (toolsByCategory["Exploration"]?.outputTokens || 0) +
    (toolsByCategory["Research"]?.outputTokens || 0);
  const _implementationTokens =
    toolsByCategory["Implementation"]?.outputTokens || 0;
  const explorationRatio =
    totalOutputTokens > 0
      ? ((explorationTokens / totalOutputTokens) * 100).toFixed(1)
      : "0";

  // Print report
  logger.info("=".repeat(60));
  logger.info("SESSION TOKEN ANALYSIS");
  logger.info("=".repeat(60));
  logger.info(`File: ${filePath}`);
  logger.info(`Messages: ${messageCount}`);
  logger.info(`Tool Calls: ${toolCallCount}`);

  logger.info("--- TOKEN SUMMARY ---");
  logger.info(`Input Tokens:    ${totalInputTokens.toLocaleString()}`);
  logger.info(`Output Tokens:   ${totalOutputTokens.toLocaleString()}`);
  logger.info(`Cache Creation:  ${totalCacheCreation.toLocaleString()}`);
  logger.info(`Cache Read:      ${totalCacheRead.toLocaleString()}`);
  logger.info(
    `Total Context:   ${(totalInputTokens + totalCacheCreation + totalCacheRead).toLocaleString()}`,
  );

  logger.info("--- TOOL CALLS BY CATEGORY ---");
  const sortedCategories = Object.entries(toolsByCategory).sort(
    (a, b) => b[1].count - a[1].count,
  );

  for (const [category, stats] of sortedCategories) {
    const pct = ((stats.count / toolCallCount) * 100).toFixed(1);
    logger.info(`${category}: ${stats.count} calls (${pct}%)`);
    logger.info(`  Output tokens: ${stats.outputTokens.toLocaleString()}`);
    if (stats.examples.length > 0) {
      logger.info(`  Examples: ${stats.examples.slice(0, 2).join(", ")}`);
    }
  }

  logger.info("--- TOOL CALLS BY NAME ---");
  const sortedTools = Object.entries(toolsByName)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  for (const [name, stats] of sortedTools) {
    logger.info(`  ${name}: ${stats.count} calls`);
  }

  logger.info("--- KEY METRICS ---");
  logger.info(
    `Exploration Ratio: ${explorationRatio}% of output tokens on exploration/research`,
  );
  logger.info(
    `Exploration Calls: ${(toolsByCategory["Exploration"]?.count || 0) + (toolsByCategory["Research"]?.count || 0)} / ${toolCallCount}`,
  );

  // Output JSON for logging
  logger.info("--- JSON OUTPUT (for workflow logging) ---");
  const jsonOutput = {
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreation,
    totalCacheRead,
    toolCallCount,
    explorationRatio: parseFloat(explorationRatio),
    categoryCounts: Object.fromEntries(
      Object.entries(toolsByCategory).map(([k, v]) => [k, v.count]),
    ),
    topTools: sortedTools
      .slice(0, 5)
      .map(([name, stats]) => ({ name, count: stats.count })),
  };
  logger.info(JSON.stringify(jsonOutput, null, 2));
}

// Main
const sessionFile = process.argv[2];
if (!sessionFile) {
  logger.info("Usage: bun analyze-session.ts <session-file.jsonl>");
  logger.info("Example:");
  logger.info(
    "  bun analyze-session.ts ~/.claude/projects/.../session-id.jsonl",
  );
  process.exit(1);
}

analyzeSession(sessionFile);
