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

## No Tech Debt Rule

**If it can be fixed now, fix it.**

When CodeRabbit, Claude review, or any code review identifies issues - even minor nitpicks - fix them immediately rather than deferring. This prevents accumulation of small issues that become larger problems.

## File Modification

Before modifying files, consider:

1. Was an explicit change requested?
2. Have relevant workflow gates been passed?
3. Is this the minimal change needed?

Safe operations (always allowed): reading files, searching, running tests, analyzing code.

## Search Priority

**Always use MCP tools first. Grep/Glob are fallback only.**

Graph tools are dramatically better than text search:

- **Speed**: Pre-indexed AST lookups are instant
- **Accuracy**: Finds actual definitions, not string matches
- **Context efficiency**: 10-20 precise results vs 200+ grep matches

Key tools: `graph_find` (definitions), `graph_what_calls` (callers), `graph_blast_radius` (impact)

See [.claude/rules/search-priority.md](.claude/rules/search-priority.md) for detailed decision tables and fallback guidance.

## Workflows

| Command                  | Use Case                       |
| ------------------------ | ------------------------------ |
| `/work-on-issue <n>`     | Supervised with approval gates |
| `/auto-issue <n>`        | Fully automated                |
| `/auto-milestone <name>` | Parallel milestone execution   |

See [docs/development-workflows.md](docs/development-workflows.md) for details.

### IMPORTANT: Workflow Integrity

**YOU MUST follow all workflow phases. YOU MUST NOT commit directly to main.**

"Autonomous" mode means no user approval gates - it does NOT mean skip phases or bypass branch isolation.

Why this matters:

- **User control** - PRs give the user a chance to review/reject before merge
- **Rollback safety** - Closing a PR is trivial; reverting main commits is disruptive
- **Quality** - Review phase catches bugs before they reach production
- **Token efficiency** - Research phase prevents trial-and-error coding

The correct pattern:

```text
Issue → Feature Branch → Commits → PR → Review → Merge
NEVER: Issue → Commit directly to main
```

### NEVER Use --admin Flag

**YOU MUST NEVER use `gh pr merge --admin` to bypass branch protection.**

If a merge is blocked:

- `BLOCKED` status means CI is still running or checks haven't completed
- "base branch policy prohibits the merge" means WAIT, not bypass
- Wait for CI to complete, then check review comments before merging

Do NOT use `--auto` flag - it skips review comment validation.

The `--admin` flag:

- Bypasses ALL branch protections
- Merges even with failing CI
- Deletes the branch (with `--delete-branch`), making recovery difficult
- Violates user trust and workflow integrity

If merge fails, ASK the user what to do. Never bypass protections autonomously.

## Proactive Reviews

Use after completing relevant work:

- `/markdown-reviewer` - After editing `.md` files
- `senior-code-reviewer` agent - After implementing features
- `openbadges-compliance-reviewer` agent - After badge/credential code changes

## Documentation

- [Development Workflows](docs/development-workflows.md) - gates, agents, plugins
- [Publishing Guide](docs/publishing-guide.md) - npm, Docker, Changesets
- [Monorepo Structure](docs/monorepo-structure.md) - deps, packages, env vars
- [Context Engineering](docs/context-engineering-best-practices.md) - Opus 4.5 best practices

## Current Focus

**Priority**: OB3 Phase 1 → Badge Generator → Self-Signed → Backpack

**Board**: [Monorepo Development (#11)](https://github.com/orgs/rollercoaster-dev/projects/11)
