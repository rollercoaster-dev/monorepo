---
name: worktree-removal-safety
enabled: true
event: bash
pattern: worktree-manager\.sh\s+remove|git\s+worktree\s+remove
action: warn
---

**Worktree Removal Safety Check**

You are about to remove a worktree. Verify you are NOT inside the worktree directory before proceeding.

**Quick check:**
- Run `pwd` to confirm your current directory
- If inside a worktree, first `cd` to the main repo

**Why this matters:**
- If the shell's working directory is deleted, subsequent commands fail
- The only fix is restarting Claude Code

**Safe pattern:**

```bash
cd /home/rd/Code/rollercoaster.dev/monorepo && ./scripts/worktree-manager.sh remove <issue>
```
