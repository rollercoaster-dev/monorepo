# Visual Validation Skill

Boot `openbadges-system`, navigate key pages, take screenshots, and check for errors.

## When to Use

- After implementing UI changes, before creating a PR
- When you need to verify the app renders correctly
- As an optional post-implementation step in `/auto-issue` (pass `--visual`)

## Prerequisites

- Must be in a worktree with `bun install` completed
- Playwright MCP tools must be available (`mcp__playwright__*`)

## Procedure

### Step 1: Configure Environment

Set environment variables for isolated dev server and structured logging:

```bash
# Port isolation: offset by issue number to avoid collisions across parallel worktrees
VITE_PORT=$((7777 + (ISSUE_NUMBER % 100)))
HONO_PORT=$((8888 + (ISSUE_NUMBER % 100)))

export SYSTEM_VITE_PORT=$VITE_PORT
export SYSTEM_SERVER_PORT=$HONO_PORT
export LOG_TO_FILE=true
export LOG_FORMAT=json
export LOG_FILE_PATH=.tmp/server.log
```

If the issue number is not available, use the default ports (7777/8888).

### Step 2: Boot Dev Server

Start the dev server in the background:

```bash
cd <worktree-root>/apps/openbadges-system
SYSTEM_VITE_PORT=$VITE_PORT SYSTEM_SERVER_PORT=$HONO_PORT \
  LOG_TO_FILE=true LOG_FORMAT=json LOG_FILE_PATH=.tmp/server.log \
  bun run dev
```

Use `Bash` with `run_in_background: true`. Record the background command ID.

### Step 3: Wait for Readiness

Poll the Vite dev server until it responds (max 30 seconds, check every 2 seconds):

1. Use `mcp__playwright__browser_navigate` to `http://localhost:$VITE_PORT/`
2. If the page loads (no connection error), the server is ready
3. If it fails, wait 2 seconds and retry
4. After 30 seconds with no response, abort and report failure

### Step 4: Navigate and Screenshot

Create the screenshots directory:

```bash
mkdir -p .tmp/screenshots
```

Visit each page, take a screenshot, and check the browser console:

| Page         | URL              | Screenshot Name     |
| ------------ | ---------------- | ------------------- |
| Home         | `/`              | `home.png`          |
| Badge List   | `/badges`        | `badges.png`        |
| Badge Create | `/badges/create` | `badges-create.png` |

For each page:

1. `mcp__playwright__browser_navigate` to the URL
2. Wait for the page to settle (use `mcp__playwright__browser_wait_for` with `networkidle` or a short timeout)
3. `mcp__playwright__browser_take_screenshot` and save to `.tmp/screenshots/<name>.png`
4. `mcp__playwright__browser_console_messages` to capture any errors or warnings

### Step 5: Read Server Logs

Read `.tmp/server.log` using the `Read` tool. Each line is a JSON object.

Filter for entries where `"level"` is `"error"` or `"warn"`. Collect these for the summary.

### Step 6: Stop Dev Server

Kill the background process. If you recorded the Bash background command ID, the process will be cleaned up when the command is stopped.

As a fallback:

```bash
# Kill processes on the ports used
lsof -ti:$VITE_PORT | xargs kill 2>/dev/null
lsof -ti:$HONO_PORT | xargs kill 2>/dev/null
```

### Step 7: Produce Summary

Output a structured summary:

```
VISUAL VALIDATION SUMMARY

Pages Visited:
- / (home) - screenshot: .tmp/screenshots/home.png
- /badges - screenshot: .tmp/screenshots/badges.png
- /badges/create - screenshot: .tmp/screenshots/badges-create.png

Console Errors: <count>
<list of errors if any>

Console Warnings: <count>
<list of warnings if any>

Server Errors (from .tmp/server.log): <count>
<list of error-level log entries if any>

Server Warnings (from .tmp/server.log): <count>
<list of warn-level log entries if any>
```

## Port Isolation

When running in parallel worktrees (e.g., during `/auto-milestone`), each worktree uses different ports based on the issue number:

- **Vite (frontend):** `7777 + (issue_number % 100)`
- **Hono (backend):** `8888 + (issue_number % 100)`

This avoids port collisions. Each worktree also writes logs to its own `.tmp/server.log`.

## Limitations

- Requires a browser-capable environment (local dev machine, not CI)
- Playwright MCP tools must be configured and available
- Pages behind authentication will show unauthenticated state
- No pixel-level diff comparison (screenshots are for human review)
