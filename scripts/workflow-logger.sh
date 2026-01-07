#!/usr/bin/env bash
# Workflow Logger Utility
# Provides logging functions for autonomous agent workflows
#
# NOTE: When sourced, this library does NOT alter caller shell options.
# If you want strict mode, enable it in your script before sourcing:
#   set -euo pipefail
#   source scripts/workflow-logger.sh

# Only enable strict mode if running as standalone (not sourced)
if [[ "${WORKFLOW_LOGGER_STRICT:-}" == "1" ]] || [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -euo pipefail
fi

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

  # Sanitize identifier to prevent directory traversal
  # Only allow alphanumeric, underscore, and hyphen characters
  local safe_identifier
  safe_identifier=$(echo "$identifier" | tr -cd '[:alnum:]_-')

  if [[ -z "$safe_identifier" ]]; then
    echo "Error: Invalid identifier '$identifier' - must contain alphanumeric, underscore, or hyphen characters" >&2
    return 1
  fi

  # Additional check: ensure it doesn't contain path separators or start with dot
  if [[ "$safe_identifier" =~ ^\. ]] || [[ "$safe_identifier" =~ \.\. ]] || [[ "$safe_identifier" =~ / ]]; then
    echo "Error: Invalid identifier '$identifier' - cannot contain path separators or start with dot" >&2
    return 1
  fi

  # Create workflow ID
  local timestamp
  timestamp=$(date +%s)
  local workflow_id="${workflow_type}-${safe_identifier}"
  local workflow_dir="${WORKFLOW_STATE_DIR}/${workflow_id}"

  # Create directory structure
  if ! mkdir -p "$workflow_dir"; then
    echo "Error: Failed to create workflow directory: $workflow_dir" >&2
    return 1
  fi

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
  local temp_file
  temp_file=$(mktemp)

  if [[ "$workflow_type" == "auto-issue" ]]; then
    # Try to convert to number, fall back to string if not numeric
    if [[ "$safe_identifier" =~ ^[0-9]+$ ]]; then
      if ! jq -n \
        --arg workflow "$workflow_type" \
        --arg wf_id "$workflow_id" \
        --arg issue_num "$safe_identifier" \
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
        }' > "$temp_file"; then
        rm -f "$temp_file"
        echo "Error: Failed to create initial state file" >&2
        return 1
      fi
    else
      # Non-numeric identifier (e.g., for tests)
      if ! jq -n \
        --arg workflow "$workflow_type" \
        --arg wf_id "$workflow_id" \
        --arg issue_num "$safe_identifier" \
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
        }' > "$temp_file"; then
        rm -f "$temp_file"
        echo "Error: Failed to create initial state file" >&2
        return 1
      fi
    fi
  else
    # For auto-milestone, no issue_number field
    if ! jq -n \
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
      }' > "$temp_file"; then
      rm -f "$temp_file"
      echo "Error: Failed to create initial state file" >&2
      return 1
    fi
  fi

  # Validate the output is valid JSON
  if ! jq empty "$temp_file" 2>/dev/null; then
    rm -f "$temp_file"
    echo "Error: Generated invalid JSON for state file" >&2
    return 1
  fi

  mv "$temp_file" "$state_file"

  # Create audit log with initial event using jq for proper escaping
  local metadata_json
  metadata_json=$(jq -n \
    --arg wf "$workflow_type" \
    --arg id "$identifier" \
    '{workflow: $wf, identifier: $id}')

  log_event "$workflow_id" "workflow.start" "$metadata_json"

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
  if ! log_entry=$(jq -n \
    --arg ts "$timestamp" \
    --arg event "$event_type" \
    --argjson meta "$metadata" \
    '{timestamp: $ts, event: $event, metadata: $meta}'); then
    echo "Error: Failed to create log entry for event '$event_type'" >&2
    return 1
  fi

  if [[ -z "$log_entry" ]]; then
    echo "Error: Empty log entry for event '$event_type'" >&2
    return 1
  fi

  if ! echo "$log_entry" >> "$audit_log"; then
    echo "Error: Failed to append to audit log: $audit_log" >&2
    return 1
  fi
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

  if ! jq --arg phase "$phase_name" \
     --argjson data "$phase_data" \
     --arg ts "$timestamp" \
     '.currentPhase = $phase |
      .phaseData[$phase] = $data |
      .lastUpdated = $ts' \
     "$state_file" > "$temp_file"; then
    rm -f "$temp_file"
    echo "Error: Failed to update phase in state file" >&2
    return 1
  fi

  # Validate the output is valid JSON
  if ! jq empty "$temp_file" 2>/dev/null; then
    rm -f "$temp_file"
    echo "Error: Generated invalid JSON when updating phase" >&2
    return 1
  fi

  mv "$temp_file" "$state_file"

  # Log phase update using jq for proper escaping
  local metadata_json
  metadata_json=$(jq -n --arg phase "$phase_name" '{phase: $phase}')
  log_event "$workflow_id" "phase.update" "$metadata_json"
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

  if ! jq --arg ctx "$context" \
     --arg ts "$timestamp" \
     '.resumeContext = $ctx |
      .lastUpdated = $ts' \
     "$state_file" > "$temp_file"; then
    rm -f "$temp_file"
    echo "Error: Failed to update resume context" >&2
    return 1
  fi

  # Validate the output is valid JSON
  if ! jq empty "$temp_file" 2>/dev/null; then
    rm -f "$temp_file"
    echo "Error: Generated invalid JSON when updating resume context" >&2
    return 1
  fi

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

  if ! jq '.resumable = false' "$state_file" > "$temp_file"; then
    rm -f "$temp_file"
    echo "Error: Failed to mark workflow as non-resumable" >&2
    return 1
  fi

  # Validate the output is valid JSON
  if ! jq empty "$temp_file" 2>/dev/null; then
    rm -f "$temp_file"
    echo "Error: Generated invalid JSON when marking non-resumable" >&2
    return 1
  fi

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
  if ! mkdir -p "$archive_dir"; then
    echo "Error: Failed to create archive directory: $archive_dir" >&2
    return 1
  fi

  # Move workflow to archive
  if ! mv "$workflow_dir" "$archive_dir/"; then
    echo "Error: Failed to move workflow to archive" >&2
    return 1
  fi

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

  if ! rm -rf "$workflow_dir"; then
    echo "Error: Failed to delete workflow directory: $workflow_dir" >&2
    return 1
  fi

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

  # Enable nullglob to handle empty directories gracefully
  shopt -s nullglob

  echo "=== Active Workflows ==="

  local active_count=0
  for dir in "$WORKFLOW_STATE_DIR"/*; do
    if [[ -d "$dir" && "$dir" != *"/archive" && -f "$dir/state.json" ]]; then
      local workflow_id
      workflow_id=$(basename "$dir")

      # Handle race condition: file could be deleted between check and read
      local state
      if ! state=$(cat "$dir/state.json" 2>/dev/null); then
        # File disappeared, skip silently
        continue
      fi

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

        # Handle race condition: file could be deleted between check and read
        local state
        if ! state=$(cat "$dir/state.json" 2>/dev/null); then
          continue
        fi

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

  # Restore default glob behavior
  shopt -u nullglob
}

# Helper: Log phase start
log_phase_start() {
  local workflow_id=$1
  local phase=$2
  local metadata_json
  metadata_json=$(jq -n --arg phase "$phase" '{phase: $phase}')
  log_event "$workflow_id" "phase.start" "$metadata_json"
  update_phase "$workflow_id" "$phase" '{"started":true}'
}

# Helper: Log phase complete
log_phase_complete() {
  local workflow_id=$1
  local phase=$2
  local metadata=${3:-"{}"}

  # Create metadata JSON using jq for proper escaping
  local event_metadata
  event_metadata=$(jq -n \
    --arg phase "$phase" \
    --argjson meta "$metadata" \
    '{phase: $phase, metadata: $meta}')
  log_event "$workflow_id" "phase.complete" "$event_metadata"

  # Update phase data to mark as completed
  local current_data
  if ! current_data=$(get_workflow_state "$workflow_id" | jq ".phaseData.\"${phase}\" // {}"); then
    echo "Error: Failed to get current phase data for $workflow_id" >&2
    return 1
  fi
  local updated_data
  updated_data=$(echo "$current_data" | jq '. + {completed: true}')
  update_phase "$workflow_id" "$phase" "$updated_data"
}

# Helper: Log agent spawn
log_agent_spawn() {
  local workflow_id=$1
  local agent=$2
  local metadata=${3:-"{}"}

  local event_metadata
  event_metadata=$(jq -n \
    --arg agent "$agent" \
    --argjson meta "$metadata" \
    '{agent: $agent, metadata: $meta}')
  log_event "$workflow_id" "agent.spawn" "$event_metadata"
}

# Helper: Log commit created
log_commit() {
  local workflow_id=$1
  local sha=$2
  local message=$3
  local metadata=${4:-"{}"}

  # Validate SHA is a valid git hash (7-40 hex characters)
  if ! [[ "$sha" =~ ^[a-f0-9]{7,40}$ ]]; then
    echo "Error: Invalid commit SHA: $sha" >&2
    return 1
  fi

  local event_metadata
  event_metadata=$(jq -n \
    --arg sha "$sha" \
    --arg msg "$message" \
    --argjson meta "$metadata" \
    '{sha: $sha, message: $msg, metadata: $meta}')
  log_event "$workflow_id" "commit.created" "$event_metadata"
}

# Helper: Log PR created
log_pr_created() {
  local workflow_id=$1
  local pr_number=$2
  local pr_url=$3

  # Validate PR number is numeric
  if ! [[ "$pr_number" =~ ^[0-9]+$ ]]; then
    echo "Error: Invalid PR number: $pr_number" >&2
    return 1
  fi

  local event_metadata
  event_metadata=$(jq -n \
    --argjson num "$pr_number" \
    --arg url "$pr_url" \
    '{number: $num, url: $url}')
  log_event "$workflow_id" "pr.created" "$event_metadata"
}

# Helper: Log escalation
log_escalation() {
  local workflow_id=$1
  local reason=$2
  local metadata=${3:-"{}"}

  local event_metadata
  event_metadata=$(jq -n \
    --arg reason "$reason" \
    --argjson meta "$metadata" \
    '{reason: $reason, metadata: $meta}')
  log_event "$workflow_id" "escalation" "$event_metadata"
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

  local event_metadata
  event_metadata=$(jq -n --arg reason "$reason" '{reason: $reason}')
  log_event "$workflow_id" "workflow.abort" "$event_metadata"
  mark_non_resumable "$workflow_id"
}

# Functions are available when sourced
# No export needed - functions are available in the sourcing shell
