# /checkpoint $ARGUMENTS

Manually run checkpoint operations for workflow state, session lifecycle, learnings, and metrics.

## Usage

```
/checkpoint <category> <command> [args...]
```

## Categories

### workflow - Workflow State Management

```bash
# Find existing workflow for an issue
bun run checkpoint workflow find <issue-number>

# Create new workflow
bun run checkpoint workflow create <issue-number> "<branch-name>" [worktree-path]

# Get workflow details
bun run checkpoint workflow get "<workflow-id>"

# Update workflow phase
bun run checkpoint workflow set-phase "<workflow-id>" <phase>
# Phases: research, implement, review, finalize, planning, execute, merge, cleanup

# Update workflow status
bun run checkpoint workflow set-status "<workflow-id>" <status>
# Statuses: running, paused, completed, failed

# Log an action
bun run checkpoint workflow log-action "<workflow-id>" "<action-name>" <result> ['{"metadata": "json"}']
# Results: success, failed, pending

# Log a commit
bun run checkpoint workflow log-commit "<workflow-id>" "<sha>" "<commit-message>"

# List active workflows
bun run checkpoint workflow list-active

# Clean up stale workflows
bun run checkpoint workflow cleanup [hours]

# Delete workflow
bun run checkpoint workflow delete "<workflow-id>"
```

### session - Session Lifecycle

```bash
# Start session (usually auto-run by hook)
bun run checkpoint session-start [--branch <name>] [--issue <number>]

# End session with metrics
bun run checkpoint session-end [--workflow-id <id>] [--session-id <id>] \
  [--learnings-injected <n>] [--start-time <iso>] \
  [--compacted] [--interrupted] \
  [--review-findings <n>] [--files-read <n>]
```

### learning - Knowledge Extraction

```bash
# Analyze workflow for learnings
bun run checkpoint learning analyze "<workflow-id>" "<dev-plan-path>"

# Query knowledge graph
bun run checkpoint learning query [--code-area <area>] [--file <path>] [--issue <number>]
```

### metrics - Context Metrics

```bash
# List session metrics
bun run checkpoint metrics list [issue-number]

# Summary of all metrics
bun run checkpoint metrics summary
```

### milestone - Milestone Tracking

```bash
# Create milestone
bun run checkpoint milestone create "<name>" [github-number]

# Find milestone
bun run checkpoint milestone find "<name>"

# Get milestone details
bun run checkpoint milestone get "<id>"

# Update milestone phase
bun run checkpoint milestone set-phase "<id>" <phase>

# Update milestone status
bun run checkpoint milestone set-status "<id>" <status>

# List active milestones
bun run checkpoint milestone list-active

# Delete milestone
bun run checkpoint milestone delete "<id>"
```

### baseline - Validation Baselines

```bash
# Save baseline metrics
bun run checkpoint baseline save "<milestone-id>" \
  <lint-exit> <lint-warnings> <lint-errors> \
  <typecheck-exit> <typecheck-errors>
```

### graph - Code Graph Queries

```bash
# Find what calls a function
bun run checkpoint graph what-calls <name>

# Find what depends on something
bun run checkpoint graph what-depends-on <name>

# Calculate blast radius for a file
bun run checkpoint graph blast-radius <file>

# Find entities by name
bun run checkpoint graph find <name> [type]

# List exports from a package
bun run checkpoint graph exports [package]

# Find callers of a function
bun run checkpoint graph callers <function>

# Package/codebase summary
bun run checkpoint graph summary [package]
```

### bootstrap - Knowledge Mining

```bash
# Mine learnings from recent PRs
bun run checkpoint bootstrap mine-prs [limit]
```

## Examples

```bash
# Check if workflow exists for issue 394
/checkpoint workflow find 394

# Create workflow for new issue
/checkpoint workflow create 394 "feat/issue-394-tree-sitter"

# Query learnings about testing
/checkpoint learning query --code-area testing

# Check session metrics
/checkpoint metrics summary

# Find what depends on a module
/checkpoint graph what-depends-on checkpoint
```

## When to Use

- **Manual workflow management** - Creating/updating workflows outside normal flow
- **Debugging** - Checking workflow state when things go wrong
- **Knowledge queries** - Finding relevant learnings before starting work
- **Metrics review** - Understanding context usage patterns
- **Code exploration** - Using graph queries to understand dependencies
