#!/usr/bin/env bun
/**
 * Burndown Chart Generator
 *
 * Reconstructs a burndown chart from GitHub issue history.
 * Shows daily open/closed counts and an ASCII visualization.
 *
 * Usage: bun scripts/burndown.ts [--repo owner/repo] [--days N]
 */

import { $ } from "bun";

interface Issue {
  number: number;
  state: string;
  createdAt: string;
  closedAt: string | null;
}

interface DailyStats {
  created: number;
  closed: number;
  open: number;
  total: number;
}

interface DateEvent {
  date: string;
  eventType: "created" | "closed";
}

async function fetchIssues(repo: string): Promise<Issue[]> {
  const result =
    await $`gh issue list --repo ${repo} --state all --limit 500 --json number,state,createdAt,closedAt`.quiet();
  return JSON.parse(result.text());
}

function buildDailyStats(issues: Issue[]): Map<string, DailyStats> {
  const events: DateEvent[] = [];

  for (const issue of issues) {
    events.push({ date: issue.createdAt.slice(0, 10), eventType: "created" });
    if (issue.closedAt) {
      events.push({ date: issue.closedAt.slice(0, 10), eventType: "closed" });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  let openCount = 0;
  let totalCount = 0;
  const daily = new Map<string, DailyStats>();

  for (const e of events) {
    if (!daily.has(e.date)) {
      daily.set(e.date, { created: 0, closed: 0, open: 0, total: 0 });
    }
    const d = daily.get(e.date)!;

    if (e.eventType === "created") {
      d.created++;
      totalCount++;
      openCount++;
    } else {
      d.closed++;
      openCount--;
    }
    d.open = openCount;
    d.total = totalCount;
  }

  return daily;
}

function printTable(daily: Map<string, DailyStats>, lastNDays?: number): void {
  const entries = [...daily.entries()];
  const displayEntries = lastNDays ? entries.slice(-lastNDays) : entries;

  console.log("Date       | Created | Closed | Open | Total");
  console.log("-----------|---------|--------|------|------");

  for (const [date, d] of displayEntries) {
    const row = `${date} |    ${String(d.created).padStart(4)} |   ${String(d.closed).padStart(4)} | ${String(d.open).padStart(4)} | ${String(d.total).padStart(4)}`;
    console.log(row);
  }
}

function printSummary(daily: Map<string, DailyStats>): void {
  const last = [...daily.values()].pop()!;
  console.log("");
  console.log("--- Summary ---");
  console.log("Total issues created:", last.total);
  console.log("Currently open:", last.open);
  console.log("Closed:", last.total - last.open);
  console.log(
    "Completion rate:",
    ((1 - last.open / last.total) * 100).toFixed(1) + "%",
  );
}

function printAsciiChart(daily: Map<string, DailyStats>): void {
  const dates = [...daily.keys()];
  const values = [...daily.values()];
  const maxOpen = Math.max(...values.map((d) => d.open));
  const chartHeight = 15;
  const chartWidth = Math.min(dates.length, 60);

  // Sample dates if too many
  const step = Math.ceil(dates.length / chartWidth);
  const sampledDates = dates.filter(
    (_, i) => i % step === 0 || i === dates.length - 1,
  );

  console.log("\n--- Burndown (Open Issues) ---");

  for (let row = chartHeight; row >= 0; row--) {
    const threshold = (row / chartHeight) * maxOpen;
    let line =
      row === chartHeight
        ? `${String(maxOpen).padStart(3)}|`
        : row === 0
          ? "  0|"
          : "   |";

    for (const date of sampledDates) {
      const d = daily.get(date)!;
      line += d.open >= threshold ? "█" : " ";
    }
    console.log(line);
  }

  console.log("   +" + "─".repeat(sampledDates.length));
  console.log(
    `    ${sampledDates[0]} → ${sampledDates[sampledDates.length - 1]}`,
  );
}

function printWeeklyTrend(daily: Map<string, DailyStats>): void {
  const entries = [...daily.entries()];
  if (entries.length < 7) return;

  const last7 = entries.slice(-7);
  const prev7 = entries.slice(-14, -7);

  const last7Created = last7.reduce((sum, [, d]) => sum + d.created, 0);
  const last7Closed = last7.reduce((sum, [, d]) => sum + d.closed, 0);
  const prev7Created = prev7.reduce((sum, [, d]) => sum + d.created, 0);
  const prev7Closed = prev7.reduce((sum, [, d]) => sum + d.closed, 0);

  const netLast7 = last7Closed - last7Created;
  const netPrev7 = prev7Closed - prev7Created;

  console.log("\n--- Weekly Trend ---");
  console.log(
    `Last 7 days:  +${last7Created} created, -${last7Closed} closed (net: ${netLast7 >= 0 ? "+" : ""}${netLast7})`,
  );
  if (prev7.length === 7) {
    console.log(
      `Previous 7:   +${prev7Created} created, -${prev7Closed} closed (net: ${netPrev7 >= 0 ? "+" : ""}${netPrev7})`,
    );
    const trend =
      netLast7 > netPrev7
        ? "📈 Improving"
        : netLast7 < netPrev7
          ? "📉 Slowing"
          : "➡️ Steady";
    console.log(`Trend: ${trend}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let repo = "rollercoaster-dev/monorepo";
  let days: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--repo" && args[i + 1]) {
      repo = args[i + 1];
      i++;
    } else if (args[i] === "--days" && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      i++;
    }
  }

  console.log(`Fetching issues from ${repo}...`);
  const issues = await fetchIssues(repo);
  console.log(`Found ${issues.length} issues\n`);

  const daily = buildDailyStats(issues);

  printTable(daily, days);
  printSummary(daily);
  printAsciiChart(daily);
  printWeeklyTrend(daily);
}

main().catch(console.error);
