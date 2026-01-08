---
name: worktree-removal-safety
enabled: true
event: bash
pattern: worktree-manager\.sh\s+remove|git\s+worktree\s+remove
action: block
---

**STOP - Worktree Removal Safety Check**

You are about to remove a worktree. This will **break the shell** if you're currently inside that worktree directory.

**Before removing a worktree, you MUST:**

1. First run: `cd /Users/joeczarnecki/Code/rollercoaster.dev/monorepo` (or any directory outside the worktree)
2. Verify you're in a safe location with `pwd`
3. Then run the worktree removal command

**Why this matters:**

- The Bash tool uses a persistent shell session
- If the shell's working directory is deleted, ALL subsequent commands fail
- The only fix is restarting Claude Code

**Safe pattern:**

```bash
cd /Users/joeczarnecki/Code/rollercoaster.dev/monorepo && ./scripts/worktree-manager.sh remove <issue>
```
