# Commit Rules

**Applies to:** All git commit operations

## Atomic Commits

Each commit must be:

- Self-contained (works on its own)
- Single purpose (one logical change)
- Buildable (type-check passes)
- Testable (related tests included when applicable)

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

Related to #<issue-number>
```

Types: feat, fix, refactor, test, docs, chore, build, ci

Scopes: rd-logger, openbadges-types, openbadges-ui, openbadges-server, openbadges-system, deps, config

## Before Committing

1. Run validation: `bun run type-check && bun run lint`
2. Run related tests: `bun test <test-file>`
3. Review changes: `git diff --staged`

## Do NOT Commit

- Files with secrets (.env, credentials)
- Debug code (console.log statements)
- Commented-out code blocks
- Incomplete implementations (unless WIP branch)
