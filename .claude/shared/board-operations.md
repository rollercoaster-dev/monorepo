# Board Operations

Shared GitHub Project board operations for workflow commands and skills.

## Project Board Configuration

**Project:** Monorepo Development (#11)
**URL:** https://github.com/orgs/rollercoaster-dev/projects/11

### IDs Reference

| Resource        | ID                               |
| --------------- | -------------------------------- |
| Project ID      | `PVT_kwDOB1lz3c4BI2yZ`           |
| Status Field ID | `PVTSSF_lADOB1lz3c4BI2yZzg5MUx4` |

### Status Option IDs

| Status      | Option ID  | When to Use                 |
| ----------- | ---------- | --------------------------- |
| Backlog     | `8b7bb58f` | Not ready / needs triage    |
| Next        | `266160c2` | Ready to pick up            |
| In Progress | `3e320f16` | Currently being worked on   |
| Blocked     | `51c2af7b` | PR created, awaiting review |
| Done        | `56048761` | Merged to main              |

## Helper Functions

### get_item_id_for_issue

Get the project item ID for an issue number.

```bash
get_item_id_for_issue() {
  local issue_number=$1
  gh api graphql -f query='
    query {
      organization(login: "rollercoaster-dev") {
        projectV2(number: 11) {
          items(first: 100) {
            nodes {
              id
              content { ... on Issue { number } }
            }
          }
        }
      }
    }' | jq -r ".data.organization.projectV2.items.nodes[] | select(.content.number == $issue_number) | .id"
}
```

### update_board_status

Update issue status with validation.

```bash
update_board_status() {
  local item_id=$1
  local option_id=$2
  local status_name=$3
  local context=${4:-"WORKFLOW"}  # Optional context for logging

  RESULT=$(gh api graphql \
    -f projectId="PVT_kwDOB1lz3c4BI2yZ" \
    -f itemId="$item_id" \
    -f fieldId="PVTSSF_lADOB1lz3c4BI2yZzg5MUx4" \
    -f optionId="$option_id" \
    -f query='mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }' 2>&1)

  # Validate response
  if echo "$RESULT" | jq -e '.errors | length > 0' > /dev/null 2>&1; then
    echo "[$context] WARNING: Board update failed (GraphQL error)"
    return 1
  elif echo "$RESULT" | jq -e '.data.updateProjectV2ItemFieldValue.projectV2Item.id' > /dev/null 2>&1; then
    echo "[$context] Board: Moved to '$status_name'"
    return 0
  else
    echo "[$context] WARNING: Board update failed (unexpected response)"
    return 1
  fi
}
```

### add_issue_to_board

Add an issue to the project board.

```bash
add_issue_to_board() {
  local issue_number=$1

  ISSUE_NODE_ID=$(gh issue view $issue_number --json id -q .id)
  gh api graphql -f query='
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {
        projectId: $projectId
        contentId: $contentId
      }) { item { id } }
    }' -f projectId="PVT_kwDOB1lz3c4BI2yZ" -f contentId="$ISSUE_NODE_ID" 2>/dev/null || true
}
```

## Common Workflows

### Add Issue and Set Status

```bash
# 1. Add to board (silently fails if already present)
add_issue_to_board 123

# 2. Get item ID and update status
ITEM_ID=$(get_item_id_for_issue 123)
if [ -n "$ITEM_ID" ]; then
  update_board_status "$ITEM_ID" "266160c2" "Next" "MY-CONTEXT"
else
  echo "[MY-CONTEXT] WARNING: Issue not found on project board"
fi
```

### Workflow Status Transitions

| Workflow Event        | Status      | Option ID  |
| --------------------- | ----------- | ---------- |
| Issue assigned        | In Progress | `3e320f16` |
| PR created            | Blocked     | `51c2af7b` |
| PR merged             | Done        | `56048761` |
| Blocked by dependency | Blocked     | `51c2af7b` |

## Error Handling

Board operations are **non-critical** - if they fail:

1. Log a warning
2. Continue with the main workflow
3. User can manually update board later

```bash
ITEM_ID=$(get_item_id_for_issue "$ISSUE")
if [ -n "$ITEM_ID" ]; then
  update_board_status "$ITEM_ID" "3e320f16" "In Progress" || true
else
  echo "[WORKFLOW] WARNING: Could not update board (continuing anyway)"
fi
```

## Query IDs (if they change)

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
