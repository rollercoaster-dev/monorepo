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
  openbadges-system/          # Vue 3 + Bun/Hono full-stack app
  openbadges-modular-server/  # OB 2.0/3.0 API server (Bun/Hono)
  native-rd/                  # Expo/React Native goal tracker + badge portfolio
  docs/                       # Living documentation (wiki structure)
packages/
  design-tokens/              # Design system tokens (npm published)
  openbadges-core/            # Shared OB3 core library (npm published)
  rd-logger/                  # Structured logging (npm published)
  openbadges-types/           # OB TypeScript types (npm published)
  openbadges-ui/              # Vue 3 components (npm published)
  shared-config/              # Build configs (internal)
```

Each package has its own `AGENTS.md` with package-specific context.

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

## Product Planning Methodology

**When the user asks to plan a product, rebuild, feature, or package, follow the documented methodology — do not invent your own sequence.**

Canonical doc: [`apps/docs/processes/product-planning.md`](apps/docs/processes/product-planning.md)

Sequence: **User Stories → Vision Docs → Design Docs → ADRs / Planning → Build.** Each phase feeds the next. Stories come first, always.

Key rules agents get wrong and **must not**:

- Never refuse to write a user story because "the feature / tool / CLI doesn't exist yet." Stories are forward-looking by design — they are how the project decides what to build.
- Never jump to implementation, vision, or design before stories are solid.
- Never treat stories as specs. They are narrative, present-tense, actor-driven. Specs come later.
- Never delete a story; mark it _needs rework_ and move on.

Read `apps/docs/processes/product-planning.md` before engaging in any planning conversation.

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

## Proactive Reviews

Use after completing relevant work:

- `/markdown-reviewer` - After editing `.md` files
- `senior-code-reviewer` agent - After implementing features
- `openbadges-compliance-reviewer` agent - After badge/credential code changes

## Documentation

- [Documentation Index](docs/index.md) - full catalog of all docs with freshness status
- [Architecture Overview](docs/architecture/overview.md) - package map, dependency directions, prohibited imports
- [Golden Principles](docs/golden-principles.md) - mechanical coding rules drawn from PR reviews
- [Development Workflows](docs/development-workflows.md) - gates, agents, plugins
- [Publishing Guide](docs/publishing-guide.md) - npm, Docker, Changesets
- [Monorepo Structure](docs/monorepo-structure.md) - deps, packages, env vars

## Current Focus

**Priority**: OB3 Phase 1 → Badge Generator → Self-Signed → Backpack

**Board**: [Monorepo Development (#11)](https://github.com/orgs/rollercoaster-dev/projects/11)
