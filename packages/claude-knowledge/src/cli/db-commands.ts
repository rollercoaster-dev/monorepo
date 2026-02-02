/**
 * Database CLI commands for health checks and diagnostics.
 *
 * Usage:
 *   checkpoint db health       - Check database health and file sizes
 */

import { checkDatabaseHealth } from "../db/sqlite";

/**
 * Handle database-related CLI commands.
 */
export async function handleDbCommands(
  command: string,
  _args: string[],
): Promise<void> {
  switch (command) {
    case "health":
      await handleHealthCommand();
      break;

    default:
      console.error(`Unknown db command: ${command}`);
      console.error("Available commands:");
      console.error("  db health    - Check database health and file sizes");
      process.exit(1);
  }
}

/**
 * Check database health and display diagnostic information.
 */
async function handleHealthCommand(): Promise<void> {
  console.log("Checking database health...\n");

  const health = checkDatabaseHealth();

  // Status indicator
  const statusIcon = health.healthy ? "\u2705" : "\u274C";
  const statusText = health.healthy ? "HEALTHY" : "UNHEALTHY";

  console.log(`Status: ${statusIcon} ${statusText}`);
  console.log(`Response time: ${health.responsiveMs}ms`);
  console.log("");

  // File sizes
  console.log("File sizes:");
  console.log(`  Database: ${formatSize(health.dbSizeKb)}`);
  console.log(`  WAL file: ${formatSize(health.walSizeKb)}`);
  console.log(`  SHM file: ${formatSize(health.shmSizeKb)}`);

  // Warnings
  if (health.walSizeKb > 10240) {
    // > 10MB
    console.log("");
    console.log(
      "\u26A0\uFE0F  WARNING: Large WAL file detected. This may indicate checkpoint issues.",
    );
    console.log("   Consider running: rm -f .claude/execution-state.db-wal");
  }

  if (health.responsiveMs > 500) {
    console.log("");
    console.log(
      "\u26A0\uFE0F  WARNING: Slow database response. This may indicate lock contention.",
    );
  }

  if (health.error) {
    console.log("");
    console.log(`\u274C Error: ${health.error}`);
  }

  // Exit with appropriate code
  process.exit(health.healthy ? 0 : 1);
}

/**
 * Format file size in KB to human-readable format.
 */
function formatSize(kb: number): string {
  if (kb === 0) return "0 KB (not found)";
  if (kb < 1024) return `${kb} KB`;
  const mb = Math.round((kb / 1024) * 10) / 10;
  return `${mb} MB`;
}
