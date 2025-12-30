# PR Creation Workflow Gate

**Applies to:** `gh pr create`, creating pull requests

## STOP - Before Creating a PR

You MUST complete these finalization steps IN ORDER before running `gh pr create`:

### Checklist (ALL Required)

1. [ ] **Implementation complete** - All code changes committed
2. [ ] **Tests pass** - `bun test` shows all green
3. [ ] **Type-check passes** - `bun run type-check` clean
4. [ ] **Lint passes** - `bun run lint` clean
5. [ ] **Build succeeds** - `bun run build` works
6. [ ] **Pre-PR review** - Run pr-review-toolkit or equivalent
7. [ ] **Domain review** (if badge code) - Run openbadges-compliance-reviewer

### Gate Review Requirement

Present findings grouped by severity:

- **Critical (must fix)**: Security, bugs, breaking changes
- **High (should fix)**: Code quality, error handling
- **Medium (consider)**: Style, documentation

Do NOT create PR until Critical issues are resolved.

### Why This Matters

Skipping pre-PR review leads to:

- CodeRabbit catching issues that should have been fixed
- CI failures on PR
- Wasted review cycles
- Lower code quality

### Example

```bash
# WRONG - Skip straight to PR
git push && gh pr create

# CORRECT - Follow finalization workflow
bun test && bun run type-check && bun run lint && bun run build
# Run pr-review-toolkit
# Fix critical issues
# THEN gh pr create
```
