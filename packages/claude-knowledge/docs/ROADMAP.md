# Roadmap: claude-knowledge

> Prioritized next steps with rationale and issue mapping.

## Prioritization Framework

Work is categorized into four buckets:

| Bucket    | Criteria                                                    |
| --------- | ----------------------------------------------------------- |
| **Now**   | Critical for validation, blocks other work, high confidence |
| **Next**  | Valuable if validation succeeds, medium confidence          |
| **Later** | Nice to have, lower priority, depends on user feedback      |
| **Never** | Out of scope, not aligned with vision, explicitly rejected  |

## Now: Context Engineering Foundation

**Goal**: Implement core context engineering principles before validation.

### 0. Token Budget Enforcement (NEW) - CRITICAL

**Status**: Not created
**Priority**: P0 (foundational principle)

**What**: Make token budget the primary constraint for all context injection.

**Why**: Currently we front-load context "just in case." This wastes tokens and causes rot. Token budget should drive real decisions about what gets injected.

**Implementation**:

- Define warmup token budget (~2-4k tokens, configurable)
- Session start hook respects budget strictly
- Prioritize: workflow state > query commands > paths > content
- Log actual token usage for optimization

**Success Criteria**:

- Warmup fits in 2-4k tokens consistently
- No "dump everything" anti-patterns
- Measurable reduction in initial context size

---

### 0b. Output-to-Files Handler (NEW) - CRITICAL

**Status**: Not created
**Priority**: P0 (foundational principle)

**What**: Long command outputs (tests, lint, builds) go to files; context gets summary + path.

**Why**: A single `bun test` can add 5k tokens to context. Saving to file and returning a summary dramatically reduces context bloat while preserving information.

**Implementation**:

- Hook/wrapper for common commands (test, lint, typecheck, build)
- Threshold: outputs > 50 lines → write to `.claude/logs/`
- Return: pass/fail status, error count, key excerpts, file path
- Agent greps file when details needed

**Apply to**:

- Test output (especially failures)
- Lint/typecheck results
- Build logs
- Long bash output

**Success Criteria**:

- Test runs return ~100 tokens instead of ~5000
- Full output preserved in searchable files
- Agent can retrieve details on demand

---

### 0c. Warmup Refactor: How Not What (NEW) - CRITICAL

**Status**: Not created
**Priority**: P0 (foundational principle)

**What**: Session warmup provides commands/paths to find information, not the information itself.

**Why**: Injecting knowledge content front-loads potentially irrelevant data. Providing query commands lets the agent pull only what's needed.

**Current (anti-pattern)**:

```
Here are 5 relevant learnings:
1. Always validate API input with Zod... (200 tokens)
2. Use rd-logger for structured logging... (150 tokens)
...
```

**Target (pull-based)**:

```
Query knowledge:
- Learnings: `bun run knowledge query --area "<topic>"`
- Code graph: `bun run g:calls <function>`
- Patterns: `/knowledge-query patterns`

State files:
- Dev plan: `.claude/dev-plans/issue-123.md`
- Test logs: `.claude/logs/`
```

**Success Criteria**:

- Warmup is ~500 tokens of pointers, not ~2000 tokens of content
- Agent queries knowledge on-demand
- Relevant information still accessible when needed

---

### 0d. MCP Server Interface (#519) - HIGH

**Status**: Open
**Priority**: P0 (enables adoption)

**What**: Convert claude-knowledge to an MCP server for native Claude Code tool integration.

**Why**: CLI commands have adoption friction - Claude forgets to use them. MCP tools appear alongside Read, Write, Bash as native tools. With MCP Tool Search (now default in Claude Code), tool schemas are loaded on-demand, aligning with our "how not what" principle.

**Implementation**:

- MCP server scaffold with Bun
- Tools: `knowledge_query`, `graph_what_calls`, `checkpoint_workflow_find`, `output_save`
- Resources: browsable learnings, logs, workflows
- Keep CLI for hooks and debugging

**Success Criteria**:

- Claude uses knowledge/graph tools naturally (no prompting)
- Tools work in MCP Inspector for debugging
- Can be added to other projects via `.mcp.json`

**Future**: If proven valuable across projects, consider extracting to standalone repo.

---

## Next: Validation Phase

**Goal**: Prove the knowledge graph provides real value before investing more.

### 1. Dogfood Knowledge Graph (#387) - CRITICAL

**Status**: Open
**Priority**: P1 (after MCP enables adoption)

**What**: Use the knowledge graph daily for 4-6 weeks with systematic metrics tracking.

**Why**: The knowledge graph is built but unvalidated. We don't know if:

- Captured learnings are actually useful
- Retrieved knowledge is relevant
- The effort is worth the benefit

**Success Criteria**:

- At least 50 learnings stored from real sessions
- Knowledge queries returning useful results
- Measurable reduction in repeated work

**Blocks**: All "Next" items depend on this validation succeeding.

---

### 2. Learning Relevance Tracking (#416)

**Status**: Open
**Priority**: P1

**What**: Track when injected learnings are actually used vs ignored.

**Why**: Without relevance tracking, we can't tell if knowledge injection is helpful or just noise.

**Implementation**:

- Add "learning_used" action in checkpoint
- Track which learnings were in context when actions occurred
- Calculate relevance score over time

---

### 3. Metrics Dashboard (NEW ISSUE NEEDED)

**Status**: Not created
**Priority**: P1

**What**: Create simple CLI dashboard showing validation metrics.

**Why**: Context metrics exist but aren't surfaced. Need visibility to make decisions.

**Implementation**:

- `bun run checkpoint metrics dashboard`
- Show: sessions, learnings, queries, relevance scores
- Highlight trends over time

---

### 4. Code Graph Usage Examples (NEW ISSUE NEEDED)

**Status**: Not created
**Priority**: P2

**What**: Document when and how to use code graph queries.

**Why**: Feature exists but is underutilized due to lack of guidance.

**Deliverables**:

- "When to use code graph" section in docs
- Example queries for common scenarios
- Integration with workflow phases

## Next: If Validation Succeeds

**Prerequisite**: Issue #387 dogfooding shows measurable value.

### 5. Capture PR Review Findings (#411)

**Status**: Open
**Priority**: P2

**What**: Automatically capture learnings from CodeRabbit/Claude PR reviews.

**Why**: PR reviews are rich source of learnings that currently get lost.

**Implementation**:

- Parse PR review comments
- Extract actionable learnings
- Store with confidence based on severity

**Depends on**: #387 proving knowledge storage is valuable.

---

### 6. Bootstrap from Merged PRs (#396)

**Status**: Open
**Priority**: P2

**What**: Mine existing merged PRs to populate initial knowledge.

**Why**: Bootstrap knowledge graph with historical learnings instead of starting empty.

**Implementation**:

- Parse conventional commit messages
- Extract learnings from PR descriptions
- Store with lower confidence (historical)

**Depends on**: #387 proving knowledge retrieval is valuable.

---

### 7. Persist Gate State Across Sessions (#418)

**Status**: Open
**Priority**: P2

**What**: Save `/work-on-issue` gate state in checkpoint for cross-session resume.

**Why**: Gate progress is lost on context compaction; must re-approve gates.

**Implementation**:

- Add `gate_state` to workflow checkpoint
- Track which gates passed
- Resume from correct gate on recovery

**Depends on**: Checkpoint system (already validated).

---

### 8. Improve Code Graph Query Performance

**Status**: Not created
**Priority**: P3

**What**: Optimize code graph queries for larger codebases.

**Why**: Current linear scan is fine for small repos but may not scale.

**Implementation**:

- Add caching layer
- Consider incremental parsing
- Profile actual usage patterns first

**Depends on**: #387 showing code graph is actually used.

## Later: Enhancement Phase

**Prerequisite**: Core validation complete, clear user demand.

### 9. Conversation Graph (#448)

**Status**: Open
**Priority**: P3

**What**: Track conversation flow and topic relationships.

**Why**: Conversations have structure that could inform knowledge retrieval.

**Implementation**:

- Model conversation as graph
- Track topic transitions
- Use for context-aware knowledge injection

**Depends on**: Strong signal that knowledge injection needs improvement.

---

### 10. Improved Relationship Tracking (#446)

**Status**: Open
**Priority**: P3

**What**: Better tracking of method calls and class relationships.

**Why**: Current ts-morph parsing misses some relationship types.

**Implementation**:

- Add method-level call tracking
- Track class instantiation
- Improve extends/implements detection

**Depends on**: Code graph being actively used.

---

### 11. Combine Semantic Search with Code Graph (#439)

**Status**: Open
**Priority**: P3

**What**: Use code graph to scope semantic search results.

**Why**: Semantic search could be more relevant if scoped to related code.

**Implementation**:

- Query code graph for related entities
- Filter semantic results by related files
- Hybrid ranking (semantic + structural)

**Depends on**: Both semantic search and code graph proving valuable.

---

### 12. Local LLM for Summarization (#405)

**Status**: Open
**Priority**: P4

**What**: Use local LLM to summarize and refine learnings.

**Why**: Learnings from commits may need refinement for clarity.

**Implementation**:

- Integrate ollama or similar
- Summarize verbose learnings
- Generate pattern descriptions

**Depends on**: High volume of learnings proving hard to manage.

## Never: Out of Scope

These are explicitly NOT planned:

### Multi-User Sync

**Why not**: claude-knowledge is single-user, single-project by design. Team sync would require:

- Conflict resolution
- Authentication
- Network infrastructure
- Dramatically different architecture

**Alternative**: Each team member has their own local knowledge graph.

---

### Multi-Project Support

**Why not**: Scope creep. Each project has its own patterns and learnings.

**Alternative**: Separate knowledge databases per project (already possible by changing db path).

---

### Large-Scale Codebase Indexing

**Why not**: Not the goal. We're tracking learnings and workflow state, not building a code search engine.

**Alternative**: Use existing tools (sourcegraph, grep.app, etc.) for large-scale search.

---

### CRDTs for Team Sync

**Why not**: Complexity not justified. This is a local tool for individual developers.

**Alternative**: If team features needed, start simpler (export/import JSON).

---

### Cloud Backup

**Why not**: Against local-first philosophy. Users can back up `.claude/` directory themselves.

**Alternative**: Git-ignore exception if users want to commit their knowledge database.

## Dependency Graph

```
   ┌──────────────────────────────────────────────┐
   │         CONTEXT ENGINEERING FOUNDATION       │
   │              (implement first)               │
   └──────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  ┌───────────┐     ┌───────────┐     ┌───────────┐
  │  Token    │     │ Output-to │     │  Warmup   │
  │  Budget   │     │   Files   │     │  How Not  │
  │ Enforce   │     │  Handler  │     │   What    │
  └───────────┘     └───────────┘     └───────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │  #519 MCP Server    │
                │  (enables adoption) │
                └─────────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │  #387 Dogfooding    │
                │   (with MCP tools)  │
                └─────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  #416    │    │ Metrics  │    │ Code     │
    │ Relevance│    │Dashboard │    │ Graph    │
    │ Tracking │    │ (new)    │    │ Examples │
    └──────────┘    └──────────┘    └──────────┘
          │
          ▼
   ┌──────────────────────────────────────────────┐
   │              VALIDATION GATE                 │
   │         (4-6 weeks of usage data)            │
   └──────────────────────────────────────────────┘
          │
    ┌─────┼─────────┬─────────┐
    │     │         │         │
    ▼     ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ #411  │ │ #396  │ │ #418  │ │ Code  │
│ PR    │ │ Boot- │ │ Gate  │ │ Graph │
│Reviews│ │ strap │ │ State │ │ Perf  │
└───────┘ └───────┘ └───────┘ └───────┘
          │
          ▼
   ┌──────────────────────────────────────────────┐
   │              USER FEEDBACK                   │
   │         (clear demand signal)                │
   └──────────────────────────────────────────────┘
          │
    ┌─────┼─────────┬─────────┐
    │     │         │         │
    ▼     ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ #448  │ │ #446  │ │ #439  │ │ #405  │
│ Conv  │ │ Rel   │ │Hybrid │ │ Local │
│ Graph │ │ Track │ │Search │ │ LLM   │
└───────┘ └───────┘ └───────┘ └───────┘
```

## Decision Points

### After Week 2: Early Signal Check

**Questions**:

- Are learnings being captured? (target: 10+)
- Are queries returning results? (target: 5+ queries)
- Any obvious friction points?

**Actions**:

- If no learnings: Debug session hooks
- If no queries: Add query prompts to workflows
- If friction: Address immediately

### After Week 6: Validation Decision

**Continue if ANY**:

- 20%+ reduction in file reads
- 2+ successful checkpoint recoveries
- Natural usage of `knowledge.query()`
- Positive qualitative feedback

**Deprecate knowledge graph if ALL**:

- No measurable improvement
- Never using query API
- Maintenance burden > 1hr/week
- Negative feedback

### Quarterly Review

Every 3 months, review:

- Which "Later" items have user demand?
- Are any "Never" items worth reconsidering?
- Should any "Now"/"Next" items be deprioritized?

## Related Documents

- [VISION.md](./VISION.md) - Problem statement and success criteria
- [FEATURE-ASSESSMENT.md](./FEATURE-ASSESSMENT.md) - Current feature status
- [METRICS.md](./METRICS.md) - Measurement plan
- [Milestone 22](https://github.com/rollercoaster-dev/monorepo/milestone/22) - GitHub tracking

---

_Last updated: 2026-01-16_
