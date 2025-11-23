#!/bin/bash
# GitHub API helper script - alternative to gh CLI when binary downloads are blocked
# Usage: ./scripts/github-api.sh <command> [args]
# Requires: GH_TOKEN environment variable

set -e

# Default repo from git remote or environment
get_repo() {
  if [ -n "$GITHUB_REPOSITORY" ]; then
    echo "$GITHUB_REPOSITORY"
  else
    # Handle various URL formats: github.com, local proxy, etc.
    local url
    url=$(git remote get-url origin 2>/dev/null)
    # Try github.com format first
    if echo "$url" | grep -q "github.com"; then
      echo "$url" | sed -E 's|.*github.com[:/](.+/.+)(\.git)?$|\1|' | sed 's/\.git$//'
    else
      # Fallback: extract last two path segments (owner/repo)
      echo "$url" | sed -E 's|.*/([^/]+/[^/]+)$|\1|' | sed 's/\.git$//'
    fi
  fi
}

REPO="${GITHUB_REPOSITORY:-$(get_repo)}"
API_BASE="https://api.github.com"

# Show help without requiring token
if [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ] || [ -z "$1" ]; then
  echo "GitHub API Helper - Alternative to gh CLI"
  echo ""
  echo "Usage: ./scripts/github-api.sh <command> [args]"
  echo ""
  echo "Commands:"
  echo "  issue-list [state] [labels]     List issues (state: open/closed/all)"
  echo "  issue-view <number>             View issue details"
  echo "  issue-create \"title\" \"body\"     Create new issue"
  echo "  issue-update <num> <field> <val> Update issue (field: state/title/body/labels)"
  echo "  issue-comment <number> \"body\"   Add comment to issue"
  echo "  pr-list [state]                 List pull requests"
  echo "  pr-view <number>                View PR details"
  echo "  pr-create \"title\" \"body\" <head> Create PR"
  echo "  project-list <org>              List organization projects"
  echo "  project-items <project-num> <org> List items in a project"
  echo "  repo                            Show repository info"
  echo "  whoami                          Show authenticated user"
  echo ""
  echo "Environment:"
  echo "  GH_TOKEN           Required - GitHub personal access token"
  echo "  GITHUB_REPOSITORY  Optional - Override repo (owner/repo)"
  echo ""
  echo "Examples:"
  echo "  ./scripts/github-api.sh issue-list open bug"
  echo "  ./scripts/github-api.sh issue-view 42"
  echo "  ./scripts/github-api.sh issue-update 42 state closed"
  exit 0
fi

# Check for token (required for all other commands)
if [ -z "$GH_TOKEN" ]; then
  echo "Error: GH_TOKEN environment variable is required" >&2
  echo "Set it in Claude Code Web UI or export GH_TOKEN=ghp_your_token" >&2
  exit 1
fi

AUTH_HEADER="Authorization: token $GH_TOKEN"
ACCEPT_HEADER="Accept: application/vnd.github.v3+json"

# Helper functions
api_get() {
  curl -sS -H "$AUTH_HEADER" -H "$ACCEPT_HEADER" "$1"
}

api_post() {
  curl -sS -X POST -H "$AUTH_HEADER" -H "$ACCEPT_HEADER" -H "Content-Type: application/json" -d "$2" "$1"
}

api_patch() {
  curl -sS -X PATCH -H "$AUTH_HEADER" -H "$ACCEPT_HEADER" -H "Content-Type: application/json" -d "$2" "$1"
}

# GraphQL helper for Projects v2
graphql() {
  curl -sS -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d "{\"query\": \"$1\"}" "https://api.github.com/graphql"
}

# Commands
case "$1" in
  issue-list|issues)
    # List issues: github-api.sh issue-list [state] [labels]
    STATE="${2:-open}"
    LABELS="${3:-}"
    URL="$API_BASE/repos/$REPO/issues?state=$STATE&per_page=30"
    [ -n "$LABELS" ] && URL="$URL&labels=$LABELS"
    api_get "$URL" | jq -r '.[] | select(.pull_request == null) | "#\(.number) [\(.state)] \(.title)"'
    ;;

  issue-view|issue)
    # View issue: github-api.sh issue-view <number> [owner/repo]
    [ -z "$2" ] && echo "Usage: github-api.sh issue-view <number> [owner/repo]" >&2 && exit 1
    ISSUE_NUM="$2"
    if [ -n "$3" ]; then
      OWNER=$(echo "$3" | cut -d'/' -f1)
      REPO_NAME=$(echo "$3" | cut -d'/' -f2)
    else
      OWNER=$(echo "$REPO" | cut -d'/' -f1)
      REPO_NAME=$(echo "$REPO" | cut -d'/' -f2)
    fi
    # Use GraphQL for better reliability
    curl -sS -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
      -d "{\"query\": \"query { repository(owner: \\\"$OWNER\\\", name: \\\"$REPO_NAME\\\") { issue(number: $ISSUE_NUM) { number title state body url author { login } labels(first: 10) { nodes { name } } createdAt } } }\"}" \
      https://api.github.com/graphql | jq -r '.data.repository.issue | "#\(.number) \(.title)\nState: \(.state)\nAuthor: \(.author.login)\nLabels: \(.labels.nodes | map(.name) | join(", "))\nCreated: \(.createdAt)\nURL: \(.url)\n\n\(.body)"'
    ;;

  issue-create)
    # Create issue: github-api.sh issue-create "title" "body" [labels]
    [ -z "$2" ] && echo "Usage: github-api.sh issue-create \"title\" \"body\" [labels]" >&2 && exit 1
    TITLE="$2"
    BODY="${3:-}"
    LABELS="${4:-}"
    DATA=$(jq -n --arg t "$TITLE" --arg b "$BODY" '{title: $t, body: $b}')
    [ -n "$LABELS" ] && DATA=$(echo "$DATA" | jq --arg l "$LABELS" '.labels = ($l | split(","))')
    api_post "$API_BASE/repos/$REPO/issues" "$DATA" | jq -r '"Created issue #\(.number): \(.html_url)"'
    ;;

  issue-update)
    # Update issue: github-api.sh issue-update <number> <state|title|body|labels> <value>
    [ -z "$4" ] && echo "Usage: github-api.sh issue-update <number> <field> <value>" >&2 && exit 1
    NUM="$2"
    FIELD="$3"
    VALUE="$4"
    case "$FIELD" in
      state|title|body)
        DATA=$(jq -n --arg v "$VALUE" "{\"$FIELD\": \$v}")
        ;;
      labels)
        DATA=$(jq -n --arg v "$VALUE" '{labels: ($v | split(","))}')
        ;;
      *)
        echo "Unknown field: $FIELD (use: state, title, body, labels)" >&2 && exit 1
        ;;
    esac
    api_patch "$API_BASE/repos/$REPO/issues/$NUM" "$DATA" | jq -r '"Updated issue #\(.number): \(.html_url)"'
    ;;

  issue-comment)
    # Add comment: github-api.sh issue-comment <number> "comment body"
    [ -z "$3" ] && echo "Usage: github-api.sh issue-comment <number> \"body\"" >&2 && exit 1
    DATA=$(jq -n --arg b "$3" '{body: $b}')
    api_post "$API_BASE/repos/$REPO/issues/$2/comments" "$DATA" | jq -r '"Comment added: \(.html_url)"'
    ;;

  pr-list|prs)
    # List PRs: github-api.sh pr-list [state]
    STATE="${2:-open}"
    api_get "$API_BASE/repos/$REPO/pulls?state=$STATE&per_page=30" | jq -r '.[] | "#\(.number) [\(.state)] \(.title) <- \(.head.ref)"'
    ;;

  pr-view|pr)
    # View PR: github-api.sh pr-view <number>
    [ -z "$2" ] && echo "Usage: github-api.sh pr-view <number>" >&2 && exit 1
    api_get "$API_BASE/repos/$REPO/pulls/$2" | jq -r '"#\(.number) \(.title)\nState: \(.state) | Mergeable: \(.mergeable // "checking...")\nAuthor: \(.user.login)\nBranch: \(.head.ref) -> \(.base.ref)\nCreated: \(.created_at)\n\n\(.body)"'
    ;;

  pr-create)
    # Create PR: github-api.sh pr-create "title" "body" <head> [base]
    [ -z "$4" ] && echo "Usage: github-api.sh pr-create \"title\" \"body\" <head-branch> [base-branch]" >&2 && exit 1
    TITLE="$2"
    BODY="$3"
    HEAD="$4"
    BASE="${5:-main}"
    DATA=$(jq -n --arg t "$TITLE" --arg b "$BODY" --arg h "$HEAD" --arg base "$BASE" '{title: $t, body: $b, head: $h, base: $base}')
    api_post "$API_BASE/repos/$REPO/pulls" "$DATA" | jq -r '"Created PR #\(.number): \(.html_url)"'
    ;;

  project-list|projects)
    # List org projects: github-api.sh project-list <org>
    ORG="${2:-rollercoaster-dev}"
    QUERY="query { organization(login: \\\"$ORG\\\") { projectsV2(first: 20) { nodes { number title url } } } }"
    graphql "$QUERY" | jq -r '.data.organization.projectsV2.nodes[] | "#\(.number) \(.title)\n   \(.url)"'
    ;;

  project-items|project)
    # List project items: github-api.sh project-items <number> [org]
    [ -z "$2" ] && echo "Usage: github-api.sh project-items <project-number> [org]" >&2 && exit 1
    PROJECT_NUM="$2"
    ORG="${3:-rollercoaster-dev}"
    QUERY="query { organization(login: \\\"$ORG\\\") { projectV2(number: $PROJECT_NUM) { title items(first: 50) { nodes { content { ... on Issue { number title state url } ... on PullRequest { number title state url } } fieldValues(first: 10) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } } } } } } } } }"
    graphql "$QUERY" | jq -r '
      .data.organization.projectV2 as $proj |
      "Project: \($proj.title)\n" +
      (.data.organization.projectV2.items.nodes[] |
        .content as $c |
        (.fieldValues.nodes | map(select(.name != null) | "\(.field.name): \(.name)") | join(" | ")) as $fields |
        "#\($c.number) [\($c.state)] \($c.title)\n   \($c.url)\n   \($fields)\n"
      )'
    ;;

  repo)
    # Get repo info
    api_get "$API_BASE/repos/$REPO" | jq -r '"Repo: \(.full_name)\nDescription: \(.description)\nStars: \(.stargazers_count) | Forks: \(.forks_count)\nDefault branch: \(.default_branch)\nOpen issues: \(.open_issues_count)"'
    ;;

  whoami)
    # Get authenticated user
    api_get "$API_BASE/user" | jq -r '"Authenticated as: \(.login) (\(.name // "no name"))\nEmail: \(.email // "private")"'
    ;;

  *)
    echo "Unknown command: $1" >&2
    echo "Run './scripts/github-api.sh help' for usage" >&2
    exit 1
    ;;
esac
