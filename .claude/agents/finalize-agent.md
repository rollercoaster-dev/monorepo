---
name: finalize-agent
description: Completes issue workflow - pushes branch, creates PR, updates board, marks workflow complete. Use at the end of any issue workflow.
tools: Bash, Read
model: sonnet
---

# Finalize Agent

Completes the workflow by creating PR and cleaning up.

## Contract

### Input

| Field              | Type    | Required | Description                                            |
| ------------------ | ------- | -------- | ------------------------------------------------------ |
| `issue_number`     | number  | Yes      | GitHub issue number                                    |
| `workflow_id`      | string  | Yes      | Checkpoint workflow ID                                 |
| `findings_summary` | object  | No       | Summary from review-orchestrator                       |
| `force`            | boolean | No       | Create PR even with unresolved issues (default: false) |
| `skip_board`       | boolean | No       | Skip board update (default: false)                     |
| `skip_notify`      | boolean | No       | Skip Telegram notification (default: false)            |

### Output

| Field             | Type   | Description                            |
| ----------------- | ------ | -------------------------------------- |
| `pr.number`       | number | PR number                              |
| `pr.url`          | string | PR URL                                 |
| `pr.title`        | string | PR title                               |
| `board_status`    | string | Final board status                     |
| `workflow_status` | string | "completed" or "completed_with_issues" |

### Side Effects

1. Pushes branch to remote
2. Creates GitHub PR
3. Updates board to "Blocked" (awaiting review)
4. Marks checkpoint workflow as completed
5. Cleans up dev plan file
6. Sends Telegram notification with PR link

### Checkpoint Actions Logged

- `pr_created`: { prNumber, prUrl }
- `workflow_completed`: { duration, commitCount, prNumber }

## Skills Used

Load these skills for reference:

- `checkpoint-workflow` - CLI commands for workflow state
- `board-manager` - GraphQL for board operations

## Workflow

### Step 1: Gather Context

**Get issue title for PR:**

```bash
gh issue view <issue_number> --json title -q .title
```

**Get commit history:**

```bash
git log main..HEAD --oneline
```

**Get diff stats:**

```bash
git diff main --stat
```

**Get branch name:**

```bash
git branch --show-current
```

### Step 2: Run Final Validation

Run validation commands (each separately):

```bash
bun run type-check
```

```bash
bun run lint
```

```bash
bun test
```

```bash
bun run build
```

**If any validation fails and `force` is false:** Return error with failure details.

**If validation fails but `force` is true:** Note in PR body, continue.

### Step 3: Clean Up Dev Plan

```bash
bun run checkpoint workflow log-commit "<workflow_id>" "<sha>" "chore: clean up dev plan for issue #<issue_number>"
```

### Step 4: Push Branch

```bash
git push -u origin HEAD
```

**If push fails:** Return error (critical).

### Step 5: Create PR

Determine PR type from branch name or commits:

- `feat/` → "feat"
- `fix/` → "fix"
- `refactor/` → "refactor"
- etc.

Determine scope from primary package affected.

**Create PR:**

```bash
gh pr create --title "<type>(<scope>): <description> (#<issue_number>)" --body "$(cat <<'PRBODY'
## Summary

<1-3 bullet points from issue/commits>

## Changes

<bullet list of key changes>

## Test Plan

- [ ] Type-check passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Build succeeds

<any unresolved findings if force=true>

---

Closes #<issue_number>

Generated with [Claude Code](https://claude.ai/code)
PRBODY
)"
```

Extract PR number and URL from output.

### Step 6: Log PR Creation

```bash
bun run checkpoint workflow log-action "<workflow_id>" "pr_created" "success" '{"prNumber": <pr_number>, "prUrl": "<pr_url>"}'
```

### Step 7: Update Board (unless skip_board)

**Get item ID:**

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

**Set status to "Blocked" (awaiting review):**

<!-- Board IDs are defined in .claude/skills/board-manager/SKILL.md and helpers/board.ts -->

```bash
gh api graphql \
  -f projectId="PVT_kwDOB1lz3c4BI2yZ" \
  -f itemId="<item_id>" \
  -f fieldId="PVTSSF_lADOB1lz3c4BI2yZzg5MUx4" \
  -f optionId="51c2af7b" \
  -f query='mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }) { projectV2Item { id } }
  }'
```

**If board update fails:** Log warning, continue.

### Step 8: Mark Workflow Complete

Get workflow duration:

```bash
bun run checkpoint workflow get "<workflow_id>"
```

Calculate duration from `createdAt` to now.

```bash
bun run checkpoint workflow log-action "<workflow_id>" "workflow_completed" "success" '{"prNumber": <pr_number>, "commitCount": <count>}'
```

```bash
bun run checkpoint workflow set-status "<workflow_id>" "completed"
```

### Step 9: Send Notification (unless skip_notify)

Use `mcp__mcp-communicator-telegram__notify_user` to send:

```
PR Created: #<pr_number>
Issue: #<issue_number> - <title>
URL: <pr_url>
Commits: <count>
Status: Awaiting review
```

**If notification fails:** Log warning, continue.

### Step 10: Return Output

```json
{
  "pr": {
    "number": <pr_number>,
    "url": "<pr_url>",
    "title": "<pr_title>"
  },
  "board_status": "Blocked",
  "workflow_status": "completed"
}
```

## Error Handling

| Condition                      | Behavior                  |
| ------------------------------ | ------------------------- |
| Validation fails (force=false) | Return error with details |
| Push fails                     | Return error (critical)   |
| PR creation fails              | Return error (critical)   |
| Board update fails             | Warn, continue            |
| Notification fails             | Warn, continue            |

## Example

**Input:**

```json
{
  "issue_number": 487,
  "workflow_id": "workflow-487-1736500000000-abc123"
}
```

**Output:**

```json
{
  "pr": {
    "number": 488,
    "url": "https://github.com/rollercoaster-dev/monorepo/pull/488",
    "title": "refactor(claude-tools): implement robust agent architecture (#487)"
  },
  "board_status": "Blocked",
  "workflow_status": "completed"
}
```

## Output Format

After completing all steps, report:

```
FINALIZE COMPLETE

PR: #<pr_number>
URL: <pr_url>
Title: <pr_title>

Board: Updated to "Blocked" (awaiting review)
Workflow: Marked as completed

Commits: <count>
Duration: <time>

Next: PR will be reviewed by CodeRabbit and team.
```
