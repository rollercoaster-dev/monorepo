# Validation Commands

> **Architecture:** Used by agents for pre-commit validation. See [agent-architecture.md](../docs/agent-architecture.md).

Shared validation patterns for workflow commands and agents.

## Quick Reference

| Level | Command                                                           | When to Use            |
| ----- | ----------------------------------------------------------------- | ---------------------- |
| Basic | `bun run type-check && bun run lint`                              | After each code change |
| Full  | `bun test && bun run type-check && bun run lint && bun run build` | Before PR creation     |

## Validation Levels

### Basic Validation

Run after each commit or code change:

```bash
bun run type-check && bun run lint
```

**Checks:**

- TypeScript type errors
- ESLint rule violations

**Use when:**

- After making changes during implementation
- Before staging a commit
- After auto-fixer applies changes

### Full Validation

Run before creating a PR:

```bash
bun test && bun run type-check && bun run lint && bun run build
```

**Checks:**

- All tests pass
- TypeScript type errors
- ESLint rule violations
- Build succeeds

**Use when:**

- Before creating a PR
- After all implementation commits
- After fixing review findings

### Test-Only Validation

Run specific tests:

```bash
bun test <path-to-test>
```

**Use when:**

- Verifying a specific fix
- TDD development cycle

## Validation Patterns

### After Each Commit

```bash
# Quick validation before committing
bun run type-check && bun run lint

# If passes, commit
git add . && git commit -m "<message>"
```

### Pre-PR Checklist

```bash
# Full validation
bun test && bun run type-check && bun run lint && bun run build

# All must pass before gh pr create
```

### Auto-Fix Loop Validation

After applying a fix:

```bash
# Basic validation to confirm fix works
bun run type-check && bun run lint

# If fails, rollback fix
git checkout -- <file>
```

## Error Handling

### Type-Check Failures

```bash
# Check specific error
bun run type-check 2>&1 | head -50

# Common fixes:
# - Add type annotations
# - Import missing types
# - Fix null/undefined handling
```

### Lint Failures

```bash
# Auto-fix what's possible
bun run lint:fix

# Check remaining issues
bun run lint
```

### Test Failures

```bash
# Run specific test for details
bun test <path> --verbose

# Common fixes:
# - Update test expectations
# - Fix mocked data
# - Handle async properly
```

### Build Failures

```bash
# Check build output
bun run build 2>&1 | tail -100

# Common fixes:
# - Resolve import paths
# - Export missing types
# - Fix circular dependencies
```

## Integration with Workflows

### /work-on-issue (Gated)

```markdown
- After Gate 2: Basic validation before each commit
- After all commits: Full validation before Gate 4
```

### /auto-issue (Autonomous)

```markdown
- Phase 2 end: Basic validation
- Phase 4 start: Full validation
- If --require-tests: Fail on test failures
```

### Agents

| Component        | Validation Level    |
| ---------------- | ------------------- |
| implement skill  | Basic (each commit) |
| auto-fixer agent | Basic (after fix)   |
| finalize skill   | Full (pre-PR)       |
| review skill     | Full (after fixes)  |
