# Agent Usage Rules

**Applies to:** All GitHub and specialized domain operations

## GitHub Operations → github-master Agent

**ALWAYS use the github-master agent for:**

- Creating issues (`gh issue create`)
- Updating issues (`gh issue edit`)
- Creating PRs (`gh pr create`)
- Adding to project board
- Applying labels
- Managing milestones
- Branch cleanup

**Do NOT run `gh` commands directly** for these operations. The agent handles proper labeling, board organization, and formatting.

## Domain-Specific Agents

| Task                       | Agent                          |
| -------------------------- | ------------------------------ |
| Open Badges spec questions | openbadges-expert              |
| OB compliance review       | openbadges-compliance-reviewer |
| Vue/Hono patterns          | vue-hono-expert                |
| Documentation              | docs-assistant                 |

## When Direct Commands Are OK

- Read-only queries: `gh issue view`, `gh pr view`, `gh pr checks`
- Simple status checks: `gh pr list`, `gh issue list`
- API queries for data: `gh api`
