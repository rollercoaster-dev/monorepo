---
name: plan-status
description: Show the current planning stack with stale item detection. Use to see what you're working on, what's paused, and items needing attention.
---

# /plan status - Show Planning Stack Status

Display the current planning stack with git activity context and stale item detection.

## Usage

```bash
/plan status
```

No arguments needed.

## What It Does

1. Retrieves the current planning stack
2. Runs stale detection against GitHub (cached, 5-min TTL)
3. Displays the full stack with status and warnings
4. Shows actionable next steps

## Implementation

Use the `planning_stack_status` MCP tool:

```typescript
planning_stack_status({});
```

Format the output as a readable status report:

```text
Current stack (depth: N):

1. [Type] Title (status, age)
   Details...
   Warning if stale...

2. [Type] Title (status, age)
   ...

Stale items: N
Observations: ...
```

## Example Output

```text
Current stack (depth: 3):

1. [Interrupt] Fix CI failure (active, 2h)
   Reason: Tests breaking on main
   ↑ interrupted: Knowledge cleanup

2. [Goal] Knowledge cleanup #608 (paused, 3d)
   ⚠️ Issue #608 closed 1 day ago - run /done to summarize

3. [Goal] OB3 Phase 1 #294 (paused, 7d)
   No recent activity

Stale items: 1
Next action: Fix CI, then /done to resume Knowledge cleanup.
```

## When to Use

- Starting a new session (check where you left off)
- Feeling lost about priorities
- Checking if any items need attention
- Weekly planning reviews
- Before deciding what to work on next

## Related

- `/goal` - Push a new goal
- `/interrupt` - Push an interrupt
- `/done` - Complete current item
- `planning://stack` - MCP resource for programmatic access
