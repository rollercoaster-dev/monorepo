#!/bin/bash
#
# Worktree Manager for Claude Code
# Manages git worktrees and tracks state across sessions
#

set -e

STATE_FILE="$HOME/.claude/worktrees-state.json"
WORKTREES_BASE="$HOME/.claude-worktrees"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure state file exists
ensure_state_file() {
  if [ ! -f "$STATE_FILE" ]; then
    mkdir -p "$(dirname "$STATE_FILE")"
    cat > "$STATE_FILE" << 'EOF'
{
  "version": "1.0",
  "description": "Tracks git worktrees across Claude Code sessions",
  "base_path": "/Users/joeczarnecki/.claude-worktrees",
  "worktrees": [],
  "last_updated": null
}
EOF
  fi
}

# Get the repo name from git remote
get_repo_name() {
  local repo_url
  repo_url=$(git remote get-url origin 2>/dev/null || echo "unknown")
  basename -s .git "$repo_url"
}

# Update state file timestamp
update_timestamp() {
  local tmp_file
  tmp_file=$(mktemp)
  jq --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" '.last_updated = $ts' "$STATE_FILE" > "$tmp_file"
  mv "$tmp_file" "$STATE_FILE"
}

# Create a new worktree for an issue
cmd_create() {
  local issue_number="$1"
  local branch_name="$2"

  if [ -z "$issue_number" ]; then
    echo -e "${RED}Error: Issue number required${NC}"
    echo "Usage: worktree create <issue_number> [branch_name]"
    exit 1
  fi

  ensure_state_file

  # Get repo info
  local repo_name
  repo_name=$(get_repo_name)
  local repo_root
  repo_root=$(git rev-parse --show-toplevel)

  # Generate branch name if not provided
  if [ -z "$branch_name" ]; then
    # Try to get issue title from GitHub
    local issue_title
    issue_title=$(gh issue view "$issue_number" --json title -q '.title' 2>/dev/null || echo "")
    if [ -n "$issue_title" ]; then
      # Convert to kebab-case branch name
      branch_name=$(echo "$issue_title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-50)
      branch_name="feat/issue-${issue_number}-${branch_name}"
    else
      branch_name="feat/issue-${issue_number}"
    fi
  fi

  # Create worktree directory path
  local worktree_dir="$WORKTREES_BASE/$repo_name/issue-$issue_number"

  # Check if worktree already exists
  if [ -d "$worktree_dir" ]; then
    echo -e "${YELLOW}Worktree already exists at: $worktree_dir${NC}"
    echo ""
    echo -e "To use it, run in a new terminal:"
    echo -e "${CYAN}  cd $worktree_dir && claude${NC}"
    exit 0
  fi

  # Create parent directory
  mkdir -p "$WORKTREES_BASE/$repo_name"

  # Create the worktree
  echo -e "${BLUE}Creating worktree for issue #$issue_number...${NC}"

  # Check if branch exists
  if git show-ref --verify --quiet "refs/heads/$branch_name" 2>/dev/null; then
    echo -e "${YELLOW}Branch '$branch_name' exists, using it${NC}"
    git worktree add "$worktree_dir" "$branch_name"
  else
    echo -e "${GREEN}Creating new branch '$branch_name' from main${NC}"
    git worktree add -b "$branch_name" "$worktree_dir" main
  fi

  # Update state file
  local tmp_file
  tmp_file=$(mktemp)
  jq --arg path "$worktree_dir" \
     --arg branch "$branch_name" \
     --arg issue "$issue_number" \
     --arg repo "$repo_name" \
     --arg created "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
     '.worktrees += [{
       "path": $path,
       "branch": $branch,
       "issue": $issue,
       "repo": $repo,
       "status": "active",
       "created_at": $created,
       "last_accessed": $created
     }]' "$STATE_FILE" > "$tmp_file"
  mv "$tmp_file" "$STATE_FILE"
  update_timestamp

  echo ""
  echo -e "${GREEN}Worktree created successfully!${NC}"
  echo ""
  echo -e "To start working on issue #$issue_number, run in a new terminal:"
  echo -e "${CYAN}  cd $worktree_dir && claude${NC}"
  echo ""
}

# List all worktrees
cmd_list() {
  ensure_state_file

  echo -e "${BLUE}=== Git Worktrees ===${NC}"
  echo ""

  # Get actual git worktrees
  git worktree list --porcelain | while read -r line; do
    if [[ "$line" == worktree* ]]; then
      local path="${line#worktree }"
      echo -e "${CYAN}Path:${NC} $path"
    elif [[ "$line" == branch* ]]; then
      local branch="${line#branch refs/heads/}"
      echo -e "${CYAN}Branch:${NC} $branch"
    elif [[ "$line" == HEAD* ]]; then
      local head="${line#HEAD }"
      echo -e "${CYAN}HEAD:${NC} ${head:0:8}"
      echo ""
    fi
  done

  echo -e "${BLUE}=== Tracked State ===${NC}"
  echo ""

  local count
  count=$(jq '.worktrees | length' "$STATE_FILE")

  if [ "$count" -eq 0 ]; then
    echo -e "${YELLOW}No worktrees tracked in state file${NC}"
  else
    jq -r '.worktrees[] | "Issue #\(.issue) | \(.branch)\n  Path: \(.path)\n  Status: \(.status)\n  Created: \(.created_at)\n"' "$STATE_FILE"
  fi
}

# Show status of all worktrees
cmd_status() {
  ensure_state_file

  echo -e "${BLUE}=== Worktree Status ===${NC}"
  echo ""

  # Sync with actual git worktrees first
  cmd_sync > /dev/null 2>&1

  local count
  count=$(jq '.worktrees | length' "$STATE_FILE")

  if [ "$count" -eq 0 ]; then
    echo -e "${YELLOW}No active worktrees${NC}"
    echo ""
    echo "Create one with: /worktree create <issue_number>"
    return
  fi

  # Display each worktree with status
  jq -r '.worktrees[] | @base64' "$STATE_FILE" | while read -r encoded; do
    local wt
    wt=$(echo "$encoded" | base64 --decode)

    local path branch issue status wt_type milestone milestone_title issues_list
    path=$(echo "$wt" | jq -r '.path')
    branch=$(echo "$wt" | jq -r '.branch')
    issue=$(echo "$wt" | jq -r '.issue // empty')
    milestone=$(echo "$wt" | jq -r '.milestone // empty')
    milestone_title=$(echo "$wt" | jq -r '.milestone_title // empty')
    issues_list=$(echo "$wt" | jq -r '.issues // empty')
    wt_type=$(echo "$wt" | jq -r '.type // "issue"')
    status=$(echo "$wt" | jq -r '.status')

    if [ -d "$path" ]; then
      # Get git status
      local git_status
      git_status=$(cd "$path" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

      if [ "$wt_type" = "milestone" ]; then
        echo -e "${GREEN}[active]${NC} ${BLUE}Milestone #$milestone:${NC} $milestone_title"
        echo -e "  Issues: ${CYAN}$issues_list${NC}"
      else
        echo -e "${GREEN}[active]${NC} Issue #$issue"
      fi
      echo -e "  Branch: ${CYAN}$branch${NC}"
      echo -e "  Path:   $path"
      echo -e "  Changes: $git_status uncommitted files"
      echo ""
    else
      if [ "$wt_type" = "milestone" ]; then
        echo -e "${RED}[missing]${NC} ${BLUE}Milestone #$milestone:${NC} $milestone_title"
      else
        echo -e "${RED}[missing]${NC} Issue #$issue"
      fi
      echo -e "  Branch: ${CYAN}$branch${NC}"
      echo -e "  Path:   $path (directory not found)"
      echo ""
    fi
  done

  echo -e "${BLUE}Commands:${NC}"
  echo "  cd <path> && claude  - Start Claude in worktree"
  echo "  /worktree remove <issue>  - Remove a worktree"
}

# Sync state with actual git worktrees
cmd_sync() {
  ensure_state_file

  local tmp_file
  tmp_file=$(mktemp)

  # Remove entries for non-existent worktrees
  jq '[.worktrees[] | select(.path as $p | ($p | test("^/")) and ([$p] | .[0] | . as $path | "'$(git worktree list --porcelain | grep "^worktree " | cut -d' ' -f2-)'" | split("\n") | map(select(. != "")) | any(. == $path)))]' "$STATE_FILE" > /dev/null 2>&1 || true

  # For now, just mark missing directories
  jq '
    .worktrees = [.worktrees[] |
      if (.path | . as $p | test("^/") and (["ls", $p] | @sh | system == 0 | not)) then
        .status = "missing"
      else
        .
      end
    ]
  ' "$STATE_FILE" > "$tmp_file" 2>/dev/null || cp "$STATE_FILE" "$tmp_file"

  mv "$tmp_file" "$STATE_FILE"
  update_timestamp

  echo -e "${GREEN}State synchronized${NC}"
}

# Remove a worktree
cmd_remove() {
  local issue_number="$1"

  if [ -z "$issue_number" ]; then
    echo -e "${RED}Error: Issue number required${NC}"
    echo "Usage: worktree remove <issue_number>"
    exit 1
  fi

  ensure_state_file

  # Find the worktree
  local worktree_path
  worktree_path=$(jq -r --arg issue "$issue_number" '.worktrees[] | select(.issue == $issue) | .path' "$STATE_FILE")

  if [ -z "$worktree_path" ] || [ "$worktree_path" = "null" ]; then
    echo -e "${YELLOW}No tracked worktree found for issue #$issue_number${NC}"
    echo "Checking git worktrees..."

    # Try to find by directory name
    local repo_name
    repo_name=$(get_repo_name)
    worktree_path="$WORKTREES_BASE/$repo_name/issue-$issue_number"
  fi

  if [ -d "$worktree_path" ]; then
    echo -e "${YELLOW}Removing worktree at: $worktree_path${NC}"
    git worktree remove "$worktree_path" --force 2>/dev/null || rm -rf "$worktree_path"
    echo -e "${GREEN}Worktree directory removed${NC}"
  fi

  # Remove from state
  local tmp_file
  tmp_file=$(mktemp)
  jq --arg issue "$issue_number" '.worktrees = [.worktrees[] | select(.issue != $issue)]' "$STATE_FILE" > "$tmp_file"
  mv "$tmp_file" "$STATE_FILE"
  update_timestamp

  echo -e "${GREEN}Worktree for issue #$issue_number removed${NC}"
}

# Update last accessed time for current worktree
cmd_touch() {
  ensure_state_file

  local current_path
  current_path=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

  local tmp_file
  tmp_file=$(mktemp)
  jq --arg path "$current_path" \
     --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
     '.worktrees = [.worktrees[] | if .path == $path then .last_accessed = $ts else . end]' \
     "$STATE_FILE" > "$tmp_file"
  mv "$tmp_file" "$STATE_FILE"
}

# Create a worktree for a milestone (all issues in milestone)
cmd_milestone() {
  local milestone_name="$1"

  if [ -z "$milestone_name" ]; then
    echo -e "${RED}Error: Milestone name or number required${NC}"
    echo "Usage: worktree milestone <name_or_number>"
    echo ""
    echo "Available milestones:"
    gh api repos/:owner/:repo/milestones --jq '.[] | "  #\(.number): \(.title)"' 2>/dev/null || echo "  (could not fetch milestones)"
    exit 1
  fi

  ensure_state_file

  # Get repo info
  local repo_name
  repo_name=$(get_repo_name)

  # Get milestone info
  local milestone_title milestone_number
  if [[ "$milestone_name" =~ ^[0-9]+$ ]]; then
    # It's a number, get the title
    milestone_number="$milestone_name"
    milestone_title=$(gh api "repos/:owner/:repo/milestones/$milestone_number" --jq '.title' 2>/dev/null)
    if [ -z "$milestone_title" ]; then
      echo -e "${RED}Error: Milestone #$milestone_number not found${NC}"
      exit 1
    fi
  else
    # It's a name, find the number
    milestone_title="$milestone_name"
    milestone_number=$(gh api repos/:owner/:repo/milestones --jq ".[] | select(.title == \"$milestone_name\") | .number" 2>/dev/null)
    if [ -z "$milestone_number" ]; then
      echo -e "${RED}Error: Milestone '$milestone_name' not found${NC}"
      exit 1
    fi
  fi

  # Create branch name from milestone
  local branch_name
  branch_name=$(echo "$milestone_title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-40)
  branch_name="feat/milestone-${milestone_number}-${branch_name}"

  # Create worktree directory path
  local worktree_dir="$WORKTREES_BASE/$repo_name/milestone-$milestone_number"

  # Check if worktree already exists
  if [ -d "$worktree_dir" ]; then
    echo -e "${YELLOW}Worktree already exists at: $worktree_dir${NC}"
    echo ""
    echo -e "To use it, run in a new terminal:"
    echo -e "${CYAN}  cd $worktree_dir && claude${NC}"
    exit 0
  fi

  # Get issues in milestone
  echo -e "${BLUE}Fetching issues for milestone: $milestone_title${NC}"
  local issues
  issues=$(gh issue list --milestone "$milestone_title" --state open --json number,title --jq '.[] | "#\(.number): \(.title)"' 2>/dev/null)

  if [ -z "$issues" ]; then
    echo -e "${YELLOW}No open issues found in milestone '$milestone_title'${NC}"
    exit 1
  fi

  echo -e "${CYAN}Issues in this milestone:${NC}"
  echo "$issues"
  echo ""

  # Create parent directory
  mkdir -p "$WORKTREES_BASE/$repo_name"

  # Create the worktree
  echo -e "${BLUE}Creating worktree for milestone #$milestone_number...${NC}"

  # Check if branch exists
  if git show-ref --verify --quiet "refs/heads/$branch_name" 2>/dev/null; then
    echo -e "${YELLOW}Branch '$branch_name' exists, using it${NC}"
    git worktree add "$worktree_dir" "$branch_name"
  else
    echo -e "${GREEN}Creating new branch '$branch_name' from main${NC}"
    git worktree add -b "$branch_name" "$worktree_dir" main
  fi

  # Get issue numbers for state
  local issue_numbers
  issue_numbers=$(gh issue list --milestone "$milestone_title" --state open --json number --jq '[.[].number | tostring] | join(",")' 2>/dev/null)

  # Update state file
  local tmp_file
  tmp_file=$(mktemp)
  jq --arg path "$worktree_dir" \
     --arg branch "$branch_name" \
     --arg milestone "$milestone_number" \
     --arg milestone_title "$milestone_title" \
     --arg issues "$issue_numbers" \
     --arg repo "$repo_name" \
     --arg created "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
     '.worktrees += [{
       "path": $path,
       "branch": $branch,
       "milestone": $milestone,
       "milestone_title": $milestone_title,
       "issues": $issues,
       "repo": $repo,
       "type": "milestone",
       "status": "active",
       "created_at": $created,
       "last_accessed": $created
     }]' "$STATE_FILE" > "$tmp_file"
  mv "$tmp_file" "$STATE_FILE"
  update_timestamp

  echo ""
  echo -e "${GREEN}Worktree created successfully for milestone: $milestone_title${NC}"
  echo ""
  echo -e "Issues included: $issue_numbers"
  echo ""
  echo -e "To start working, run in a new terminal:"
  echo -e "${CYAN}  cd $worktree_dir && claude${NC}"
  echo ""
  echo -e "Tip: Tell Claude which issue to start with, e.g.:"
  echo -e "${CYAN}  'Let's work on issue #170 first'${NC}"
  echo ""
}

# Show help
cmd_help() {
  echo -e "${BLUE}Worktree Manager for Claude Code${NC}"
  echo ""
  echo "Commands:"
  echo "  create <issue> [branch]    Create a new worktree for an issue"
  echo "  milestone <name|number>    Create a worktree for all issues in a milestone"
  echo "  list                       List all worktrees"
  echo "  status                     Show detailed status of worktrees"
  echo "  remove <issue>             Remove a worktree"
  echo "  sync                       Sync state with actual git worktrees"
  echo "  help                       Show this help message"
  echo ""
  echo "Examples:"
  echo "  /worktree create 164"
  echo "  /worktree create 164 feat/sqlite-api-key"
  echo "  /worktree milestone 16"
  echo "  /worktree milestone \"CI Reliability & DevOps Improvements\""
  echo "  /worktree status"
  echo "  /worktree remove 164"
}

# Main command router
main() {
  local cmd="${1:-help}"
  shift || true

  case "$cmd" in
    create)
      cmd_create "$@"
      ;;
    milestone)
      cmd_milestone "$@"
      ;;
    list)
      cmd_list
      ;;
    status)
      cmd_status
      ;;
    remove)
      cmd_remove "$@"
      ;;
    sync)
      cmd_sync
      ;;
    touch)
      cmd_touch
      ;;
    help|--help|-h)
      cmd_help
      ;;
    *)
      echo -e "${RED}Unknown command: $cmd${NC}"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
