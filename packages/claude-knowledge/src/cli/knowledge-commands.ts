import { knowledge } from "../knowledge/index";
import type { Learning } from "../types";
import { parseIntSafe } from "./shared/validation";
import { randomUUID } from "crypto";

/**
 * Handle knowledge commands.
 */
export async function handleKnowledgeCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "store-learning") {
    // knowledge store-learning <content> [--code-area <area>] [--file <path>] [--confidence <n>]
    if (args.length === 0) {
      throw new Error(
        "Usage: knowledge store-learning <content> [--code-area <area>] [--file <path>] [--confidence <n>]",
      );
    }

    let content = "";
    let codeArea: string | undefined;
    let filePath: string | undefined;
    let confidence: number | undefined;

    // Parse arguments
    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg === "--code-area" && args[i + 1]) {
        codeArea = args[i + 1];
        i += 2;
      } else if (arg === "--file" && args[i + 1]) {
        filePath = args[i + 1];
        i += 2;
      } else if (arg === "--confidence" && args[i + 1]) {
        const confidenceValue = parseIntSafe(args[i + 1], "confidence");
        if (confidenceValue < 0 || confidenceValue > 100) {
          throw new Error("Confidence must be between 0 and 100");
        }
        confidence = confidenceValue / 100; // Convert to 0.0-1.0
        i += 2;
      } else {
        // Accumulate content from positional args
        content += (content ? " " : "") + arg;
        i++;
      }
    }

    if (!content) {
      throw new Error("Learning content is required");
    }

    // Create learning
    const learningId = `learning-${randomUUID()}`;
    const learning: Learning = {
      id: learningId,
      content,
      codeArea,
      filePath,
      confidence,
    };

    // Store the learning
    await knowledge.store([learning]);

    console.log("Learning stored successfully");
    console.log(`ID: ${learningId}`);
    console.log(`Content: ${content}`);
    if (codeArea) {
      console.log(`Code Area: ${codeArea}`);
    }
    if (filePath) {
      console.log(`File: ${filePath}`);
    }
    if (confidence !== undefined) {
      console.log(`Confidence: ${(confidence * 100).toFixed(0)}%`);
    }
  } else {
    throw new Error(`Unknown knowledge command: ${command}`);
  }
}
