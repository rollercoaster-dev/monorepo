# Issue #431 Final Report: Context Strategy Evaluation

**Date:** 2026-01-11
**Status:** Complete
**Decision:** Proceed with full code graph system

---

## Executive Summary

This research evaluated whether a pre-computed code graph would meaningfully improve Claude's ability to understand and work with codebases. Three experiments were conducted:

1. **Token Baseline Analysis** - Measured current exploration overhead
2. **Compaction Survival Test** - Validated structured data persistence
3. **Code Graph Prototype** - Built and benchmarked a working prototype

**Key Finding:** The code graph prototype achieved **27x speedup** and **97% token savings** compared to the grep+read approach, strongly supporting investment in a full code graph system.

---

## Experiment 1: Token Baseline Analysis

### Methodology

Analyzed 5 Claude Code sessions across 3 projects (monorepo, fobizz-rails, vacay-photo-map) totaling 1,312 tool calls.

### Findings

| Metric                                   | Value             |
| ---------------------------------------- | ----------------- |
| Exploration calls (Read, Grep, Glob, ls) | **47.7%** average |
| Implementation calls (Edit, Write)       | **14.1%** average |
| Read calls per session                   | 15-125 (avg ~54)  |
| Grep calls per session                   | 3-67 (avg ~28)    |

### Key Insight

Nearly half of all tool calls are spent **finding things out** rather than **making changes**. This is consistent across project types (TypeScript monorepo, Rails app, personal project).

### Implication

Significant opportunity to reduce exploration overhead with pre-computed structure.

---

## Experiment 2: Compaction Survival

### Methodology

Used the research conversation itself as a test subject, storing checkpoints in the claude-knowledge workflow system (SQLite).

### Findings

After context compaction occurred:

- ✅ Workflow checkpoint recovered perfectly
- ✅ All experiment data preserved
- ✅ Session metadata intact
- ✅ Action log complete

### Key Insight

Structured data stored in SQLite survives compaction completely, while unstructured conversation context is summarized/lost.

### Implication

Knowledge should be stored in structured form (database) rather than relying on conversation context.

---

## Experiment 3: Code Graph Prototype

### Implementation

Built a complete prototype targeting the `rd-logger` package:

**Components Created:**

1. `scripts/graph/test-parser.ts` - Verify ts-morph works
2. `scripts/graph/parse-package.ts` - Extract entities and relationships
3. `scripts/graph/store-graph.ts` - Store in SQLite
4. `src/cli/graph-commands.ts` - Query CLI (7 commands)
5. `scripts/graph/benchmark.ts` - Performance comparison

**Technology Choice:**

- Initially planned tree-sitter, but WASM compatibility issues led to using **ts-morph** instead
- ts-morph wraps TypeScript's own compiler API - ideal for TypeScript codebases

### Extraction Results

| Metric                  | Value                                            |
| ----------------------- | ------------------------------------------------ |
| Files parsed            | 21                                               |
| Entities extracted      | 103                                              |
| Relationships extracted | 305                                              |
| Entity types            | file, function, class, interface, type, variable |
| Relationship types      | imports, exports, calls, implements              |

**Entity Breakdown:**

- Functions: 53
- Files: 21
- Interfaces: 12
- Variables: 8
- Classes: 7
- Types: 2

**Relationship Breakdown:**

- Calls: 166
- Imports: 82
- Exports: 53
- Implements: 4

### Benchmark Results

| Query                          | Graph  | Grep    | Speedup |
| ------------------------------ | ------ | ------- | ------- |
| Find Logger class              | 0.65ms | 18.26ms | **28x** |
| Find createLogger              | 0.18ms | 9.22ms  | **50x** |
| What depends on logger.service | 0.37ms | 12.01ms | **32x** |
| What depends on Logger         | 0.26ms | 9.29ms  | **36x** |
| Blast radius of logger.service | 1.72ms | 10.54ms | **6x**  |
| Blast radius of formatters     | 0.90ms | 8.70ms  | **10x** |

**Totals:**

- Graph total: **4.08ms**
- Grep total: **68.03ms**
- Average speedup: **27x**

### Token Analysis

| Approach                   | Tokens   |
| -------------------------- | -------- |
| Grep (reads all source)    | ~124,000 |
| Graph (structured results) | ~4,250   |
| **Savings**                | **97%**  |

### CLI Commands Implemented

```bash
# Find what calls a function
graph what-calls <name>

# Find dependencies on an entity
graph what-depends-on <name>

# Find entities affected by changes to a file
graph blast-radius <file>

# Search for entities by name
graph find <name> [type]

# List exported entities
graph exports [package]

# Find direct callers
graph callers <function>

# Show graph statistics
graph summary [package]
```

---

## Decision Framework Applied

| Condition                  | Result         | Action                |
| -------------------------- | -------------- | --------------------- |
| Token baseline low (<20%)  | ❌ False (48%) | N/A                   |
| Structured survives better | ✅ True        | Validates approach    |
| Graph significantly faster | ✅ True (27x)  | **Build full system** |

**Decision: Proceed with full code graph system**

---

## Recommendations

### Immediate Next Steps

1. **Prioritize Issue #394** - Build full tree-sitter/ts-morph analysis for entire monorepo
2. **Extend schema** - Add metadata fields for richer queries
3. **Build index on startup** - Pre-compute graph when Claude Code session starts

### Future Enhancements

1. **Incremental updates** - Only re-parse changed files
2. **Cross-package relationships** - Track dependencies between packages
3. **Type-aware queries** - Use TypeScript's type information for smarter navigation
4. **Semantic search** - Combine graph with embeddings for natural language queries

### Integration Points

1. **Session start hook** - Build/refresh graph
2. **Explore agent** - Use graph for codebase exploration
3. **Edit suggestions** - Warn about blast radius before changes
4. **Context injection** - Include relevant graph context in prompts

---

## Files Created

```
packages/claude-knowledge/
├── scripts/graph/
│   ├── test-parser.ts      # Parser verification
│   ├── parse-package.ts    # Entity/relationship extraction
│   ├── store-graph.ts      # SQLite storage
│   └── benchmark.ts        # Performance comparison
├── src/
│   ├── cli/
│   │   └── graph-commands.ts  # Query CLI
│   └── db/
│       └── sqlite.ts       # Extended with graph tables
└── ...

.claude/dev-plans/
├── issue-431-context-research.md    # Main research plan
├── issue-431-experiment-1-report.md # Token baseline report
├── issue-431-experiment-3-code-graph.md # Code graph plan
└── issue-431-final-report.md        # This report
```

---

## Appendix: Workflow Tracking

**Workflow ID:** `workflow-431-1768140445021-3rdj99`

**Recovery Command:**

```bash
bun packages/claude-knowledge/src/cli/index.ts workflow get "workflow-431-1768140445021-3rdj99"
```

**Key Actions Logged:**

- `research_augment_context_engine` - Augment research
- `research_greptile_code_graph` - Greptile research
- `defined_user_priorities` - P1: tokens, P2: compaction, P3: understanding
- `experiment_1_cross_project` - Token baseline across 3 projects
- `experiment_3_complete` - Final benchmark results
- `issue_closed` - Research complete

---

## Conclusion

The code graph prototype exceeded expectations. A 27x speedup and 97% token savings make this one of the highest-impact improvements possible for claude-knowledge.

The investment case is clear:

- **Problem validated:** 48% exploration overhead is significant
- **Solution validated:** Pre-computed graph is dramatically faster
- **Persistence validated:** Structured data survives compaction

**Next action:** Implement full monorepo graph in Issue #394.

---

_Report generated as part of Issue #431 research. All data logged to workflow checkpoint for future reference._
