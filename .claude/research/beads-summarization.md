# Beads Summarization Pattern - Research for Planning Graph

**Date:** 2026-01-28
**Issue:** [#625](https://github.com/rollercoaster-dev/monorepo/issues/625) - Planning Graph Phase 1
**Source:** [steveyegge/beads](https://github.com/steveyegge/beads), `.claude/research/issue-338-workflow-logging-research.md`

---

## Core Concept: Semantic Compaction

Beads uses **semantic compaction** to summarize completed tasks. When a task is closed, its full history (comments, status changes, dependencies) is compressed into a concise summary that preserves essential context while reducing token usage.

Key properties:

- **Lossless intent** - The "what" and "why" are preserved
- **Lossy detail** - Implementation steps, intermediate states are dropped
- **Audit trail** - Full history remains in git, summary is for active context
- **Token-efficient** - A task that took 50 messages to complete becomes 1-3 sentences

---

## Application to Planning Graph

When `/done` pops an item from the planning stack, we apply semantic compaction:

### For Goals

```
Completed: "{title}". {outcome}. {key metrics}.
```

Examples:

- `"Completed: JSONL git sync (#608). Merged PR #623 after 5 days. Required content_hash deduplication logic."`
- `"Completed: Fix CI failure. Resolved test isolation issue in transcript tests. 2 commits."`

### For Interrupts

```
Resolved: "{title}". {resolution}. Resumed: {interrupted item}.
```

Examples:

- `"Resolved: CI failing on main. Fixed test isolation in transcript.test.ts. Resumed: Knowledge cleanup."`
- `"Resolved: Urgent code review. Approved PR #620 with minor feedback. Resumed: OB3 Phase 1."`

---

## Data Sources for Summarization

When summarizing, gather context from available sources:

| Source     | Data                          | How                           |
| ---------- | ----------------------------- | ----------------------------- |
| Stack item | title, description, createdAt | Direct from planning entity   |
| Git log    | commits since item was pushed | `git log --since=<createdAt>` |
| GitHub     | issue state, PR status        | `gh issue view`, `gh pr list` |
| Duration   | time between push and pop     | `now - createdAt`             |

---

## Implementation Approach

**Template-based** (no LLM needed for Phase 1):

```typescript
function summarize(item: Goal | Interrupt, gitContext?: GitContext): string {
  const duration = formatDuration(
    Date.now() - new Date(item.createdAt).getTime(),
  );
  const prefix = item.type === "Goal" ? "Completed" : "Resolved";

  let summary = `${prefix}: "${item.title}"`;

  if (gitContext?.commitCount) {
    summary += `. ${gitContext.commitCount} commits`;
  }

  if (gitContext?.prMerged) {
    summary += `. PR #${gitContext.prNumber} merged`;
  }

  if (item.type === "Goal" && item.issueNumber && gitContext?.issueClosed) {
    summary += `. Issue #${item.issueNumber} closed`;
  }

  summary += `. Duration: ${duration}.`;
  return summary;
}
```

---

## Storage as Learning

The summary is stored as a Learning entity in the knowledge graph:

```typescript
const learning: Learning = {
  id: `learning-planning-${randomUUID()}`,
  content: summary,
  codeArea: inferCodeArea(item),
  confidence: 0.7, // Template-generated, not LLM-analyzed
  metadata: {
    source: "planning-graph",
    planningEntityId: item.id,
    planningEntityType: item.type,
    duration: durationMs,
  },
};
```

This bridges planning graph completions into the knowledge graph, making past work discoverable via `knowledge_search_similar`.

---

## Future Enhancement (Phase 2+)

- LLM-based summarization for richer summaries
- Include key decisions made during the goal
- Cross-reference related learnings captured during the goal's lifetime
- Aggregate patterns from multiple goal completions
