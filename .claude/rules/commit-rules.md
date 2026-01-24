# Commit Rules

**Applies to:** All git commit operations

---

## CRITICAL: Never Commit Directly to Main

**YOU MUST NOT commit directly to `main` when running `/auto-issue`, `/auto-milestone`, or `/work-on-issue` workflows.**

### Why This Rule Exists

1. **User Control** - The user expects to review changes via PR before they land on main
2. **Rollback Safety** - Closing a PR is trivial; reverting commits on main is disruptive
3. **Review Quality** - PRs get CI checks, CodeRabbit review, Claude review
4. **Workflow Integrity** - The entire workflow is designed around branch → PR → merge

### The Correct Pattern

```bash
# During any workflow:
git checkout -b feat/issue-123-description   # Create feature branch
# ... make commits on feature branch ...
git push -u origin feat/issue-123-description
gh pr create ...                              # Create PR
# User reviews → approves → merges
```

### What Happens If You Bypass This

- User loses ability to review before merge
- No CI validation before code lands
- Bugs go directly to main
- **You break the trust the user placed in you**

---

## Atomic Commits

Each commit should be:

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

## Avoid Committing

- Files with secrets (.env, credentials)
- Debug code (console.log statements)
- Commented-out code blocks
- Incomplete implementations (unless WIP branch)
