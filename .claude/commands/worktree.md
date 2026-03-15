# Worktree Manager

Manage git worktrees for parallel Claude Code sessions.

Worktrees are stored at `~/Code/worktrees/<repo>-issue-<N>` or `~/Code/worktrees/<repo>-pr-<N>` (outside the repo).

## Usage

Run the worktree manager script with the provided arguments:

```bash
"$CLAUDE_PROJECT_DIR/scripts/worktree-manager.sh" $ARGUMENTS
```

## Available Commands

- `create <issue> [branch]` - Create a new worktree for a GitHub issue
- `create-pr <pr> [branch]` - Create a bootstrapped worktree for an existing PR
- `list` - List all worktrees
- `path <issue>` - Print the path to an issue worktree
- `path-pr <pr>` - Print the path to a PR worktree
- `bootstrap <path>` - Install dependencies and prepare a worktree-local temp dir
- `exec <path> -- <command>` - Run a command with `TMPDIR`/`TMP`/`TEMP` pointed at the worktree-local `.tmp`
- `remove <issue>` - Remove a worktree
- `remove-pr <pr>` - Remove a PR worktree
- `rebase <issue>` - Rebase an issue worktree onto `main`
- `help` - Show help

## Examples

```
/worktree create 164
/worktree create 164 feat/sqlite-api-key
/worktree create-pr 818
/worktree bootstrap ~/Code/worktrees/monorepo-pr-818
/worktree exec ~/Code/worktrees/monorepo-pr-818 -- bun run type-check
/worktree remove 164
```

## Worktree Location

Worktrees are created at: `~/Code/worktrees/monorepo-issue-<N>` and `~/Code/worktrees/monorepo-pr-<N>`

This keeps worktrees outside the main repo to avoid nesting issues.

## Bootstrap Behavior

New worktrees created by `create` and `create-pr` are fully bootstrapped:

1. Dependencies are installed inside the worktree with `bun install`
2. A worktree-local `.tmp` directory is created
3. Use `scripts/worktree-manager.sh exec <path> -- <command>` to run Bun, Vitest, and other tooling with `TMPDIR`, `TMP`, and `TEMP` set to that local `.tmp`

## Workflow

1. Create worktrees for issues you want to work on in parallel
2. Use `create-pr` when you need to review or patch an existing PR without touching your current checkout
3. Open a new terminal for each worktree
4. Run `claude` in each worktree directory
5. Each Claude session works independently in its own bootstrapped worktree
