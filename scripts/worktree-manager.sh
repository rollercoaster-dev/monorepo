#!/usr/bin/env bash
#
# Worktree Manager for /auto-milestone
# Manages git worktrees for parallel issue development
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREE_BASE="$REPO_ROOT/.worktrees"
STATE_FILE="$WORKTREE_BASE/.state.json"
CHECKPOINT_VERSION="1.0"

# Claude Knowledge CLI for state management
CLI_CMD="bun $REPO_ROOT/packages/claude-knowledge/src/cli.ts"
MILESTONE_ID_FILE="$WORKTREE_BASE/.milestone_id"

# Default timeouts and retry settings
CI_POLL_TIMEOUT=${CI_POLL_TIMEOUT:-1800}  # 30 minutes
CI_POLL_INTERVAL=${CI_POLL_INTERVAL:-30}  # 30 seconds base interval

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#------------------------------------------------------------------------------
# Helper Functions
# log_info prints an informational message prefixed with `[worktree]` in blue.

log_info() { echo -e "${BLUE}[worktree]${NC} $1"; }
# log_success prints MESSAGE to stdout prefixed with "[worktree]" in green.
log_success() { echo -e "${GREEN}[worktree]${NC} $1"; }
# log_warn prints a warning message prefixed with [worktree] in yellow.
log_warn() { echo -e "${YELLOW}[worktree]${NC} $1"; }
# log_error prints an error message prefixed with "[worktree]" in red.
log_error() { echo -e "${RED}[worktree]${NC} $1"; }

#------------------------------------------------------------------------------
# CLI Helper Functions

# cli_call executes a CLI command with error handling and logging
cli_call() {
  local output
  if ! output=$($CLI_CMD "$@" 2>&1); then
    log_error "CLI command failed: $CLI_CMD $*"
    log_error "Error: $output"
    return 1
  fi
  echo "$output"
}

# get_milestone_id retrieves the cached milestone ID from file
get_milestone_id() {
  if [[ -f "$MILESTONE_ID_FILE" ]]; then
    cat "$MILESTONE_ID_FILE"
  else
    log_error "No milestone ID found. Run preflight first."
    exit 1
  fi
}

# get_or_create_milestone finds or creates a milestone and caches its ID
get_or_create_milestone() {
  local milestone_name=$1
  local github_number=${2:-""}

  # Try to find existing milestone
  local result
  result=$(cli_call milestone find "$milestone_name" 2>/dev/null || echo '{}')
  local milestone_id
  milestone_id=$(echo "$result" | jq -r '.milestone.id // empty')

  if [[ -z "$milestone_id" ]]; then
    # Create new milestone
    log_info "Creating milestone: $milestone_name"
    if [[ -n "$github_number" ]]; then
      result=$(cli_call milestone create "$milestone_name" "$github_number")
    else
      result=$(cli_call milestone create "$milestone_name")
    fi
    milestone_id=$(echo "$result" | jq -r '.milestone.id')
  else
    log_info "Found existing milestone: $milestone_name (ID: $milestone_id)"
  fi

  # Cache the milestone ID
  echo "$milestone_id" > "$MILESTONE_ID_FILE"
  echo "$milestone_id"
}

#------------------------------------------------------------------------------
# Prerequisite Checks

# check_prerequisites verifies that required CLI tools (git, gh, jq, bun) are available.
# Exits with error if any are missing.
check_prerequisites() {
  local missing=()

  for cmd in git gh jq bun; do
    if ! command -v "$cmd" &> /dev/null; then
      missing+=("$cmd")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Missing required commands: ${missing[*]}"
    log_error "Please install missing dependencies and try again"
    exit 1
  fi
}

# ensure_base_dir ensures the worktree base directory exists and initializes the state file if missing.
# If created, writes an initial '{"worktrees":{}}' object to $STATE_FILE.
ensure_base_dir() {
  if [[ ! -d "$WORKTREE_BASE" ]]; then
    mkdir -p "$WORKTREE_BASE"
    echo '{"worktrees":{}}' > "$STATE_FILE"
    log_info "Created worktree base directory: $WORKTREE_BASE"
  fi
}

# get_worktree_path returns the filesystem path for the worktree directory for the given issue number.
get_worktree_path() {
  local issue_number=$1
  echo "$WORKTREE_BASE/issue-$issue_number"
}

# update_state creates or updates a workflow using the CLI
update_state() {
  local issue_number=$1
  local status=$2
  local branch=${3:-""}
  local pr_number=${4:-""}

  ensure_base_dir

  # Find or create workflow
  local result
  result=$(cli_call workflow find "$issue_number" 2>/dev/null || echo '{}')
  local workflow_id
  workflow_id=$(echo "$result" | jq -r '.workflow.id // empty')

  if [[ -z "$workflow_id" ]]; then
    # Create new workflow
    local worktree_path
    worktree_path=$(get_worktree_path "$issue_number")
    result=$(cli_call workflow create "$issue_number" "$branch" "$worktree_path")
    workflow_id=$(echo "$result" | jq -r '.workflow.id')
  fi

  # Update status
  cli_call workflow set-status "$workflow_id" "$status" > /dev/null

  # Log PR number if provided (store as metadata)
  if [[ -n "$pr_number" ]]; then
    cli_call workflow log-action "$workflow_id" "pr-created" "success" "{\"pr\": \"$pr_number\"}" > /dev/null
  fi
}

# remove_from_state deletes a workflow using the CLI
remove_from_state() {
  local issue_number=$1

  # Find workflow
  local result
  result=$(cli_call workflow find "$issue_number" 2>/dev/null || echo '{}')
  local workflow_id
  workflow_id=$(echo "$result" | jq -r '.workflow.id // empty')

  # Delete if exists
  if [[ -n "$workflow_id" ]]; then
    cli_call workflow delete "$workflow_id" > /dev/null
  fi
}

# set_milestone_field sets a milestone field using the CLI
set_milestone_field() {
  local field=$1
  local value=$2
  local milestone_id
  milestone_id=$(get_milestone_id)

  case "$field" in
    phase)
      cli_call milestone set-phase "$milestone_id" "$value" > /dev/null
      ;;
    milestone_status|status)
      cli_call milestone set-status "$milestone_id" "$value" > /dev/null
      ;;
    milestone|started|integration_test_status|integration_test_timestamp)
      # These fields are stored as metadata in milestone
      # For now, we'll skip updating these via set-milestone-field
      # They are handled differently (milestone name is set at creation, etc.)
      log_warn "Field '$field' cannot be updated via set_milestone_field (use CLI directly or it's read-only)"
      ;;
    *)
      log_warn "Unsupported milestone field: $field"
      ;;
  esac
}

# get_milestone_field retrieves a milestone field using the CLI
get_milestone_field() {
  local field=$1
  local milestone_id
  milestone_id=$(get_milestone_id)

  local milestone_data
  milestone_data=$(cli_call milestone get "$milestone_id")

  case "$field" in
    milestone)
      echo "$milestone_data" | jq -r '.milestone.name // ""'
      ;;
    phase)
      echo "$milestone_data" | jq -r '.milestone.phase // ""'
      ;;
    milestone_status|status)
      echo "$milestone_data" | jq -r '.milestone.status // ""'
      ;;
    started)
      echo "$milestone_data" | jq -r '.milestone.createdAt // ""'
      ;;
    checkpoint_version)
      # Hardcoded for now - checkpoint version is implicit in CLI
      echo "2.0"
      ;;
    checkpoint_description|checkpoint_timestamp)
      # These are now stored differently in CLI (via log-action)
      # For backward compat, return empty
      echo ""
      ;;
    integration_test_status|integration_test_timestamp)
      # These would need to be stored as milestone metadata or workflow actions
      # For now return empty (will be handled in integration-test command)
      echo ""
      ;;
    *)
      log_warn "Unknown milestone field: $field"
      echo ""
      ;;
  esac
}

#------------------------------------------------------------------------------
# Commands
# cmd_create creates a new git worktree for the specified issue (optionally using the provided branch name), installs dependencies in the worktree, and records the worktree and branch in the persistent state.

cmd_create() {
  check_prerequisites

  local issue_number=$1
  local branch_name=${2:-""}

  if [[ -z "$issue_number" ]]; then
    log_error "Usage: worktree-manager.sh create <issue-number> [branch-name]"
    exit 1
  fi

  ensure_base_dir

  local worktree_path
  worktree_path=$(get_worktree_path "$issue_number")

  if [[ -d "$worktree_path" ]]; then
    log_warn "Worktree for issue #$issue_number already exists at $worktree_path"
    exit 0
  fi

  # Fetch latest main
  log_info "Fetching latest from origin..."
  git -C "$REPO_ROOT" fetch origin main --quiet

  # Generate branch name if not provided
  if [[ -z "$branch_name" ]]; then
    # Get issue title for branch name
    local issue_title
    issue_title=$(gh issue view "$issue_number" --json title -q '.title' 2>/dev/null || echo "issue-$issue_number")
    # Sanitize title for branch name
    local sanitized
    sanitized=$(echo "$issue_title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-40)
    branch_name="feat/issue-$issue_number-$sanitized"
  fi

  # Create worktree with new branch from origin/main
  log_info "Creating worktree for issue #$issue_number..."
  git -C "$REPO_ROOT" worktree add -b "$branch_name" "$worktree_path" origin/main --quiet

  # Install dependencies in worktree
  log_info "Installing dependencies in worktree..."
  (cd "$worktree_path" && bun install --silent)

  update_state "$issue_number" "created" "$branch_name"

  log_success "Created worktree for issue #$issue_number"
  echo "  Path: $worktree_path"
  echo "  Branch: $branch_name"
}

# cmd_remove removes the worktree for a given issue number, optionally deletes its branch if it is fully merged into main, and updates the tracked state.
cmd_remove() {
  local issue_number=$1

  if [[ -z "$issue_number" ]]; then
    log_error "Usage: worktree-manager.sh remove <issue-number>"
    exit 1
  fi

  local worktree_path
  worktree_path=$(get_worktree_path "$issue_number")

  if [[ ! -d "$worktree_path" ]]; then
    log_warn "No worktree found for issue #$issue_number"
    exit 0
  fi

  # Get branch name before removing (query worktree directly for reliability)
  local branch_name
  branch_name=$(git -C "$worktree_path" branch --show-current 2>/dev/null || echo "")

  log_info "Removing worktree for issue #$issue_number..."
  git -C "$REPO_ROOT" worktree remove "$worktree_path" --force

  # Optionally delete the branch if it exists and is fully merged
  if [[ -n "$branch_name" ]]; then
    if git -C "$REPO_ROOT" branch --merged main | grep -q "$branch_name"; then
      git -C "$REPO_ROOT" branch -d "$branch_name" 2>/dev/null || true
      log_info "Deleted merged branch: $branch_name"
    fi
  fi

  remove_from_state "$issue_number"
  log_success "Removed worktree for issue #$issue_number"
}

# cmd_list lists current git worktrees and prints the tracked worktree state from the state file.
cmd_list() {
  ensure_base_dir

  echo ""
  echo "Git Worktrees:"
  echo "─────────────────────────────────────────────────────────────"
  git -C "$REPO_ROOT" worktree list
  echo ""

  if [[ -f "$STATE_FILE" ]]; then
    echo "Tracked State:"
    echo "─────────────────────────────────────────────────────────────"
    jq -r '.worktrees | to_entries[] | "Issue #\(.key): \(.value.status) (\(.value.branch // "no branch"))"' "$STATE_FILE" 2>/dev/null || echo "  (none)"
    echo ""
  fi
}

# cmd_status displays a formatted table of tracked worktrees from the state file, showing Issue, Status, Branch, and PR (or prints "No active worktrees" when none are tracked).
cmd_status() {
  ensure_base_dir

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│                    Worktree Status                          │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Get active workflows from CLI
  local workflows
  workflows=$(cli_call workflow list-active 2>/dev/null || echo '[]')

  if [[ "$workflows" == "[]" ]] || [[ $(echo "$workflows" | jq 'length') -eq 0 ]]; then
    echo "  No active worktrees"
    echo ""
    return
  fi

  # Header
  printf "  %-8s %-15s %-35s %s\n" "Issue" "Status" "Branch" "PR"
  echo "  ──────── ─────────────── ─────────────────────────────────── ────"

  # Display each workflow
  echo "$workflows" | jq -r '.[] | [.issueNumber, .status, .branch, ""] | @tsv' | \
  while IFS=$'\t' read -r issue status branch pr_placeholder; do
    # Try to get PR number from workflow actions
    local workflow_data pr_number
    workflow_data=$(cli_call workflow find "$issue" 2>/dev/null || echo '{}')
    pr_number=$(echo "$workflow_data" | jq -r '.actions[]? | select(.action == "pr-created") | .metadata.pr // empty' | head -1)

    pr_display=${pr_number:-"-"}
    branch_display=${branch:-"-"}

    # Truncate branch if too long
    if [[ ${#branch_display} -gt 35 ]]; then
      branch_display="${branch_display:0:32}..."
    fi
    printf "  #%-7s %-15s %-35s %s\n" "$issue" "$status" "$branch_display" "$pr_display"
  done

  echo ""
}

# cmd_update_status updates the tracked status and optional PR number for the given issue in the worktree state file.
cmd_update_status() {
  local issue_number=$1
  local new_status=$2
  local pr_number=${3:-""}

  if [[ -z "$issue_number" ]] || [[ -z "$new_status" ]]; then
    log_error "Usage: worktree-manager.sh update-status <issue-number> <status> [pr-number]"
    exit 1
  fi

  ensure_base_dir

  # Get current branch from CLI or worktree
  local current_branch=""
  local result
  result=$(cli_call workflow find "$issue_number" 2>/dev/null || echo '{}')
  current_branch=$(echo "$result" | jq -r '.workflow.branch // ""')

  if [[ -z "$current_branch" ]]; then
    # Fallback: get from git worktree
    local worktree_path
    worktree_path=$(get_worktree_path "$issue_number")
    if [[ -d "$worktree_path" ]]; then
      current_branch=$(git -C "$worktree_path" branch --show-current 2>/dev/null || echo "")
    fi
  fi

  update_state "$issue_number" "$new_status" "$current_branch" "$pr_number"

  log_success "Updated issue #$issue_number status to: $new_status"
}

# cmd_sync syncs the persisted worktree state with the repository's actual git worktrees by removing state entries for missing worktrees and adding any untracked worktrees.
cmd_sync() {
  log_info "Syncing worktree state with git..."

  ensure_base_dir

  # Get list of actual git worktrees
  local actual_worktrees
  actual_worktrees=$(git -C "$REPO_ROOT" worktree list --porcelain | grep "worktree" | grep ".worktrees/issue-" | sed 's/worktree //')

  # Remove stale entries from state (worktrees that no longer exist)
  jq -r '.worktrees | keys[]' "$STATE_FILE" 2>/dev/null | while read -r issue; do
    local expected_path
    expected_path=$(get_worktree_path "$issue")
    if [[ ! -d "$expected_path" ]]; then
      log_warn "Worktree for issue #$issue no longer exists, removing from state"
      remove_from_state "$issue"
    fi
  done

  # Add untracked worktrees to state (worktrees that exist but aren't tracked)
  while read -r worktree_path; do
    if [[ -n "$worktree_path" ]]; then
      local issue_number
      issue_number=$(basename "$worktree_path" | sed 's/issue-//')
      if ! jq -e --arg issue "$issue_number" '.worktrees[$issue]' "$STATE_FILE" &> /dev/null; then
        log_info "Found untracked worktree for issue #$issue_number, adding to state"
        local branch
        branch=$(git -C "$worktree_path" branch --show-current 2>/dev/null || echo "")
        update_state "$issue_number" "created" "$branch"
      fi
    fi
  done <<< "$actual_worktrees"

  log_success "Sync complete"
}

# cmd_cleanup_all prompts for confirmation (unless --force) and removes all tracked worktrees and their state entries.
cmd_cleanup_all() {
  local force_flag=""
  local dry_run_flag=""

  # Handle flags in any order
  for arg in "$@"; do
    case "$arg" in
      --force) force_flag="--force" ;;
      --dry-run) dry_run_flag="--dry-run" ;;
    esac
  done

  ensure_base_dir

  local worktree_count
  worktree_count=$(jq '.worktrees | length' "$STATE_FILE" 2>/dev/null || echo "0")

  if [[ "$worktree_count" -eq 0 ]]; then
    log_info "No worktrees to remove"
    exit 0
  fi

  if [[ "$dry_run_flag" == "--dry-run" ]]; then
    log_info "Dry run - would remove $worktree_count worktree(s):"
    jq -r '.worktrees | keys[] | "  - Issue #\(.)"' "$STATE_FILE" 2>/dev/null
    exit 0
  fi

  if [[ "$force_flag" != "--force" ]]; then
    log_warn "This will remove $worktree_count worktree(s). Are you sure? (y/N)"
    read -r confirm

    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      log_info "Aborted"
      exit 0
    fi
  fi

  # Use process substitution to avoid subshell variable scope issue
  local failed_count=0
  while read -r issue; do
    if ! cmd_remove "$issue"; then
      ((failed_count++)) || true
    fi
  done < <(jq -r '.worktrees | keys[]' "$STATE_FILE" 2>/dev/null)

  if [[ $failed_count -gt 0 ]]; then
    log_warn "Cleanup completed with $failed_count failure(s)"
    exit 1
  else
    log_success "All worktrees removed"
  fi
}

# cmd_path prints the filesystem path for the worktree corresponding to the given issue number; exits with status 1 if the issue number is missing or the worktree does not exist.
cmd_path() {
  local issue_number=$1

  if [[ -z "$issue_number" ]]; then
    log_error "Usage: worktree-manager.sh path <issue-number>"
    exit 1
  fi

  local worktree_path
  worktree_path=$(get_worktree_path "$issue_number")

  if [[ -d "$worktree_path" ]]; then
    echo "$worktree_path"
  else
    log_error "No worktree found for issue #$issue_number"
    exit 1
  fi
}

# cmd_rebase rebases the worktree for the specified issue onto origin/main; on conflict it aborts the rebase, reports an error, and returns a non-zero status.
cmd_rebase() {
  local issue_number=$1

  if [[ -z "$issue_number" ]]; then
    log_error "Usage: worktree-manager.sh rebase <issue-number>"
    exit 1
  fi

  local worktree_path
  worktree_path=$(get_worktree_path "$issue_number")

  if [[ ! -d "$worktree_path" ]]; then
    log_error "No worktree found for issue #$issue_number"
    exit 1
  fi

  log_info "Rebasing worktree for issue #$issue_number on main..."

  # Fetch latest
  git -C "$worktree_path" fetch origin main --quiet

  # Attempt rebase
  if git -C "$worktree_path" rebase origin/main --quiet; then
    log_success "Rebase successful for issue #$issue_number"
    return 0
  else
    log_error "Rebase failed - conflicts detected"
    git -C "$worktree_path" rebase --abort
    return 1
  fi
}

# cmd_checkpoint saves the current milestone state to enable resume after context overflow.
cmd_checkpoint() {
  local phase=${1:-""}
  local description=${2:-"manual checkpoint"}

  ensure_base_dir

  local milestone_id
  milestone_id=$(get_milestone_id)

  # Update milestone phase
  if [[ -n "$phase" ]]; then
    cli_call milestone set-phase "$milestone_id" "$phase" > /dev/null
  fi

  # Log checkpoint action for each active workflow
  local workflows pr_count
  workflows=$(cli_call workflow list-active)
  pr_count=0

  # Process each workflow to log checkpoint action with PR status
  echo "$workflows" | jq -c '.[]' | while read -r workflow; do
    local workflow_id issue_number
    workflow_id=$(echo "$workflow" | jq -r '.id')
    issue_number=$(echo "$workflow" | jq -r '.issueNumber')

    # Try to get PR number from recent actions
    local workflow_data pr_number
    workflow_data=$(cli_call workflow get "$workflow_id")
    pr_number=$(echo "$workflow_data" | jq -r '.actions[]? | select(.action == "pr-created") | .metadata.pr // empty' | head -1)

    if [[ -n "$pr_number" ]]; then
      # Get PR status from GitHub
      local pr_state
      pr_state=$(gh pr view "$pr_number" --json state,mergeable,reviews,statusCheckRollup 2>/dev/null || echo '{}')

      # Validate JSON before logging
      if echo "$pr_state" | jq empty 2>/dev/null; then
        local metadata
        metadata=$(jq -n --arg desc "$description" --argjson pr_state "$pr_state" \
          '{description: $desc, pr_state: $pr_state}')
        cli_call workflow log-action "$workflow_id" "checkpoint" "success" "$metadata" > /dev/null
        ((pr_count++)) || true
      fi
    fi
  done

  log_success "Checkpoint saved at phase: ${phase:-unspecified}"
  echo "  Timestamp: $(date -Iseconds)"
  echo "  Description: $description"
  echo "  PRs tracked: $pr_count"
}

# cmd_resume displays checkpoint info and allows resuming from saved state.
cmd_resume() {
  ensure_base_dir

  local milestone_id
  milestone_id=$(cat "$MILESTONE_ID_FILE" 2>/dev/null || echo "")

  if [[ -z "$milestone_id" ]]; then
    log_error "No milestone found. Run preflight first."
    exit 1
  fi

  local milestone_data
  milestone_data=$(cli_call milestone get "$milestone_id" 2>/dev/null || echo '{}')

  if [[ "$milestone_data" == "{}" ]]; then
    log_error "No checkpoint found. Nothing to resume."
    exit 1
  fi

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│                  Checkpoint Found                           │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  local milestone phase status created updated
  milestone=$(echo "$milestone_data" | jq -r '.milestone.name // "unknown"')
  phase=$(echo "$milestone_data" | jq -r '.milestone.phase // "unknown"')
  status=$(echo "$milestone_data" | jq -r '.milestone.status // "unknown"')
  created=$(echo "$milestone_data" | jq -r '.milestone.createdAt // "unknown"')
  updated=$(echo "$milestone_data" | jq -r '.milestone.updatedAt // "unknown"')

  printf "  %-18s %s\n" "Milestone:" "$milestone"
  printf "  %-18s %s\n" "Phase:" "$phase"
  printf "  %-18s %s\n" "Status:" "$status"
  printf "  %-18s %s\n" "Created:" "$created"
  printf "  %-18s %s\n" "Updated:" "$updated"
  printf "  %-18s %s\n" "Version:" "2.0"
  echo ""

  # Show worktree status
  cmd_status

  # Show pending work from workflows
  local workflows completed_count failed_count pending_count
  workflows=$(echo "$milestone_data" | jq -r '.workflows // []')
  completed_count=$(echo "$workflows" | jq '[.[] | select(.status == "completed")] | length')
  failed_count=$(echo "$workflows" | jq '[.[] | select(.status == "failed")] | length')
  pending_count=$(echo "$workflows" | jq '[.[] | select(.status != "completed" and .status != "failed")] | length')

  echo "Summary:"
  printf "  %-18s %d\n" "Completed:" "$completed_count"
  printf "  %-18s %d\n" "Failed:" "$failed_count"
  printf "  %-18s %d\n" "Pending:" "$pending_count"
  echo ""

  log_info "To continue from this checkpoint, resume your workflow at phase: $phase"
}

# cmd_state_path prints the path to the state file.
cmd_state_path() {
  ensure_base_dir
  echo "$STATE_FILE"
}

# cmd_preflight runs lint and type-check on main to establish a baseline of pre-existing issues.
cmd_preflight() {
  check_prerequisites
  ensure_base_dir

  log_info "Running pre-flight baseline check on main..."

  # Ensure we're checking from main
  # Handle detached HEAD state by saving the commit ref as fallback
  local current_branch current_ref
  current_branch=$(git -C "$REPO_ROOT" branch --show-current)
  current_ref=$(git -C "$REPO_ROOT" rev-parse --short HEAD)
  local switched_branch=false
  local did_stash=false

  if [[ "$current_branch" != "main" ]]; then
    log_info "Temporarily checking out main for baseline..."
    # Only stash if there are changes
    if git -C "$REPO_ROOT" stash --quiet 2>/dev/null; then
      did_stash=true
    fi
    git -C "$REPO_ROOT" checkout main --quiet
    switched_branch=true
  fi

  git -C "$REPO_ROOT" pull origin main --quiet 2>/dev/null || true

  local lint_output lint_exit_code
  local typecheck_output typecheck_exit_code

  # Temporarily disable errexit to capture exit codes properly
  set +e

  # Run lint
  log_info "Running lint check..."
  lint_output=$(cd "$REPO_ROOT" && bun run lint 2>&1)
  lint_exit_code=$?

  # Run type-check
  log_info "Running type-check..."
  typecheck_output=$(cd "$REPO_ROOT" && bun run type-check 2>&1)
  typecheck_exit_code=$?

  # Re-enable errexit
  set -e

  # Restore original branch if we switched
  if [[ "$switched_branch" == "true" ]]; then
    if [[ -n "$current_branch" ]]; then
      # Normal branch - checkout by name
      git -C "$REPO_ROOT" checkout "$current_branch" --quiet
    else
      # Detached HEAD - checkout the saved commit ref
      git -C "$REPO_ROOT" checkout --detach "$current_ref" --quiet
    fi
    # Only pop stash if we actually stashed
    if [[ "$did_stash" == "true" ]]; then
      git -C "$REPO_ROOT" stash pop --quiet 2>/dev/null || true
    fi
  fi

  # Count issues
  local lint_warnings lint_errors typecheck_errors
  lint_warnings=$(echo "$lint_output" | grep -c "warning" || echo "0")
  lint_errors=$(echo "$lint_output" | grep -c "error" || echo "0")
  typecheck_errors=$(echo "$typecheck_output" | grep -c "error" || echo "0")

  # Save baseline to CLI (create milestone if needed)
  local milestone_id
  milestone_id=$(get_or_create_milestone "current")

  cli_call baseline save "$milestone_id" \
    "$lint_exit_code" "$lint_warnings" "$lint_errors" \
    "$typecheck_exit_code" "$typecheck_errors" > /dev/null

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│                 Pre-flight Baseline                         │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""
  printf "  %-20s %s\n" "Lint warnings:" "$lint_warnings"
  printf "  %-20s %s\n" "Lint errors:" "$lint_errors"
  printf "  %-20s %s\n" "Type-check errors:" "$typecheck_errors"
  echo ""

  if [[ "$lint_errors" -gt 0 ]] || [[ "$typecheck_errors" -gt 0 ]]; then
    log_warn "Pre-existing issues detected! These should be fixed separately."
    log_warn "Milestone work may be blocked by these issues."
    return 1
  else
    log_success "Baseline captured. No blocking pre-existing issues."
    return 0
  fi
}

# cmd_ci_status checks CI status for a PR with optional blocking wait.
cmd_ci_status() {
  local pr_number=""
  local wait_flag=""

  # Parse arguments - handle flags in any position
  for arg in "$@"; do
    case "$arg" in
      --wait) wait_flag="--wait" ;;
      *) [[ -z "$pr_number" ]] && pr_number="$arg" ;;
    esac
  done

  if [[ -z "$pr_number" ]] || ! [[ "$pr_number" =~ ^[0-9]+$ ]]; then
    log_error "Usage: worktree-manager.sh ci-status <pr-number> [--wait]"
    exit 1
  fi

  check_prerequisites

  if [[ "$wait_flag" == "--wait" ]]; then
    log_info "Waiting for CI checks on PR #$pr_number (timeout: ${CI_POLL_TIMEOUT}s)..."

    local elapsed=0
    local interval=$CI_POLL_INTERVAL
    local max_interval=120  # Max 2 minutes between polls

    while [[ $elapsed -lt $CI_POLL_TIMEOUT ]]; do
      local status
      status=$(gh pr checks "$pr_number" --json name,state,conclusion 2>/dev/null || echo "[]")

      local pending in_progress completed failed
      pending=$(echo "$status" | jq '[.[] | select(.state == "PENDING")] | length')
      in_progress=$(echo "$status" | jq '[.[] | select(.state == "IN_PROGRESS")] | length')
      completed=$(echo "$status" | jq '[.[] | select(.state == "COMPLETED")] | length')
      failed=$(echo "$status" | jq '[.[] | select(.conclusion == "FAILURE")] | length')

      if [[ "$pending" -eq 0 ]] && [[ "$in_progress" -eq 0 ]]; then
        # All checks complete
        if [[ "$failed" -gt 0 ]]; then
          log_error "CI failed: $failed check(s) failed"
          echo "$status" | jq -r '.[] | select(.conclusion == "FAILURE") | "  - \(.name): \(.conclusion)"'
          return 1
        else
          log_success "All CI checks passed ($completed checks)"
          return 0
        fi
      fi

      printf "\r  Waiting... %ds elapsed, %d pending, %d in progress, %d complete" \
        "$elapsed" "$pending" "$in_progress" "$completed"

      sleep "$interval"
      elapsed=$((elapsed + interval))

      # Exponential backoff (capped)
      interval=$((interval * 2))
      if [[ $interval -gt $max_interval ]]; then
        interval=$max_interval
      fi
    done

    echo ""
    log_error "CI check timeout after ${CI_POLL_TIMEOUT}s"
    return 1
  else
    # Non-blocking status check
    local status
    status=$(gh pr checks "$pr_number" --json name,state,conclusion 2>/dev/null || echo "[]")

    local total pending in_progress completed passed failed
    total=$(echo "$status" | jq 'length')
    pending=$(echo "$status" | jq '[.[] | select(.state == "PENDING")] | length')
    in_progress=$(echo "$status" | jq '[.[] | select(.state == "IN_PROGRESS")] | length')
    completed=$(echo "$status" | jq '[.[] | select(.state == "COMPLETED")] | length')
    passed=$(echo "$status" | jq '[.[] | select(.conclusion == "SUCCESS")] | length')
    failed=$(echo "$status" | jq '[.[] | select(.conclusion == "FAILURE")] | length')

    echo ""
    echo "CI Status for PR #$pr_number:"
    printf "  %-15s %d\n" "Total checks:" "$total"
    printf "  %-15s %d\n" "Pending:" "$pending"
    printf "  %-15s %d\n" "In progress:" "$in_progress"
    printf "  %-15s %d\n" "Completed:" "$completed"
    printf "  %-15s %d\n" "Passed:" "$passed"
    printf "  %-15s %d\n" "Failed:" "$failed"
    echo ""

    # Return JSON for scripting
    jq -n \
      --argjson total "$total" \
      --argjson pending "$pending" \
      --argjson in_progress "$in_progress" \
      --argjson completed "$completed" \
      --argjson passed "$passed" \
      --argjson failed "$failed" \
      '{total: $total, pending: $pending, in_progress: $in_progress, completed: $completed, passed: $passed, failed: $failed}'
  fi
}

# cmd_integration_test runs full validation on main after all PRs are merged.
cmd_integration_test() {
  check_prerequisites

  log_info "Running post-merge integration tests on main..."

  # Ensure we're on main with latest
  git -C "$REPO_ROOT" fetch origin main --quiet
  git -C "$REPO_ROOT" checkout main --quiet 2>/dev/null || {
    log_error "Cannot checkout main - you may have uncommitted changes"
    exit 1
  }
  git -C "$REPO_ROOT" pull origin main --quiet

  local results=()
  local exit_code=0

  # Type-check
  log_info "Running type-check..."
  if (cd "$REPO_ROOT" && bun run type-check); then
    results+=("type-check: PASS")
  else
    results+=("type-check: FAIL")
    exit_code=1
  fi

  # Lint
  log_info "Running lint..."
  if (cd "$REPO_ROOT" && bun run lint); then
    results+=("lint: PASS")
  else
    results+=("lint: FAIL")
    exit_code=1
  fi

  # Unit tests
  log_info "Running tests..."
  if (cd "$REPO_ROOT" && bun test); then
    results+=("test: PASS")
  else
    results+=("test: FAIL")
    exit_code=1
  fi

  # Build
  log_info "Running build..."
  if (cd "$REPO_ROOT" && bun run build); then
    results+=("build: PASS")
  else
    results+=("build: FAIL")
    exit_code=1
  fi

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│              Integration Test Results                       │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""
  for result in "${results[@]}"; do
    if [[ "$result" == *"PASS"* ]]; then
      echo -e "  ${GREEN}✓${NC} $result"
    else
      echo -e "  ${RED}✗${NC} $result"
    fi
  done
  echo ""

  if [[ $exit_code -eq 0 ]]; then
    log_success "All integration tests passed!"
    set_milestone_field "integration_test_status" "passed"
    set_milestone_field "integration_test_timestamp" "$(date -Iseconds)"
  else
    log_error "Integration tests failed. Manual intervention required."
    set_milestone_field "integration_test_status" "failed"
    set_milestone_field "integration_test_timestamp" "$(date -Iseconds)"
  fi

  return $exit_code
}

# cmd_summary generates a milestone summary report.
cmd_summary() {
  ensure_base_dir

  local milestone_id
  milestone_id=$(cat "$MILESTONE_ID_FILE" 2>/dev/null || echo "")

  if [[ -z "$milestone_id" ]]; then
    log_error "No milestone found. Run preflight first."
    exit 1
  fi

  # Get milestone data from CLI
  local milestone_data
  milestone_data=$(cli_call milestone get "$milestone_id")

  local milestone started
  milestone=$(echo "$milestone_data" | jq -r '.milestone.name // "unknown"')
  started=$(echo "$milestone_data" | jq -r '.milestone.createdAt // "unknown"')

  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "                    MILESTONE SUMMARY                          "
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  printf "  %-18s %s\n" "Milestone:" "$milestone"
  printf "  %-18s %s\n" "Started:" "$started"
  printf "  %-18s %s\n" "Completed:" "$(date -Iseconds)"
  echo ""

  # Count by status from workflows
  local workflows
  workflows=$(echo "$milestone_data" | jq -r '.workflows // []')

  local total completed failed running other
  total=$(echo "$workflows" | jq 'length')
  completed=$(echo "$workflows" | jq '[.[] | select(.status == "completed")] | length')
  failed=$(echo "$workflows" | jq '[.[] | select(.status == "failed")] | length')
  running=$(echo "$workflows" | jq '[.[] | select(.status == "running")] | length')
  other=$((total - completed - failed - running))

  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│                      Issues Summary                         │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""
  printf "  %-20s %d\n" "Total issues:" "$total"
  printf "  %-20s %d\n" "Completed:" "$completed"
  printf "  %-20s %d\n" "Running:" "$running"
  printf "  %-20s %d\n" "Failed:" "$failed"
  printf "  %-20s %d\n" "Other:" "$other"
  echo ""

  # List workflows with PRs
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│                    PRs Created/Merged                       │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""
  printf "  %-8s %-8s %-12s %s\n" "Issue" "PR" "Status" "Branch"
  echo "  ──────── ──────── ──────────── ────────────────────────────────"

  echo "$workflows" | jq -c '.[]' | while read -r workflow; do
    local issue_number status branch pr_number
    issue_number=$(echo "$workflow" | jq -r '.issueNumber')
    status=$(echo "$workflow" | jq -r '.status')
    branch=$(echo "$workflow" | jq -r '.branch // ""')

    # Get PR number from actions
    local workflow_data
    workflow_data=$(cli_call workflow get "$(echo "$workflow" | jq -r '.id')")
    pr_number=$(echo "$workflow_data" | jq -r '.actions[]? | select(.action == "pr-created") | .metadata.pr // empty' | head -1)

    if [[ -n "$pr_number" ]]; then
      branch_short="${branch:0:30}"
      [[ ${#branch} -gt 30 ]] && branch_short="${branch_short}..."
      printf "  #%-7s #%-7s %-12s %s\n" "$issue_number" "$pr_number" "$status" "$branch_short"
    fi
  done

  echo ""

  # List failed issues
  local failed_issues
  failed_issues=$(echo "$workflows" | jq -r '.[] | select(.status == "failed") | "#\(.issueNumber)"' | tr '\n' ' ')
  if [[ -n "$failed_issues" ]]; then
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│                 Issues Requiring Attention                  │"
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  Failed issues: $failed_issues"
    echo ""
  fi

  # Integration test status
  local integration_status integration_timestamp
  integration_status=$(get_milestone_field "integration_test_status")
  integration_timestamp=$(get_milestone_field "integration_test_timestamp")

  if [[ -n "$integration_status" ]]; then
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│                  Integration Tests                          │"
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""
    printf "  %-18s %s\n" "Status:" "$integration_status"
    printf "  %-18s %s\n" "Run at:" "${integration_timestamp:-unknown}"
    echo ""
  fi

  # Baseline comparison (only show if baseline exists in CLI)
  local milestone_id
  milestone_id=$(cat "$MILESTONE_ID_FILE" 2>/dev/null || echo "")

  if [[ -n "$milestone_id" ]]; then
    local milestone_data baseline_data
    milestone_data=$(cli_call milestone get "$milestone_id" 2>/dev/null || echo '{}')
    baseline_data=$(echo "$milestone_data" | jq '.baseline // null')

    if [[ "$baseline_data" != "null" ]]; then
      local baseline_lint_errors baseline_typecheck_errors
      baseline_lint_errors=$(echo "$baseline_data" | jq -r '.lintErrors // 0')
      baseline_typecheck_errors=$(echo "$baseline_data" | jq -r '.typecheckErrors // 0')
      echo "┌─────────────────────────────────────────────────────────────┐"
      echo "│                    Baseline Comparison                      │"
      echo "└─────────────────────────────────────────────────────────────┘"
      echo ""
      printf "  %-25s %s\n" "Pre-existing lint errors:" "${baseline_lint_errors:-0}"
      printf "  %-25s %s\n" "Pre-existing type errors:" "${baseline_typecheck_errors:-0}"
      echo ""
    fi
  fi

  echo "═══════════════════════════════════════════════════════════════"
}

# cmd_validate_state validates and optionally migrates the state file schema.
cmd_validate_state() {
  ensure_base_dir

  if [[ ! -f "$STATE_FILE" ]]; then
    log_info "No state file exists. Creating fresh state."
    echo '{"worktrees":{}}' > "$STATE_FILE"
    return 0
  fi

  log_info "Validating state file..."

  # Check if valid JSON
  if ! jq empty "$STATE_FILE" 2>/dev/null; then
    log_error "State file is not valid JSON!"
    log_warn "Creating backup and resetting state..."
    cp "$STATE_FILE" "$STATE_FILE.backup.$(date +%s)"
    echo '{"worktrees":{}}' > "$STATE_FILE"
    return 1
  fi

  # Check for required fields
  local has_worktrees
  has_worktrees=$(jq 'has("worktrees")' "$STATE_FILE")

  if [[ "$has_worktrees" != "true" ]]; then
    log_warn "State file missing 'worktrees' field. Adding..."
    local tmp_file
    tmp_file=$(mktemp)
    jq '. + {worktrees: {}}' "$STATE_FILE" > "$tmp_file" && mv "$tmp_file" "$STATE_FILE"
  fi

  # Check and set checkpoint version if missing
  local version
  version=$(get_milestone_field "checkpoint_version")
  if [[ -z "$version" ]]; then
    log_info "Adding checkpoint version to state file..."
    set_milestone_field "checkpoint_version" "$CHECKPOINT_VERSION"
  fi

  # Sync with actual worktrees
  cmd_sync

  log_success "State file validation complete"
}

# cmd_help prints the usage message and a list of available commands, status values, and examples for the worktree-manager script.
cmd_help() {
  cat << 'EOF'
Worktree Manager for /auto-milestone

Usage: worktree-manager.sh <command> [arguments]

Worktree Commands:
  create <issue> [branch]   Create a new worktree for an issue
  remove <issue>            Remove a worktree and optionally its branch
  list                      List all worktrees
  status                    Show detailed status of all worktrees
  update-status <issue> <status> [pr]
                            Update the status of a worktree
  path <issue>              Print the path to a worktree
  rebase <issue>            Rebase a worktree on main
  sync                      Sync state file with actual git worktrees
  cleanup-all [--force] [--dry-run]
                            Remove all worktrees (--force skips confirmation, --dry-run shows what would be removed)

Milestone Commands:
  checkpoint [phase] [desc] Save milestone state for resume after context overflow
  resume                    Display checkpoint info and resume guidance
  state-path                Print path to state file
  preflight                 Run lint/type-check baseline on main before work
  ci-status <pr> [--wait]   Check CI status for a PR (--wait blocks until complete)
  integration-test          Run full test suite on main after all merges
  summary                   Generate milestone completion summary report
  validate-state            Validate and migrate state file schema

Status Values:
  created       Worktree created, ready for work
  implementing  /auto-issue running
  pr-created    PR has been created
  reviewing     Waiting for/handling reviews
  ready-merge   Approved and ready to merge
  merged        PR merged, worktree can be cleaned
  failed        /auto-issue escalated

Environment Variables:
  CI_POLL_TIMEOUT   Timeout for CI wait in seconds (default: 1800)
  CI_POLL_INTERVAL  Base interval between CI polls (default: 30)

Examples:
  # Basic worktree operations
  worktree-manager.sh create 111
  worktree-manager.sh create 111 feat/my-custom-branch
  worktree-manager.sh update-status 111 pr-created 145
  worktree-manager.sh remove 111

  # Milestone workflow
  worktree-manager.sh preflight                    # Baseline before work
  worktree-manager.sh checkpoint "executing" "after issue 111"
  worktree-manager.sh ci-status 145 --wait         # Wait for CI
  worktree-manager.sh integration-test             # Post-merge validation
  worktree-manager.sh summary                      # Final report
  worktree-manager.sh cleanup-all --force          # Cleanup all worktrees
EOF
}

#------------------------------------------------------------------------------
# Main
# main parses the first CLI argument as a subcommand and dispatches to the corresponding cmd_* function, defaulting to help.

main() {
  local command=${1:-help}
  shift || true

  case "$command" in
    # Worktree commands
    create)        cmd_create "$@" ;;
    remove)        cmd_remove "$@" ;;
    list)          cmd_list ;;
    status)        cmd_status ;;
    update-status) cmd_update_status "$@" ;;
    path)          cmd_path "$@" ;;
    rebase)        cmd_rebase "$@" ;;
    sync)          cmd_sync ;;
    cleanup-all)   cmd_cleanup_all "$@" ;;

    # Milestone commands
    checkpoint)    cmd_checkpoint "$@" ;;
    resume)        cmd_resume ;;
    state-path)    cmd_state_path ;;
    preflight)     cmd_preflight ;;
    ci-status)     cmd_ci_status "$@" ;;
    integration-test) cmd_integration_test ;;
    summary)       cmd_summary ;;
    validate-state) cmd_validate_state ;;

    help|--help|-h) cmd_help ;;
    *)
      log_error "Unknown command: $command"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"