# /resume-workflow

Check for existing workflow state files and display resume context.

This command helps you resume workflows after:

- Session timeouts
- Token limit hits
- Manual interruptions
- Network failures

---

## Usage

```bash
/resume-workflow              # Check for any resumable workflows
/resume-workflow auto-issue   # Check for specific workflow type
```

---

## What This Does

1. Scans `.claude/workflow-state/` for workflow state files
2. Filters for resumable workflows (resumable: true)
3. Displays workflow status and resume context
4. Suggests next steps to continue

---

## Implementation

```bash
# Source workflow logger
source scripts/workflow-logger.sh

# Get workflow type filter (optional)
WORKFLOW_FILTER="${ARGUMENTS:-}"

echo "=== Resumable Workflows ==="
echo ""

FOUND_WORKFLOWS=0

# Check for active workflows
for state_file in .claude/workflow-state/*/state.json; do
  if [[ ! -f "$state_file" ]]; then
    continue
  fi

  # Parse state
  WORKFLOW_STATE=$(cat "$state_file")
  RESUMABLE=$(echo "$WORKFLOW_STATE" | jq -r '.resumable')
  WORKFLOW_TYPE=$(echo "$WORKFLOW_STATE" | jq -r '.workflow')
  WORKFLOW_ID=$(echo "$WORKFLOW_STATE" | jq -r '.workflow_id')

  # Skip if not resumable
  if [[ "$RESUMABLE" != "true" ]]; then
    continue
  fi

  # Skip if filter doesn't match
  if [[ -n "$WORKFLOW_FILTER" && "$WORKFLOW_TYPE" != "$WORKFLOW_FILTER" ]]; then
    continue
  fi

  # Extract details
  ISSUE_NUMBER=$(echo "$WORKFLOW_STATE" | jq -r '.issue_number')
  STARTED_AT=$(echo "$WORKFLOW_STATE" | jq -r '.startedAt')
  LAST_UPDATED=$(echo "$WORKFLOW_STATE" | jq -r '.lastUpdated')
  CURRENT_PHASE=$(echo "$WORKFLOW_STATE" | jq -r '.currentPhase')
  RESUME_CONTEXT=$(echo "$WORKFLOW_STATE" | jq -r '.resumeContext')
  BRANCH=$(echo "$WORKFLOW_STATE" | jq -r '.metadata.branch')

  # Calculate time elapsed (portable: works on both GNU and BSD/macOS)
  # Try GNU date first, fall back to python3 for BSD/macOS
  if LAST_TIMESTAMP=$(date -d "$LAST_UPDATED" +%s 2>/dev/null); then
    : # GNU date worked
  elif command -v python3 &>/dev/null; then
    LAST_TIMESTAMP=$(python3 -c "from datetime import datetime; print(int(datetime.fromisoformat('$LAST_UPDATED'.replace('Z','+00:00')).timestamp()))" 2>/dev/null || echo "0")
  else
    LAST_TIMESTAMP=0
  fi
  NOW_TIMESTAMP=$(date +%s)
  ELAPSED_SECONDS=$((NOW_TIMESTAMP - LAST_TIMESTAMP))
  ELAPSED_MINUTES=$((ELAPSED_SECONDS / 60))

  # Display workflow info
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Workflow: $WORKFLOW_ID"
  echo "Type: $WORKFLOW_TYPE"
  if [[ "$ISSUE_NUMBER" != "null" ]]; then
    echo "Issue: #$ISSUE_NUMBER"
  fi
  echo "Started: $STARTED_AT"
  echo "Last updated: $LAST_UPDATED ($ELAPSED_MINUTES minutes ago)"
  echo "Current phase: $CURRENT_PHASE"
  if [[ "$BRANCH" != "null" ]]; then
    echo "Branch: $BRANCH"
  fi
  echo ""
  echo "Resume context:"
  echo "  $RESUME_CONTEXT"
  echo ""
  echo "To resume:"
  echo "  1. Review state: cat .claude/workflow-state/$WORKFLOW_ID/state.json | jq"
  echo "  2. Check audit log: cat .claude/workflow-state/$WORKFLOW_ID/audit.jsonl"
  if [[ "$WORKFLOW_TYPE" == "auto-issue" ]]; then
    echo "  3. Continue work: /auto-issue $ISSUE_NUMBER (or manual implementation)"
  elif [[ "$WORKFLOW_TYPE" == "auto-milestone" ]]; then
    echo "  3. Continue work: /auto-milestone \"<milestone-name>\" (workflow will detect and continue)"
  fi
  echo ""

  ((FOUND_WORKFLOWS++))
done

if [[ $FOUND_WORKFLOWS -eq 0 ]]; then
  echo "No resumable workflows found."
  echo ""
  echo "Workflows are marked as non-resumable when:"
  echo "  - Successfully completed (archived)"
  echo "  - Explicitly aborted"
  echo "  - Dry-run completed"
  echo ""
  echo "Check archived workflows:"
  echo "  ls .claude/workflow-state/archive/"
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Found $FOUND_WORKFLOWS resumable workflow(s)"
fi

echo ""
echo "To view all workflows (including archived):"
echo "  source scripts/workflow-logger.sh && list_workflows"
```

---

## Example Output

```
=== Resumable Workflows ===

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Workflow: auto-issue-338
Type: auto-issue
Issue: #338
Started: 2026-01-07T10:00:00Z
Last updated: 2026-01-07T10:45:00Z (15 minutes ago)
Current phase: implement
Branch: feat/issue-338-workflow-logging

Resume context:
  Issue #338 was being implemented. Phase 'implement' was in
  progress with 3 commits made (last: abc123). The dev plan
  is at .claude/dev-plans/issue-338.md. Resume by checking
  git log and continuing from Step 4 of the plan.

To resume:
  1. Review state: cat .claude/workflow-state/auto-issue-338/state.json | jq
  2. Check audit log: cat .claude/workflow-state/auto-issue-338/audit.jsonl
  3. Continue work: /auto-issue 338 (or manual implementation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 1 resumable workflow(s)

To view all workflows (including archived):
  source scripts/workflow-logger.sh && list_workflows
```

---

## Workflow Types

| Workflow Type    | Resume Method                        |
| ---------------- | ------------------------------------ |
| `auto-issue`     | `/auto-issue <issue-number>`         |
| `auto-milestone` | `/auto-milestone "<milestone-name>"` |

Both workflows will detect existing state and can continue from where they left off.

---

## State File Structure

Each workflow has:

```
.claude/workflow-state/<workflow-id>/
├── state.json          # Current checkpoint
└── audit.jsonl         # Event log (append-only)
```

See `.claude/workflow-state/README.md` for detailed schema documentation.

---

## Cleanup

To manually clean up old workflows:

```bash
# Archive a completed workflow
source scripts/workflow-logger.sh
archive_workflow "auto-issue-338"

# Delete old archived logs (30 days default)
cleanup_old_logs 30

# View all workflows
list_workflows
```

---

## Related Commands

- `/auto-issue` - Autonomous issue-to-PR workflow
- `/auto-milestone` - Autonomous milestone-to-PRs workflow
- See `.claude/workflow-state/README.md` for detailed documentation
