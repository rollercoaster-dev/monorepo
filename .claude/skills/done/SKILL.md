---
name: done
description: Pop the top item from the planning stack. Marks it as completed, generates a summary, and resumes the previous item.
---

# /done - Complete Current Item

Pop the top item from the planning stack, mark it as completed, and resume the previous item.

## Usage

```
/done
```

No arguments needed - always operates on the top of the stack.

## What It Does

1. Pops the top item from the planning stack
2. Gathers git context (commits, PRs, issue state)
3. Generates a Beads-style summary of the completed work
4. Stores the summary as a Learning in the knowledge graph
5. Promotes the next item to active (resumes previous work)
6. Displays the completion summary and updated stack

## Implementation

Use the `planning_stack_pop` MCP tool:

```
planning_stack_pop({})
```

After popping, display:

- What was completed (title, type)
- Summary of work done (commits, PRs, duration)
- What you're returning to (next item on stack)
- Updated stack depth
- If stack is empty: "All caught up! Use /goal to start new work."

## Example Output

```
Completed: "Fix CI failure" (Interrupt)
  Summary: Resolved: "Fix CI failure". 2 commits. Duration: 2h.
  Resumed: "Knowledge cleanup" (Goal)

Stack depth: 2
  1. [Goal] Knowledge cleanup (active)
  2. [Goal] OB3 Phase 1 (paused)
```

## When to Use

- Finished working on the current task
- Bug is fixed
- Code review is done
- Any time the current focus is complete

## Related

- `/goal` - Push a new goal
- `/interrupt` - Push an interrupt
- `/plan status` - See the full stack without modifying it
