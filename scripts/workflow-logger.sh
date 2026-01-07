#!/usr/bin/env bash
# Workflow Logger Utility
# Provides logging functions for autonomous agent workflows

set -euo pipefail

# Get the monorepo root directory
get_monorepo_root() {
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "$CLAUDE_PROJECT_DIR"
  else
    git rev-parse --show-toplevel 2>/dev/null || pwd
  fi
}

MONOREPO_ROOT=$(get_monorepo_root)
WORKFLOW_STATE_DIR="${MONOREPO_ROOT}/.claude/workflow-state"

# Ensure jq is available
check_dependencies() {
  if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed" >&2
    echo "Install with: sudo pacman -S jq (Arch) or brew install jq (macOS)" >&2
    return 1
  fi
}

# Get current ISO-8601 timestamp
get_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Initialize new workflow
# Usage: init_workflow <workflow_type> <identifier>
# Returns: workflow_id
init_workflow() {
  local workflow_type=$1  # "auto-milestone" | "auto-issue"
  local identifier=$2     # milestone name or issue number

  check_dependencies || return 1

  # Create workflow ID
  local timestamp
  timestamp=$(date +%s)
  local workflow_id="${workflow_type}-${identifier}"
  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"

  # Create directory structure
  mkdir -p "$workflow_dir"

  # Get current git context
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  local base_commit
  base_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

  # Create initial state file
  local state_file="${workflow_dir}/state.json"
  local start_time
  start_time=$(get_timestamp)

  # Build JSON with jq to ensure proper escaping
  if [[ "$workflow_type" == "auto-issue" ]]; then
    # Try to convert to number, fall back to string if not numeric
    if [[ "$identifier" =~ ^[0-9]+$ ]]; then
      jq -n \
        --arg workflow "$workflow_type" \
        --arg wf_id "$workflow_id" \
        --arg issue_num "$identifier" \
        --arg start "$start_time" \
        --arg branch "$branch" \
        --arg commit "$base_commit" \
        '{
          workflow: $workflow,
          workflow_id: $wf_id,
          issue_number: ($issue_num | tonumber),
          startedAt: $start,
          lastUpdated: $start,
          currentPhase: "init",
          phaseData: {},
          resumeContext: "Workflow initialized but not yet started.",
          resumable: true,
          metadata: {
            branch: $branch,
            baseCommit: $commit
          }
        }' > "$state_file"
    else
      # Non-numeric identifier (e.g., for tests)
      jq -n \
        --arg workflow "$workflow_type" \
        --arg wf_id "$workflow_id" \
        --arg issue_num "$identifier" \
        --arg start "$start_time" \
        --arg branch "$branch" \
        --arg commit "$base_commit" \
        '{
          workflow: $workflow,
          workflow_id: $wf_id,
          issue_number: $issue_num,
          startedAt: $start,
          lastUpdated: $start,
          currentPhase: "init",
          phaseData: {},
          resumeContext: "Workflow initialized but not yet started.",
          resumable: true,
          metadata: {
            branch: $branch,
            baseCommit: $commit
          }
        }' > "$state_file"
    fi
  else
    # For auto-milestone, no issue_number field
    jq -n \
      --arg workflow "$workflow_type" \
      --arg wf_id "$workflow_id" \
      --arg start "$start_time" \
      --arg branch "$branch" \
      --arg commit "$base_commit" \
      '{
        workflow: $workflow,
        workflow_id: $wf_id,
        issue_number: null,
        startedAt: $start,
        lastUpdated: $start,
        currentPhase: "init",
        phaseData: {},
        resumeContext: "Workflow initialized but not yet started.",
        resumable: true,
        metadata: {
          branch: $branch,
          baseCommit: $commit
        }
      }' > "$state_file"
  fi

  # Create audit log with initial event
  log_event "$workflow_id" "workflow.start" "{\"workflow\":\"$workflow_type\",\"identifier\":\"$identifier\"}"

  echo "$workflow_id"
}

# Log workflow event to audit log
# Usage: log_event <workflow_id> <event_type> <metadata_json>
log_event() {
  local workflow_id=$1
  local event_type=$2
  local metadata=${3:-"{}"}

  check_dependencies || return 1

  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"
  local audit_log="${workflow_dir}/audit.jsonl"

  if [[ ! -d "$workflow_dir" ]]; then
    echo "Error: Workflow directory not found: $workflow_dir" >&2
    return 1
  fi

  local timestamp
  timestamp=$(get_timestamp)

  # Create JSONL entry
  local log_entry
  log_entry=$(jq -n \
    --arg ts "$timestamp" \
    --arg event "$event_type" \
    --argjson meta "$metadata" \
    '{timestamp: $ts, event: $event, metadata: $meta}')

  echo "$log_entry" >> "$audit_log"
}

# Update workflow phase
# Usage: update_phase <workflow_id> <phase_name> <phase_data_json>
update_phase() {
  local workflow_id=$1
  local phase_name=$2
  local phase_data=${3:-"{}"}

  check_dependencies || return 1

  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"
  local state_file="${workflow_dir}/state.json"

  if [[ ! -f "$state_file" ]]; then
    echo "Error: State file not found: $state_file" >&2
    return 1
  fi

  local timestamp
  timestamp=$(get_timestamp)

  # Update state file
  local temp_file
  temp_file=$(mktemp)

  jq --arg phase "$phase_name" \
     --argjson data "$phase_data" \
     --arg ts "$timestamp" \
     '.currentPhase = $phase |
      .phaseData[$phase] = $data |
      .lastUpdated = $ts' \
     "$state_file" > "$temp_file"

  mv "$temp_file" "$state_file"

  # Log phase update
  log_event "$workflow_id" "phase.update" "{\"phase\":\"$phase_name\"}"
}

# Set resume context string
# Usage: set_resume_context <workflow_id> <context_string>
set_resume_context() {
  local workflow_id=$1
  local context=$2

  check_dependencies || return 1

  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"
  local state_file="${workflow_dir}/state.json"

  if [[ ! -f "$state_file" ]]; then
    echo "Error: State file not found: $state_file" >&2
    return 1
  fi

  local timestamp
  timestamp=$(get_timestamp)

  # Update resume context
  local temp_file
  temp_file=$(mktemp)

  jq --arg ctx "$context" \
     --arg ts "$timestamp" \
     '.resumeContext = $ctx |
      .lastUpdated = $ts' \
     "$state_file" > "$temp_file"

  mv "$temp_file" "$state_file"
}

# Get workflow state
# Usage: get_workflow_state <workflow_id>
# Returns: JSON state on stdout
get_workflow_state() {
  local workflow_id=$1

  check_dependencies || return 1

  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"
  local state_file="${workflow_dir}/state.json"

  if [[ ! -f "$state_file" ]]; then
    echo "Error: State file not found: $state_file" >&2
    return 1
  fi

  cat "$state_file"
}

# Mark workflow as non-resumable
# Usage: mark_non_resumable <workflow_id>
mark_non_resumable() {
  local workflow_id=$1

  check_dependencies || return 1

  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"
  local state_file="${workflow_dir}/state.json"

  if [[ ! -f "$state_file" ]]; then
    echo "Error: State file not found: $state_file" >&2
    return 1
  fi

  local temp_file
  temp_file=$(mktemp)

  jq '.resumable = false' "$state_file" > "$temp_file"
  mv "$temp_file" "$state_file"
}

# Archive completed workflow
# Usage: archive_workflow <workflow_id>
archive_workflow() {
  local workflow_id=$1
  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"
  local archive_dir="${WORKFLOW_STATE_DIR}/archive"

  if [[ ! -d "$workflow_dir" ]]; then
    echo "Error: Workflow directory not found: $workflow_dir" >&2
    return 1
  fi

  # Create archive directory
  mkdir -p "$archive_dir"

  # Move workflow to archive
  mv "$workflow_dir" "$archive_dir/"

  echo "Archived workflow: $workflow_id"
}

# Cleanup workflow (delete)
# Usage: cleanup_workflow <workflow_id>
cleanup_workflow() {
  local workflow_id=$1
  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"

  if [[ ! -d "$workflow_dir" ]]; then
    echo "Warning: Workflow directory not found: $workflow_dir" >&2
    return 0
  fi

  rm -rf "$workflow_dir"
  echo "Deleted workflow: $workflow_id"
}

# Cleanup old archived logs
# Usage: cleanup_old_logs [days]
cleanup_old_logs() {
  local days=${1:-30}
  local archive_dir="${WORKFLOW_STATE_DIR}/archive"

  if [[ ! -d "$archive_dir" ]]; then
    echo "No archived logs found"
    return 0
  fi

  local deleted=0

  # Find and delete directories older than N days
  while IFS= read -r -d '' dir; do
    if [[ -d "$dir" ]]; then
      rm -rf "$dir"
      ((deleted++))
    fi
  done < <(find "$archive_dir" -maxdepth 1 -type d -mtime +"$days" -print0)

  echo "Deleted $deleted archived workflow(s) older than $days days"
}

# List all workflows
# Usage: list_workflows
list_workflows() {
  check_dependencies || return 1

  echo "=== Active Workflows ==="

  local active_count=0
  for dir in "$WORKFLOW_STATE_DIR"/*; do
    if [[ -d "$dir" && "$dir" != *"/archive" && -f "$dir/state.json" ]]; then
      local workflow_id
      workflow_id=$(basename "$dir")
      local state
      state=$(cat "$dir/state.json")

      local workflow_type
      workflow_type=$(echo "$state" | jq -r '.workflow')
      local current_phase
      current_phase=$(echo "$state" | jq -r '.currentPhase')
      local started_at
      started_at=$(echo "$state" | jq -r '.startedAt')
      local resumable
      resumable=$(echo "$state" | jq -r '.resumable')

      echo "  $workflow_id"
      echo "    Type: $workflow_type"
      echo "    Phase: $current_phase"
      echo "    Started: $started_at"
      echo "    Resumable: $resumable"
      echo ""

      ((active_count++))
    fi
  done

  if [[ $active_count -eq 0 ]]; then
    echo "  (none)"
  fi

  echo ""
  echo "=== Archived Workflows ==="

  local archive_dir="${WORKFLOW_STATE_DIR}/archive"
  local archived_count=0

  if [[ -d "$archive_dir" ]]; then
    for dir in "$archive_dir"/*; do
      if [[ -d "$dir" && -f "$dir/state.json" ]]; then
        local workflow_id
        workflow_id=$(basename "$dir")
        local state
        state=$(cat "$dir/state.json")

        local workflow_type
        workflow_type=$(echo "$state" | jq -r '.workflow')
        local started_at
        started_at=$(echo "$state" | jq -r '.startedAt')

        echo "  $workflow_id ($workflow_type, started $started_at)"
        ((archived_count++))
      fi
    done
  fi

  if [[ $archived_count -eq 0 ]]; then
    echo "  (none)"
  fi

  echo ""
  echo "Total: $active_count active, $archived_count archived"
}

# Helper: Log phase start
log_phase_start() {
  local workflow_id=$1
  local phase=$2
  log_event "$workflow_id" "phase.start" "{\"phase\":\"$phase\"}"
  update_phase "$workflow_id" "$phase" '{"started":true}'
}

# Helper: Log phase complete
log_phase_complete() {
  local workflow_id=$1
  local phase=$2
  local metadata=${3:-"{}"}
  log_event "$workflow_id" "phase.complete" "{\"phase\":\"$phase\",\"metadata\":$metadata}"

  # Update phase data to mark as completed
  local current_data
  current_data=$(get_workflow_state "$workflow_id" | jq ".phaseData.${phase}")
  local updated_data
  updated_data=$(echo "$current_data" | jq '. + {completed: true}')
  update_phase "$workflow_id" "$phase" "$updated_data"
}

# Helper: Log agent spawn
log_agent_spawn() {
  local workflow_id=$1
  local agent=$2
  local metadata=${3:-"{}"}
  log_event "$workflow_id" "agent.spawn" "{\"agent\":\"$agent\",\"metadata\":$metadata}"
}

# Helper: Log commit created
log_commit() {
  local workflow_id=$1
  local sha=$2
  local message=$3
  local metadata=${4:-"{}"}
  log_event "$workflow_id" "commit.created" "{\"sha\":\"$sha\",\"message\":\"$message\",\"metadata\":$metadata}"
}

# Helper: Log PR created
log_pr_created() {
  local workflow_id=$1
  local pr_number=$2
  local pr_url=$3
  log_event "$workflow_id" "pr.created" "{\"number\":$pr_number,\"url\":\"$pr_url\"}"
}

# Helper: Log escalation
log_escalation() {
  local workflow_id=$1
  local reason=$2
  local metadata=${3:-"{}"}
  log_event "$workflow_id" "escalation" "{\"reason\":\"$reason\",\"metadata\":$metadata}"
}

# Helper: Log workflow success
log_workflow_success() {
  local workflow_id=$1
  local metadata=${2:-"{}"}
  log_event "$workflow_id" "workflow.success" "$metadata"
  mark_non_resumable "$workflow_id"
}

# Helper: Log workflow abort
log_workflow_abort() {
  local workflow_id=$1
  local reason=$2
  log_event "$workflow_id" "workflow.abort" "{\"reason\":\"$reason\"}"
  mark_non_resumable "$workflow_id"
}

# Functions are available when sourced
# No export needed - functions are available in the sourcing shell
