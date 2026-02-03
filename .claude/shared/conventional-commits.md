# Conventional Commits

> **Architecture:** Used by all agents for commit formatting. See [agent-architecture.md](../docs/agent-architecture.md).

Shared commit message format for all workflows and agents.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types

| Type       | When to Use                      |
| ---------- | -------------------------------- |
| `feat`     | New feature or functionality     |
| `fix`      | Bug fix                          |
| `refactor` | Code change that doesn't fix/add |
| `test`     | Adding or updating tests         |
| `docs`     | Documentation changes            |
| `chore`    | Maintenance, config, tooling     |
| `build`    | Build system or dependencies     |
| `ci`       | CI/CD configuration              |

## Scopes

Package-specific scopes:

| Scope               | Package                        |
| ------------------- | ------------------------------ |
| `rd-logger`         | packages/rd-logger             |
| `openbadges-types`  | packages/openbadges-types      |
| `openbadges-ui`     | packages/openbadges-ui         |
| `openbadges-server` | apps/openbadges-modular-server |
| `openbadges-system` | apps/openbadges-system         |
| `deps`              | Dependency updates             |
| `config`            | Configuration changes          |

## Examples

### Feature

```
feat(openbadges-types): add VerifiableCredential type definitions

Adds OB3 VerifiableCredential types including:
- CredentialSubject interface
- Proof interface
- CredentialStatus interface

Related to #365
```

### Bug Fix

```
fix(rd-logger): handle undefined context in QueryLogger

The QueryLogger was throwing when context was undefined.
Now defaults to empty object.

Fixes #123
```

### Refactor

```
refactor(openbadges-server): extract badge validation to separate module

Moves validation logic from routes to dedicated validator module
for better testability and reuse.

Related to #456
```

### Test

```
test(openbadges-ui): add unit tests for BadgeCard component

Covers:
- Rendering with minimal props
- Click handler behavior
- Loading state display
```

### Chore

```
chore: clean up dev-plan for issue #365
```

## Footer Formats

### Issue References

```
Related to #123
Fixes #123
Closes #123
```

### Co-Author

```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Breaking Change

```
BREAKING CHANGE: renamed store() to storeKnowledge()

The old store() function has been renamed for clarity.
Update all call sites to use storeKnowledge() instead.
```

## Rules

1. **Subject line**: Max 72 characters, imperative mood ("add" not "added")
2. **Body**: Wrap at 72 characters, explain what and why (not how)
3. **Footer**: Reference issues, co-authors, breaking changes
4. **Atomic**: Each commit should be buildable and testable alone

## HEREDOC Format for Git

When committing via command line, use HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(scope): description

Body text here.

Related to #123
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```
