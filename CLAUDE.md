# Rollercoaster.dev Monorepo

Open Badges credentialing system with self-signed badges, local-first architecture, and neurodivergent-first UX.

## Quick Reference

**Stack**: Bun 1.3.2 + Turborepo + TypeScript (strict, no `any`)

```bash
# Essential commands
bun dev                    # Start all apps
bun run build              # Build all packages
bun test                   # Run all tests
bun run type-check         # TypeScript checking
bun run lint               # Lint all packages
bun --filter <pkg> <cmd>   # Run command in specific package
```

## Project Structure

```text
apps/
  openbadges-modular-server/  # OB 2.0/3.0 API server (Bun/Hono)
  openbadges-system/          # Vue 3 + Bun/Hono full-stack app
packages/
  rd-logger/                  # Structured logging (npm published)
  openbadges-types/           # OB TypeScript types (npm published)
  openbadges-ui/              # Vue 3 components (npm published)
  shared-config/              # Build configs (internal)
```

Each package has its own `CLAUDE.md` with package-specific context.

## Conventions

- **Testing**: Bun test runner, tests colocated (`*.test.ts`). Use `bun run test:unit` from root.
- **Commits**: Conventional commits (`feat`, `fix`, `chore`, etc.)
- **Versioning**: Changesets for version management (`bunx changeset`)

## Implementation Philosophy

Keep solutions simple and focused. Only make changes that are directly requested.

- Don't add features or refactor code beyond what was asked
- Don't add error handling for scenarios that can't happen
- Don't create abstractions for one-time operations
- Reuse existing patterns; the right complexity is the minimum needed
- For `/work-on-issue` workflow, follow all gates exactly and pause at each one

## File Modification

Before modifying files, consider:

1. Was an explicit change requested?
2. Have relevant workflow gates been passed?
3. Is this the minimal change needed?

Safe operations (always allowed): reading files, searching, running tests, analyzing code.

## Search Priority (DEFAULT)

**Always use MCP tools first. Grep/Glob are fallback only.**

### Why Graph First?

Graph tools are dramatically better than text search:

- **Speed**: Pre-indexed AST lookups are instant vs scanning every file
- **Accuracy**: Finds actual definitions, not string matches (e.g., "Config" in comments, variable names, imports)
- **Context efficiency**: Returns 10-20 precise results vs 200+ grep matches that consume context
- **Semantic understanding**: `graph_what_calls` shows actual call relationships, not just where the string appears

A single `graph_find` call often replaces 3-5 grep iterations of "found too many matches, let me refine..."

Tool usage is tracked and reported at session end. Aim for graph/search ratio > 1.0.

### Graph Tools (Code Structure)

| Tool                 | Use For              | Why Default                                     |
| -------------------- | -------------------- | ----------------------------------------------- |
| `graph_find`         | Locating definitions | AST-precise, finds declarations not just text   |
| `graph_what_calls`   | Finding callers      | Shows actual usage patterns, not string matches |
| `graph_blast_radius` | Impact analysis      | Transitive deps - prevents breaking changes     |

### When to Use Graph vs Grep

| Looking For                 | Use This             | Why                                   |
| --------------------------- | -------------------- | ------------------------------------- |
| Function/class definition   | `graph_find`         | Finds declaration, not usages         |
| What calls a function       | `graph_what_calls`   | Actual call sites, not string matches |
| Impact of changing a file   | `graph_blast_radius` | Transitive dependencies               |
| Literal string in code      | `Grep`               | Graph only indexes code entities      |
| Config files (package.json) | `Grep/Glob`          | Not in code graph                     |
| Error message text          | `Grep`               | Strings aren't indexed                |

### Knowledge Tools (Past Context)

| Tool                       | Use For              | Why Default                                     |
| -------------------------- | -------------------- | ----------------------------------------------- |
| `knowledge_search_similar` | Finding related work | Semantic - "auth" finds "credential validation" |
| `knowledge_query`          | Exact lookups        | By area, file, or issue number                  |
| `knowledge_store`          | Capturing insights   | Persists for future sessions                    |

### Other MCP Tools

| Tool                    | Purpose                     |
| ----------------------- | --------------------------- |
| `checkpoint_workflow_*` | Manage workflow checkpoints |
| `output_save`           | Save long output to file    |
| `metrics_*`             | Query tool usage stats      |

### Fallback (Grep/Glob)

Use only when:

- MCP returned no results
- Searching for literal strings/regex patterns
- Looking outside the indexed codebase
- Config files, READMEs, or non-code content

### Capture Learnings

When you discover something interesting - a pattern, a gotcha, a non-obvious solution - store it with `knowledge_store`. Future sessions benefit from what you learn today.

**Resources** (browsable data):

- `knowledge://learnings` - Browse all learnings
- `knowledge://patterns` - Browse patterns
- `workflows://active` - Running workflows

## Workflows

| Command                  | Use Case                       |
| ------------------------ | ------------------------------ |
| `/work-on-issue <n>`     | Supervised with approval gates |
| `/auto-issue <n>`        | Fully automated                |
| `/auto-milestone <name>` | Parallel milestone execution   |

See [docs/development-workflows.md](docs/development-workflows.md) for details.

## Documentation

- [Development Workflows](docs/development-workflows.md) - gates, agents, plugins
- [Publishing Guide](docs/publishing-guide.md) - npm, Docker, Changesets
- [Monorepo Structure](docs/monorepo-structure.md) - deps, packages, env vars
- [Context Engineering](docs/context-engineering-best-practices.md) - Opus 4.5 best practices

## Current Focus

**Priority**: OB3 Phase 1 → Badge Generator → Self-Signed → Backpack

**Board**: [Monorepo Development (#11)](https://github.com/orgs/rollercoaster-dev/projects/11)
