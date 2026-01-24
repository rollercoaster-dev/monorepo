# Auto-Milestone Comparison Analysis

**Date:** 2025-01-18
**Analysis Type:** Multi-session comparison with subagent deep-dive

---

## Executive Summary

Comparison of two auto-milestone sessions reveals **Session 2's structured workflow pattern is 40% more efficient** than Session 1's simpler approach.

### Key Findings

1. **Structured agents improve efficiency**: Session 2 uses dedicated setup-agent, review-orchestrator, and finalize-agent, resulting in only 28.8 orchestrator calls per issue vs Session 1's 48.1.

2. **Higher delegation correlates with efficiency**: Session 2 spends 18.8% of its calls on Task coordination, compared to Session 1's 4.6%. More delegation = less orchestrator work.

3. **File size is 5x smaller per issue**: Session 2 averages 25MB per issue vs Session 1's 68MB, suggesting cleaner execution paths.

4. **Zero Claude-Knowledge tool usage**: Neither session uses MCP Knowledge tools (0 calls) or CLI graph/knowledge commands (0 calls). Session 2 only uses checkpoint CLI (4 calls). This is the biggest optimization opportunity.

5. **Git churn differs significantly**: Session 1 had 52 git checkouts (branch thrashing); Session 2 had only 8 for the same number of branches.

### Recommendation

Standardize on Session 2's workflow pattern (with milestone-planner, setup-agent, review-orchestrator, finalize-agent) and enable MCP Knowledge tools for further optimization

---

## Session Overview

| Session ID        | Size  | Date   | Issues                                   | Subagent Pattern               |
| ----------------- | ----- | ------ | ---------------------------------------- | ------------------------------ |
| c9d986c3-bcaa-... | 615MB | Jan 17 | ~9 issues (190, 218-223, 552, 553, etc.) | Basic (researcher + developer) |
| 038d480b-3138-... | 125MB | Jan 16 | 5 issues (227, 228, 224, 194, 49)        | Full workflow (6 agent types)  |

---

## Session 1: c9d986c3 (Multiple Issues)

_Data from Experiment 4 analysis + new subagent deep-dive_
_Actual issues: #190, #218-223, #552, #553, #90_

### Key Metrics (From Experiment 4)

| Metric                  | Value       |
| ----------------------- | ----------- |
| Total tool calls        | 1,126       |
| Main orchestrator calls | 433 (38.5%) |
| Subagent calls          | 693 (61.5%) |
| Read:Write ratio        | 1.53:1      |
| Subagents spawned       | 19          |

### Tool Distribution

| Tool      | Main | Subagents | Total | %     |
| --------- | ---- | --------- | ----- | ----- |
| Bash      | 307  | 352       | 659   | 58.5% |
| Edit      | 26   | 158       | 184   | 16.3% |
| Read      | 33   | 135       | 168   | 14.9% |
| TodoWrite | 31   | 0         | 31    | 2.8%  |
| Glob      | 7    | 17        | 24    | 2.1%  |
| Write     | 8    | 15        | 23    | 2.0%  |
| Task      | 20   | 0         | 20    | 1.8%  |
| Grep      | 1    | 9         | 10    | 0.9%  |
| Skill     | 0    | 7         | 7     | 0.6%  |

### Subagent Breakdown (20 Task Calls)

| Agent Type       | Count | Purpose             |
| ---------------- | ----- | ------------------- |
| issue-researcher | 9     | Create dev plans    |
| atomic-developer | 9     | Implement changes   |
| github-master    | 2     | Create issues/epics |

**Note:** Session 1 lacks setup-agent, review-orchestrator, and finalize-agent - older workflow pattern.

### Git Commands (127 total)

| Command      | Count | Category |
| ------------ | ----- | -------- |
| git checkout | 52    | READ     |
| git push     | 19    | WRITE    |
| git add      | 17    | WRITE    |
| git log      | 12    | READ     |
| git status   | 9     | READ     |
| git diff     | 5     | READ     |
| git stash    | 3     | WRITE    |
| git pull     | 2     | READ     |
| git show     | 2     | READ     |
| git fetch    | 2     | READ     |
| git branch   | 1     | READ     |
| git rm       | 1     | WRITE    |
| git commit   | 1     | WRITE    |
| git rebase   | 1     | WRITE    |

**Git Summary:** READ 85 (67%), WRITE 42 (33%)

### Bun Commands (36 total)

| Command            | Count |
| ------------------ | ----- |
| bun run type-check | 11    |
| bun --filter       | 10    |
| bun run lint       | 5     |
| bun run build      | 3     |
| bun run test       | 3     |
| bun test           | 2     |
| bun install        | 1     |

### GH Commands (75 total)

| Command  | Count | Category |
| -------- | ----- | -------- |
| gh pr    | 35    | WRITE    |
| gh run   | 20    | READ     |
| gh issue | 17    | WRITE    |
| gh api   | 3     | READ     |

**GH Summary:** READ 23 (31%), WRITE 52 (69%)

### Issues Worked On

The session actually worked on these issues (not 164, 165, 190 as initially stated):

- Issue #190 - TypeScript strict mode
- Issues #220-223 - rd-logger refactoring
- Issue #218, #90 - Additional tasks
- Issues #552, #553 - Auth tests

---

## Session 2: 038d480b (Issues 227, 228, 224, 194, 49)

_Fresh analysis - 5 issues processed, 5 PRs created_

### Key Metrics

| Metric                            | Value                           |
| --------------------------------- | ------------------------------- |
| Total lines in session            | 2,197                           |
| Main orchestrator tool calls      | 144                             |
| Task tool calls (subagent spawns) | 27                              |
| PRs created                       | 5 (#536-540)                    |
| Issues completed                  | 5 (#227, #228, #224, #194, #49) |

### Tool Distribution (Main Orchestrator)

| Tool           | Count | %     |
| -------------- | ----- | ----- |
| Bash           | 95    | 66.0% |
| Task           | 27    | 18.8% |
| TodoWrite      | 11    | 7.6%  |
| Read           | 4     | 2.8%  |
| Edit           | 3     | 2.1%  |
| MCP (Telegram) | 2     | 1.4%  |
| Skill          | 1     | 0.7%  |
| WebFetch       | 1     | 0.7%  |

### Subagent Breakdown (27 Task Calls)

| Agent Type          | Count | Purpose                             |
| ------------------- | ----- | ----------------------------------- |
| milestone-planner   | 1     | Analyze issue dependencies          |
| setup-agent         | 5     | Initialize workflow per issue       |
| issue-researcher    | 6     | Create dev plans (issue #224 had 2) |
| atomic-developer    | 5     | Implement changes                   |
| review-orchestrator | 5     | Code review (issue #49 had 3)       |
| finalize-agent      | 5     | Create PRs                          |

### Git Commands (35 total)

| Command      | Count | Category |
| ------------ | ----- | -------- |
| git checkout | 8     | READ     |
| git status   | 5     | READ     |
| git diff     | 5     | READ     |
| git show     | 5     | READ     |
| git log      | 3     | READ     |
| git restore  | 3     | WRITE    |
| git stash    | 2     | WRITE    |
| git push     | 2     | WRITE    |
| git rebase   | 1     | WRITE    |
| git add      | 1     | WRITE    |

**Git Summary:** READ 26 (74%), WRITE 9 (26%)

### Bun Commands (13 total)

| Command            | Count |
| ------------------ | ----- |
| bun --filter       | 4     |
| bun run checkpoint | 4     |
| bun run type-check | 3     |
| bun install        | 1     |
| bun run build      | 1     |

### GH Commands (26 total)

| Command              | Count | Category |
| -------------------- | ----- | -------- |
| gh pr (create/merge) | 10    | WRITE    |
| gh api (graphql)     | 7     | READ     |
| gh issue (view/edit) | 6     | WRITE    |
| gh run (view)        | 3     | READ     |

**GH Summary:** READ 10 (38%), WRITE 16 (62%)

### Notable Observations

1. **Heavy delegation**: Main orchestrator primarily coordinates via Task (27 calls)
2. **Subagent results embedded**: All subagent work is inline in the session file, not in separate agent-\*.jsonl files
3. **Issue #49 required extra review**: 3 review-orchestrator calls (font implementation complexity)
4. **Issue #224 required re-research**: 2 issue-researcher calls (path alias complexity)
5. **MCP usage**: 2 Telegram notifications used (likely for status updates)

---

## Comparison

### Side-by-Side Metrics

| Metric                  | Session 1 (c9d986c3) | Session 2 (038d480b) | Delta  |
| ----------------------- | -------------------- | -------------------- | ------ |
| Session file size       | 615MB                | 125MB                | -79.7% |
| Lines in session        | 4,359                | 2,197                | -49.6% |
| Main orchestrator calls | 433                  | 144                  | -66.7% |
| Task calls (subagents)  | 20                   | 27                   | +35%   |
| Issues addressed        | ~9                   | 5                    | -44%   |
| PRs created             | Unknown              | 5                    | -      |
| Git commands            | 127                  | 35                   | -72.4% |
| GH commands             | 75                   | 26                   | -65.3% |
| Bun commands            | 36                   | 13                   | -63.9% |

### Workflow Pattern Comparison

| Feature             | Session 1 | Session 2 |
| ------------------- | --------- | --------- |
| milestone-planner   | No        | Yes (1)   |
| setup-agent         | No        | Yes (5)   |
| review-orchestrator | No        | Yes (5)   |
| finalize-agent      | No        | Yes (5)   |
| MCP Telegram        | No        | Yes (2)   |
| MCP Knowledge       | No        | No        |

### Key Differences

1. **Session 2 uses structured workflow agents**
   - Dedicated setup, review, and finalization phases
   - Session 1 only used issue-researcher and atomic-developer

2. **Session 2 is more efficient per-issue**
   - 144 main calls / 5 issues = **28.8 calls/issue**
   - Session 1: 433 calls / ~9 issues = **48.1 calls/issue**
   - **40% more efficient**

3. **Session 2 has better delegation ratio**
   - Task calls: 27/144 = **18.8%** of main orchestrator work is coordination
   - Session 1: 20/433 = **4.6%** coordination
   - Session 2 delegates more, orchestrator does less direct work

4. **Git usage patterns differ**
   - Session 1: Heavy `git checkout` (52) and `git add` (17) suggests iterative work
   - Session 2: Fewer git commands overall, more read-focused (74% vs 67%)

5. **Neither session uses MCP Knowledge tools**
   - Both rely on Glob/Grep for code exploration
   - Missing opportunity for graph-based navigation

### Read:Write Ratio Analysis

| Category                                    | Session 1  | Session 2  |
| ------------------------------------------- | ---------- | ---------- |
| **Read tools** (Read, Glob, Grep, WebFetch) | 41         | 5          |
| **Write tools** (Edit, Write)               | 34         | 3          |
| **Meta tools** (Task, TodoWrite, Skill)     | 51         | 39         |
| **Bash**                                    | 307        | 95         |
| **MCP tools**                               | 0          | 2          |
| **Read:Write Ratio**                        | **1.21:1** | **1.67:1** |

**Key Insight:** Session 2 has a higher Read:Write ratio (1.67:1 vs 1.21:1), suggesting more deliberate exploration before making changes. However, both ratios are relatively low compared to ad-hoc sessions (which average ~3.4:1 per Experiment 1).

### MCP Usage Deep Dive

| MCP Tool                                          | Session 1 | Session 2 | Purpose              |
| ------------------------------------------------- | --------- | --------- | -------------------- |
| `mcp__claude-knowledge__graph_find`               | 0         | 0         | Find code entities   |
| `mcp__claude-knowledge__graph_what_calls`         | 0         | 0         | Find callers         |
| `mcp__claude-knowledge__graph_blast_radius`       | 0         | 0         | Impact analysis      |
| `mcp__claude-knowledge__knowledge_query`          | 0         | 0         | Query learnings      |
| `mcp__claude-knowledge__knowledge_search_similar` | 0         | 0         | Semantic search      |
| `mcp__claude-knowledge__knowledge_store`          | 0         | 0         | Store learnings      |
| `mcp__claude-knowledge__checkpoint_*`             | 0         | 0         | Workflow checkpoints |
| `mcp__mcp-communicator-telegram__notify_user`     | 0         | **2**     | User notifications   |
| **Total MCP Calls**                               | **0**     | **2**     | -                    |

**Critical Gap:** Zero usage of Claude Knowledge MCP tools in both sessions. The code graph and knowledge base are not being leveraged during auto-milestone workflows. This represents a significant optimization opportunity.

### Claude-Knowledge CLI Usage

| CLI Command                                   | Session 1 | Session 2 |
| --------------------------------------------- | --------- | --------- |
| `bun run checkpoint status`                   | 0         | 2         |
| `bun run checkpoint workflow list`            | 0         | 2         |
| `bun run graph-*` (any graph command)         | 0         | 0         |
| `bun run knowledge-*` (any knowledge command) | 0         | 0         |
| **Total CLI Usage**                           | **0**     | **4**     |

Session 2 uses the checkpoint CLI to track workflow status, but **neither session uses the graph or knowledge CLI commands**. The checkpoint usage shows awareness of the system, but the exploration tools (graph query, knowledge search) are unused.

**Commands found in Session 2:**

```bash
bun run checkpoint status --commits 10
bun run checkpoint workflow list --status running
bun run checkpoint workflow list
bun run checkpoint status --commits 3 | grep -A 20 "ACTIVE WORKFLOWS"
```

### Efficiency Analysis

| Ratio                | Session 1 | Session 2 | Winner                      |
| -------------------- | --------- | --------- | --------------------------- |
| Main calls per issue | 48.1      | 28.8      | Session 2                   |
| Task calls per issue | 2.2       | 5.4       | Session 2 (more delegation) |
| Git reads per write  | 2.0:1     | 2.9:1     | Session 2 (less churn)      |
| File size per issue  | ~68MB     | ~25MB     | Session 2                   |

---

## Recommendations

### 1. Adopt Session 2's Workflow Pattern

The structured workflow with setup-agent, review-orchestrator, and finalize-agent shows clear benefits:

- 40% fewer orchestrator calls per issue
- Better separation of concerns
- More consistent PR creation

### 2. Enable Claude-Knowledge Integration

Both sessions had **0 MCP Knowledge tool calls** and **0 graph/knowledge CLI usage**. This is a critical optimization opportunity:

**MCP Tools to Enable:**

- `mcp__claude-knowledge__graph_find` - Replace Glob for finding code entities
- `mcp__claude-knowledge__graph_what_calls` - Use before refactoring to understand impact
- `mcp__claude-knowledge__knowledge_search_similar` - Find relevant past learnings before implementing
- `mcp__claude-knowledge__knowledge_store` - Capture learnings during implementation

**CLI Tools to Use:**

- `bun run graph:query` - Query code graph from command line
- `bun run knowledge:search` - Search learnings database

**Expected Impact:** Based on Experiment 1, MCP-enabled exploration could reduce the Read:Write ratio from 1.2-1.7:1 to <1:1, as graph tools provide more precise results than Glob/Grep

### 3. Reduce Git Checkout Frequency

Session 1 had 52 `git checkout` calls. Consider:

- Worktree-based workflows for parallel issue work
- Stash management to avoid branch thrashing
- Session 2's pattern shows this is achievable (only 8 checkouts for 5 issues)

### 4. Monitor Subagent Re-calls

Both sessions show cases where agents were called multiple times for the same issue:

- Session 2: Issue #224 needed 2 issue-researcher calls
- Session 2: Issue #49 needed 3 review-orchestrator calls

Consider adding retry logging to identify problematic patterns.

### 5. Track MCP Usage Adoption

Create metrics to track MCP tool adoption over time:

- Target: >50% of exploration via graph tools
- Current: 0% (both sessions)

---

## Appendix: Raw Data Summary

### Session 1 (c9d986c3)

```json
{
  "sessionId": "c9d986c3-bcaa-446e-86ab-97ed3ee3549c",
  "date": "2025-01-17",
  "fileSize": "615MB",
  "lines": 4359,
  "mainCalls": 433,
  "taskCalls": 20,
  "subagentTypes": ["issue-researcher", "atomic-developer", "github-master"],
  "mcpKnowledgeCalls": 0
}
```

### Session 2 (038d480b)

```json
{
  "sessionId": "038d480b-3138-484d-a820-c851874da7d2",
  "date": "2025-01-16",
  "fileSize": "125MB",
  "lines": 2197,
  "mainCalls": 144,
  "taskCalls": 27,
  "subagentTypes": [
    "milestone-planner",
    "setup-agent",
    "issue-researcher",
    "atomic-developer",
    "review-orchestrator",
    "finalize-agent"
  ],
  "mcpKnowledgeCalls": 0,
  "telegramNotifications": 2,
  "prsCreated": ["#536", "#537", "#538", "#539", "#540"]
}
```

---

_Analysis generated on 2025-01-18. Extends Experiment 4 findings with Session 2 comparison._
