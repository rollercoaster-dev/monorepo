# Conversation Graph Memory System Research

**Date:** 2026-01-12
**Status:** Exploration
**Problem:** Context loss after compaction forces re-explanation of complex topics

---

## The Problem

During regular conversations (not workflows), there's nothing preserving context like "the user has explained the core problem multiple times" or "we've explored these ideas before." The current claude-knowledge system handles workflow state recovery (`/auto-issue`, `/work-on-issue`), but not conversational memory.

**Goal:** Persistent memory that gets injected into _every_ conversation, enabling work on larger, more complex topics that span sessions.

---

## Research: Existing Systems

### Key Systems Reviewed

| System                                               | Approach                              | Key Insight                                        |
| ---------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| [**Mem0**](https://mem0.ai/research)                 | Extract → Compare → ADD/UPDATE/DELETE | 90% token savings, 26% accuracy gain               |
| [**Zep/Graphiti**](https://arxiv.org/abs/2501.13956) | Temporal knowledge graph              | Maintains historical relationships across sessions |
| [**A-MEM**](https://arxiv.org/abs/2502.12110)        | Zettelkasten-inspired linking         | Notes evolve - new memories update old ones        |
| [**Memoria**](https://arxiv.org/abs/2512.12686)      | Session summaries + weighted KG       | Captures user traits/preferences as entities       |
| [**Cognee**](https://www.cognee.ai)                  | Graph + vector embeddings             | Unified memory for reasoning across sessions       |

### Common Patterns Across Systems

1. **Extract, don't dump** - Pull salient facts from conversations, not raw transcripts
2. **Graph structure** - Nodes (topics/entities) + edges (relationships) beats flat storage
3. **Temporal awareness** - When something was learned matters
4. **Evolution** - New info can update/supersede old memories
5. **Selective retrieval** - Semantic search to find relevant context, not grep everything

### Performance Claims (Mem0)

- **26% accuracy improvement** over OpenAI's memory (66.9% vs 52.9% on LOCOMO benchmark)
- **91% lower p95 latency** versus full-context methods (1.44s vs 17.12s)
- **90% token savings** (~1.8K tokens vs 26K for full-context)

---

## Proposed Design: Conversation Graph

### Conceptual Model

Inspired by Kahneman's "Thinking, Fast and Slow":

- **System 1 (Fast)**: Quick context injection via semantic search - automatic, effortless
- **System 2 (Slow)**: The deliberative reasoning that happens during complex discussions - captured and preserved

### Node Types

```typescript
interface ConversationNode {
  id: string;
  type: "topic" | "idea" | "conclusion" | "preference" | "frustration";
  content: string; // The actual insight/topic
  keywords: string[]; // For retrieval
  timestamp: Date; // When learned
  confidence: number; // How certain (0-1)
  sourceSession?: string; // Which conversation
  supersedes?: string; // If this updates an older node
}
```

### Edge Types

```typescript
type EdgeType =
  | "led_to" // A led to conclusion B
  | "contradicts" // A contradicts B (newer wins?)
  | "supports" // A provides evidence for B
  | "supersedes" // A replaces B (evolution)
  | "related_to"; // Semantic similarity
```

### Operations

| Phase                   | Operation | Description                                     |
| ----------------------- | --------- | ----------------------------------------------- |
| **After conversation**  | Extract   | Pull salient topics/conclusions from session    |
| **After conversation**  | Compare   | Check against existing nodes                    |
| **After conversation**  | Mutate    | ADD new / UPDATE existing / DELETE contradicted |
| **Before conversation** | Search    | Semantic search for relevant context            |
| **Before conversation** | Inject    | Format and inject into conversation start       |

### Architecture Sketch

```text
┌─────────────────────────────────────────────────────────┐
│                   Conversation Graph                     │
├─────────────────────────────────────────────────────────┤
│  Nodes                          Edges                    │
│  ┌──────────────┐              ┌──────────────┐         │
│  │ Topic        │──led_to────▶│ Conclusion   │         │
│  │ "context     │              │ "need conv   │         │
│  │  loss"       │              │  graph"      │         │
│  └──────────────┘              └──────────────┘         │
│         │                             │                  │
│         │ related_to                  │ supports         │
│         ▼                             ▼                  │
│  ┌──────────────┐              ┌──────────────┐         │
│  │ Frustration  │              │ Idea         │         │
│  │ "re-explain  │              │ "semantic    │         │
│  │  everything" │              │  search"     │         │
│  └──────────────┘              └──────────────┘         │
├─────────────────────────────────────────────────────────┤
│  Storage: SQLite (existing)                              │
│  Search: TF-IDF embeddings (existing) or upgrade         │
│  Injection: Token-budgeted formatting (existing)         │
├─────────────────────────────────────────────────────────┤
│  Hooks:                                                  │
│  - SessionStart: query graph → inject relevant nodes     │
│  - SessionEnd: extract topics → ADD/UPDATE/DELETE        │
└─────────────────────────────────────────────────────────┘
```

---

## Differences from Current claude-knowledge

| Aspect         | Current System                  | Conversation Graph          |
| -------------- | ------------------------------- | --------------------------- |
| **Scope**      | Workflows only                  | Every conversation          |
| **Content**    | Code patterns, mistakes         | Topics, ideas, user context |
| **Trigger**    | `/auto-issue`, `/work-on-issue` | All sessions                |
| **Extraction** | From commits/reviews            | From conversation content   |
| **Goal**       | Workflow recovery               | Topic continuity            |

---

## Open Questions

1. **Extraction**: How to identify salient topics from conversation? LLM-based extraction? Rule-based?
2. **Granularity**: What's a "node"? A single insight? A topic cluster?
3. **Evolution**: How aggressively should new info supersede old?
4. **Privacy**: User preferences may be sensitive - local-only is good
5. **Bootstrap**: How to seed initial graph? Mine past conversations?

---

## Next Steps

1. Prototype node/edge schema in existing SQLite
2. Implement basic extraction (LLM-based or heuristic)
3. Add semantic search over conversation nodes
4. Hook into SessionStart for injection
5. Measure: Does it actually reduce re-explanation?

---

## References

- [Agent Memory Paper List](https://github.com/Shichun-Liu/Agent-Memory-Paper-List) - Comprehensive survey
- [Mem0 Research](https://mem0.ai/research) - Production memory system
- [Zep/Graphiti Paper](https://arxiv.org/abs/2501.13956) - Temporal knowledge graph
- [A-MEM Paper](https://arxiv.org/abs/2502.12110) - Zettelkasten-inspired
- [Memoria Paper](https://arxiv.org/abs/2512.12686) - Personalized conversational AI
- [Memory Survey (ACM)](https://dl.acm.org/doi/10.1145/3748302) - Comprehensive academic survey
- [Cognee](https://www.cognee.ai) - Graph + vector hybrid
