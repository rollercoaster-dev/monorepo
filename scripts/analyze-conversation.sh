#!/usr/bin/env bash
# analyze-conversation.sh - Analyze Claude Code conversation JSONL files
# Usage: ./analyze-conversation.sh <session.jsonl> [output.md]

set -euo pipefail

SESSION_FILE="${1:-}"
OUTPUT_FILE="${2:-/dev/stdout}"

if [[ -z "$SESSION_FILE" || ! -f "$SESSION_FILE" ]]; then
  echo "Usage: $0 <session.jsonl> [output.md]"
  echo "Analyzes a Claude Code conversation and outputs metrics."
  exit 1
fi

# Get file size
FILE_SIZE=$(ls -lh "$SESSION_FILE" | awk '{print $5}')
FILE_NAME=$(basename "$SESSION_FILE")

# Temp files for intermediate data
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Analyzing: $SESSION_FILE ($FILE_SIZE)..." >&2

# === PHASE 1: Extract all tool_use blocks ===
echo "  Extracting tool calls..." >&2
jq -c 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | {name: .name, input: .input}' "$SESSION_FILE" 2>/dev/null > "$TEMP_DIR/tool_calls.jsonl"

# === PHASE 2: Count tools ===
echo "  Counting tool distribution..." >&2
jq -r '.name' "$TEMP_DIR/tool_calls.jsonl" | sort | uniq -c | sort -rn > "$TEMP_DIR/tool_counts.txt"

# === PHASE 3: Extract Bash commands ===
echo "  Analyzing Bash commands..." >&2
jq -r 'select(.name == "Bash") | .input.command' "$TEMP_DIR/tool_calls.jsonl" > "$TEMP_DIR/bash_commands.txt"

# Categorize bash commands
GIT_COUNT=$(/usr/bin/grep -c 'git ' "$TEMP_DIR/bash_commands.txt" 2>/dev/null || echo 0)
GH_COUNT=$(/usr/bin/grep -c 'gh ' "$TEMP_DIR/bash_commands.txt" 2>/dev/null || echo 0)
BUN_COUNT=$(/usr/bin/grep -c 'bun ' "$TEMP_DIR/bash_commands.txt" 2>/dev/null || echo 0)
NPM_COUNT=$(/usr/bin/grep -c 'npm ' "$TEMP_DIR/bash_commands.txt" 2>/dev/null || echo 0)

# Detailed git breakdown
/usr/bin/grep -oE 'git (checkout|add|commit|push|pull|status|diff|log|branch|stash|merge|rebase|show|fetch|restore|rm|reset)' "$TEMP_DIR/bash_commands.txt" 2>/dev/null | sort | uniq -c | sort -rn > "$TEMP_DIR/git_breakdown.txt" || true

# Detailed gh breakdown
/usr/bin/grep -oE 'gh (issue|pr|run|api|project|label|repo) [a-z-]+' "$TEMP_DIR/bash_commands.txt" 2>/dev/null | sort | uniq -c | sort -rn > "$TEMP_DIR/gh_breakdown.txt" || true

# Detailed bun breakdown
/usr/bin/grep -oE 'bun (run |test|install|--filter)' "$TEMP_DIR/bash_commands.txt" 2>/dev/null | sort | uniq -c | sort -rn > "$TEMP_DIR/bun_breakdown.txt" || true

# === PHASE 4: Extract Task (subagent) calls ===
echo "  Extracting subagent spawns..." >&2
jq -r 'select(.name == "Task") | .input | "\(.subagent_type)\t\(.description // "no description")"' "$TEMP_DIR/tool_calls.jsonl" > "$TEMP_DIR/subagents.txt"

# Count by subagent type
cut -f1 "$TEMP_DIR/subagents.txt" | sort | uniq -c | sort -rn > "$TEMP_DIR/subagent_counts.txt"

# === PHASE 5: MCP tool usage ===
echo "  Checking MCP tool usage..." >&2
/usr/bin/grep -E '^mcp__' "$TEMP_DIR/tool_counts.txt" > "$TEMP_DIR/mcp_counts.txt" 2>/dev/null || true

# === PHASE 6: Message type distribution ===
echo "  Counting message types..." >&2
jq -r '.type' "$SESSION_FILE" 2>/dev/null | sort | uniq -c | sort -rn > "$TEMP_DIR/message_types.txt"

# === PHASE 7: Calculate Read/Write ratio ===
# Read tools: Read, Glob, Grep
# Write tools: Edit, Write
READ_TOOLS=$(awk '$2 ~ /^(Read|Glob|Grep)$/ {sum += $1} END {print sum+0}' "$TEMP_DIR/tool_counts.txt")
WRITE_TOOLS=$(awk '$2 ~ /^(Edit|Write)$/ {sum += $1} END {print sum+0}' "$TEMP_DIR/tool_counts.txt")

# Bash read commands (git status/log/diff/show, bun test/lint/type-check)
BASH_READ=$(/usr/bin/grep -cE 'git (status|log|diff|show|branch|fetch)|bun (run )?(test|lint|type-check|build)|gh .*(view|list|checks)' "$TEMP_DIR/bash_commands.txt" 2>/dev/null || echo 0)
# Bash write commands (git add/commit/push, bun install)
BASH_WRITE=$(/usr/bin/grep -cE 'git (add|commit|push|merge|rm|restore|stash|rebase)|bun install|gh .*(create|merge|close|delete|edit)' "$TEMP_DIR/bash_commands.txt" 2>/dev/null || echo 0)

TOTAL_READ=$((READ_TOOLS + BASH_READ))
TOTAL_WRITE=$((WRITE_TOOLS + BASH_WRITE))

if [[ $TOTAL_WRITE -gt 0 ]]; then
  RATIO=$(echo "scale=2; $TOTAL_READ / $TOTAL_WRITE" | bc)
else
  RATIO="N/A"
fi

# === OUTPUT REPORT ===
echo "  Generating report..." >&2

cat > "$OUTPUT_FILE" << EOF
# Conversation Analysis: $FILE_NAME

**File Size:** $FILE_SIZE
**Generated:** $(date '+%Y-%m-%d %H:%M')

---

## Message Distribution

\`\`\`
$(cat "$TEMP_DIR/message_types.txt")
\`\`\`

---

## Tool Usage Summary

| Tool | Count |
|------|-------|
$(awk '{printf "| %s | %d |\n", $2, $1}' "$TEMP_DIR/tool_counts.txt")

**Total Tool Calls:** $(wc -l < "$TEMP_DIR/tool_calls.jsonl")

---

## Read/Write Analysis

| Category | Tool-Level | Bash-Level | Total |
|----------|------------|------------|-------|
| Read | $READ_TOOLS | $BASH_READ | $TOTAL_READ |
| Write | $WRITE_TOOLS | $BASH_WRITE | $TOTAL_WRITE |

**Read:Write Ratio:** $RATIO:1

---

## Bash Command Breakdown

**Total Bash Commands:** $(wc -l < "$TEMP_DIR/bash_commands.txt")

| Category | Count |
|----------|-------|
| git | $GIT_COUNT |
| gh (GitHub CLI) | $GH_COUNT |
| bun | $BUN_COUNT |
| npm | $NPM_COUNT |

### Git Commands
\`\`\`
$(cat "$TEMP_DIR/git_breakdown.txt" 2>/dev/null || echo "None")
\`\`\`

### GitHub CLI Commands
\`\`\`
$(cat "$TEMP_DIR/gh_breakdown.txt" 2>/dev/null || echo "None")
\`\`\`

### Bun Commands
\`\`\`
$(cat "$TEMP_DIR/bun_breakdown.txt" 2>/dev/null || echo "None")
\`\`\`

---

## Subagent Analysis

**Total Subagent Spawns:** $(wc -l < "$TEMP_DIR/subagents.txt")

### By Type
\`\`\`
$(cat "$TEMP_DIR/subagent_counts.txt" 2>/dev/null || echo "None")
\`\`\`

### All Spawns
| Type | Description |
|------|-------------|
$(awk -F'\t' '{printf "| %s | %s |\n", $1, $2}' "$TEMP_DIR/subagents.txt" 2>/dev/null || echo "| None | - |")

---

## MCP Tool Usage

$(if [[ -s "$TEMP_DIR/mcp_counts.txt" ]]; then
  echo "| Tool | Count |"
  echo "|------|-------|"
  awk '{printf "| %s | %d |\n", $2, $1}' "$TEMP_DIR/mcp_counts.txt"
else
  echo "**No MCP tools used in this session.**"
fi)

---

_Analysis generated by analyze-conversation.sh_
EOF

echo "Done! Report written to: $OUTPUT_FILE" >&2
