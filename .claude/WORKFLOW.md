# Claude Code Workflow

This document describes the complete development workflow using Claude Code agents and skills.

## Overview

```
Issue → Research → Plan → Implement → PR → Review → Merge
```

### Tools

| Type  | Name              | Purpose                    | Invoke                         |
| ----- | ----------------- | -------------------------- | ------------------------------ |
| Skill | issue-fetcher     | Get issue details          | Auto (ask about issues)        |
| Skill | board-status      | Check project board        | Auto (ask about board)         |
| Skill | milestone-tracker | Track milestone progress   | Auto (ask about milestone)     |
| Skill | pr-review-checker | Check PR review status     | Auto (ask about reviews)       |
| Agent | issue-researcher  | Research and plan          | `"research issue #123"`        |
| Agent | atomic-developer  | Implement with commits     | `"implement issue #123"`       |
| Agent | pr-creator        | Create PR, trigger reviews | `"create pr for issue #123"`   |
| Agent | review-handler    | Address review feedback    | `"handle reviews for pr #123"` |

## Complete Workflow

### 1. Pick an Issue

**Ask:** "what's next to work on?" or "board status"

The `board-status` skill auto-triggers and shows:

- Items in "Next" column (ready to pick up)
- Current "In Progress" items
- Items "Blocked" (awaiting review)

### 2. Research the Issue

**Command:** `"research issue #108"`

The `issue-researcher` agent:

1. Fetches issue details
2. Analyzes codebase
3. Creates development plan
4. Saves to `.claude/dev-plans/issue-108.md`
5. Updates board status to "In Progress"

### 3. Implement the Plan

**Command:** `"implement issue #108"`

The `atomic-developer` agent:

1. Creates feature branch: `feat/issue-108-description`
2. Follows the development plan
3. Makes atomic commits (one logical change each)
4. Validates after each commit
5. Reports when ready for PR

### 4. Create Pull Request

**Command:** `"create pr for issue #108"`

The `pr-creator` agent:

1. Pushes branch to origin
2. Creates PR with proper description
3. Links issue with "Closes #108"
4. Triggers `@coderabbitai full review` (comment)
5. Triggers `@claude review` (comment)
6. Updates board status to "Blocked" (awaiting review)

### 5. Address Review Feedback

**Command:** `"handle reviews for pr #140"`

The `review-handler` agent:

1. Fetches CodeRabbit and Claude reviews
2. Categorizes feedback (critical/should fix/suggestions)
3. Implements fixes with atomic commits
4. Pushes updates
5. Reports status

### 6. Merge and Done

When approved:

1. Merge the PR (squash or merge commit)
2. GitHub auto-closes the linked issue
3. Update board status to "Done" (if not automatic)

## Quick Reference

### Common Commands

```
# Check status
"board status"
"milestone progress"
"what's in review?"

# Work on issue
"research issue #108"
"implement issue #108"
"create pr for issue #108"

# Handle reviews
"check pr #140 reviews"
"handle reviews for pr #140"
```

### Board Status Flow

```
Backlog → Next → In Progress → Blocked → Done
```

| Status      | When                            | Who Updates      |
| ----------- | ------------------------------- | ---------------- |
| Backlog     | Issue created, not ready        | Manual           |
| Next        | Dependencies met, ready to work | Manual           |
| In Progress | Work started                    | atomic-developer |
| Blocked     | PR created, awaiting review     | pr-creator       |
| Done        | PR merged                       | review-handler   |

### Branch Naming

```
<type>/issue-<number>-<short-description>
```

Examples:

- `feat/issue-108-key-management-types`
- `fix/issue-115-png-encoding`
- `refactor/issue-120-unified-baking`

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`

## Skills vs Agents

### Skills (Auto-invoke)

- **Read-only** operations
- Triggered by natural language questions
- No explicit command needed
- Examples: "what's blocking?", "PR status?", "milestone progress?"

### Agents (Explicit invoke)

- **Write** operations (code changes, PR creation)
- Triggered by explicit commands
- User controls when to invoke
- Examples: "research issue #X", "implement issue #X"

## File Locations

```
.claude/
├── agents/              # Agent definitions
│   ├── atomic-developer.md
│   ├── issue-researcher.md
│   ├── pr-creator.md
│   └── review-handler.md
├── skills/              # Skill definitions
│   ├── board-status/
│   ├── issue-fetcher/
│   ├── milestone-tracker/
│   └── pr-review-checker/
├── templates/           # Templates
│   └── dev-plan.md
├── dev-plans/           # Stored development plans
│   └── issue-<number>.md
├── settings.json        # Team settings
├── WORKFLOW.md          # This file
└── settings.local.json  # Personal settings (not committed)
```

## Tips

1. **One issue at a time** - Complete current work before starting new
2. **Small PRs** - Target ~500 lines max (excluding tests)
3. **Atomic commits** - Each commit should be self-contained
4. **Address all reviews** - Don't skip AI feedback
5. **Update board status** - Keep the project board accurate
