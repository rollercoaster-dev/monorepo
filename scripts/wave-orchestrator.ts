#!/usr/bin/env bun
/* eslint-disable no-console */
/* global Bun */
/**
 * Wave Orchestrator
 *
 * Replaces in-session /auto-milestone and /auto-epic orchestration with
 * per-issue `claude -p` invocations, preventing OOM crashes.
 * Uses the existing checkpoint system for all state.
 *
 * Usage:
 *   bun scripts/wave-orchestrator.ts epic 635
 *   bun scripts/wave-orchestrator.ts epic 635 --parallel 3
 *   bun scripts/wave-orchestrator.ts milestone "OB3 Phase 1"
 *   bun scripts/wave-orchestrator.ts milestone 153,154,155
 *   bun scripts/wave-orchestrator.ts epic 635 --resume
 *   bun scripts/wave-orchestrator.ts epic 635 --dry-run
 */

import { $ } from "bun";
import { checkpoint } from "../packages/claude-knowledge/src/checkpoint/index.ts";
import { getDatabase } from "../packages/claude-knowledge/src/db/sqlite.ts";
import { mkdirSync } from "fs";
import { resolve, dirname } from "path";

// ---------------------------------------------------------------------------
// Config & Arg Parsing
// ---------------------------------------------------------------------------

interface Config {
  mode: "epic" | "milestone";
  target: string;
  parallel: number;
  maxBudget: number;
  model: string;
  dryRun: boolean;
  targetWave: number | null;
  skipCi: boolean;
  skipMerge: boolean;
  resume: boolean;
}

interface Wave {
  wave: number;
  issues: number[];
}

interface IssueNode {
  number: number;
  title: string;
  state: string;
  blockedBy: number[];
}

function isClosed(issue: IssueNode): boolean {
  return issue.state === "CLOSED" || issue.state === "closed";
}

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const WORKTREE_MANAGER = resolve(REPO_ROOT, "scripts/worktree-manager.sh");
const OUTPUT_DIR = resolve(REPO_ROOT, ".claude/output");

function parseArgs(): Config {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }

  const modeArg = args[0];
  if (modeArg !== "epic" && modeArg !== "milestone") {
    console.error(`Unknown mode: ${modeArg}. Use 'epic' or 'milestone'.`);
    process.exit(1);
  }

  const target = args[1];
  const config: Config = {
    mode: modeArg,
    target,
    parallel: 1,
    maxBudget: 5,
    model: "sonnet",
    dryRun: false,
    targetWave: null,
    skipCi: false,
    skipMerge: false,
    resume: false,
  };

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case "--parallel": {
        const v = parseInt(args[++i], 10);
        if (isNaN(v) || v < 1) {
          console.error(`Invalid --parallel: ${args[i]}`);
          process.exit(1);
        }
        config.parallel = v;
        break;
      }
      case "--max-budget": {
        const v = parseFloat(args[++i]);
        if (isNaN(v) || v <= 0) {
          console.error(`Invalid --max-budget: ${args[i]}`);
          process.exit(1);
        }
        config.maxBudget = v;
        break;
      }
      case "--model":
        config.model = args[++i];
        break;
      case "--dry-run":
        config.dryRun = true;
        break;
      case "--wave": {
        const v = parseInt(args[++i], 10);
        if (isNaN(v) || v < 1) {
          console.error(`Invalid --wave: ${args[i]}`);
          process.exit(1);
        }
        config.targetWave = v;
        break;
      }
      case "--skip-ci":
        config.skipCi = true;
        break;
      case "--skip-merge":
        config.skipMerge = true;
        break;
      case "--resume":
        config.resume = true;
        break;
      default:
        console.error(`Unknown flag: ${args[i]}`);
        process.exit(1);
    }
  }

  return config;
}

function printUsage(): void {
  console.log(`
Usage:
  bun scripts/wave-orchestrator.ts epic <number> [flags]
  bun scripts/wave-orchestrator.ts milestone <name|numbers> [flags]

Flags:
  --parallel N      Concurrent issues per wave (default: 1)
  --max-budget N    USD budget per issue (default: 5)
  --model NAME      Model for claude -p (default: sonnet)
  --dry-run         Show wave plan only, no execution
  --wave N          Only run wave N
  --skip-ci         Skip CI wait
  --skip-merge      Skip PR merge
  --resume          Resume interrupted run
`);
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const COLORS = {
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
} as const;

function makeLogger(color: string, dest: "log" | "error" = "log") {
  return (msg: string): void => {
    console[dest](`${color}[wave]${COLORS.reset} ${msg}`);
  };
}

const log = makeLogger(COLORS.blue);
const logOk = makeLogger(COLORS.green);
const logWarn = makeLogger(COLORS.yellow);
const logErr = makeLogger(COLORS.red, "error");

// ---------------------------------------------------------------------------
// Wave Computation — Epic Mode
// ---------------------------------------------------------------------------

async function fetchSubIssues(epicNumber: number): Promise<IssueNode[]> {
  const query = `
    query($number: Int!) {
      repository(owner: "rollercoaster-dev", name: "monorepo") {
        issue(number: $number) {
          subIssues(first: 50) {
            nodes {
              number
              title
              state
            }
          }
        }
      }
    }
  `;

  const result =
    await $`gh api graphql -f query=${query} -F number=${epicNumber}`.quiet();
  const data = JSON.parse(result.text());
  const nodes = data.data.repository.issue.subIssues.nodes as Array<{
    number: number;
    title: string;
    state: string;
  }>;

  return nodes.map((n) => ({
    number: n.number,
    title: n.title,
    state: n.state,
    blockedBy: [],
  }));
}

async function fetchDependencies(issues: IssueNode[]): Promise<IssueNode[]> {
  const query = `
    query($number: Int!) {
      repository(owner: "rollercoaster-dev", name: "monorepo") {
        issue(number: $number) {
          trackedInIssues(first: 10) {
            nodes { number title state }
          }
        }
      }
    }
  `;

  const issueNumbers = new Set(issues.map((i) => i.number));

  for (const issue of issues) {
    try {
      const result =
        await $`gh api graphql -f query=${query} -F number=${issue.number}`.quiet();
      const data = JSON.parse(result.text());
      const blockers = data.data.repository.issue.trackedInIssues?.nodes ?? [];
      issue.blockedBy = blockers
        .filter(
          (b: { number: number; state: string }) =>
            issueNumbers.has(b.number) && b.state !== "CLOSED",
        )
        .map((b: { number: number }) => b.number);
    } catch {
      try {
        const bodyResult =
          await $`gh issue view ${issue.number} --json body -q .body`.quiet();
        const body = bodyResult.text();
        const depPattern = /(?:blocked by|depends on|after)\s+#(\d+)/gi;
        let match;
        while ((match = depPattern.exec(body)) !== null) {
          const dep = parseInt(match[1], 10);
          if (issueNumbers.has(dep) && !issue.blockedBy.includes(dep)) {
            issue.blockedBy.push(dep);
          }
        }
      } catch {
        logWarn(`Could not fetch dependencies for #${issue.number}`);
      }
    }
  }

  return issues;
}

function toposortWaves(issues: IssueNode[]): Wave[] {
  const open = issues.filter((i) => !isClosed(i));
  if (open.length === 0) return [];

  const issueSet = new Set(open.map((i) => i.number));
  const inDegree = new Map<number, number>();
  const dependents = new Map<number, number[]>();

  for (const issue of open) {
    inDegree.set(issue.number, 0);
    dependents.set(issue.number, []);
  }

  for (const issue of open) {
    // Only count blockers that are in our open set
    const validBlockers = issue.blockedBy.filter((b) => issueSet.has(b));
    inDegree.set(issue.number, validBlockers.length);
    for (const blocker of validBlockers) {
      dependents.get(blocker)!.push(issue.number);
    }
  }

  // Kahn's algorithm with wave tracking
  const waves: Wave[] = [];
  let queue = open
    .filter((i) => inDegree.get(i.number)! === 0)
    .map((i) => i.number);

  if (queue.length === 0) {
    // Circular dependency detected
    const cycle = open.map((i) => `#${i.number}`).join(", ");
    logErr(`Circular dependency detected among: ${cycle}`);
    process.exit(1);
  }

  let waveNum = 1;
  const assigned = new Set<number>();

  while (queue.length > 0) {
    waves.push({ wave: waveNum, issues: [...queue] });
    for (const n of queue) assigned.add(n);

    const nextQueue: number[] = [];
    for (const n of queue) {
      for (const dep of dependents.get(n) ?? []) {
        const newDeg = inDegree.get(dep)! - 1;
        inDegree.set(dep, newDeg);
        if (newDeg === 0 && !assigned.has(dep)) {
          nextQueue.push(dep);
        }
      }
    }

    queue = nextQueue;
    waveNum++;
  }

  // Check for unassigned (circular) issues
  const unassigned = open.filter((i) => !assigned.has(i.number));
  if (unassigned.length > 0) {
    const cycle = unassigned.map((i) => `#${i.number}`).join(", ");
    logErr(`Circular dependency detected among: ${cycle}`);
    process.exit(1);
  }

  return waves;
}

async function computeWavesEpic(epicNumber: number): Promise<Wave[]> {
  log(`Fetching sub-issues for epic #${epicNumber}...`);
  const issues = await fetchSubIssues(epicNumber);

  if (issues.length === 0) {
    logErr(`No sub-issues found for epic #${epicNumber}`);
    process.exit(1);
  }

  log(`Found ${issues.length} sub-issues, fetching dependencies...`);
  await fetchDependencies(issues);

  return toposortWaves(issues);
}

// ---------------------------------------------------------------------------
// Wave Computation — Milestone Mode
// ---------------------------------------------------------------------------

async function computeWavesMilestone(target: string): Promise<Wave[]> {
  let issueNumbers: number[];

  // Check if target is comma-separated numbers
  if (/^[\d,]+$/.test(target)) {
    issueNumbers = target.split(",").map((n) => parseInt(n.trim(), 10));
  } else {
    // Fetch from GitHub milestone
    log(`Fetching issues for milestone "${target}"...`);
    const result =
      await $`gh issue list --milestone ${target} --state open --json number --limit 100`.quiet();
    const issues = JSON.parse(result.text()) as Array<{ number: number }>;
    issueNumbers = issues.map((i) => i.number);
  }

  if (issueNumbers.length === 0) {
    logErr("No issues found for milestone");
    process.exit(1);
  }

  log(`Found ${issueNumbers.length} issues, inferring dependencies...`);

  // Use a short claude -p session to infer dependency waves
  try {
    const issueList = issueNumbers.join(", ");
    const prompt = `You are analyzing GitHub issues for dependency ordering.
Issues: ${issueList}

For each issue, fetch its title and body using gh, then determine blocking relationships.
Output ONLY valid JSON in this exact format (no other text):
[{"wave": 1, "issues": [N, ...]}, {"wave": 2, "issues": [N, ...]}, ...]

Rules:
- Issues with no dependencies go in wave 1
- Issues blocked by wave 1 issues go in wave 2, etc.
- If you can't determine dependencies, put all issues in wave 1`;

    const claudeResult =
      await $`claude -p ${prompt} --permission-mode plan --max-budget-usd 2 --output-format text`.quiet();
    const text = claudeResult.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const waves = JSON.parse(jsonMatch[0]) as Wave[];
      if (Array.isArray(waves) && waves.length > 0) {
        return waves;
      }
    }
  } catch {
    logWarn("Dependency inference failed, using single wave fallback");
  }

  // Fallback: all issues in wave 1
  return [{ wave: 1, issues: issueNumbers }];
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function ensureOutputDir(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function executeIssue(
  issue: number,
  wave: number,
  milestoneId: string,
  config: Config,
): Promise<{ pr?: number }> {
  const logFile = resolve(OUTPUT_DIR, `issue-${issue}.log`);
  log(`[Wave ${wave}] Starting issue #${issue} → ${logFile}`);

  // 1. Create worktree
  try {
    await $`bash ${WORKTREE_MANAGER} create ${issue}`.quiet();
  } catch (e) {
    logErr(`Failed to create worktree for #${issue}: ${e}`);
    throw e;
  }

  // Get worktree path
  const worktreePath = (await $`bash ${WORKTREE_MANAGER} path ${issue}`.quiet())
    .text()
    .trim();

  // 2. Find existing workflow (created in main) or create new one
  const branch = `feat/issue-${issue}`;
  const existing = checkpoint.findByIssue(issue);
  let wfId: string;
  if (existing) {
    wfId = existing.workflow.id;
    // Update worktree path
    existing.workflow.worktree = worktreePath;
    checkpoint.save(existing.workflow);
  } else {
    const wf = checkpoint.create(issue, branch, worktreePath);
    checkpoint.linkWorkflowToMilestone(wf.id, milestoneId, wave);
    wfId = wf.id;
  }
  checkpoint.setPhase(wfId, "execute");

  // 3. Run claude -p with /auto-issue
  try {
    const claudeArgs = [
      "-p",
      `/auto-issue ${issue}`,
      "--cwd",
      worktreePath,
      "--max-budget-usd",
      String(config.maxBudget),
      "--model",
      config.model,
      "--output-format",
      "text",
    ];

    const proc = Bun.spawn(["claude", ...claudeArgs], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: worktreePath,
    });

    const logHandle = Bun.file(logFile).writer();

    async function pipeStream(
      stream: ReadableStream<Uint8Array>,
    ): Promise<void> {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        logHandle.write(value);
      }
    }

    await Promise.all([pipeStream(proc.stdout), pipeStream(proc.stderr)]);
    await logHandle.flush();
    logHandle.end();

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`claude -p exited with code ${exitCode}`);
    }
  } catch (e) {
    logErr(`[Wave ${wave}] Issue #${issue} failed: ${e}`);
    checkpoint.setStatus(wfId, "failed");
    checkpoint.logAction(wfId, "auto-issue-failed", "failed", {
      error: String(e),
    });
    throw e;
  }

  // 4. Extract PR number
  let prNumber: number | undefined;
  try {
    const prResult =
      await $`gh pr list --head feat/issue-${issue} --json number --limit 1`.quiet();
    const prs = JSON.parse(prResult.text()) as Array<{ number: number }>;
    if (prs.length > 0) {
      prNumber = prs[0].number;
    }
  } catch {
    logWarn(`Could not detect PR for #${issue}`);
  }

  // 5. Log completion
  if (prNumber) {
    checkpoint.logAction(wfId, "pr-created", "success", { pr: prNumber, wave });
  } else {
    checkpoint.logAction(wfId, "execution-completed", "success", { wave });
    logWarn(`[Wave ${wave}] Issue #${issue} completed but no PR detected`);
  }
  checkpoint.setStatus(wfId, "completed");
  logOk(
    `[Wave ${wave}] Issue #${issue} completed${prNumber ? ` → PR #${prNumber}` : ""}`,
  );

  return { pr: prNumber };
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task()
      .then((r) => {
        results.push(r);
      })
      .finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= limit) await Promise.race(executing);
  }

  await Promise.all(executing);
  return results;
}

async function executeWave(
  wave: Wave,
  milestoneId: string,
  config: Config,
  completedIssues: Set<number>,
): Promise<void> {
  const pending = wave.issues.filter((i) => !completedIssues.has(i));
  if (pending.length === 0) {
    log(`Wave ${wave.wave}: all issues already completed, skipping`);
    return;
  }

  log(
    `\n${"=".repeat(60)}\nWave ${wave.wave}: ${pending.length} issue(s) [parallel=${config.parallel}]\n${"=".repeat(60)}`,
  );

  const tasks = pending.map(
    (issue) => () => executeIssue(issue, wave.wave, milestoneId, config),
  );

  const failedIssues: number[] = [];

  if (config.parallel <= 1) {
    for (const [idx, task] of tasks.entries()) {
      try {
        await task();
      } catch {
        failedIssues.push(pending[idx]);
      }
    }
  } else {
    // Wrap each task to catch failures individually
    const wrappedTasks = tasks.map((task, idx) => async () => {
      try {
        return await task();
      } catch {
        failedIssues.push(pending[idx]);
        return { pr: undefined };
      }
    });
    await runWithConcurrency(wrappedTasks, config.parallel);
  }

  if (failedIssues.length > 0) {
    logWarn(
      `Wave ${wave.wave}: ${failedIssues.length} issue(s) failed: ${failedIssues.map((i) => `#${i}`).join(", ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// CI + Merge
// ---------------------------------------------------------------------------

async function waitAndMergeWave(
  wave: Wave,
  milestoneId: string,
  config: Config,
): Promise<void> {
  if (config.skipCi && config.skipMerge) return;

  log(`\nWave ${wave.wave}: CI + Merge phase`);

  // Collect PRs for completed workflows in this wave
  const db = getDatabase();
  const rows = db
    .query<
      { workflow_id: string; issue_number: number; status: string },
      [string, number]
    >(
      `
      SELECT w.id as workflow_id, w.issue_number, w.status
      FROM workflows w
      JOIN milestone_workflows mw ON w.id = mw.workflow_id
      WHERE mw.milestone_id = ? AND mw.wave_number = ?
      ORDER BY w.issue_number ASC
    `,
    )
    .all(milestoneId, wave.wave);

  for (const row of rows) {
    if (row.status !== "completed") {
      logWarn(`Skipping #${row.issue_number} (status: ${row.status})`);
      continue;
    }

    // Find PR number from actions
    const prAction = db
      .query<{ metadata: string }, [string]>(
        `
        SELECT metadata FROM actions
        WHERE workflow_id = ? AND action = 'pr-created' AND result = 'success'
        ORDER BY created_at DESC LIMIT 1
      `,
      )
      .get(row.workflow_id);

    if (!prAction?.metadata) continue;

    let prNumber: number;
    try {
      const meta = JSON.parse(prAction.metadata);
      prNumber = meta.pr;
      if (!prNumber) continue;
    } catch {
      continue;
    }

    // Wait for CI
    if (!config.skipCi) {
      log(`Waiting for CI on PR #${prNumber}...`);
      try {
        await $`bash ${WORKTREE_MANAGER} ci-status ${prNumber} --wait`.quiet();
        logOk(`PR #${prNumber}: CI passed`);
      } catch {
        logWarn(`PR #${prNumber}: CI failed, attempting fix...`);
        // Attempt fix via short claude -p
        let fixed = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const worktreePath = (
              await $`bash ${WORKTREE_MANAGER} path ${row.issue_number}`.quiet()
            )
              .text()
              .trim();
            await $`claude -p "Fix CI failures for PR #${prNumber}. Run the failing checks, fix the issues, commit and push." --cwd ${worktreePath} --max-budget-usd 2 --model ${config.model} --output-format text`.quiet();
            await $`bash ${WORKTREE_MANAGER} ci-status ${prNumber} --wait`.quiet();
            fixed = true;
            logOk(`PR #${prNumber}: CI fixed on attempt ${attempt}`);
            break;
          } catch {
            logWarn(`PR #${prNumber}: CI fix attempt ${attempt} failed`);
          }
        }
        if (!fixed) {
          checkpoint.logAction(row.workflow_id, "ci-failed", "failed", {
            pr: prNumber,
          });
          logErr(`PR #${prNumber}: CI still failing, skipping merge`);
          continue;
        }
      }
    }

    // Merge
    if (!config.skipMerge) {
      log(`Merging PR #${prNumber}...`);
      try {
        await $`gh pr merge ${prNumber} --squash --delete-branch`.quiet();
        checkpoint.logAction(row.workflow_id, "pr-merged", "success", {
          pr: prNumber,
        });
        logOk(`PR #${prNumber}: merged`);
      } catch (e) {
        logWarn(`PR #${prNumber}: merge failed, attempting rebase...`);
        try {
          await $`bash ${WORKTREE_MANAGER} rebase ${row.issue_number}`.quiet();
          await $`gh pr merge ${prNumber} --squash --delete-branch`.quiet();
          checkpoint.logAction(row.workflow_id, "pr-merged", "success", {
            pr: prNumber,
            rebased: true,
          });
          logOk(`PR #${prNumber}: merged after rebase`);
        } catch {
          checkpoint.logAction(row.workflow_id, "pr-merge-failed", "failed", {
            pr: prNumber,
            error: String(e),
          });
          logErr(`PR #${prNumber}: merge failed after rebase`);
        }
      }
    }
  }

  // Pull latest main
  if (!config.skipMerge) {
    try {
      await $`git -C ${REPO_ROOT} pull origin main`.quiet();
    } catch {
      logWarn("Failed to pull origin main");
    }
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup(
  config: Config,
  milestoneId: string,
  epicNumber?: number,
): Promise<void> {
  log("\nCleanup phase");

  // Remove all worktrees
  try {
    await $`bash ${WORKTREE_MANAGER} cleanup-all --force`.quiet();
    logOk("Worktrees cleaned up");
  } catch {
    logWarn("Worktree cleanup had errors");
  }

  // Epic: update parent issue checkboxes and close if all done
  if (config.mode === "epic" && epicNumber) {
    try {
      // Fetch current epic body
      const bodyResult =
        await $`gh issue view ${epicNumber} --json body -q .body`.quiet();
      let body = bodyResult.text();

      // Fetch closed sub-issues
      const subIssues = await fetchSubIssues(epicNumber);
      const closedNumbers = subIssues.filter(isClosed).map((i) => i.number);

      // Check boxes for closed sub-issues
      for (const num of closedNumbers) {
        body = body.replace(new RegExp(`- \\[ \\] .*#${num}\\b`), (match) =>
          match.replace("- [ ]", "- [x]"),
        );
      }

      await $`gh issue edit ${epicNumber} --body ${body}`.quiet();

      // Close epic if all sub-issues are closed
      const allClosed = subIssues.every(isClosed);
      if (allClosed) {
        await $`gh issue close ${epicNumber}`.quiet();
        logOk(`Epic #${epicNumber} closed (all sub-issues done)`);
      }
    } catch {
      logWarn("Failed to update epic issue");
    }
  }

  // Mark milestone completed
  checkpoint.setMilestoneStatus(milestoneId, "completed");

  // Print summary
  try {
    await $`bash ${WORKTREE_MANAGER} summary`;
  } catch {
    // summary is non-critical
  }
}

// ---------------------------------------------------------------------------
// Resume Support
// ---------------------------------------------------------------------------

interface ResumeState {
  milestoneId: string;
  waves: Wave[];
  completedIssues: Set<number>;
}

function getMilestoneName(config: Config): string {
  return config.mode === "epic" ? `epic-${config.target}` : config.target;
}

function loadResumeState(config: Config): ResumeState | null {
  const data = checkpoint.findMilestoneByName(getMilestoneName(config));
  if (!data) return null;

  const milestoneId = data.milestone.id;

  // Query wave assignments directly from DB
  const db = getDatabase();
  const rows = db
    .query<
      {
        workflow_id: string;
        issue_number: number;
        wave_number: number | null;
        status: string;
      },
      [string]
    >(
      `
      SELECT mw.workflow_id, w.issue_number, mw.wave_number, w.status
      FROM milestone_workflows mw
      JOIN workflows w ON w.id = mw.workflow_id
      WHERE mw.milestone_id = ?
      ORDER BY mw.wave_number ASC, w.issue_number ASC
    `,
    )
    .all(milestoneId);

  // Reconstruct waves and recover interrupted workflows
  const waveMap = new Map<number, number[]>();
  const completedIssues = new Set<number>();
  let recovered = 0;

  for (const row of rows) {
    const waveNum = row.wave_number ?? 1;
    if (!waveMap.has(waveNum)) {
      waveMap.set(waveNum, []);
    }
    waveMap.get(waveNum)!.push(row.issue_number);

    if (row.status === "completed") {
      completedIssues.add(row.issue_number);
    } else if (row.status === "running" || row.status === "failed") {
      // Check if interrupted workflow already produced a PR
      const prAction = db
        .query<{ metadata: string }, [string]>(
          `SELECT metadata FROM actions
           WHERE workflow_id = ? AND action = 'pr-created' AND result = 'success'
           ORDER BY created_at DESC LIMIT 1`,
        )
        .get(row.workflow_id);

      if (prAction?.metadata) {
        try {
          const meta = JSON.parse(prAction.metadata);
          if (meta.pr) {
            checkpoint.setStatus(row.workflow_id, "completed");
            completedIssues.add(row.issue_number);
            recovered++;
            logOk(
              `Recovered #${row.issue_number} (PR #${meta.pr} exists, promoted to completed)`,
            );
            continue;
          }
        } catch {
          // metadata parse failure — fall through to re-execution
        }
      }

      // No PR yet — mark failed so executeWave will re-run it
      if (row.status === "running") {
        checkpoint.setStatus(row.workflow_id, "failed");
      }
    }
  }

  if (recovered > 0) {
    logOk(`Recovered ${recovered} interrupted workflow(s) with existing PRs`);
  }

  const waves: Wave[] = Array.from(waveMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([wave, issues]) => ({ wave, issues }));

  return { milestoneId, waves, completedIssues };
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function displayWavePlan(waves: Wave[], completedIssues?: Set<number>): void {
  const { green, blue, dim, reset } = COLORS;
  console.log(
    `\n${green}Wave Plan${reset} (${waves.reduce((s, w) => s + w.issues.length, 0)} issues in ${waves.length} wave(s))\n`,
  );

  for (const wave of waves) {
    console.log(`  ${blue}Wave ${wave.wave}${reset}:`);
    for (const issue of wave.issues) {
      const done = completedIssues?.has(issue);
      const marker = done ? `${green}✓${reset}` : `${dim}○${reset}`;
      console.log(`    ${marker} #${issue}`);
    }
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = parseArgs();
  ensureOutputDir();

  log(
    `Mode: ${config.mode} | Target: ${config.target} | Parallel: ${config.parallel}`,
  );

  let milestoneId: string;
  let waves: Wave[];
  let completedIssues = new Set<number>();

  // --- Resume or Fresh ---
  if (config.resume) {
    log("Resuming from checkpoint...");
    const state = loadResumeState(config);
    if (!state) {
      logErr("No checkpoint found to resume. Run without --resume first.");
      process.exit(1);
    }
    milestoneId = state.milestoneId;
    waves = state.waves;
    completedIssues = state.completedIssues;
    logOk(`Resumed: ${completedIssues.size} issue(s) already completed`);
  } else {
    // Guard: if milestone already exists, suggest --resume
    const existingMs = checkpoint.findMilestoneByName(getMilestoneName(config));
    if (existingMs) {
      logErr(
        `Milestone "${getMilestoneName(config)}" already exists. Use --resume to continue.`,
      );
      process.exit(1);
    }

    // Compute waves
    if (config.mode === "epic") {
      waves = await computeWavesEpic(parseInt(config.target, 10));
    } else {
      waves = await computeWavesMilestone(config.target);
    }

    const ms = checkpoint.createMilestone(getMilestoneName(config));
    milestoneId = ms.id;

    // Pre-create workflows and link them
    for (const wave of waves) {
      for (const issue of wave.issues) {
        const branch = `feat/issue-${issue}`;
        const wf = checkpoint.create(issue, branch);
        checkpoint.linkWorkflowToMilestone(wf.id, milestoneId, wave.wave);
      }
    }

    checkpoint.setMilestonePhase(milestoneId, "planning");
  }

  // --- Filter waves ---
  if (config.targetWave !== null) {
    waves = waves.filter((w) => w.wave === config.targetWave);
    if (waves.length === 0) {
      logErr(`Wave ${config.targetWave} not found`);
      process.exit(1);
    }
  }

  // --- Display plan ---
  displayWavePlan(waves, completedIssues);

  if (config.dryRun) {
    log("Dry run — exiting without execution.");
    return;
  }

  // --- Execute waves ---
  for (const wave of waves) {
    checkpoint.setMilestonePhase(milestoneId, "execute");
    await executeWave(wave, milestoneId, config, completedIssues);

    checkpoint.setMilestonePhase(milestoneId, "merge");
    await waitAndMergeWave(wave, milestoneId, config);
  }

  // --- Cleanup ---
  checkpoint.setMilestonePhase(milestoneId, "cleanup");
  const epicNumber =
    config.mode === "epic" ? parseInt(config.target, 10) : undefined;
  await cleanup(config, milestoneId, epicNumber);

  logOk("Wave orchestrator complete.");
}

main().catch((e) => {
  logErr(`Fatal: ${e}`);
  process.exit(1);
});
