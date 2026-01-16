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

## Skills Integration

Claude Code skills provide structured access to claude-knowledge features:

| Feature              | Skill               | Description                                      |
| -------------------- | ------------------- | ------------------------------------------------ |
| Workflow checkpoints | checkpoint-workflow | Track issue-based workflows, resume after breaks |
| Session lifecycle    | checkpoint-session  | Auto-inject knowledge, extract learnings         |
| Code graph queries   | graph-query         | Query call hierarchies, blast radius analysis    |
| Documentation search | docs-search         | Index and search project docs semantically       |
| Knowledge queries    | knowledge-query     | Semantic search over learnings and patterns      |
| Context metrics      | context-metrics     | Dogfooding metrics for optimization              |

Skills are markdown files in `.claude/skills/` that describe when and how Claude Code should use these features. They provide command references, usage examples, and integration patterns.

**Session Hooks**: The `onSessionStart` and `onSessionEnd` hooks are fully implemented and accessible via CLI (`checkpoint session-start`/`session-end`), but are not automatically triggered by Claude Code yet. Automatic injection requires Claude Code client integration (tracked separately).

### Issue-Based Doc Discovery

When working with `/work-on-issue` workflows, the session hooks automatically fetch GitHub issue metadata to enhance documentation discovery:

```bash
# Session start with issue context
bun run checkpoint session-start --issue 476

# Searches docs using:
# - Issue title keywords: "enhance", "session", "doc", "injection"
# - Issue labels: pkg:claude-knowledge → "claude-knowledge"
# - Branch keywords: feat/issue-476-context → "context"
```

**How it works:**

1. Fetches issue metadata via `gh issue view --json title,body,labels`
2. Extracts keywords from title and body (filters stop words)
3. Parses label prefixes (e.g., `pkg:claude-knowledge` → `claude-knowledge`)
4. Extracts keywords from branch name
5. Combines with file-based signals for comprehensive doc search

**Requirements:**

- GitHub CLI (`gh`) installed and authenticated
- Issue number provided via `--issue` flag or parsed from branch name

**Cache behavior:**

- Results cached for 15 minutes to avoid repeated API calls
- Cache is session-scoped (in-memory, not persisted)

**Fallback:**

- If `gh` CLI fails or issue not found, falls back to file-based doc search
- Session continues normally without issue context

## CLI Reference

```bash
# Workflow commands
bun run checkpoint workflow create <issue> <branch>
bun run checkpoint workflow find <issue>
bun run checkpoint workflow set-phase <id> <phase>
bun run checkpoint workflow log-commit <id> <sha> <message>

# Session hooks
bun run checkpoint session-start [--issue <number>]
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
