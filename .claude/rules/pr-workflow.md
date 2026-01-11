# PR Creation Workflow

**Applies to:** `gh pr create`, creating pull requests

## Pre-PR Checklist

Complete these finalization steps before running `gh pr create`:

### Required Steps

1. [ ] **Implementation complete** - All code changes committed
2. [ ] **Tests pass** - `bun test` shows all green
3. [ ] **Type-check passes** - `bun run type-check` clean
4. [ ] **Lint passes** - `bun run lint` clean
5. [ ] **Build succeeds** - `bun run build` works
6. [ ] **Pre-PR review** - Run pr-review-toolkit or equivalent
7. [ ] **Domain review** (if badge code) - Run openbadges-compliance-reviewer

### Review Findings

Present findings grouped by severity:

- **High-priority (fix before PR)**: Security, bugs, breaking changes
- **Medium priority (should fix)**: Code quality, error handling
- **Low priority (consider)**: Style, documentation

Don't create PR until high-priority issues are resolved.

### Why This Matters

Skipping pre-PR review leads to:

- CodeRabbit catching issues that should have been fixed
- CI failures on PR
- Wasted review cycles
- Lower code quality

### Example

```bash
# Less ideal - Skip straight to PR
git push && gh pr create

# Better - Follow finalization workflow
bun test && bun run type-check && bun run lint && bun run build
# Run pr-review-toolkit
# Fix high priority issues
# THEN gh pr create
```
