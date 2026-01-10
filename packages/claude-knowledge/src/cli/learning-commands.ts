import { analyzeWorkflow, storeWorkflowLearning, query } from "../knowledge";
import { parseIntSafe } from "./shared";

/**
 * Handle learning commands.
 */
export async function handleLearningCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "analyze") {
    if (args.length < 2) {
      throw new Error("Usage: learning analyze <workflow-id> <dev-plan-path>");
    }
    const workflowId = args[0];
    const devPlanPath = args[1];
    if (!workflowId || !devPlanPath) {
      throw new Error("Workflow ID and dev plan path are required");
    }

    // Analyze the workflow
    const learning = await analyzeWorkflow(workflowId, devPlanPath);

    // Store the learning
    await storeWorkflowLearning(learning);

    // Output summary
    console.log("Workflow Learning Analysis Complete");
    console.log("===================================");
    console.log(`Issue: #${learning.issueNumber}`);
    console.log(`Branch: ${learning.branch}`);
    console.log(`Planned commits: ${learning.plannedCommits.length}`);
    console.log(`Actual commits: ${learning.actualCommits.length}`);
    console.log(`Deviations: ${learning.deviations.length}`);
    console.log(`Review findings: ${learning.reviewFindings.length}`);
    console.log(`Fixes applied: ${learning.fixesApplied.length}`);
    console.log(`Patterns extracted: ${learning.patterns.length}`);
    console.log(`Mistakes extracted: ${learning.mistakes.length}`);

    if (learning.improvements.length > 0) {
      console.log("\nImprovement suggestions:");
      for (const imp of learning.improvements) {
        console.log(`  - ${imp}`);
      }
    }

    console.log(`\nLearning stored with ID: ${learning.id}`);
  } else if (command === "query") {
    // learning query [--code-area <area>] [--file <path>] [--issue <number>]
    let codeArea: string | undefined;
    let filePath: string | undefined;
    let issueNumber: number | undefined;

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
      } else if (arg === "--issue" && nextArg) {
        issueNumber = parseIntSafe(nextArg, "issue");
        i++;
      }
    }

    // At least one filter should be provided
    if (!codeArea && !filePath && issueNumber === undefined) {
      throw new Error(
        "At least one filter is required: --code-area, --file, or --issue",
      );
    }

    // Query the knowledge graph
    const results = await query({
      codeArea,
      filePath,
      issueNumber,
      limit: 20,
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
    throw new Error(`Unknown learning command: ${command}`);
  }
}
