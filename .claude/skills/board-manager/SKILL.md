---
name: board-manager
description: Manage GitHub Project board items - add issues, update status, move between columns. Use when user asks to add issues to board, change status, or organize the project.
allowed-tools: Bash, Read
---

# Board Manager Skill

## Purpose

Add issues to the project board and update their status. This skill has **write permissions** for board operations.

## When Claude Should Use This

- User asks "add this issue to the board"
- User asks "move #X to In Progress"
- User asks "update status of issue"
- User asks "put this in the backlog"
- After creating a new issue (auto-add to board)
- After completing work (move to Done)

## Project Board Configuration

**Project:** Monorepo Development (#11)
**URL:** https://github.com/orgs/rollercoaster-dev/projects/11

### IDs Reference

| Resource | ID |
|----------|-----|
| Project ID | `PVT_kwDOB1lz3c4BI2yZ` |
| Status Field ID | `PVTSSF_lADOB1lz3c4BI2yZzg5MUx4` |

### Status Option IDs

| Status | Option ID |
|--------|-----------|
| Backlog | `8b7bb58f` |
| Next | `266160c2` |
| In Progress | `3e320f16` |
| In Review | `51c2af7b` |
| Done | `56048761` |

## Commands

### Add Issue to Project Board

```bash
gh project item-add 11 --owner rollercoaster-dev --url https://github.com/rollercoaster-dev/monorepo/issues/<number>
```

### Get Item ID for an Issue

```bash
gh project item-list 11 --owner rollercoaster-dev --format json | jq '.items[] | select(.content.number == <issue-number>) | .id'
```

### Update Issue Status

```bash
gh project item-edit \
  --project-id PVT_kwDOB1lz3c4BI2yZ \
  --id <item-id> \
  --field-id PVTSSF_lADOB1lz3c4BI2yZzg5MUx4 \
  --single-select-option-id <option-id>
```

### Remove Issue from Project

```bash
gh project item-delete 11 --owner rollercoaster-dev --id <item-id>
```

## Workflow Examples

### Add New Issue and Set Status

```bash
# 1. Add to project
gh project item-add 11 --owner rollercoaster-dev --url https://github.com/rollercoaster-dev/monorepo/issues/123

# 2. Get the item ID
ITEM_ID=$(gh project item-list 11 --owner rollercoaster-dev --format json | jq -r '.items[] | select(.content.number == 123) | .id')

# 3. Set status to "Next"
gh project item-edit \
  --project-id PVT_kwDOB1lz3c4BI2yZ \
  --id "$ITEM_ID" \
  --field-id PVTSSF_lADOB1lz3c4BI2yZzg5MUx4 \
  --single-select-option-id 266160c2
```

### Move Issue to In Progress

```bash
# Get item ID
ITEM_ID=$(gh project item-list 11 --owner rollercoaster-dev --format json | jq -r '.items[] | select(.content.number == <issue-number>) | .id')

# Update to In Progress
gh project item-edit \
  --project-id PVT_kwDOB1lz3c4BI2yZ \
  --id "$ITEM_ID" \
  --field-id PVTSSF_lADOB1lz3c4BI2yZzg5MUx4 \
  --single-select-option-id 3e320f16
```

## Status Mapping

| Action | Status | Option ID |
|--------|--------|-----------|
| New issue, blocked | Backlog | `8b7bb58f` |
| Ready to work | Next | `266160c2` |
| Started work | In Progress | `3e320f16` |
| PR created | In Review | `51c2af7b` |
| PR merged | Done | `56048761` |

## Output Format

After operations, confirm:

```markdown
**Board Update:** Issue #X moved to [Status]
**URL:** https://github.com/orgs/rollercoaster-dev/projects/11
```

## Query Current IDs (if they change)

```bash
gh api graphql -f query='
query {
  organization(login: "rollercoaster-dev") {
    projectV2(number: 11) {
      id
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
}'
```
