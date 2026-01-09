# Claude-Knowledge Gap Analysis

> Comparing `docs/design/claude-knowledge-vision.md` to current implementation and open issues.
>
> Created: 2026-01-09

---

## Current State Summary

### What's Working (Implemented & Closed)

| Feature                                | Issue      | Status   |
| -------------------------------------- | ---------- | -------- |
| Checkpoint system                      | #352-356   | Complete |
| SQLite schema for knowledge graph      | #364       | Complete |
| `knowledge.store()` API                | #365       | Complete |
| `knowledge.query()` API                | #366       | Complete |
| Session lifecycle hooks                | #367       | Complete |
| Knowledge formatting + token budgeting | #368       | Complete |
| Worktree migration                     | #371, #373 | Complete |

### What's Open (Tracked)

| Feature                       | Issue    | Vision Doc Status          |
| ----------------------------- | -------- | -------------------------- |
| Context injection for prompts | #385     | "Deferred until validated" |
| Semantic search (embeddings)  | #379     | "Deferred until validated" |
| CLI knowledge commands        | #380     | "Deferred until validated" |
| Dogfooding validation         | #387     | "Do Now"                   |
| LED_TO semantics cleanup      | #381     | Not mentioned              |
| SUPERSEDES relationship       | #383     | "Deferred"                 |
| Workflow retrospective        | #375     | Not mentioned              |
| Type improvements             | #390-392 | Not mentioned              |

---

## Gap Analysis: Vision Doc vs Reality

### Section: Problem Statement

**Vision says:** Context compaction erases workflow state, same mistakes repeated.
**Reality:** Checkpoint system addresses state recovery. Knowledge graph addresses learning. ✅ Aligned.

### Section: Two Systems

**Vision says:** Checkpoint (ephemeral) + Knowledge Graph (persistent).
**Reality:** Both implemented. ✅ Aligned.

### Section: Existing Solutions

**Vision says:** Nothing does exactly what we need.
**Reality:** We built our own. ✅ Aligned.

### Section: Team Sync Options

**Vision says:** Defer until core value proven.
**Reality:** Not implemented.
**Scope clarification:** Multi-user and multi-project is **OUT OF SCOPE** for this implementation.

### Section: Codebase Indexing

**Vision says:** Defer. Separate milestone.
**Reality:** Not started. ✅ Aligned (correctly deferred).
**Note:** Tree-sitter static analysis (Tier 1 of hybrid strategy) should be broken out as separate issue.

### Section: Schema Design

**Vision says:** Start with Learning/Pattern/Mistake. Defer expansions (PlanExecution, ReviewFinding, TestingPattern, CrossPackageRule).
**Reality:** Current schema has Learning/Pattern/Mistake. Deferred items not implemented.
**Gap:** No tracking issues for schema expansions if/when dogfooding succeeds.

### Section: Token/Context Hypothesis

**Vision says:** Knowledge injection could reduce context 10-20x.
**Reality:** Formatter exists with token budgeting. But injection to prompts (#385) not done.
**Gap:** Can't measure hypothesis without #385.
**Action needed:** #385 is the critical blocker for validating this hypothesis.

### Section: Measurement Plan

**Vision says:** 4 phases - baseline, mine PRs, inject at session start, compare.
**Reality:**

- Phase 1 (baseline): Not systematically tracked. #387 mentions goals but no tracking mechanism.
- Phase 2 (mine PRs): Not started.
- Phase 3 (inject at session start): Blocked by #385.
- Phase 4 (compare): Can't happen without 1-3.
  **Gap:** No concrete tracking mechanism for measurement.

### Section: Decisions - "Do Now"

**Vision says:**

1. Use checkpoint system as-is ✅ Done
2. Dogfood for 4-6 weeks (#387) ⏳ In progress (tracking unclear)
3. Log observations honestly ❓ No mechanism

### Section: Decisions - "Defer Until Validated"

| Item                     | Issue | Status                |
| ------------------------ | ----- | --------------------- |
| Schema expansions        | None  | No issues exist       |
| Team sync                | N/A   | **OUT OF SCOPE**      |
| Codebase indexing        | None  | See Tree-sitter issue |
| Semantic search          | #379  | ✅ Tracked            |
| Session hooks automation | #367  | ✅ Done               |

---

## Issues Missing from Vision Doc

| Issue    | Description               | Should it be in vision?           |
| -------- | ------------------------- | --------------------------------- |
| #381     | LED_TO semantics          | No - tech debt                    |
| #375     | Workflow retrospective    | Yes - relates to learning capture |
| #390-392 | Type system improvements  | No - implementation detail        |
| #382     | Remove stale graph.cypher | No - cleanup                      |

---

## Recommendations

### Issues to Create

| New Issue                       | Description                                                                                                                                 | Priority    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Tree-sitter static analysis** | Extract code structure (functions, classes, imports) - Tier 1 of hybrid strategy. Start with TypeScript only, store as CodeSymbol entities. | Medium-High |
| **Measurement tracking**        | Concrete mechanism for dogfooding metrics (file reads, compactions, time)                                                                   | High        |
| **PR mining for bootstrap**     | Mine merged PRs for learnings to seed knowledge graph                                                                                       | Medium      |

### Tree-sitter Scoping

**Start minimal:**

- TypeScript/JavaScript only (monorepo is mostly TS)
- Extract: functions, classes, types, interfaces
- Store as `CodeSymbol` entity type in existing schema
- Defer cross-file call graphs to v2

**Schema addition:**

```typescript
// New entity type
type EntityType =
  | "Learning"
  | "CodeArea"
  | "File"
  | "Pattern"
  | "Mistake"
  | "CodeSymbol";

interface CodeSymbol {
  id: string;
  name: string;
  kind: "function" | "class" | "type" | "interface" | "const";
  filePath: string;
  startLine: number;
  endLine: number;
  signature?: string; // e.g., "(ctx: Context) => Promise<void>"
}
```

**New relationships:**

- `DEFINES`: File → CodeSymbol
- `CALLS`: CodeSymbol → CodeSymbol (future)
- `IMPORTS`: File → File (future)

### Milestone 22 Prioritization

- #385 (context injection) - **Critical** for validation
- #387 (dogfooding) - Active, needs measurement mechanism
- #380 (CLI commands) - After #385
- #379 (semantic search) - After dogfooding proves value

---

## Summary

**Scope:** Single-user, single-project only. Multi-user/multi-project is OUT OF SCOPE.

| Category            | Aligned   | Gaps                          |
| ------------------- | --------- | ----------------------------- |
| Core implementation | ✅        | -                             |
| Issue tracking      | ✅ Mostly | Some deferred items untracked |
| Measurement plan    | ❌        | No tracking mechanism         |
| Documentation       | ✅        | Updated 2026-01-09            |
| Prioritization      | ✅        | #385 now flagged as critical  |

**Key insight:** The system is largely built. The gap is in **validation infrastructure** (#385 context injection + measurement tracking) rather than features.
