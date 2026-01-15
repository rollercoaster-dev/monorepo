import { knowledge } from "../knowledge/index";
import type { Learning, Pattern, Mistake } from "../types";
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
  } else if (command === "store-pattern") {
    // knowledge store-pattern <name> <description> [--code-area <area>]
    if (args.length < 2) {
      throw new Error(
        "Usage: knowledge store-pattern <name> <description> [--code-area <area>]",
      );
    }

    let name = "";
    let description = "";
    let codeArea: string | undefined;

    // Parse arguments
    let i = 0;
    const positionalArgs: string[] = [];
    while (i < args.length) {
      const arg = args[i];

      if (arg === "--code-area" && args[i + 1]) {
        codeArea = args[i + 1];
        i += 2;
      } else {
        positionalArgs.push(arg);
        i++;
      }
    }

    // First positional is name, rest is description
    if (positionalArgs.length < 2) {
      throw new Error("Both <name> and <description> are required");
    }

    name = positionalArgs[0];
    description = positionalArgs.slice(1).join(" ");

    // Create pattern
    const patternId = `pattern-${randomUUID()}`;
    const pattern: Pattern = {
      id: patternId,
      name,
      description,
      codeArea,
    };

    // Store the pattern
    await knowledge.storePattern(pattern);

    console.log("Pattern stored successfully");
    console.log(`ID: ${patternId}`);
    console.log(`Name: ${name}`);
    console.log(`Description: ${description}`);
    if (codeArea) {
      console.log(`Code Area: ${codeArea}`);
    }
  } else if (command === "store-mistake") {
    // knowledge store-mistake <description> <how-fixed> [--file <path>]
    if (args.length < 2) {
      throw new Error(
        "Usage: knowledge store-mistake <description> <how-fixed> [--file <path>]",
      );
    }

    let description = "";
    let howFixed = "";
    let filePath: string | undefined;

    // Parse arguments
    let i = 0;
    const positionalArgs: string[] = [];
    while (i < args.length) {
      const arg = args[i];

      if (arg === "--file" && args[i + 1]) {
        filePath = args[i + 1];
        i += 2;
      } else {
        positionalArgs.push(arg);
        i++;
      }
    }

    // First positional is description, rest is how-fixed
    if (positionalArgs.length < 2) {
      throw new Error("Both <description> and <how-fixed> are required");
    }

    description = positionalArgs[0];
    howFixed = positionalArgs.slice(1).join(" ");

    // Create mistake
    const mistakeId = `mistake-${randomUUID()}`;
    const mistake: Mistake = {
      id: mistakeId,
      description,
      howFixed,
      filePath,
    };

    // Store the mistake
    await knowledge.storeMistake(mistake);

    console.log("Mistake stored successfully");
    console.log(`ID: ${mistakeId}`);
    console.log(`Description: ${description}`);
    console.log(`How Fixed: ${howFixed}`);
    if (filePath) {
      console.log(`File: ${filePath}`);
    }
  } else if (command === "query") {
    // knowledge query [--code-area <area>] [--file <path>] [--text <keyword>] [--issue <n>] [--limit <n>]
    let codeArea: string | undefined;
    let filePath: string | undefined;
    const keywords: string[] = [];
    let issueNumber: number | undefined;
    let limit: number | undefined;

    // Parse optional arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];
      if (arg === "--code-area" && nextArg) {
        codeArea = nextArg;
        i++;
      } else if (arg === "--file" && nextArg) {
        filePath = nextArg;
        i++;
      } else if (arg === "--text" && nextArg) {
        keywords.push(nextArg);
        i++;
      } else if (arg === "--issue" && nextArg) {
        issueNumber = parseIntSafe(nextArg, "issue");
        i++;
      } else if (arg === "--limit" && nextArg) {
        limit = parseIntSafe(nextArg, "limit");
        i++;
      }
    }

    // Query the knowledge graph
    const results = await knowledge.query({
      codeArea,
      filePath,
      keywords: keywords.length > 0 ? keywords : undefined,
      issueNumber,
      limit,
    });

    if (results.length === 0) {
      console.log("No learnings found matching the criteria.");
    } else {
      console.log(`Found ${results.length} learning(s):\n`);

      for (const result of results) {
        console.log("---");
        console.log(`ID: ${result.learning.id}`);
        console.log(`Content: ${result.learning.content}`);
        if (result.learning.sourceIssue) {
          console.log(`Source Issue: #${result.learning.sourceIssue}`);
        }
        if (result.learning.codeArea) {
          console.log(`Code Area: ${result.learning.codeArea}`);
        }
        if (result.learning.filePath) {
          console.log(`File: ${result.learning.filePath}`);
        }
        if (result.learning.confidence !== undefined) {
          console.log(
            `Confidence: ${(result.learning.confidence * 100).toFixed(0)}%`,
          );
        }

        if (result.relatedPatterns && result.relatedPatterns.length > 0) {
          console.log("Related Patterns:");
          for (const p of result.relatedPatterns) {
            console.log(`  - ${p.name}: ${p.description}`);
          }
        }

        if (result.relatedMistakes && result.relatedMistakes.length > 0) {
          console.log("Related Mistakes:");
          for (const m of result.relatedMistakes) {
            console.log(`  - ${m.description}`);
            console.log(`    Fix: ${m.howFixed}`);
          }
        }
        console.log("");
      }
    }
  } else {
    throw new Error(`Unknown knowledge command: ${command}`);
  }
}
