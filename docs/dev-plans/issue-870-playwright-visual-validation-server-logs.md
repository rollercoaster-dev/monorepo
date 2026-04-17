# Development Plan: Issue #870

## Issue Summary

**Title**: Playwright integration, visual-validation skill, and agent-readable server logs
**Type**: enhancement
**Complexity**: MEDIUM
**Estimated Lines**: ~350 lines

> Note: This is three tightly-related capabilities in one PR (as explicitly requested in the issue — it consolidates #800, #801, #802). The line count is moderate because most of this is documentation/configuration (skill files, workflow docs) with a narrow TypeScript footprint (logger config change). No existing logic is modified beyond the logger construction site.

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [ ] An agent running `/auto-issue` can invoke the `visual-validation` skill, which boots `openbadges-system` in the current worktree, navigates to `/`, `/badges`, and `/badges/create`, takes screenshots, and produces a structured summary without manual intervention
- [ ] Browser console errors captured during each navigation are included in the visual-validation summary output
- [ ] The dev server started by the skill is stopped after validation completes (no orphaned processes)
- [ ] Dev server logs are written to `.tmp/server.log` in the current worktree in newline-delimited JSON format (one JSON object per line), not mixed with stdout
- [ ] An agent can read `.tmp/server.log` and filter for `"level":"error"` entries without shell tools — the format is agent-parseable by reading the file line-by-line
- [ ] Two parallel `/auto-issue` runs in different worktrees each write logs to their own `.tmp/server.log`, with no cross-contamination
- [ ] `docs/development-workflows.md` documents how to invoke visual-validation as a post-implementation step and how to read server logs

## Dependencies

| Issue | Title | Status | Type |
| ----- | ----- | ------ | ---- |
| None  | —     | —      | —    |

**Status**: All dependencies met. Issue explicitly states no dependencies.

## Objective

Deliver three agent-facing capabilities that make `openbadges-system` legible to agents during `/auto-issue` runs: (1) a documented boot/screenshot/teardown workflow using Playwright MCP tools, (2) a `.claude/skills/visual-validation/SKILL.md` that encodes the workflow as an invocable skill, and (3) per-worktree structured server logs that agents can query for errors without shell parsing.

## Decisions

| ID  | Decision                                                                                                                                  | Alternatives Considered                                                                | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Store logs in `.tmp/server.log` (already per-worktree by convention)                                                                      | Separate `logs/` directory, system temp dir                                            | `.tmp` is per-worktree and excluded from git by convention. Zero new directory creation needed. The `visual-validation` skill creates `.tmp/` with `mkdir -p` before booting the server.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D2  | Add a lightweight inline `JsonFileTransport` at the `logger.ts` construction site rather than patching `FileTransport`                    | Rely on `FileTransport` + `JsonFormatter`, patch `FileTransport` to accept a formatter | **Critical finding during research**: `FileTransport.log()` has hardcoded text formatting and never calls the `Logger`'s `formatter` field. The `Formatter` abstraction is stored on `Logger` but not passed to any transport — both `ConsoleTransport` and `FileTransport` format independently. Setting `formatter: new JsonFormatter()` on the `Logger` config has no effect on file output. The least invasive fix is a small inline transport class at the `logger.ts` construction site that calls `JsonFormatter.format()` directly. This is a single-file change with no changes to the published `rd-logger` package. |
| D3  | Configure JSON logging via environment variables (`LOG_TO_FILE`, `LOG_FILE_PATH`) rather than hardcoding                                  | Hardcode in server entry point, use a config file                                      | Env vars are the existing pattern in this codebase (see `LOG_LEVEL`, `SYSTEM_SERVER_PORT`). Agent boot scripts set env vars naturally. `LOG_FORMAT` env var is NOT needed — when `LOG_TO_FILE` is set, the file transport always writes JSON (that is the only reason agents would want file output).                                                                                                                                                                                                                                                                                                                          |
| D4  | Visual-validation skill uses Playwright MCP tools directly (no custom boot script)                                                        | Write a shell script that boots and polls readiness                                    | The project already has `mcp__playwright__*` tools available. A skill document instructing the agent to use them directly is simpler and more maintainable than a shell wrapper.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D5  | Boot readiness check: poll `http://localhost:<SYSTEM_VITE_PORT>/` via Playwright navigate until non-error response (max 30s, 2s interval) | Use a fixed sleep, use a custom wait script                                            | Health endpoint already exists at `/api/health`. Using Playwright navigate to poll it avoids additional tooling.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D6  | Visual-validation is an optional documented step, not wired into workflow phases                                                          | Make it a mandatory review phase                                                       | It should remain opt-in — CI has no browser environment and most issues don't require visual validation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Affected Areas

- `apps/openbadges-system/src/server/utils/logger.ts`: Add env-var-gated inline JSON file transport
- `.claude/skills/visual-validation/SKILL.md`: New skill file (create directory)
- `docs/development-workflows.md`: Add "Agent Observability Tools" section after "Review Pipeline"

## Implementation Plan

### Step 1: Add env-var-gated JSON file logging to the server

**Files**: `apps/openbadges-system/src/server/utils/logger.ts`
**Commit**: `feat(openbadges-system): add env-var-gated JSON file transport for agent-readable logs`
**Changes**:

- [ ] Import `JsonFormatter`, `FileTransport` from `@rollercoaster-dev/rd-logger` (both are confirmed public exports in `packages/rd-logger/src/index.ts`)
- [ ] Read `LOG_TO_FILE` env var: if truthy, activate file logging
- [ ] Read `LOG_FILE_PATH` env var: path to log file; default `'.tmp/server.log'` relative to `process.cwd()`
- [ ] When `LOG_TO_FILE` is set, construct a small inline `JsonFileTransport` class (within `logger.ts`) that implements the `Transport` interface — its `log()` method calls `new JsonFormatter().format(level, message, timestamp, context)` and appends the result + newline to the file path using `fs.appendFileSync` (or reuse `FileTransport` logic). This bypasses `FileTransport`'s hardcoded text format. Alternatively, subclass `FileTransport` and override `log()` to call `JsonFormatter.format()`. Either approach is acceptable; use whichever results in fewer lines.
- [ ] When `LOG_TO_FILE` is NOT set, behaviour is unchanged (console-only, existing format)
- [ ] The `Logger` is still constructed with a single `transports` array when file logging is active: `[new ConsoleTransport(...existing options...), new JsonFileTransport({ filePath: resolvedLogFilePath })]`
- [ ] Ensure `.tmp/` directory creation is handled (either in the transport's `initialize()` or via `fs.mkdirSync(dir, { recursive: true })` before constructing the transport)
- [ ] Verify `type-check` passes: `bun --filter openbadges-system run type-check`

> Implementation note: Do NOT set `logToFile: true` on the `LoggerConfig` — that activates `FileTransport` (text format). Instead, add the custom transport only via the `transports` config array when `LOG_TO_FILE` is set.

### Step 2: Create the visual-validation skill

**Files**: `.claude/skills/visual-validation/SKILL.md` (new directory + file)
**Commit**: `feat(skills): add visual-validation skill for agent-driven UI checks`
**Changes**:

- [ ] Create `.claude/skills/visual-validation/` directory
- [ ] Write `SKILL.md` with frontmatter (`name`, `description`, `allowed-tools`) matching the pattern in `.claude/skills/publish/SKILL.md`
- [ ] Document the full agent procedure:
  - **Pre-conditions**: Must be called from within a worktree that has `bun install` complete
  - **Step 1 — Resolve ports**: Use `7777 + (issue_number % 100)` for Vite port, `8888 + (issue_number % 100)` for Hono port to avoid collisions across parallel worktrees. If no issue number is known, use 7877 / 8877 as safe defaults.
  - **Step 2 — Prepare `.tmp/`**: Run `mkdir -p <worktree>/.tmp` and `mkdir -p <worktree>/.tmp/screenshots`
  - **Step 3 — Set env vars**: `LOG_TO_FILE=true`, `LOG_FILE_PATH=<worktree>/.tmp/server.log`, `SYSTEM_VITE_PORT`, `SYSTEM_SERVER_PORT`
  - **Step 4 — Boot server**: Run `LOG_TO_FILE=true LOG_FILE_PATH=<worktree>/.tmp/server.log SYSTEM_VITE_PORT=<vite_port> SYSTEM_SERVER_PORT=<hono_port> bun --filter openbadges-system run dev` in background via Bash with `run_in_background: true`; record the background task ID
  - **Step 5 — Wait for readiness**: Poll `http://localhost:<SYSTEM_VITE_PORT>/` via `mcp__playwright__navigate` until response is not an error (max 30s, 2s interval — attempt up to 15 times)
  - **Step 6 — Navigate and screenshot**:
    - Navigate to `/` (home) → screenshot to `.tmp/screenshots/home-<timestamp>.png` → check browser console
    - Navigate to `/badges` → screenshot to `.tmp/screenshots/badges-<timestamp>.png` → check browser console
    - Navigate to `/badges/create` (unauthenticated view) → screenshot to `.tmp/screenshots/badges-create-<timestamp>.png` → check browser console
  - **Step 7 — Read server logs**: Read `.tmp/server.log` line by line, collect lines where `"level":"error"` or `"level":"warn"` appear
  - **Step 8 — Stop server**: Kill the background process using the task ID from Step 4
  - **Step 9 — Produce summary**: Output structured summary (pages visited, screenshot paths, console errors per page, server-side errors/warnings from log file)

### Step 3: Update development-workflows.md

**Files**: `docs/development-workflows.md`
**Commit**: `docs(workflows): document visual-validation skill and agent-readable server logs`
**Changes**:

- [ ] Add a new top-level section `## Agent Observability Tools` immediately after the `## Review Pipeline` section (before `## Agent & Plugin Architecture`)
- [ ] Under that section, add `### Visual Validation` subsection:
  - When to use: after implementing UI changes, before creating PR
  - How to invoke: `"run visual validation"` or `Skill(visual-validation)`
  - What it produces: screenshot paths, console error summary, server error summary
  - Limitation: requires a browser-capable environment (local dev, not CI)
- [ ] Add `### Agent-Readable Server Logs` subsection:
  - Explain the env vars: `LOG_TO_FILE=true`, `LOG_FILE_PATH` (default `.tmp/server.log`)
  - Show the NDJSON format: `{"level":"info","message":"...","timestamp":"..."}` (one line per log entry)
  - Explain how to read: use the `Read` tool on `.tmp/server.log`; each line is a JSON object with `level`, `message`, `timestamp` fields
  - Explain per-worktree isolation: each worktree's `.tmp/` is independent; parallel runs write to separate files
  - Note: visual-validation skill sets these env vars automatically
- [ ] Keep changes additive — do not modify existing workflow phase descriptions

## Testing Strategy

- [ ] Manual: Boot `openbadges-system` locally with `LOG_TO_FILE=true LOG_FILE_PATH=.tmp/server.log bun run dev` (from `apps/openbadges-system/`), verify `.tmp/server.log` is created and each line is valid JSON with `level`, `message`, `timestamp` fields
- [ ] Manual: Verify that without `LOG_TO_FILE` set, no log file is created and console output is unchanged
- [ ] Manual: Invoke the visual-validation skill in a real worktree and verify the summary output is complete and accurate
- [ ] Type-check: `bun --filter openbadges-system run type-check` must pass after Step 1
- [ ] No new unit tests required: the logger change is a construction-site wiring change; `JsonFormatter` already has tests in `packages/rd-logger`

## Not in Scope

| Item                                                        | Reason                                                                                                                                                  | Follow-up                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Playwright E2E tests (automated, running in CI)             | Issue is about agent-facing tooling, not CI test automation. Adding CI Playwright is a separate milestone item.                                         | Separate issue when CI Playwright support is needed                    |
| Before/after visual diff (pixel comparison)                 | Acceptance criteria only require screenshots and console errors. True pixel diff requires additional tooling (e.g. `pixelmatch`).                       | Follow-up if needed                                                    |
| Structured logs for the Vite dev server                     | Vite's stdout is not under our control. The structured logging is for the Hono backend only, which uses rd-logger.                                      | Not needed — agents care about backend errors, not Vite's build output |
| Publishing rd-logger version bump                           | The change is to the construction site in `openbadges-system`, not to the rd-logger package itself. No new public exports are added.                    | N/A                                                                    |
| Patching `FileTransport` in rd-logger to accept a formatter | Would require a version bump of a published package for what is effectively an internal plumbing fix. The inline approach in `logger.ts` is sufficient. | Consider as a future rd-logger improvement                             |

## Discovery Log

Runtime discoveries made during implementation. Starts empty — populated by the implement skill as work progresses.

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
