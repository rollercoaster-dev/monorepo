# Development Plans

This directory stores development plans created by the `issue-researcher` agent.

## Naming Convention

```
issue-<number>.md
```

Example: `issue-108.md` for GitHub issue #108

## Usage

1. **Create plan:** `"research issue #108"` - Uses issue-researcher agent
2. **Implement:** `"implement issue #108"` - Uses atomic-developer agent
3. **Create PR:** `"create pr for issue #108"` - Uses pr-creator agent

## Template

See `.claude/templates/dev-plan.md` for the plan template structure.

## Note

Plans are living documents. Update them if implementation deviates significantly from the original plan.
