# AI Code Review Workflows

This document explains how AI-powered code review works in this repository.

## Overview

We use a layered approach to AI code review:

| Tool           | Role                           | Trigger                  |
| -------------- | ------------------------------ | ------------------------ |
| **CodeRabbit** | Primary reviewer               | Automatic on PR creation |
| **Claude**     | Deep reasoning for complex PRs | On-demand (`@claude`)    |

## CodeRabbit (Primary)

CodeRabbit automatically reviews all non-draft PRs when they are created.

### Automatic Behavior

- **PR creation**: Full review of all changes (one-time)
- **Subsequent commits**: No automatic review (use manual trigger if needed)
- **Draft PRs**: Skipped until marked ready for review

> **Why no auto-review on commits?** To avoid hitting API limits and reduce noise during iterative development. Use `@coderabbitai review` when you're ready for another review.

### Manual Trigger

To request an additional review or re-review:

```
@coderabbitai review
```

### Path-Specific Instructions

CodeRabbit uses path-specific instructions defined in `.coderabbit.yaml`:

| Path                                                            | Focus Areas                            |
| --------------------------------------------------------------- | -------------------------------------- |
| `packages/openbadges-ui/**/*.vue`                               | Accessibility, Vue 3 best practices    |
| `apps/openbadges-modular-server/src/api/**`                     | Security, input validation, API design |
| `apps/openbadges-modular-server/src/auth/**`                    | Authentication security, JWT handling  |
| `apps/openbadges-modular-server/src/infrastructure/database/**` | SQL injection, data integrity          |
| `packages/rd-logger/**`                                         | Sensitive data protection              |
| `packages/openbadges-types/**`                                  | Open Badges spec compliance            |
| `**/*.test.ts`                                                  | Test quality, edge cases               |

See [`.coderabbit.yaml`](../../.coderabbit.yaml) for full configuration.

## Claude (On-Demand)

Claude is available for deep reasoning on complex PRs or specific questions.

### How to Trigger

Comment on a PR with:

```
@claude <your question or request>
```

Examples:

- `@claude review this PR for architectural issues`
- `@claude explain the changes in this PR`
- `@claude are there any security concerns with this approach?`

### When to Use Claude

- Large PRs with significant architectural changes
- Complex business logic that needs deeper analysis
- Questions about implementation approach
- Security-focused review requests

### Workflow Files

- `.github/workflows/claude-code-review.yml` - PR review workflow
- `.github/workflows/claude.yml` - General-purpose Claude assistant

## Best Practices

1. **Let CodeRabbit handle routine reviews** - It runs automatically and provides comprehensive feedback
2. **Use Claude for complex questions** - When you need deeper reasoning or have specific concerns
3. **Address critical issues first** - Both tools categorize issues by severity
4. **Don't over-trigger** - Incremental reviews reduce noise; avoid manual triggers unless needed

## Disabling Reviews

### Skip CodeRabbit for a PR

Add to PR description:

```
@coderabbitai ignore
```

### Skip Specific Files

CodeRabbit automatically skips:

- `**/dist/**`
- `**/node_modules/**`
- `**/*.lock`
- `**/coverage/**`
- `**/.bun-cache/**`

## Troubleshooting

### CodeRabbit Not Reviewing

1. Check if PR is still a draft (drafts are skipped)
2. Verify `.coderabbit.yaml` hasn't been accidentally modified
3. Try manual trigger: `@coderabbitai review`

### Claude Not Responding

1. Check GitHub Actions for workflow failures
2. Verify `ANTHROPIC_API_KEY` secret is configured
3. Check workflow permissions in repository settings
