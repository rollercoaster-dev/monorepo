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

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#------------------------------------------------------------------------------
# Helper Functions
#------------------------------------------------------------------------------

log_info() { echo -e "${BLUE}[worktree]${NC} $1"; }
log_success() { echo -e "${GREEN}[worktree]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[worktree]${NC} $1"; }
log_error() { echo -e "${RED}[worktree]${NC} $1"; }

ensure_base_dir() {
  if [[ ! -d "$WORKTREE_BASE" ]]; then
    mkdir -p "$WORKTREE_BASE"
    echo '{"worktrees":{}}' > "$STATE_FILE"
    log_info "Created worktree base directory: $WORKTREE_BASE"
  fi
}

get_worktree_path() {
  local issue_number=$1
  echo "$WORKTREE_BASE/issue-$issue_number"
}

update_state() {
  local issue_number=$1
  local status=$2
  local branch=${3:-""}
  local pr_number=${4:-""}

  ensure_base_dir

  local tmp_file=$(mktemp)
  jq --arg issue "$issue_number" \
     --arg status "$status" \
     --arg branch "$branch" \
     --arg pr "$pr_number" \
     --arg timestamp "$(date -Iseconds)" \
     '.worktrees[$issue] = {status: $status, branch: $branch, pr: $pr, updated: $timestamp}' \
     "$STATE_FILE" > "$tmp_file" && mv "$tmp_file" "$STATE_FILE"
}

remove_from_state() {
  local issue_number=$1
  local tmp_file=$(mktemp)
  jq --arg issue "$issue_number" 'del(.worktrees[$issue])' \
     "$STATE_FILE" > "$tmp_file" && mv "$tmp_file" "$STATE_FILE"
}

#------------------------------------------------------------------------------
# Commands
#------------------------------------------------------------------------------

cmd_create() {
  local issue_number=$1
  local branch_name=${2:-""}

  if [[ -z "$issue_number" ]]; then
    log_error "Usage: worktree-manager.sh create <issue-number> [branch-name]"
    exit 1
  fi

  ensure_base_dir

  local worktree_path=$(get_worktree_path "$issue_number")

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
    local issue_title=$(gh issue view "$issue_number" --json title -q '.title' 2>/dev/null || echo "issue-$issue_number")
    # Sanitize title for branch name
    local sanitized=$(echo "$issue_title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-40)
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

cmd_remove() {
  local issue_number=$1

  if [[ -z "$issue_number" ]]; then
    log_error "Usage: worktree-manager.sh remove <issue-number>"
    exit 1
  fi

  local worktree_path=$(get_worktree_path "$issue_number")

  if [[ ! -d "$worktree_path" ]]; then
    log_warn "No worktree found for issue #$issue_number"
    exit 0
  fi

  # Get branch name before removing
  local branch_name=$(git -C "$REPO_ROOT" worktree list --porcelain | grep -A2 "$worktree_path" | grep "branch" | sed 's/branch refs\/heads\///')

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

cmd_status() {
  ensure_base_dir

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│                    Worktree Status                          │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  if [[ ! -f "$STATE_FILE" ]] || [[ $(jq '.worktrees | length' "$STATE_FILE") -eq 0 ]]; then
    echo "  No active worktrees"
    echo ""
    return
  fi

  # Header
  printf "  %-8s %-15s %-35s %s\n" "Issue" "Status" "Branch" "PR"
  echo "  ──────── ─────────────── ─────────────────────────────────── ────"

  jq -r '.worktrees | to_entries[] | [.key, .value.status, .value.branch, .value.pr] | @tsv' "$STATE_FILE" | \
  while IFS=$'\t' read -r issue status branch pr; do
    pr_display=${pr:-"-"}
    branch_display=${branch:-"-"}
    # Truncate branch if too long
    if [[ ${#branch_display} -gt 35 ]]; then
      branch_display="${branch_display:0:32}..."
    fi
    printf "  #%-7s %-15s %-35s %s\n" "$issue" "$status" "$branch_display" "$pr_display"
  done

  echo ""
}

cmd_update_status() {
  local issue_number=$1
  local new_status=$2
  local pr_number=${3:-""}

  if [[ -z "$issue_number" ]] || [[ -z "$new_status" ]]; then
    log_error "Usage: worktree-manager.sh update-status <issue-number> <status> [pr-number]"
    exit 1
  fi

  ensure_base_dir

  local current_branch=$(jq -r --arg issue "$issue_number" '.worktrees[$issue].branch // ""' "$STATE_FILE")
  update_state "$issue_number" "$new_status" "$current_branch" "$pr_number"

  log_success "Updated issue #$issue_number status to: $new_status"
}

cmd_sync() {
  log_info "Syncing worktree state with git..."

  ensure_base_dir

  # Get list of actual git worktrees
  local actual_worktrees=$(git -C "$REPO_ROOT" worktree list --porcelain | grep "worktree" | grep ".worktrees/issue-" | sed 's/worktree //')

  # Check each tracked worktree
  jq -r '.worktrees | keys[]' "$STATE_FILE" 2>/dev/null | while read -r issue; do
    local expected_path=$(get_worktree_path "$issue")
    if [[ ! -d "$expected_path" ]]; then
      log_warn "Worktree for issue #$issue no longer exists, removing from state"
      remove_from_state "$issue"
    fi
  done

  log_success "Sync complete"
}

cmd_cleanup_all() {
  log_warn "This will remove ALL worktrees. Are you sure? (y/N)"
  read -r confirm

  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    log_info "Aborted"
    exit 0
  fi

  ensure_base_dir

  jq -r '.worktrees | keys[]' "$STATE_FILE" 2>/dev/null | while read -r issue; do
    cmd_remove "$issue"
  done

  log_success "All worktrees removed"
}

cmd_path() {
  local issue_number=$1

  if [[ -z "$issue_number" ]]; then
    log_error "Usage: worktree-manager.sh path <issue-number>"
    exit 1
  fi

  local worktree_path=$(get_worktree_path "$issue_number")

  if [[ -d "$worktree_path" ]]; then
    echo "$worktree_path"
  else
    log_error "No worktree found for issue #$issue_number"
    exit 1
  fi
}

cmd_rebase() {
  local issue_number=$1

  if [[ -z "$issue_number" ]]; then
    log_error "Usage: worktree-manager.sh rebase <issue-number>"
    exit 1
  fi

  local worktree_path=$(get_worktree_path "$issue_number")

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

cmd_help() {
  cat << 'EOF'
Worktree Manager for /auto-milestone

Usage: worktree-manager.sh <command> [arguments]

Commands:
  create <issue> [branch]   Create a new worktree for an issue
  remove <issue>            Remove a worktree and optionally its branch
  list                      List all worktrees
  status                    Show detailed status of all worktrees
  update-status <issue> <status> [pr]
                            Update the status of a worktree
  path <issue>              Print the path to a worktree
  rebase <issue>            Rebase a worktree on main
  sync                      Sync state file with actual git worktrees
  cleanup-all               Remove all worktrees (with confirmation)
  help                      Show this help

Status Values:
  created       Worktree created, ready for work
  implementing  /auto-issue running
  pr-created    PR has been created
  reviewing     Waiting for/handling reviews
  ready-merge   Approved and ready to merge
  merged        PR merged, worktree can be cleaned
  failed        /auto-issue escalated

Examples:
  worktree-manager.sh create 111
  worktree-manager.sh create 111 feat/my-custom-branch
  worktree-manager.sh update-status 111 pr-created 145
  worktree-manager.sh remove 111
EOF
}

#------------------------------------------------------------------------------
# Main
#------------------------------------------------------------------------------

main() {
  local command=${1:-help}
  shift || true

  case "$command" in
    create)        cmd_create "$@" ;;
    remove)        cmd_remove "$@" ;;
    list)          cmd_list ;;
    status)        cmd_status ;;
    update-status) cmd_update_status "$@" ;;
    path)          cmd_path "$@" ;;
    rebase)        cmd_rebase "$@" ;;
    sync)          cmd_sync ;;
    cleanup-all)   cmd_cleanup_all ;;
    help|--help|-h) cmd_help ;;
    *)
      log_error "Unknown command: $command"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
