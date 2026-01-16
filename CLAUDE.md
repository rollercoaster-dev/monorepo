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

## MCP Tools Available

When MCP is enabled, these native tools are available (preferred over CLI):

| Tool                       | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `knowledge_search_similar` | **Semantic search** - find related concepts |
| `knowledge_query`          | Keyword search learnings, patterns          |
| `knowledge_store`          | Store new learnings                         |
| `graph_what_calls`         | Find function callers                       |
| `graph_blast_radius`       | Analyze change impact                       |
| `graph_find`               | Locate code entities                        |
| `checkpoint_workflow_*`    | Manage workflow checkpoints                 |
| `output_save`              | Save long output to file                    |

**Resources** (browsable data):

- `knowledge://learnings` - Browse all learnings
- `knowledge://patterns` - Browse patterns
- `logs://list` - Available log files
- `logs://test/latest` - Latest test output
- `logs://file/<name>` - Read a specific log file
- `workflows://active` - Running workflows

## Search Priority (MANDATORY)

**ALWAYS try MCP tools BEFORE Grep/Glob.** 1 query = 10 greps worth of context.

| Question                    | MCP Tool (preferred)       | Fallback          |
| --------------------------- | -------------------------- | ----------------- |
| How did we handle X before? | `knowledge_search_similar` | `knowledge_query` |
| Past learnings about X?     | `knowledge_search_similar` | `knowledge_query` |
| Who calls function X?       | `graph_what_calls`         | Grep              |
| Impact of changing file X?  | `graph_blast_radius`       | Grep              |
| Where is X defined?         | `graph_find`               | Glob              |

**Priority order:**

1. **Semantic search** (`knowledge_search_similar`) - Finds conceptually related learnings
2. **Graph queries** - Code relationships (callers, dependencies, blast radius)
3. **Knowledge query** - Keyword-based search for exact matches
4. **Docs search** - Project documentation and patterns
5. **Grep/Glob** - LAST RESORT for literal text search only

**Why semantic first?** It finds "validation" when you search "input checking" - concepts, not keywords.

The code graph is populated on session start. Using it first saves 10x tool calls.

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
