import { checkpoint } from "../checkpoint";

interface StatusOptions {
  commits?: number;
  issues?: number;
  json?: boolean;
}

/**
 * Handle status command - shows project progress overview.
 */
export async function handleStatusCommand(args: string[]): Promise<void> {
  const options = parseStatusArgs(args);

  if (options.json) {
    await outputJsonStatus(options);
  } else {
    await outputHumanStatus(options);
  }
}

function parseStatusArgs(args: string[]): StatusOptions {
  const options: StatusOptions = {
    commits: 5,
    issues: 10,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--commits" && args[i + 1]) {
      options.commits = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--issues" && args[i + 1]) {
      options.issues = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--json") {
      options.json = true;
    }
  }

  return options;
}

async function getRecentCommits(
  limit: number,
): Promise<Array<{ sha: string; message: string }>> {
  const result = Bun.spawnSync([
    "git",
    "log",
    `--oneline`,
    `-${limit}`,
    "--format=%h %s",
  ]);

  if (!result.success) {
    return [];
  }

  return result.stdout
    .toString()
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [sha, ...rest] = line.split(" ");
      return { sha: sha || "", message: rest.join(" ") };
    });
}

interface GhIssue {
  number: number;
  title: string;
  milestone?: { title: string } | null;
  labels: Array<{ name: string }>;
}

async function getOpenIssues(limit: number): Promise<GhIssue[]> {
  const result = Bun.spawnSync([
    "gh",
    "issue",
    "list",
    "--limit",
    String(limit),
    "--json",
    "number,title,milestone,labels",
  ]);

  if (!result.success) {
    return [];
  }

  try {
    return JSON.parse(result.stdout.toString()) as GhIssue[];
  } catch {
    return [];
  }
}

interface GhPr {
  number: number;
  title: string;
  headRefName: string;
  isDraft: boolean;
  reviewDecision: string | null;
}

async function getOpenPRs(): Promise<GhPr[]> {
  const result = Bun.spawnSync([
    "gh",
    "pr",
    "list",
    "--json",
    "number,title,headRefName,isDraft,reviewDecision",
  ]);

  if (!result.success) {
    return [];
  }

  try {
    return JSON.parse(result.stdout.toString()) as GhPr[];
  } catch {
    return [];
  }
}

async function outputJsonStatus(options: StatusOptions): Promise<void> {
  const [commits, workflows, issues, prs] = await Promise.all([
    getRecentCommits(options.commits || 5),
    Promise.resolve(checkpoint.listActive()),
    getOpenIssues(options.issues || 10),
    getOpenPRs(),
  ]);

  // Sort issues by milestone
  const sortedIssues = issues.sort((a, b) => {
    const aMilestone = a.milestone?.title || "zzz";
    const bMilestone = b.milestone?.title || "zzz";
    return aMilestone.localeCompare(bMilestone);
  });

  console.log(
    JSON.stringify(
      {
        commits,
        workflows: workflows.map((w) => ({
          issue: w.issueNumber,
          phase: w.phase,
          status: w.status,
          branch: w.branch,
        })),
        issues: sortedIssues.map((i) => ({
          number: i.number,
          title: i.title,
          milestone: i.milestone?.title || null,
        })),
        prs: prs.map((p) => ({
          number: p.number,
          title: p.title,
          branch: p.headRefName,
          isDraft: p.isDraft,
          reviewDecision: p.reviewDecision,
        })),
      },
      null,
      2,
    ),
  );
}

async function outputHumanStatus(options: StatusOptions): Promise<void> {
  const [commits, workflows, issues, prs] = await Promise.all([
    getRecentCommits(options.commits || 5),
    Promise.resolve(checkpoint.listActive()),
    getOpenIssues(options.issues || 10),
    getOpenPRs(),
  ]);

  // Recent Commits
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  RECENT COMMITS (${commits.length})`);
  console.log(`${"=".repeat(50)}`);
  for (const commit of commits) {
    console.log(`  ${commit.sha} ${commit.message}`);
  }

  // Active Workflows
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  ACTIVE WORKFLOWS (${workflows.length})`);
  console.log(`${"=".repeat(50)}`);
  if (workflows.length === 0) {
    console.log("  (none)");
  } else {
    for (const w of workflows) {
      console.log(`  #${w.issueNumber} - ${w.phase} (${w.status})`);
    }
  }

  // Open PRs
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  OPEN PRs (${prs.length})`);
  console.log(`${"=".repeat(50)}`);
  if (prs.length === 0) {
    console.log("  (none)");
  } else {
    for (const pr of prs) {
      const status = pr.isDraft
        ? "DRAFT"
        : pr.reviewDecision || "PENDING REVIEW";
      console.log(`  #${pr.number} [${status}] ${pr.title}`);
    }
  }

  // Open Issues by Milestone
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  OPEN ISSUES (${issues.length})`);
  console.log(`${"=".repeat(50)}`);

  // Group by milestone
  const byMilestone = new Map<string, GhIssue[]>();
  for (const issue of issues) {
    const milestone = issue.milestone?.title || "No Milestone";
    if (!byMilestone.has(milestone)) {
      byMilestone.set(milestone, []);
    }
    byMilestone.get(milestone)!.push(issue);
  }

  // Sort milestones (No Milestone last)
  const sortedMilestones = [...byMilestone.keys()].sort((a, b) => {
    if (a === "No Milestone") return 1;
    if (b === "No Milestone") return -1;
    return a.localeCompare(b);
  });

  for (const milestone of sortedMilestones) {
    console.log(`\n  [${milestone}]`);
    const milestoneIssues = byMilestone.get(milestone) || [];
    for (const issue of milestoneIssues) {
      console.log(`    #${issue.number} ${issue.title}`);
    }
  }

  console.log("");
}
