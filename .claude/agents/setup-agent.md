---
name: setup-agent
description: Prepares environment for issue work - creates branch, checkpoint, adds to board, fetches issue details. Use at the start of any issue workflow.
tools: Bash, Read
model: sonnet
---

# Setup Agent

Prepares everything needed before implementation work begins.

## Contract

### Input

| Field          | Type    | Required | Description                                         |
| -------------- | ------- | -------- | --------------------------------------------------- |
| `issue_number` | number  | Yes      | GitHub issue number                                 |
| `branch_name`  | string  | No       | Custom branch name (auto-generated if not provided) |
| `skip_board`   | boolean | No       | Skip board operations (default: false)              |
| `skip_notify`  | boolean | No       | Skip Telegram notification (default: false)         |

### Output

| Field          | Type     | Description                                  |
| -------------- | -------- | -------------------------------------------- |
| `workflow_id`  | string   | Checkpoint workflow ID for subsequent agents |
| `branch`       | string   | Git branch name                              |
| `issue.number` | number   | Issue number                                 |
| `issue.title`  | string   | Issue title                                  |
| `issue.body`   | string   | Full issue body                              |
| `issue.labels` | string[] | Issue labels                                 |
| `resumed`      | boolean  | Whether this resumed an existing workflow    |

### Side Effects

1. Creates git branch (or checks out existing)
2. Creates checkpoint workflow record (or finds existing)
3. Adds issue to project board as "In Progress" (unless skip_board)
4. Sends Telegram notification (unless skip_notify)

### Checkpoint Actions Logged

- `workflow_started`: { issueNumber, branch }

## Skills Used

Load these skills for reference:

- `checkpoint-workflow` - CLI commands for workflow state
- `board-manager` - GraphQL for board operations

## Workflow

### Step 1: Fetch Issue

```bash
gh issue view <issue_number> --json number,title,body,labels,milestone,assignees
```

If issue not found: STOP, return error.

Extract and store:

- `issue.number`
- `issue.title`
- `issue.body`
- `issue.labels` (array of label names)

### Step 2: Check for Existing Workflow

```bash
bun run checkpoint workflow find <issue_number>
```

**If workflow exists and status is "running":**

- Store `workflow_id` from response
- Set `resumed = true`
- Check out the existing branch:
  ```bash
  git checkout <existing_branch>
  ```
- Skip to Step 6 (board update)

**If workflow exists but status is "failed" or "completed":**

- Treat as fresh start (will create new workflow)

**If no workflow exists:**

- Continue to Step 3

### Step 3: Generate Branch Name

If `branch_name` not provided:

- Extract short description from issue title (lowercase, hyphenated, max 30 chars)
- Format: `feat/issue-<number>-<short-description>`

Example: Issue "Add user authentication" → `feat/issue-123-add-user-auth`

### Step 4: Create Branch

Check current branch:

```bash
git branch --show-current
```

If not on target branch:

```bash
git checkout -b <branch_name>
```

If branch already exists:

```bash
git checkout <branch_name>
```

### Step 5: Create Checkpoint Workflow

```bash
bun run checkpoint workflow create <issue_number> "<branch_name>"
```

Extract `workflow_id` from JSON response (the `id` field).

Log workflow start:

```bash
bun run checkpoint workflow log-action "<workflow_id>" "workflow_started" "success" '{"issueNumber": <issue_number>, "branch": "<branch_name>"}'
```

### Step 6: Update Board (unless skip_board)

**6a. Get issue node ID:**

```bash
gh issue view <issue_number> --json id -q .id
```

**6b. Add to project board:**

```bash
gh api graphql -f query='
  mutation($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: {
      projectId: $projectId
      contentId: $contentId
    }) { item { id } }
  }' -f projectId="PVT_kwDOB1lz3c4BI2yZ" -f contentId="<issue_node_id>"
```

**6c. Get item ID:**

```bash
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
  }' | jq -r '.data.organization.projectV2.items.nodes[] | select(.content.number == <issue_number>) | .id'
```

**6d. Set status to "In Progress":**

```bash
gh api graphql \
  -f projectId="PVT_kwDOB1lz3c4BI2yZ" \
  -f itemId="<item_id>" \
  -f fieldId="PVTSSF_lADOB1lz3c4BI2yZzg5MUx4" \
  -f optionId="3e320f16" \
  -f query='mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }) { projectV2Item { id } }
  }'
```

**If any board operation fails:** Log warning, continue (non-critical).

### Step 7: Send Notification (unless skip_notify)

Use `mcp__mcp-communicator-telegram__notify_user` to send:

```text
Started: Issue #<number>
Title: <title>
Branch: <branch>
Workflow: <workflow_id>
```

**If notification fails:** Log warning, continue (non-critical).

### Step 8: Return Output

Return structured output:

```json
{
  "workflow_id": "<workflow_id>",
  "branch": "<branch_name>",
  "issue": {
    "number": <number>,
    "title": "<title>",
    "body": "<body>",
    "labels": ["<label1>", "<label2>"]
  },
  "resumed": false
}
```

## Error Handling

| Condition               | Behavior                      |
| ----------------------- | ----------------------------- |
| Issue not found         | Return error, no side effects |
| Branch checkout fails   | Return error with git status  |
| Checkpoint create fails | Return error (critical)       |
| Board update fails      | Warn, continue                |
| Notification fails      | Warn, continue                |

## Example

**Input:**

```json
{
  "issue_number": 487
}
```

**Output:**

```json
{
  "workflow_id": "workflow-487-1736500000000-abc123",
  "branch": "feat/issue-487-agent-architecture",
  "issue": {
    "number": 487,
    "title": "refactor(claude-tools): implement robust agent architecture",
    "body": "## Problem\n\nThe current Claude tools architecture...",
    "labels": ["enhancement", "priority:high"]
  },
  "resumed": false
}
```

## Output Format

After completing all steps, report:

```text
SETUP COMPLETE

Issue: #<number> - <title>
Branch: <branch>
Workflow ID: <workflow_id>
Board: Updated to "In Progress"
Resumed: Yes/No

Ready for next phase.
```
