# Claude Knowledge Vision

> Design document capturing the vision, research, and decisions for the `claude-knowledge` package.
>
> Created: 2026-01-08
> Status: Exploration / Dogfooding

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Two Systems](#two-systems)
- [Existing Solutions](#existing-solutions)
- [Team Sync Options](#team-sync-options)
- [Codebase Indexing](#codebase-indexing)
- [Schema Design](#schema-design)
- [Token/Context Hypothesis](#tokencontext-hypothesis)
- [Measurement Plan](#measurement-plan)
- [Decisions](#decisions)
- [Related Issues](#related-issues)

---

## Problem Statement

Claude Code agents face a fundamental challenge: **context compaction erases workflow state**.

When working on complex issues:

1. Context windows fill up
2. Compaction resets the conversation
3. Without persistence, agents restart from scratch
4. Re-analyzing issues, re-reading files, losing track of commits

Secondary problems:

- Same mistakes get repeated across sessions
- Patterns aren't remembered
- No institutional knowledge accumulates

---

## Two Systems

The package implements two complementary systems:

| System              | Purpose                 | Lifecycle                         |
| ------------------- | ----------------------- | --------------------------------- |
| **Checkpoint**      | Workflow state recovery | Ephemeral (deleted on completion) |
| **Knowledge Graph** | Cross-session learning  | Persistent (grows over time)      |

### Checkpoint (Working)

Tracks active workflow state for recovery after context compaction:

- Workflows: Issue-level execution state
- Milestones: Multi-issue coordination
- Actions: Audit log
- Commits: For potential rollback
- Baselines: Pre-milestone snapshots

### Knowledge Graph (In Development)

Stores learnings that persist across all sessions:

- Learnings: Knowledge units
- Patterns: Reusable approaches
- Mistakes: Errors and fixes
- Relationships: Graph edges

---

## Existing Solutions

### AI Memory/Knowledge

| Solution             | Approach                    | Fit               |
| -------------------- | --------------------------- | ----------------- |
| **Mem0**             | Managed memory layer, cloud | Not local-first   |
| **Zep**              | Long-term memory + KG       | Requires server   |
| **Graphiti**         | Temporal knowledge graphs   | Needs Neo4j       |
| **LangChain Memory** | Pluggable modules           | Framework lock-in |

### Local-First Sync

| Solution        | Approach            | Fit                |
| --------------- | ------------------- | ------------------ |
| **cr-sqlite**   | CRDTs for SQLite    | Best fit - same DB |
| **ElectricSQL** | Postgres ↔ SQLite   | Needs Postgres     |
| **PowerSync**   | SQLite sync service | Cloud service      |

### Coding Knowledge

| Solution           | Approach           | Fit                           |
| ------------------ | ------------------ | ----------------------------- |
| **Pieces.app**     | AI snippet manager | Closest, not agent-integrated |
| **Cursor/Augment** | Codebase indexing  | Proprietary, editor-tied      |

### Conclusion

Nothing does exactly "local-first coding knowledge graph + AI agent integration + team sync." The pieces exist separately.

---

## Team Sync Options

If/when team sync becomes valuable:

### Option 1: Git-Based (Simplest)

```
Export learnings → JSON → commit to repo → pull to sync
```

- Pro: No infrastructure
- Con: Manual, merge conflicts

### Option 2: Central Server

```
REST API → PostgreSQL → clients sync periodically
```

- Pro: Single source of truth
- Con: Hosting cost, SPOF

### Option 3: P2P via Tailscale

```
Tailscale mesh → each dev runs sync server → direct peer sync
```

- Pro: No central server, encrypted
- Con: Machines must be online

### Option 4: CRDTs (cr-sqlite)

```
cr-sqlite → changes auto-merge → any sync transport
```

- Pro: True local-first, offline, auto-merge
- Con: Complexity, newer tech

### Security Considerations

| Concern                     | Mitigation                                        |
| --------------------------- | ------------------------------------------------- |
| Sensitive data in learnings | Scrub before sharing, personal vs team namespaces |
| Secrets in content          | Pre-commit scanning, redaction                    |
| Access control              | Role-based filtering                              |
| Data at rest                | SQLCipher encryption                              |
| Data in transit             | TLS / Tailscale                                   |

### Decision

Defer team sync until core value is proven. Start with git-based export/import if needed.

---

## Codebase Indexing

Cursor/Augment index codebases for semantic search. We could add this.

### Two Complementary Systems

| System              | Answers                   | Source              |
| ------------------- | ------------------------- | ------------------- |
| **Codebase Index**  | "What does the code say?" | Actual source files |
| **Knowledge Graph** | "What have we learned?"   | Session learnings   |

### Potential Entity Types

```typescript
CodeFile; // Indexed source file
CodeSymbol; // Function, class, type, interface
CodeChunk; // Semantic chunk of code (~500 tokens)
```

### Decision

Defer codebase indexing until knowledge graph proves useful. It's a separate milestone of work.

---

## Schema Design

### Current Schema

- Learning (content, codeArea, filePath, sourceIssue, confidence)
- Pattern (name, description, codeArea)
- Mistake (description, howFixed, filePath)
- CodeArea (name) - auto-created
- File (path) - auto-created

### Proposed Additions (Deferred)

Based on real needs observed in this monorepo:

#### 1. Plan vs Implementation

```typescript
interface PlanExecution {
  issueNumber: number;
  plannedSteps: string[];
  actualCommits: string[];
  deviations: { planned: string; actual: string; reason: string }[];
}
```

Query: "Last time I planned X, what actually happened?"

#### 2. PR Review Findings

```typescript
interface ReviewFinding {
  issueNumber: number;
  reviewer: "coderabbit" | "claude" | "human";
  category: "security" | "error-handling" | "types" | "style";
  description: string;
  filePath: string;
  fix: string;
}
```

Query: "What does CodeRabbit usually flag in API code?"

#### 3. Testing Patterns

```typescript
interface TestingPattern {
  codeArea: string;
  pattern: string;
  example: string;
  antiPattern?: string;
}
```

Query: "How should I test a new service?"

#### 4. Package Relationships

```typescript
interface CrossPackageRule {
  trigger: string; // "Changing OB3Credential type"
  check: string[]; // ["openbadges-server", "openbadges-ui"]
  reason: string;
}
```

Query: "I'm changing types - what else might break?"

### Decision

Don't add these until the base system proves useful. Start with Learning/Pattern/Mistake.

---

## Token/Context Hypothesis

### The Idea

Knowledge injection could reduce context usage:

| Approach                           | Tokens | Information Density |
| ---------------------------------- | ------ | ------------------- |
| Read `verification.ts` (500 lines) | ~2000  | Raw code            |
| 5 learnings about verification     | ~100   | Pre-digested        |

**Potential 10-20x compression** if learnings are good.

### Why This Matters

- Smaller context = longer before compaction
- Denser information = better decisions
- Less re-reading = faster completion

### What Would Make It Work

Learnings must be:

1. **Denser than raw code** - summaries, not copies
2. **Relevant** - only what's needed
3. **Accurate** - wrong knowledge is worse than re-reading

---

## Measurement Plan

### Phase 1: Baseline (Manual, 1-2 weeks)

Track per issue:

- Files read (rough count)
- Context compactions (Y/N)
- Time spent
- Review findings on PR

### Phase 2: Mine PRs (Automated, 1 day)

```bash
gh pr list --state merged --limit 100 \
  --json number,title,body,files,reviews \
  > .claude/pr-data.json
```

Extract:

- PR summaries → Learnings
- Review comments → ReviewFindings
- File patterns → Cross-package awareness

### Phase 3: Inject at Session Start (1 day)

Update SessionStart hook to:

1. Detect current branch/issue
2. Query relevant learnings
3. Output to session context

### Phase 4: Compare (1 week)

Same metrics as baseline:

- Did file reads decrease?
- Fewer review findings?
- Longer before compaction?

### Success Criteria

- Checkpoint recovery saves time 2-3 times
- Naturally reach for `knowledge.query()` when starting work
- Stored learnings are relevant when retrieved

### Failure Criteria

- Forget it exists
- Learnings never useful
- Maintenance burden exceeds value

---

## Decisions

### Do Now

1. Use checkpoint system as-is
2. Dogfood for 4-6 weeks (#387)
3. Log observations honestly

### Defer Until Validated

- Schema expansions (PlanExecution, ReviewFinding, etc.)
- Team sync
- Codebase indexing
- Semantic search with embeddings (#379)
- Session hooks automation (#367)

### If Dogfooding Succeeds

1. Add PR mining for bootstrap data
2. Add session start injection
3. Measure token/context impact
4. Consider semantic search

### If Dogfooding Fails

- Keep checkpoint (it's useful for recovery)
- Archive knowledge graph work
- Move on

---

## Related Issues

| Issue | Description                     | Status          |
| ----- | ------------------------------- | --------------- |
| #387  | Dogfooding validation goals     | Open            |
| #379  | Semantic search with embeddings | Open (deferred) |
| #367  | Session lifecycle hooks         | Open (deferred) |
| #380  | CLI knowledge commands          | Open (deferred) |
| #375  | Workflow retrospective          | Open (deferred) |
| #385  | Context injection for prompts   | Open (deferred) |

---

## Appendix: Product Viability Assessment

### Competition

Cursor ($400M+), Augment ($227M), GitHub Copilot (Microsoft), Codeium ($150M), Sourcegraph ($225M)

### Realistic Positioning

Not viable as standalone product competing with funded players.

Viable as:

- Open source tool solving real problem
- Niche for privacy-conscious teams
- Claude Code power user tooling

### Decision

Build for ourselves, open source, see if it gets traction. Don't optimize for hypothetical commercial success.
