# claude-knowledge

Cross-session learning and workflow persistence for Claude Code autonomous workflows.

## Documentation

| Document                                         | Description                                 |
| ------------------------------------------------ | ------------------------------------------- |
| [Vision](docs/VISION.md)                         | Problem statement, goals, success criteria  |
| [Architecture](docs/ARCHITECTURE.md)             | System design, data flows, module structure |
| [Feature Assessment](docs/FEATURE-ASSESSMENT.md) | Maturity evaluation, usage analysis         |
| [Roadmap](docs/ROADMAP.md)                       | Prioritized next steps with rationale       |
| [Metrics](docs/METRICS.md)                       | Validation plan and measurement methodology |

## Quick Start

### Checkpoint (Workflow Recovery)

```typescript
import { checkpoint } from "claude-knowledge";

// Start a workflow for issue #123
const workflow = checkpoint.create(123, "feat/issue-123-feature");

// Update as work progresses
checkpoint.setPhase(workflow.id, "implement");
checkpoint.logCommit(workflow.id, "abc123", "feat: add feature");

// After compaction - resume where you left off
const state = checkpoint.findByIssue(123);
if (state) {
  console.log(`Resume from phase: ${state.workflow.phase}`);
}
```

### Knowledge Graph (Cross-Session Learning)

```typescript
import { knowledge } from "claude-knowledge";

// Store what you learned
await knowledge.store([
  {
    content: "Always validate API input with Zod schemas",
    codeArea: "API Development",
    confidence: 0.95,
  },
]);

// Query relevant knowledge
const results = await knowledge.query({ codeArea: "API Development" });
```

### Code Graph (Static Analysis)

```typescript
import { graph } from "claude-knowledge";

// Parse a file
await graph.parseFile("src/api/handler.ts");

// Query relationships
const callers = await graph.whatCalls("getDatabase");
const impact = await graph.blastRadius("handleRequest");
```

## Feature Status

| Feature                 | Status       | Usage                        |
| ----------------------- | ------------ | ---------------------------- |
| Checkpoint (workflows)  | Production   | Critical - actively used     |
| Checkpoint (milestones) | Stable       | Light - /auto-milestone only |
| Knowledge graph         | Beta         | Validation needed            |
| Semantic search         | Experimental | Deferred                     |
| Code graph              | Beta         | Underutilized                |
| Session hooks           | Stable       | Active                       |

See [Feature Assessment](docs/FEATURE-ASSESSMENT.md) for detailed analysis.

## CLI Reference

```bash
# Workflow commands
bun run checkpoint workflow create <issue> <branch>
bun run checkpoint workflow find <issue>
bun run checkpoint workflow set-phase <id> <phase>
bun run checkpoint workflow log-commit <id> <sha> <message>

# Session hooks
bun run checkpoint session-start
bun run checkpoint session-end

# Graph commands
bun run checkpoint graph parse <path>
bun run checkpoint graph what-calls <name>

# Metrics
bun run checkpoint metrics list
bun run checkpoint metrics summary
```

## Database Location

All data stored in `.claude/execution-state.db` (gitignored by default).

## Development

```bash
# Run tests
bun test packages/claude-knowledge

# Type check
bun run type-check --filter claude-knowledge
```

## Links

- [Milestone 22: Claude Knowledge Graph](https://github.com/rollercoaster-dev/monorepo/milestone/22)
- [Issues: pkg:claude-knowledge](https://github.com/rollercoaster-dev/monorepo/labels/pkg%3Aclaude-knowledge)
