# Experiment 4 Report: Auto-Milestone Tool Call Analysis

**Issue:** #431 - Evaluate context strategies (follow-up)
**Date:** 2025-01-17
**Session:** `c9d986c3-bcaa-446e-86ab-97ed3ee3549c`

---

## Executive Summary

Analysis of a large auto-milestone session reveals a **1.53:1 Read:Write ratio** when properly categorizing all tool calls including Bash subcommands. This is lower than the 3.4:1 exploration:implementation ratio found in Experiment 1, suggesting auto-milestone workflows are more implementation-focused.

Key finding: **The orchestrator delegates heavily** - only 433 of 1,126 total calls (38%) were made by the main conversation; the rest were delegated to 19 subagents.

---

## Methodology

### Data Source

- **Session:** `c9d986c3-bcaa-446e-86ab-97ed3ee3549c`
- **Size:** 615MB main conversation + 10MB subagents
- **Date:** January 17, 2025
- **Type:** Auto-milestone workflow

### Tool Categorization

| Category  | Tools / Commands                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Read**  | Read, Glob, Grep, git status/log/diff/branch/show/fetch/pull/checkout, bun test/lint/type-check/build, gh view/list/checks |
| **Write** | Edit, Write, git add/commit/push/merge/rm/restore/stash/rebase, bun install, gh create/edit/merge/close/delete             |
| **Meta**  | Task, TodoWrite, Skill                                                                                                     |

### Parsing Approach

Previous analysis using `grep` overcounted by matching text content. This analysis properly parses JSONL to extract only `tool_use` blocks.

---

## Results

### High-Level Tool Distribution

| Tool      | Main    | Subagents | Total     | %        |
| --------- | ------- | --------- | --------- | -------- |
| Bash      | 307     | 352       | 659       | 58.5%    |
| Edit      | 26      | 158       | 184       | 16.3%    |
| Read      | 33      | 135       | 168       | 14.9%    |
| TodoWrite | 31      | 0         | 31        | 2.8%     |
| Glob      | 7       | 17        | 24        | 2.1%     |
| Write     | 8       | 15        | 23        | 2.0%     |
| Task      | 20      | 0         | 20        | 1.8%     |
| Grep      | 1       | 9         | 10        | 0.9%     |
| Skill     | 0       | 7         | 7         | 0.6%     |
| **TOTAL** | **433** | **693**   | **1,126** | **100%** |

### Orchestrator vs Subagent Split

```
┌─────────────────────────────────────────────────────┐
│  Tool Call Distribution by Actor                    │
│                                                     │
│  Main Orchestrator ██████████████░░░░░░░  38.5%     │
│  19 Subagents      ██████████████████████  61.5%    │
└─────────────────────────────────────────────────────┘
```

The orchestrator primarily:

- Runs Bash commands (307 calls) for validation and git operations
- Delegates implementation to subagents via Task (20 calls)
- Tracks progress with TodoWrite (31 calls)

### Git Command Breakdown

| Command      | Count | Category |
| ------------ | ----- | -------- |
| git checkout | 52    | READ     |
| git add      | 46    | WRITE    |
| git push     | 19    | WRITE    |
| git log      | 19    | READ     |
| git status   | 15    | READ     |
| git diff     | 10    | READ     |
| git commit   | 7     | WRITE    |
| git rm       | 3     | WRITE    |
| git stash    | 3     | WRITE    |
| git branch   | 3     | READ     |
| git restore  | 2     | WRITE    |
| git pull     | 2     | READ     |
| git show     | 2     | READ     |
| git fetch    | 2     | READ     |
| git rebase   | 1     | WRITE    |

**Git Subtotal:** Read 105, Write 81

### Bun Command Breakdown

| Command                    | Count | Category |
| -------------------------- | ----- | -------- |
| bun run type-check         | 36    | READ     |
| bun run typecheck          | 13    | READ     |
| bun run checkpoint         | 13    | READ     |
| bun --filter               | 10    | READ     |
| bun run lint               | 9     | READ     |
| bun test                   | 5     | READ     |
| bun run build              | 5     | READ     |
| bun run test:server:vitest | 4     | READ     |
| bun run test               | 3     | READ     |
| bun install                | 2     | WRITE    |
| Others                     | 6     | READ     |

**Bun Subtotal:** Read 104, Write 2

### GH (GitHub CLI) Command Breakdown

| Command              | Count | Category |
| -------------------- | ----- | -------- |
| gh issue view        | 45    | READ     |
| gh pr create         | 14    | WRITE    |
| gh run view          | 12    | READ     |
| gh api graphql       | 12    | READ     |
| gh pr list           | 10    | READ     |
| gh pr merge          | 9     | WRITE    |
| gh issue create      | 9     | WRITE    |
| gh run list          | 8     | READ     |
| gh issue close       | 4     | WRITE    |
| gh issue list        | 3     | READ     |
| gh project item-add  | 2     | WRITE    |
| gh project item-edit | 2     | WRITE    |
| gh issue edit        | 2     | WRITE    |
| gh pr checks         | 2     | READ     |
| gh label list        | 2     | READ     |
| gh project item-list | 2     | READ     |
| gh pr view           | 1     | READ     |
| gh pr close          | 1     | WRITE    |

**GH Subtotal:** Read 97, Write 43

---

## Final Categorization

### Tool-Level (Read, Glob, Grep vs Edit, Write)

| Category        | Count |
| --------------- | ----- |
| Read-only tools | 202   |
| Write tools     | 207   |

Tool-level ratio is nearly 1:1.

### Including Bash Subcommands

| Category  | Tool-Level | Bash-Level | Total   |
| --------- | ---------- | ---------- | ------- |
| **READ**  | 202        | 306        | **508** |
| **WRITE** | 207        | 126        | **333** |

### Final Read:Write Ratio

```
READ:WRITE = 508:333 = 1.53:1
```

---

## Comparison with Experiment 1

| Metric            | Experiment 1 | Experiment 4 | Delta |
| ----------------- | ------------ | ------------ | ----- |
| Sessions analyzed | 5            | 1            | -     |
| Total tool calls  | 1,312        | 1,126        | -14%  |
| Exploration %     | 47.7%        | ~45%         | -3%   |
| Implementation %  | 14.1%        | ~29%         | +15%  |
| Read:Write ratio  | ~3.4:1       | 1.53:1       | -55%  |

### Key Differences

1. **More writes per session** - Auto-milestone is heavily implementation-focused
2. **Subagent delegation** - 61.5% of work delegated vs ad-hoc sessions
3. **Validation-heavy** - 49 type-check/lint/test runs (bun commands)
4. **Git-heavy** - 186 git commands for atomic commits workflow

---

## Subagent Analysis

### Tool Usage by Subagent Type

19 subagents were spawned. Analyzing their tool distributions:

| Agent Pattern        | Bash   | Edit      | Read   | Write | Glob   | Grep   |
| -------------------- | ------ | --------- | ------ | ----- | ------ | ------ |
| Implementation-heavy | High   | Very High | Medium | Low   | Low    | Low    |
| Research-heavy       | High   | Low       | High   | Low   | Medium | Medium |
| Review agents        | Medium | Low       | High   | Low   | Low    | High   |

### Subagent Characteristics

- **Average calls per subagent:** 36.5
- **Most active subagent:** 109 calls
- **Least active subagent:** 14 calls
- **Delegation efficiency:** Main orchestrator uses 433 calls to coordinate 693 subagent calls

---

## Key Findings

### Finding 1: Auto-Milestone is Write-Heavy

Unlike ad-hoc sessions (3.4:1 exploration:implementation), auto-milestone runs at 1.53:1. This makes sense:

- Issues are pre-researched
- Plans exist before implementation
- Atomic commits require many git add/commit cycles

### Finding 2: Orchestrator is Lean

The main conversation focuses on:

- Coordination (Task spawning)
- Validation (type-check, lint, test)
- Git operations (add, commit, push)
- Progress tracking (TodoWrite)

Heavy lifting (Edit, Read for implementation) is delegated.

### Finding 3: Validation is Significant

49 validation commands (type-check, lint, test) represent ~4.4% of all tool calls. This ensures quality but adds overhead.

### Finding 4: GitHub Integration is Active

140 gh commands (12.4% of Bash) show heavy board/issue/PR management during auto-milestone.

---

## Implications

### For Claude-Knowledge Development

1. **Code graph value confirmed** - Even at 1.53:1, read operations are significant
2. **Subagent efficiency** - Delegation pattern works; subagents do focused work
3. **Validation automation** - Consider caching type-check results between commits

### For Auto-Milestone Optimization

1. **Reduce git add frequency** - 46 adds vs 7 commits suggests batching opportunity
2. **Cache validation** - Skip unchanged package validation
3. **Parallel subagents** - More concurrent execution could speed up

---

## Appendix: Raw Data

### Session Metadata

```json
{
  "sessionId": "c9d986c3-bcaa-446e-86ab-97ed3ee3549c",
  "date": "2025-01-17",
  "mainConversationSize": "615MB",
  "subagentCount": 19,
  "totalSubagentSize": "~10MB",
  "totalToolCalls": 1126,
  "mainToolCalls": 433,
  "subagentToolCalls": 693
}
```

### Tool Call Totals

```json
{
  "Bash": 659,
  "Edit": 184,
  "Read": 168,
  "TodoWrite": 31,
  "Glob": 24,
  "Write": 23,
  "Task": 20,
  "Grep": 10,
  "Skill": 7
}
```

### Categorized Totals

```json
{
  "toolLevelRead": 202,
  "toolLevelWrite": 207,
  "bashLevelRead": 306,
  "bashLevelWrite": 126,
  "totalRead": 508,
  "totalWrite": 333,
  "readWriteRatio": 1.53
}
```

---

## Critical Finding: No MCP Tool Usage

**The auto-milestone session made 0 MCP tool calls.**

| Session                    | MCP Calls | Grep | Glob | Notes                   |
| -------------------------- | --------- | ---- | ---- | ----------------------- |
| Auto-milestone (c9d986c3)  | 0         | 10   | 24   | Old exploration pattern |
| Current session (cd9e3b05) | 9         | 1    | 7    | Using code graph        |

### What This Means

The auto-milestone workflow was **not using the code graph MCP tools** (`graph_find`, `graph_what_calls`, `knowledge_query`, etc.) that were designed to reduce exploration overhead.

Instead, it relied on:

- 24 Glob calls
- 10 Grep calls
- 168 Read calls

If the workflow had used MCP tools:

- `graph_find` could replace many Glob/Grep calls
- `knowledge_search_similar` could surface relevant learnings
- Read:Write ratio would likely be lower (more efficient exploration)

### Recommended Action

Update the auto-milestone skill/agents to:

1. Use `mcp__claude-knowledge__graph_find` for locating code entities
2. Use `mcp__claude-knowledge__graph_what_calls` before refactoring
3. Use `mcp__claude-knowledge__knowledge_query` to check for existing learnings

This would validate whether the code graph actually reduces exploration overhead as hypothesized in Experiment 1.

---

## Next Steps

1. **Enable MCP in auto-milestone** - Update workflow to use code graph tools
2. **Re-run analysis** - Compare MCP-enabled vs non-MCP sessions
3. **Measure exploration reduction** - Target <1:1 read:write ratio
4. **Subagent deep-dive** - Which agent types benefit most from MCP?

---

_Generated as part of Issue #431 research. Analysis performed on January 17, 2025._
