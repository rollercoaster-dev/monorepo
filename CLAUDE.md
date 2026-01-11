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

```
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

Keep solutions simple and focused. Only make changes that are directly requested.

- Don't add features or refactor code beyond what was asked
- Don't add error handling for scenarios that can't happen
- Don't create abstractions for one-time operations
- Reuse existing patterns; the right complexity is the minimum needed

## File Modification

Before modifying files, consider:

1. Was an explicit change requested?
2. Have relevant workflow gates been passed?
3. Is this the minimal change needed?

Safe operations (always allowed): reading files, searching, running tests, analyzing code.

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
