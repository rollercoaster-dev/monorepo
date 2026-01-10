import { mineMergedPRs } from "../utils";
import { knowledge } from "../knowledge";
import { parseIntSafe } from "./shared";

/**
 * Handle bootstrap commands.
 */
export async function handleBootstrapCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "mine-prs") {
    // bootstrap mine-prs [limit]
    const limit = args[0] ? parseIntSafe(args[0], "limit") : 50;

    console.log(`Mining up to ${limit} merged PRs for learnings...`);

    const learnings = await mineMergedPRs(limit);

    if (learnings.length === 0) {
      console.log(
        "No learnings extracted. PRs may not have conventional commit titles or summaries.",
      );
    } else {
      // Store the learnings
      await knowledge.store(learnings);

      // Group by code area for summary
      const byArea = new Map<string, number>();
      let withIssue = 0;

      for (const l of learnings) {
        const area = l.codeArea || "unknown";
        byArea.set(area, (byArea.get(area) || 0) + 1);
        if (l.sourceIssue) withIssue++;
      }

      console.log(`\nBootstrap Complete`);
      console.log(`==================`);
      console.log(`Learnings extracted: ${learnings.length}`);
      console.log(`Linked to issues: ${withIssue}`);
      console.log(`\nBy code area:`);

      for (const [area, count] of byArea.entries()) {
        console.log(`  ${area}: ${count}`);
      }
    }
  } else {
    throw new Error(`Unknown bootstrap command: ${command}`);
  }
}
