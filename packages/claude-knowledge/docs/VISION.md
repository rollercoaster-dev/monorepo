# Vision: claude-knowledge

> Cross-session learning and workflow persistence for Claude Code autonomous workflows.

## The Problem

Claude Code agents face a fundamental challenge: **context compaction erases workflow state**.

When working on complex issues:

1. Context windows fill up as agents read files, analyze code, and make changes
2. Compaction resets the conversation to preserve recent context
3. Without persistence, agents restart from scratch:
   - Re-analyzing issues they already understood
   - Re-reading files they already examined
   - Losing track of commits already made
   - Repeating mistakes already fixed

This creates a "Groundhog Day" effect where agents repeatedly relearn the same things, waste time on duplicate work, and make the same mistakes across sessions.

## The Solution

`claude-knowledge` provides two complementary systems:

| System              | Purpose                 | Lifecycle                         |
| ------------------- | ----------------------- | --------------------------------- |
| **Checkpoint**      | Workflow state recovery | Ephemeral (deleted on completion) |
| **Knowledge Graph** | Cross-session learning  | Persistent (grows over time)      |

### Checkpoint System (Ephemeral)

Tracks active workflow state for recovery after context compaction:

- **What phase are we in?** research → implement → review → finalize
- **What commits have been made?** For rollback capability
- **What actions were taken?** Audit trail for debugging
- **What's the current status?** running, paused, completed, failed

When context compacts mid-workflow, the agent can resume where it left off instead of starting over.

### Knowledge Graph (Persistent)

Stores learnings that persist across all sessions:

- **Learnings**: Knowledge units captured during work (e.g., "Use rd-logger for logging")
- **Patterns**: Recognized reusable patterns (e.g., "Input Validation Pattern")
- **Mistakes**: Errors made and how they were fixed (prevents repetition)
- **Topics**: Conversation themes that persist across sessions

When starting a new session, relevant knowledge is injected into context, giving the agent a "memory" of past work.

## Who Uses This?

### Primary Users: Claude Code Agents

Agents running autonomous workflows (`/auto-issue`, `/auto-milestone`, `/work-on-issue`):

- Use checkpoint for state recovery after compaction
- Query knowledge graph for relevant learnings at session start
- Store learnings at session end for future agents

### Secondary Users: Human Developers

Developers can:

- Query the knowledge graph via CLI for past learnings
- Review what the system has learned
- Bootstrap knowledge from merged PRs
- Monitor metrics to validate effectiveness

### Non-Users (Out of Scope)

- **Other AI agents**: This is specifically for Claude Code
- **Team collaboration**: Single-user, single-project only
- **External services**: All data stays local in SQLite

## Success Criteria

### Qualitative (Observation)

- [ ] Agents naturally use checkpoint for recovery (instead of restarting)
- [ ] Retrieved learnings are actually relevant to current work
- [ ] Mistakes from past sessions don't recur
- [ ] Workflow completion feels faster after compaction

### Quantitative (Metrics)

- [ ] Reduced file reads per issue (baseline vs with knowledge)
- [ ] Reduced review findings (learning from past mistakes)
- [ ] Successful checkpoint recoveries (2+ per week indicates value)
- [ ] Knowledge query hit rate (queries returning useful results)

### Decision Criteria

**Continue investing if:**

- Checkpoint recovery saves time at least 2-3 times per week
- Naturally reach for `knowledge.query()` when starting related work
- Stored learnings are relevant when retrieved

**Consider deprecating if:**

- Forget it exists and never use it
- Learnings stored are never useful later
- Maintenance burden exceeds value

## Design Philosophy

### Local-First

All data stored in `.claude/execution-state.db` (SQLite):

- No external services required
- No network dependencies
- Works offline
- Fast (local I/O only)

### Zero-Config

Works out of the box:

- Database created automatically on first use
- Schema migrations run automatically
- Hooks integrated via Claude Code settings
- No environment variables required (optional API keys for enhanced features)

### Atomic Operations

All writes use SQLite transactions:

- Safe to retry operations (idempotent)
- No partial writes
- Consistent state even after crashes

### Minimal Footprint

Designed for low overhead:

- Only store what's actually useful
- Token budget management for context injection
- Automatic cleanup of completed workflows

## Scope

### In Scope

- Single-user workflow state persistence
- Single-project knowledge accumulation
- Local SQLite database
- CLI for inspection and debugging
- Session hooks for automatic capture
- Semantic search within local knowledge

### Out of Scope

- Multi-user synchronization (team features)
- Multi-project knowledge sharing
- Cloud backup or sync
- Real-time collaboration
- Large-scale codebase indexing
- External API integrations (beyond optional embeddings)

## Relationship to Other Components

### Claude Code Skills

Skills invoke checkpoint/knowledge via CLI:

```
/work-on-issue 123
  → bun run checkpoint workflow create 123 "feat/issue-123"
  → bun run checkpoint workflow set-phase ... implement
  → bun run checkpoint workflow log-commit ...
```

### Session Hooks

Hooks in `.claude/settings.json` trigger automatically:

- `SessionStart`: Inject relevant knowledge, check for running workflows
- `PreCompact`: Capture session learnings before compaction

### Code Graph

Separate subsystem for static analysis:

- Parses TypeScript with ts-morph
- Tracks function calls, imports, exports
- Queries: what-calls, blast-radius, find, exports

Currently implemented but underutilized. May be integrated more deeply with knowledge graph in the future.

## Evolution

### Phase 1: Checkpoint (Complete)

Workflow state persistence for `/auto-issue` and `/auto-milestone`.

**Status**: Production-ready, actively used.

### Phase 2: Knowledge Graph (Validation)

Learning storage and retrieval with semantic search.

**Status**: Built but not validated. Needs dogfooding to prove value.

### Phase 3: Integration (Future)

Deeper integration between checkpoint, knowledge, and code graph:

- Capture PR review findings as learnings
- Use code graph to scope knowledge queries
- Auto-generate learnings from successful patterns

**Status**: Planned, depends on Phase 2 validation.

## Open Questions

1. **What's the forcing function for knowledge capture?** Currently depends on session hooks running, which may not always happen.

2. **How do we validate semantic search quality?** Need real learnings to test relevance.

3. **Should code graph be integrated or separate?** Currently parallel systems, unclear if unification would help.

4. **What's the right confidence threshold?** Currently 0.3 default, may need tuning based on real usage.

---

_Last updated: 2026-01-13_
_Related: [ARCHITECTURE.md](./ARCHITECTURE.md) | [FEATURE-ASSESSMENT.md](./FEATURE-ASSESSMENT.md) | [ROADMAP.md](./ROADMAP.md)_
