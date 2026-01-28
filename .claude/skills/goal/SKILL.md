---
name: goal
description: Push a new goal onto the planning stack. Use when starting a new work objective to track it in the planning graph.
---

# /goal - Push Goal onto Planning Stack

Push a new goal onto the planning stack. Goals represent high-level work objectives.

## Usage

```bash
/goal <title> [issue-number]
```

## What It Does

1. Creates a new Goal entity in the planning graph
2. Pauses the current top item (if any)
3. Places the new goal at the top of the stack
4. Displays the updated stack

## Examples

```bash
/goal Implement badge generator 294
/goal Refactor authentication
/goal Fix test isolation
```

## Implementation

Use the `planning_goal_push` MCP tool:

```typescript
planning_goal_push({
  title: "<title from arguments>",
  issueNumber: <number if provided>
})
```

Parse the arguments:

- Everything before the last word is the title
- If the last word is a number, treat it as the issue number
- Otherwise, the entire argument is the title

After pushing, display:

- The new goal that was added
- Current stack depth
- What was paused (if anything)

## When to Use

- Starting new work on an issue
- Beginning a new objective
- Tracking a high-level task

## Related

- `/interrupt` - For unplanned context switches
- `/done` - To complete and pop the current item
- `/plan status` - To see the full stack
