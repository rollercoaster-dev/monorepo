# Rollercoaster.dev Monorepo

Open Badges credentialing system with self-signed badges, local-first architecture, and neurodivergent-first UX.

## Quick Reference

**Stack**: Bun 1.3.7 + Turborepo + TypeScript (strict, no `any`)

```bash
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

- **Testing**: Bun test runner, tests colocated (`*.test.ts`)
- **Commits**: Conventional commits (`feat`, `fix`, `chore`, etc.)
- **Versioning**: Changesets for version management (`bunx changeset`)

## Implementation Philosophy

Keep solutions simple and focused. Only make changes directly requested.

- Don't add features or refactor beyond what was asked
- Don't add error handling for scenarios that can't happen
- Don't create abstractions for one-time operations
- Reuse existing patterns; minimum complexity needed
- **Fix issues now** - When reviews identify problems, fix immediately. No tech debt.

## Search: Graph First

**Always use graph tools first. Grep/Glob are fallback only.**

| If you're about to...                    | Use this instead   |
| ---------------------------------------- | ------------------ |
| Grep for a function/class/type name      | `defs`             |
| Find what calls a function               | `callers`          |
| Understand impact before changing a file | `blast`            |
| Search for a literal string or regex     | Grep (fallback OK) |
| Find config files by name                | Glob (fallback OK) |

## Workflows

| Command                  | Use Case                         |
| ------------------------ | -------------------------------- |
| `/work-on-issue <n>`     | Supervised with approval gates   |
| `/auto-issue <n>`        | Fully automated                  |
| `/auto-milestone <name>` | Parallel milestone execution     |
| `/auto-epic <n>`         | Epic sub-issues with GitHub deps |

See [docs/development-workflows.md](docs/development-workflows.md) for details.

### Branch Protection Rules

**YOU MUST follow all workflow phases. YOU MUST NOT commit directly to main.**

- Always: `Issue → Feature Branch → Commits → PR → Review → Merge`
- Never: Commit directly to main, even in "autonomous" mode
- Never: Use `gh pr merge --admin` to bypass protections
- Never: Use `--auto` flag (skips review comment validation)

If merge is blocked, WAIT for CI. If unclear, ASK.

## Planning Stack

The context builder shows the current stack at session start. Use these tools to manage it:

| Tool        | When                          |
| ----------- | ----------------------------- |
| `goal`      | Starting a new work objective |
| `interrupt` | Unplanned context switch      |
| `done`      | Finished current item         |
| `stack`     | Check what's active/paused    |

## Proactive Reviews

Use after completing relevant work:

- `/markdown-reviewer` - After editing `.md` files
- `senior-code-reviewer` agent - After implementing features
- `openbadges-compliance-reviewer` agent - After badge/credential code changes

## Documentation

- [Development Workflows](docs/development-workflows.md) - gates, agents, plugins
- [Publishing Guide](docs/publishing-guide.md) - npm, Docker, Changesets
- [Monorepo Structure](docs/monorepo-structure.md) - deps, packages, env vars

## Current Focus

**Priority**: OB3 Phase 1 → Badge Generator → Self-Signed → Backpack

**Board**: [Monorepo Development (#11)](https://github.com/orgs/rollercoaster-dev/projects/11)
