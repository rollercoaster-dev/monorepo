import { checkpoint } from "../checkpoint";
import { parseIntSafe } from "./shared";

/**
 * Handle metrics commands.
 */
export async function handleMetricsCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "list") {
    // metrics list [issue-number]
    const issueNumber = args[0]
      ? parseIntSafe(args[0], "issue-number")
      : undefined;

    const metrics = checkpoint.getContextMetrics(issueNumber);

    if (metrics.length === 0) {
      console.log(
        issueNumber
          ? `No metrics found for issue #${issueNumber}.`
          : "No metrics recorded yet.",
      );
    } else {
      console.log(`Found ${metrics.length} session(s):\n`);

      for (const m of metrics) {
        console.log("---");
        console.log(`Session: ${m.sessionId}`);
        if (m.issueNumber) {
          console.log(`Issue: #${m.issueNumber}`);
        }
        console.log(`Files Read: ${m.filesRead}`);
        console.log(`Compacted: ${m.compacted ? "Yes" : "No"}`);
        if (m.durationMinutes !== undefined) {
          console.log(`Duration: ${m.durationMinutes} minutes`);
        }
        console.log(`Review Findings: ${m.reviewFindings}`);
        console.log(`Learnings Injected: ${m.learningsInjected}`);
        console.log(`Learnings Captured: ${m.learningsCaptured}`);
        console.log(`Recorded: ${m.createdAt}`);
        console.log("");
      }
    }
  } else if (command === "summary") {
    const summary = checkpoint.getMetricsSummary();

    if (summary.totalSessions === 0) {
      console.log("No metrics recorded yet.");
    } else {
      // totalSessions > 0 guaranteed by early return above
      const compactedPercent = (
        (summary.compactedSessions / summary.totalSessions) *
        100
      ).toFixed(1);

      console.log("Context Metrics Summary");
      console.log("=======================");
      console.log(`Total Sessions: ${summary.totalSessions}`);
      console.log(
        `Compacted Sessions: ${summary.compactedSessions} (${compactedPercent}%)`,
      );
      console.log(`Avg Files Read: ${summary.avgFilesRead}`);
      console.log(`Avg Learnings Injected: ${summary.avgLearningsInjected}`);
      console.log(`Avg Learnings Captured: ${summary.avgLearningsCaptured}`);
      console.log(`Total Review Findings: ${summary.totalReviewFindings}`);
    }
  } else {
    throw new Error(`Unknown metrics command: ${command}`);
  }
}
