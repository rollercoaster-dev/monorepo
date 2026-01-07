# Workflow State Files

This directory contains workflow state files for autonomous agent workflows (`/auto-milestone`, `/auto-issue`).

## Purpose

Workflow state files enable session resumption after:

- Session timeouts
- Token limit hits
- Manual interruptions
- Network failures

They provide:

1. **Fine-grained action logging** - What each agent did and when
2. **Structured workflow event tracking** - Phase transitions, spawned agents, commits
3. **Resume context for LLM** - Human-readable prompts to continue work
4. **Audit trail** - Complete record of autonomous operations

## File Structure

Each workflow creates a directory:

```text
.claude/workflow-state/
├── auto-issue-338/
│   ├── state.json          # Current workflow state (checkpointed)
│   └── audit.jsonl         # Event log (append-only)
├── auto-milestone-ob3-phase1/
│   ├── state.json
│   └── audit.jsonl
└── archive/                # Completed workflows (moved on success)
    └── auto-issue-337/
        ├── state.json
        └── audit.jsonl
```

## State File Schema

`state.json` contains the current workflow checkpoint:

```json
{
  "workflow": "auto-milestone | auto-issue",
  "workflow_id": "unique-id",
  "issue_number": 338,
  "startedAt": "ISO-8601 timestamp",
  "lastUpdated": "ISO-8601 timestamp",
  "currentPhase": "research | implement | review | finalize",
  "phaseData": {
    "research": {"completed": true, "planPath": "..."},
    "implement": {"commits": 3, "lastCommit": "abc123"},
    "review": {"findings": [...], "fixAttempts": 2},
    "finalize": {"prNumber": 145, "status": "created"}
  },
  "resumeContext": "Human-readable string for LLM prompt",
  "resumable": true,
  "metadata": {
    "branch": "feat/issue-338-...",
    "baseCommit": "def456"
  }
}
```

### Fields

- **workflow**: Workflow type (`auto-milestone` or `auto-issue`)
- **workflow_id**: Unique identifier (timestamp + issue/milestone)
- **issue_number**: GitHub issue number (for `auto-issue`)
- **startedAt**: ISO-8601 timestamp of workflow start
- **lastUpdated**: ISO-8601 timestamp of last state update
- **currentPhase**: Current phase name
- **phaseData**: Phase-specific data (nested object)
- **resumeContext**: LLM-friendly resume prompt (string)
- **resumable**: Whether workflow can be resumed (boolean)
- **metadata**: Additional context (branch, base commit, etc.)

## Audit Log Schema

`audit.jsonl` contains append-only event log (one JSON object per line):

```jsonl
{"timestamp":"2026-01-07T10:00:00Z","event":"workflow.start","workflow":"auto-issue","issue":338,"metadata":{}}
{"timestamp":"2026-01-07T10:01:00Z","event":"phase.start","phase":"research","metadata":{}}
{"timestamp":"2026-01-07T10:05:00Z","event":"agent.spawn","agent":"issue-researcher","metadata":{}}
{"timestamp":"2026-01-07T10:10:00Z","event":"phase.complete","phase":"research","metadata":{"planPath":".claude/dev-plans/issue-338.md"}}
{"timestamp":"2026-01-07T10:15:00Z","event":"commit.created","sha":"abc123","message":"feat(dx): add schema","metadata":{}}
```

### Event Types

| Event Type         | Description                     | Metadata                      |
| ------------------ | ------------------------------- | ----------------------------- |
| `workflow.start`   | Workflow initiated              | `{workflow, issue/milestone}` |
| `phase.start`      | Phase started                   | `{phase}`                     |
| `phase.complete`   | Phase finished                  | `{phase, ...}`                |
| `agent.spawn`      | Subagent spawned                | `{agent}`                     |
| `agent.complete`   | Subagent finished               | `{agent, status}`             |
| `commit.created`   | Git commit made                 | `{sha, message}`              |
| `pr.created`       | Pull request created            | `{number, url}`               |
| `pr.merged`        | Pull request merged             | `{number, issue}`             |
| `review.finding`   | Review issue found              | `{severity, message}`         |
| `fix.attempt`      | Auto-fix attempted              | `{finding, attempt, success}` |
| `escalation`       | Manual intervention needed      | `{reason, unresolved}`        |
| `workflow.pause`   | Workflow paused by user         | `{reason}`                    |
| `workflow.resume`  | Workflow resumed                | `{fromPhase}`                 |
| `workflow.abort`   | Workflow aborted                | `{reason}`                    |
| `workflow.success` | Workflow completed successfully | `{prNumber, ...}`             |

## Workflow Lifecycle

### 1. Initialize

```bash
workflow_id=$(init_workflow "auto-issue" "338")
# Creates .claude/workflow-state/auto-issue-338/
# Creates state.json with initial data
```

### 2. Log Events

```bash
log_event "$workflow_id" "phase.start" '{"phase":"research"}'
log_event "$workflow_id" "commit.created" '{"sha":"abc123","message":"..."}'
```

### 3. Update Phase

```bash
update_phase "$workflow_id" "implement" '{"commits":3,"lastCommit":"abc123"}'
# Updates state.json currentPhase and phaseData
```

### 4. Set Resume Context

```bash
set_resume_context "$workflow_id" "Issue #338 was being implemented. Phase 'implement' was in progress with 3 commits made (last: abc123). Resume by checking git log and continuing from Step 4 of the plan."
```

### 5. Archive or Cleanup

```bash
# On success
archive_workflow "$workflow_id"
# Moves to .claude/workflow-state/archive/

# On abort or cleanup
cleanup_workflow "$workflow_id"
# Deletes the workflow state
```

## Relationship to `.worktrees/.state.json`

The workflow state files are **complementary** to `.worktrees/.state.json`:

| Feature            | Workflow State           | Worktree State         |
| ------------------ | ------------------------ | ---------------------- |
| **Scope**          | Single workflow run      | Entire milestone       |
| **Granularity**    | Per-event, per-phase     | Checkpoint-level       |
| **Purpose**        | Audit trail + resume     | Worktree coordination  |
| **Format**         | JSON + JSONL             | JSON                   |
| **Used by**        | All autonomous workflows | `/auto-milestone` only |
| **Resume context** | Human-readable string    | Structured data        |
| **Event history**  | Full audit log           | None                   |

**Use both** for complete resumption:

- Workflow state → What was the agent doing?
- Worktree state → What's the status of each issue/PR?

## Resuming a Workflow

### Manual Resume

1. Check for existing workflows:

```bash
/resume-workflow
```

2. Read the state:

```bash
cat .claude/workflow-state/auto-issue-338/state.json | jq
```

3. Continue work based on `resumeContext`

### Automatic Resume (Future Enhancement)

In the future, workflows may auto-detect and resume from state files.

## Git Handling

Workflow state files are **gitignored** by default:

```gitignore
.claude/workflow-state/*/
```

This prevents:

- Cluttering git history with ephemeral logs
- Accidentally committing sensitive data in logs
- Merge conflicts from parallel workflows

**You can commit logs manually** if needed for debugging:

```bash
git add .claude/workflow-state/auto-issue-338/ -f
git commit -m "debug: add workflow logs for issue #338"
```

## Security Considerations

**Warning**: Workflow logs may contain sensitive data:

- API keys in error messages
- Database connection strings
- User tokens from git operations
- Internal URLs and paths

**Best practices**:

1. Audit logs before sharing
2. Use `.gitignore` (included by default)
3. Clean up logs after workflow completes
4. Redact sensitive data if committing logs

## Cleanup and Archival

### Archive Completed Workflows

```bash
archive_workflow "auto-issue-338"
# Moves to .claude/workflow-state/archive/
```

### Delete Old Archived Logs

```bash
cleanup_old_logs 30  # Delete logs older than 30 days
```

### List All Workflows

```bash
list_workflows
# Shows active and archived workflows with status
```

## Utilities

Workflow logging utilities are provided in `scripts/workflow-logger.sh`:

- `init_workflow` - Initialize new workflow
- `log_event` - Append to audit log
- `update_phase` - Update current phase
- `set_resume_context` - Update resume prompt
- `get_workflow_state` - Read current state
- `archive_workflow` - Move to archive
- `cleanup_workflow` - Delete workflow state
- `cleanup_old_logs` - Delete old archived logs
- `list_workflows` - Show all workflows

## Examples

See `.claude/templates/` for example files:

- `workflow-state.json` - Example state file
- `audit-log.jsonl` - Example audit log

## Future Enhancements

- Web-based viewer for workflow logs (issue #339)
- Integration with Langfuse for observability
- MCP Memory Keeper integration for cross-session context
- Automatic cleanup cron job
- Workflow metrics and analytics
