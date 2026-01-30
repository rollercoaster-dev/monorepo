#!/usr/bin/env bun
/* eslint-disable no-console */
/* global Bun */
/**
 * Wave Orchestrator
 *
 * Thin wave scheduler that runs `/auto-issue` per issue via `claude -p`.
 * Computes dependency waves, executes sequentially (or in parallel with
 * worktrees), and optionally merges PRs between waves.
 *
 * `/auto-issue` handles all per-issue complexity: branch creation,
 * research, implementation, review, and PR creation. This orchestrator
 * only handles wave ordering and cross-wave coordination.
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
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { homedir } from "os";

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
  maxReviewFixes: number;
  autoMerge: boolean;
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
const OUTPUT_DIR = resolve(REPO_ROOT, ".claude/output");
const WORKTREE_BASE = resolve(homedir(), "Code/worktrees");
const WORKTREE_MANAGER = resolve(REPO_ROOT, "scripts/worktree-manager.sh");

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
    maxReviewFixes: 1,
    autoMerge: false,
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
      case "--max-review-fixes": {
        const v = parseInt(args[++i], 10);
        if (isNaN(v) || v < 0) {
          console.error(`Invalid --max-review-fixes: ${args[i]}`);
          process.exit(1);
        }
        config.maxReviewFixes = v;
        break;
      }
      case "--auto-merge":
        config.autoMerge = true;
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
  --skip-ci             Skip CI wait
  --skip-merge          Skip PR merge
  --resume              Resume interrupted run
  --max-review-fixes N  Max review-fix cycles per PR (default: 1, 0 = skip review handling)
  --auto-merge          Skip Telegram notification and merge PRs automatically
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

/**
 * Build an IssueNode graph from waves, inferring that each issue in wave N
 * is blocked by all issues in wave N-1.
 */
function inferGraphFromWaves(waves: Wave[]): IssueNode[] {
  const waveMap = new Map(waves.map((w) => [w.wave, w.issues]));

  return waves.flatMap((w) => {
    const prevWaveIssues = waveMap.get(w.wave - 1) ?? [];
    return w.issues.map((issue) => ({
      number: issue,
      title: "",
      state: "OPEN",
      blockedBy: [...prevWaveIssues],
    }));
  });
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
    const validBlockers = issue.blockedBy.filter((b) => issueSet.has(b));
    inDegree.set(issue.number, validBlockers.length);
    for (const blocker of validBlockers) {
      dependents.get(blocker)!.push(issue.number);
    }
  }

  const waves: Wave[] = [];
  let queue = open
    .filter((i) => inDegree.get(i.number)! === 0)
    .map((i) => i.number);

  if (queue.length === 0) {
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

  const unassigned = open.filter((i) => !assigned.has(i.number));
  if (unassigned.length > 0) {
    const cycle = unassigned.map((i) => `#${i.number}`).join(", ");
    logErr(`Circular dependency detected among: ${cycle}`);
    process.exit(1);
  }

  return waves;
}

async function computeWavesEpic(
  epicNumber: number,
): Promise<{ waves: Wave[]; graph: IssueNode[] }> {
  log(`Fetching sub-issues for epic #${epicNumber}...`);
  const issues = await fetchSubIssues(epicNumber);

  if (issues.length === 0) {
    logErr(`No sub-issues found for epic #${epicNumber}`);
    process.exit(1);
  }

  log(`Found ${issues.length} sub-issues, fetching dependencies...`);
  await fetchDependencies(issues);

  return { waves: toposortWaves(issues), graph: issues };
}

// ---------------------------------------------------------------------------
// Wave Computation — Milestone Mode
// ---------------------------------------------------------------------------

async function computeWavesMilestone(
  target: string,
): Promise<{ waves: Wave[]; graph: IssueNode[] }> {
  let issueNumbers: number[];

  if (/^[\d,]+$/.test(target)) {
    issueNumbers = target.split(",").map((n) => parseInt(n.trim(), 10));
  } else {
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

  let waves: Wave[];

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

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Wave[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        waves = parsed;
      } else {
        waves = [{ wave: 1, issues: issueNumbers }];
      }
    } else {
      waves = [{ wave: 1, issues: issueNumbers }];
    }
  } catch {
    logWarn("Dependency inference failed, using single wave fallback");
    waves = [{ wave: 1, issues: issueNumbers }];
  }

  return { waves, graph: inferGraphFromWaves(waves) };
}

// ---------------------------------------------------------------------------
// Pre-existing Work Detection
// ---------------------------------------------------------------------------

async function findExistingPR(
  issue: number,
): Promise<{ pr: number; branch: string } | null> {
  try {
    const result =
      await $`gh pr list --search "head:feat/issue-${issue}" --state open --json number,headRefName --limit 1`.quiet();
    const prs = JSON.parse(result.text()) as Array<{
      number: number;
      headRefName: string;
    }>;
    if (prs.length > 0) {
      return { pr: prs[0].number, branch: prs[0].headRefName };
    }
  } catch {
    // Fall through
  }
  return null;
}

function findExistingWorktree(issue: number): string | null {
  const worktreePath = resolve(WORKTREE_BASE, `monorepo-issue-${issue}`);
  return existsSync(worktreePath) ? worktreePath : null;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function ensureOutputDir(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Determine the working directory for a claude -p invocation.
 *
 * - parallel=1: run from REPO_ROOT (no worktree needed)
 * - parallel>1: create/reuse a worktree for isolation
 */
async function resolveCwd(issue: number, config: Config): Promise<string> {
  if (config.parallel <= 1) {
    // Sequential — just use the repo root. /auto-issue creates its own branch.
    return REPO_ROOT;
  }

  // Parallel — need isolated worktree
  const existing = findExistingWorktree(issue);
  if (existing) {
    logWarn(`Reusing existing worktree for #${issue}`);
    return existing;
  }

  try {
    await $`bash ${WORKTREE_MANAGER} create ${issue}`;
  } catch (e) {
    const stderr =
      typeof e === "object" && e !== null && "stderr" in e
        ? String((e as { stderr: unknown }).stderr)
        : String(e);
    logErr(`Failed to create worktree for #${issue}: ${stderr}`);
    throw e;
  }

  return (await $`bash ${WORKTREE_MANAGER} path ${issue}`.quiet())
    .text()
    .trim();
}

async function executeIssue(
  issue: number,
  wave: number,
  milestoneId: string,
  config: Config,
): Promise<{ pr?: number }> {
  const logFile = resolve(OUTPUT_DIR, `issue-${issue}.log`);
  log(`[Wave ${wave}] Starting issue #${issue} → ${logFile}`);

  // 1. Check for pre-existing PR — skip if already done
  const existingPR = await findExistingPR(issue);
  if (existingPR) {
    logOk(
      `[Wave ${wave}] Issue #${issue} already has PR #${existingPR.pr} (branch: ${existingPR.branch}), skipping`,
    );
    ensureWorkflowLinked(issue, milestoneId, wave, existingPR.pr);
    return { pr: existingPR.pr };
  }

  // 2. Resolve working directory
  const cwd = await resolveCwd(issue, config);

  // 3. Ensure we're on main before /auto-issue creates its branch
  if (config.parallel <= 1) {
    try {
      await $`git -C ${cwd} checkout main --quiet`.quiet();
      await $`git -C ${cwd} pull origin main --quiet`.quiet();
    } catch {
      logWarn(`Could not reset to main before #${issue}`);
    }
  }

  // 4. Run claude -p /auto-issue — let it handle the full workflow
  const claudeArgs = [
    "-p",
    `/auto-issue ${issue}`,
    "--max-budget-usd",
    String(config.maxBudget),
    "--model",
    config.model,
    "--output-format",
    "text",
    "--dangerously-skip-permissions",
  ];

  try {
    const proc = Bun.spawn(["claude", ...claudeArgs], {
      stdout: "pipe",
      stderr: "pipe",
      cwd,
    });

    // Stream output to log file
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
      // Read last 20 lines of log for diagnostic
      const logContent = await Bun.file(logFile).text();
      const lastLines = logContent.split("\n").slice(-20).join("\n");
      logErr(
        `[Wave ${wave}] claude -p exited with code ${exitCode} for #${issue}`,
      );
      logErr(`Last output:\n${lastLines}`);
      throw new Error(`claude -p exited with code ${exitCode}`);
    }
  } catch (e) {
    logErr(`[Wave ${wave}] Issue #${issue} failed: ${e}`);
    markWorkflowFailed(issue, milestoneId, wave, String(e));
    throw e;
  }

  // 5. Detect PR created by /auto-issue
  const pr = await findExistingPR(issue);
  if (pr) {
    logOk(`[Wave ${wave}] Issue #${issue} completed → PR #${pr.pr}`);
    ensureWorkflowLinked(issue, milestoneId, wave, pr.pr);
    return { pr: pr.pr };
  }

  logWarn(`[Wave ${wave}] Issue #${issue} completed but no PR detected`);
  ensureWorkflowLinked(issue, milestoneId, wave);
  return {};
}

/**
 * Find or create a workflow for an issue and ensure it is linked to the milestone.
 */
function getOrCreateLinkedWorkflow(
  issue: number,
  milestoneId: string,
  wave: number,
): string {
  const existing = checkpoint.findByIssue(issue);
  const wfId = existing
    ? existing.workflow.id
    : checkpoint.create(issue, `feat/issue-${issue}`).id;

  try {
    checkpoint.linkWorkflowToMilestone(wfId, milestoneId, wave);
  } catch {
    // Already linked
  }

  return wfId;
}

function ensureWorkflowLinked(
  issue: number,
  milestoneId: string,
  wave: number,
  prNumber?: number,
): void {
  const wfId = getOrCreateLinkedWorkflow(issue, milestoneId, wave);
  checkpoint.setStatus(wfId, "completed");
  if (prNumber) {
    checkpoint.logAction(wfId, "pr-created", "success", {
      pr: prNumber,
      wave,
    });
  }
}

function markWorkflowFailed(
  issue: number,
  milestoneId: string,
  wave: number,
  error: string,
): void {
  const wfId = getOrCreateLinkedWorkflow(issue, milestoneId, wave);
  checkpoint.setStatus(wfId, "failed");
  checkpoint.logAction(wfId, "auto-issue-failed", "failed", { error });
}

// ---------------------------------------------------------------------------
// Wave Execution
// ---------------------------------------------------------------------------

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
// Review Helpers
// ---------------------------------------------------------------------------

/**
 * Wait for CI to pass, retrying with Claude fix attempts if it fails.
 * Returns true if CI eventually passes, false otherwise.
 */
async function waitForCiWithRetries(
  pr: number,
  config: Config,
  maxAttempts: number = 2,
): Promise<boolean> {
  // First, check if CI passes on its own
  try {
    await $`bash ${WORKTREE_MANAGER} ci-status ${pr} --wait`.quiet();
    return true;
  } catch {
    logWarn(`PR #${pr}: CI failed, attempting fix...`);
  }

  // CI failed — try fix cycles
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const branchResult =
        await $`gh pr view ${pr} --json headRefName -q .headRefName`.quiet();
      const branch = branchResult.text().trim();
      await $`git -C ${REPO_ROOT} checkout ${branch} --quiet`.quiet();

      const fixProc = Bun.spawn(
        [
          "claude",
          "-p",
          `Fix CI failures for PR #${pr}. Run the failing checks, fix the issues, commit and push.`,
          "--max-budget-usd",
          "2",
          "--model",
          config.model,
          "--output-format",
          "text",
          "--dangerously-skip-permissions",
        ],
        { cwd: REPO_ROOT, stdout: "ignore", stderr: "ignore" },
      );
      await fixProc.exited;

      await $`bash ${WORKTREE_MANAGER} ci-status ${pr} --wait`.quiet();
      logOk(`PR #${pr}: CI fixed on attempt ${attempt}`);
      return true;
    } catch {
      logWarn(`PR #${pr}: CI fix attempt ${attempt} failed`);
    }
  }

  return false;
}

async function fetchReviewDecision(
  pr: number,
): Promise<"APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | ""> {
  try {
    const result =
      await $`gh pr view ${pr} --json reviewDecision -q .reviewDecision`.quiet();
    const decision = result.text().trim();
    if (
      decision === "APPROVED" ||
      decision === "CHANGES_REQUESTED" ||
      decision === "REVIEW_REQUIRED"
    ) {
      return decision;
    }
    return "";
  } catch {
    logWarn(`Could not fetch review decision for PR #${pr}`);
    return "";
  }
}

async function fetchReviewComments(pr: number): Promise<string> {
  const sections: string[] = [];

  // Conversation-level comments and reviews
  try {
    const prData = await $`gh pr view ${pr} --json reviews,comments`.quiet();
    const parsed = JSON.parse(prData.text()) as {
      reviews: Array<{
        author: { login: string };
        body: string;
        state: string;
      }>;
      comments: Array<{ author: { login: string }; body: string }>;
    };

    if (parsed.reviews?.length > 0) {
      const reviewLines = parsed.reviews
        .filter((r) => r.body?.trim())
        .map(
          (r) => `- ${r.author.login} (${r.state}): ${r.body.slice(0, 500)}`,
        );
      if (reviewLines.length > 0) {
        sections.push(`## Reviews\n${reviewLines.join("\n")}`);
      }
    }

    if (parsed.comments?.length > 0) {
      const commentLines = parsed.comments
        .filter((c) => c.body?.trim())
        .map((c) => `- ${c.author.login}: ${c.body.slice(0, 500)}`);
      if (commentLines.length > 0) {
        sections.push(`## Conversation Comments\n${commentLines.join("\n")}`);
      }
    }
  } catch {
    logWarn(`Could not fetch PR comments for PR #${pr}`);
  }

  // Inline/CodeRabbit comments via API
  try {
    const inlineData =
      await $`gh api repos/rollercoaster-dev/monorepo/pulls/${pr}/comments`.quiet();
    const inline = JSON.parse(inlineData.text()) as Array<{
      user: { login: string };
      path: string;
      line: number | null;
      body: string;
    }>;

    if (inline.length > 0) {
      const inlineLines = inline.map(
        (c) =>
          `- ${c.path}${c.line ? `:${c.line}` : ""} (${c.user.login}): ${c.body.slice(0, 500)}`,
      );
      sections.push(`## Inline Comments\n${inlineLines.join("\n")}`);
    }
  } catch {
    logWarn(`Could not fetch inline comments for PR #${pr}`);
  }

  if (sections.length === 0) {
    return "No review comments found.";
  }

  return `Review comments for PR #${pr}:\n\n${sections.join("\n\n")}\n\nFix all issues, commit and push.`;
}

async function spawnReviewFix(
  pr: number,
  comments: string,
  config: Config,
): Promise<void> {
  // Checkout PR branch
  const branchResult =
    await $`gh pr view ${pr} --json headRefName -q .headRefName`.quiet();
  const branch = branchResult.text().trim();
  await $`git -C ${REPO_ROOT} checkout ${branch} --quiet`.quiet();
  await $`git -C ${REPO_ROOT} pull origin ${branch} --quiet`.quiet();

  const prompt = `Address these review comments on PR #${pr}:\n${comments}\nFix the issues, commit and push.`;

  const fixProc = Bun.spawn(
    [
      "claude",
      "-p",
      prompt,
      "--max-budget-usd",
      "3",
      "--model",
      config.model,
      "--output-format",
      "text",
      "--dangerously-skip-permissions",
    ],
    { cwd: REPO_ROOT, stdout: "ignore", stderr: "ignore" },
  );
  await fixProc.exited;
}

/**
 * Per-PR review loop: CI wait -> review check -> fix -> re-check.
 * Returns the outcome for this PR.
 */
async function reviewAndMergePR(
  pr: number,
  workflowId: string,
  _issueNumber: number,
  config: Config,
): Promise<"ready" | "failed"> {
  // Step 1: Wait for CI (with automatic fix retries)
  if (!config.skipCi) {
    log(`PR #${pr}: waiting for CI...`);
    const ciPassed = await waitForCiWithRetries(pr, config);
    if (!ciPassed) {
      checkpoint.logAction(workflowId, "ci-failed", "failed", { pr });
      logErr(`PR #${pr}: CI still failing after fix attempts, skipping`);
      return "failed";
    }
    logOk(`PR #${pr}: CI passed`);
  }

  // Step 2: Check review decision and fix if needed
  if (config.maxReviewFixes > 0) {
    const decision = await fetchReviewDecision(pr);

    if (decision === "CHANGES_REQUESTED") {
      log(`PR #${pr}: changes requested, fetching review comments...`);
      const comments = await fetchReviewComments(pr);

      for (let cycle = 0; cycle < config.maxReviewFixes; cycle++) {
        log(
          `PR #${pr}: review-fix cycle ${cycle + 1}/${config.maxReviewFixes}`,
        );

        try {
          await spawnReviewFix(pr, comments, config);
          logOk(`PR #${pr}: review fix agent completed`);
        } catch (e) {
          logWarn(`PR #${pr}: review fix agent failed: ${e}`);
          return "failed";
        }

        // Re-check CI after review fix
        if (!config.skipCi) {
          log(`PR #${pr}: re-checking CI after review fix...`);
          const ciOk = await waitForCiWithRetries(pr, config);
          if (!ciOk) {
            checkpoint.logAction(workflowId, "ci-failed", "failed", { pr });
            logErr(`PR #${pr}: CI still failing after review fix, skipping`);
            return "failed";
          }
        }

        // Re-check review decision
        const newDecision = await fetchReviewDecision(pr);
        if (newDecision !== "CHANGES_REQUESTED") {
          logOk(
            `PR #${pr}: review status now "${newDecision || "no reviews"}"`,
          );
          break;
        }

        if (cycle === config.maxReviewFixes - 1) {
          logErr(
            `PR #${pr}: still CHANGES_REQUESTED after ${config.maxReviewFixes} fix cycle(s), skipping`,
          );
          return "failed";
        }
      }
    } else {
      log(`PR #${pr}: review decision "${decision || "none"}" — ready`);
    }
  }

  return "ready";
}

/**
 * Send one Telegram message listing all ready PRs, wait for user reply,
 * then verify which PRs were merged on GitHub.
 */
async function notifyAndWaitForMerge(
  prs: Array<{ pr: number; issue: number; workflowId: string }>,
  waveNumber: number,
  config: Config,
): Promise<{ merged: Set<number>; failed: Set<number> }> {
  const merged = new Set<number>();
  const failed = new Set<number>();

  if (prs.length === 0) return { merged, failed };

  if (config.autoMerge) {
    // Auto-merge mode: merge PRs directly
    for (const { pr, issue, workflowId } of prs) {
      try {
        await $`gh pr merge ${pr} --squash --delete-branch`.quiet();
        checkpoint.logAction(workflowId, "pr-merged", "success", { pr });
        logOk(`PR #${pr}: merged (auto-merge)`);
        merged.add(issue);
      } catch (e) {
        logErr(`PR #${pr}: merge failed: ${e}`);
        checkpoint.logAction(workflowId, "pr-merge-failed", "failed", {
          pr,
          error: String(e),
        });
        failed.add(issue);
      }
    }
    return { merged, failed };
  }

  // Telegram notification mode
  const prList = prs
    .map(({ pr, issue }) => `• PR #${pr} — issue #${issue}`)
    .join("\n");
  const message = `Wave ${waveNumber} ready for review (${prs.length} PR${prs.length > 1 ? "s" : ""}):\n${prList}\nReply when merged and ready to continue.`;

  log(`Sending Telegram notification for wave ${waveNumber}...`);
  try {
    await $`tg-send ${message}`.quiet();
  } catch (e) {
    logErr(`Failed to send Telegram notification: ${e}`);
    // Fall through — still wait for user input
  }

  log(`Waiting for Telegram reply...`);
  try {
    await $`tg-wait -q`;
  } catch (e) {
    logWarn(`tg-wait error: ${e}`);
  }

  // Verify merge status of each PR
  for (const { pr, issue, workflowId } of prs) {
    try {
      const stateResult =
        await $`gh pr view ${pr} --json state -q .state`.quiet();
      const state = stateResult.text().trim();
      if (state === "MERGED") {
        checkpoint.logAction(workflowId, "pr-merged", "success", { pr });
        logOk(`PR #${pr}: confirmed merged`);
        merged.add(issue);
      } else {
        logWarn(`PR #${pr}: state is ${state}, not merged`);
        failed.add(issue);
      }
    } catch (e) {
      logWarn(`PR #${pr}: could not verify state: ${e}`);
      failed.add(issue);
    }
  }

  return { merged, failed };
}

// ---------------------------------------------------------------------------
// CI + Review + Merge
// ---------------------------------------------------------------------------

async function reviewAndMergeWave(
  wave: Wave,
  milestoneId: string,
  config: Config,
): Promise<{ merged: Set<number>; failed: Set<number> }> {
  const merged = new Set<number>();
  const failed = new Set<number>();

  if (config.skipCi && config.skipMerge) return { merged, failed };

  log(`\nWave ${wave.wave}: Review + Merge phase`);

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

  const readyPRs: Array<{ pr: number; issue: number; workflowId: string }> = [];

  for (const row of rows) {
    if (row.status !== "completed") {
      logWarn(`Skipping #${row.issue_number} (status: ${row.status})`);
      failed.add(row.issue_number);
      continue;
    }

    // Find PR from actions
    const prAction = db
      .query<{ metadata: string }, [string]>(
        `
        SELECT metadata FROM actions
        WHERE workflow_id = ? AND action = 'pr-created' AND result = 'success'
        ORDER BY created_at DESC LIMIT 1
      `,
      )
      .get(row.workflow_id);

    if (!prAction?.metadata) {
      failed.add(row.issue_number);
      continue;
    }

    let prNumber: number;
    try {
      const meta = JSON.parse(prAction.metadata);
      prNumber = meta.pr;
      if (!prNumber) {
        failed.add(row.issue_number);
        continue;
      }
    } catch {
      failed.add(row.issue_number);
      continue;
    }

    // Verify PR is still open
    try {
      const prState =
        await $`gh pr view ${prNumber} --json state -q .state`.quiet();
      const state = prState.text().trim();
      if (state === "MERGED") {
        log(`PR #${prNumber} already merged`);
        merged.add(row.issue_number);
        continue;
      }
      if (state !== "OPEN") {
        log(`PR #${prNumber} is ${state}, skipping`);
        failed.add(row.issue_number);
        continue;
      }
    } catch {
      logWarn(`Could not check PR #${prNumber} state`);
      failed.add(row.issue_number);
      continue;
    }

    // Run per-PR review loop
    const outcome = await reviewAndMergePR(
      prNumber,
      row.workflow_id,
      row.issue_number,
      config,
    );

    if (outcome === "ready") {
      readyPRs.push({
        pr: prNumber,
        issue: row.issue_number,
        workflowId: row.workflow_id,
      });
    } else {
      failed.add(row.issue_number);
    }
  }

  // Merge phase: Telegram notify + user merge, or auto-merge
  if (!config.skipMerge && readyPRs.length > 0) {
    const mergeResult = await notifyAndWaitForMerge(
      readyPRs,
      wave.wave,
      config,
    );
    for (const issue of mergeResult.merged) merged.add(issue);
    for (const issue of mergeResult.failed) failed.add(issue);
  }

  // Pull latest main after merges
  if (!config.skipMerge && merged.size > 0) {
    try {
      await $`git -C ${REPO_ROOT} checkout main --quiet`.quiet();
      await $`git -C ${REPO_ROOT} pull origin main --quiet`.quiet();
    } catch {
      logWarn("Failed to pull origin main");
    }
  }

  return { merged, failed };
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

  // Clean up worktrees only if we used them (parallel > 1)
  if (config.parallel > 1) {
    try {
      await $`bash ${WORKTREE_MANAGER} cleanup-all --force`.quiet();
      logOk("Worktrees cleaned up");
    } catch {
      logWarn("Worktree cleanup had errors");
    }
  }

  // Ensure repo is back on main
  try {
    await $`git -C ${REPO_ROOT} checkout main --quiet`.quiet();
  } catch {
    // best-effort
  }

  // Epic: update parent issue checkboxes
  if (config.mode === "epic" && epicNumber) {
    try {
      const bodyResult =
        await $`gh issue view ${epicNumber} --json body -q .body`.quiet();
      let body = bodyResult.text();

      const subIssues = await fetchSubIssues(epicNumber);
      const closedNumbers = subIssues.filter(isClosed).map((i) => i.number);

      for (const num of closedNumbers) {
        body = body.replace(new RegExp(`- \\[ \\] .*#${num}\\b`), (match) =>
          match.replace("- [ ]", "- [x]"),
        );
      }

      await $`gh issue edit ${epicNumber} --body ${body}`.quiet();

      const allClosed = subIssues.every(isClosed);
      if (allClosed) {
        await $`gh issue close ${epicNumber}`.quiet();
        logOk(`Epic #${epicNumber} closed (all sub-issues done)`);
      }
    } catch {
      logWarn("Failed to update epic issue");
    }
  }

  // Mark milestone status based on results
  const db = getDatabase();
  const stats = db
    .query<{ status: string; cnt: number }, [string]>(
      `SELECT w.status, COUNT(*) as cnt
       FROM workflows w
       JOIN milestone_workflows mw ON w.id = mw.workflow_id
       WHERE mw.milestone_id = ?
       GROUP BY w.status`,
    )
    .all(milestoneId);

  const statusCounts = Object.fromEntries(stats.map((r) => [r.status, r.cnt]));
  const completedCount = statusCounts["completed"] ?? 0;
  const failedCount = statusCounts["failed"] ?? 0;
  const totalCount = stats.reduce((s, r) => s + r.cnt, 0);

  if (completedCount === totalCount) {
    checkpoint.setMilestoneStatus(milestoneId, "completed");
    logOk(`All ${totalCount} issue(s) completed`);
  } else if (completedCount > 0) {
    checkpoint.setMilestoneStatus(milestoneId, "completed");
    logWarn(
      `${completedCount}/${totalCount} issue(s) completed, ${failedCount} failed`,
    );
  } else {
    logErr(`All ${totalCount} issue(s) failed — use --resume to retry.`);
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

async function loadResumeState(config: Config): Promise<ResumeState | null> {
  const data = checkpoint.findMilestoneByName(getMilestoneName(config));
  if (!data) return null;

  const milestoneId = data.milestone.id;

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
      // Check checkpoint for existing PR action
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
              `Recovered #${row.issue_number} (PR #${meta.pr} from checkpoint)`,
            );
            continue;
          }
        } catch {
          // fall through
        }
      }

      // Check GitHub for PR
      const ghPR = await findExistingPR(row.issue_number);
      if (ghPR) {
        checkpoint.setStatus(row.workflow_id, "completed");
        checkpoint.logAction(row.workflow_id, "pr-created", "success", {
          pr: ghPR.pr,
          source: "pre-existing",
        });
        completedIssues.add(row.issue_number);
        recovered++;
        logOk(
          `Recovered #${row.issue_number} (found PR #${ghPR.pr} on GitHub)`,
        );
        continue;
      }

      // Check for existing worktree (in-progress, no PR)
      const worktree = findExistingWorktree(row.issue_number);
      if (worktree) {
        logWarn(
          `Issue #${row.issue_number} has worktree at ${worktree} but no PR — will re-execute`,
        );
      }

      if (row.status === "running") {
        checkpoint.setStatus(row.workflow_id, "failed");
      }
    }
  }

  if (recovered > 0) {
    logOk(`Recovered ${recovered} workflow(s) with existing PRs`);
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
// Wave Gating
// ---------------------------------------------------------------------------

function gateWave(
  wave: Wave,
  failedIssues: Set<number>,
  graph: IssueNode[],
): Wave {
  const graphMap = new Map(graph.map((node) => [node.number, node]));

  const allowed = wave.issues.filter((issue) => {
    const node = graphMap.get(issue);
    if (!node) return true;
    return !node.blockedBy.some((dep) => failedIssues.has(dep));
  });

  return { wave: wave.wave, issues: allowed };
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
  let issueGraph: IssueNode[] = [];
  let completedIssues = new Set<number>();

  // --- Resume or Fresh ---
  if (config.resume) {
    log("Resuming from checkpoint...");
    const state = await loadResumeState(config);
    if (!state) {
      logErr("No checkpoint found to resume. Run without --resume first.");
      process.exit(1);
    }
    milestoneId = state.milestoneId;
    waves = state.waves;
    completedIssues = state.completedIssues;

    issueGraph = inferGraphFromWaves(waves);

    // Reset milestone to running so execution can proceed
    checkpoint.setMilestoneStatus(milestoneId, "running");
    checkpoint.setMilestonePhase(milestoneId, "execute");

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
    const result =
      config.mode === "epic"
        ? await computeWavesEpic(parseInt(config.target, 10))
        : await computeWavesMilestone(config.target);
    waves = result.waves;
    issueGraph = result.graph;

    const ms = checkpoint.createMilestone(getMilestoneName(config));
    milestoneId = ms.id;

    // Pre-create workflow entries for tracking
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

  // --- Execute waves with gating ---
  const failedIssues = new Set<number>();

  for (const wave of waves) {
    // Gate: filter out issues whose blockers failed/didn't merge
    const gatedWave = gateWave(wave, failedIssues, issueGraph);
    if (gatedWave.issues.length === 0) {
      logWarn(
        `Wave ${wave.wave}: all issues blocked by prior failures, skipping`,
      );
      for (const issue of wave.issues) failedIssues.add(issue);
      continue;
    }
    if (gatedWave.issues.length < wave.issues.length) {
      const gatedSet = new Set(gatedWave.issues);
      const skipped = wave.issues.filter((i) => !gatedSet.has(i));
      logWarn(
        `Wave ${wave.wave}: skipping ${skipped.map((i) => `#${i}`).join(", ")} (blocked by prior failures)`,
      );
      for (const issue of skipped) failedIssues.add(issue);
    }

    checkpoint.setMilestonePhase(milestoneId, "execute");
    await executeWave(gatedWave, milestoneId, config, completedIssues);

    checkpoint.setMilestonePhase(milestoneId, "merge");
    const result = await reviewAndMergeWave(gatedWave, milestoneId, config);
    for (const f of result.failed) failedIssues.add(f);
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
