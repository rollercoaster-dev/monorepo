---
name: interrupt
description: Push an interrupt onto the planning stack. Use when an unplanned context switch happens (bug, urgent review, etc.).
---

# /interrupt - Push Interrupt onto Planning Stack

Push an interrupt onto the planning stack. Interrupts represent unplanned context switches that pause current work.

## Usage

```bash
/interrupt <title> <reason>
```

## What It Does

1. Creates a new Interrupt entity in the planning graph
2. Pauses the current top item (if any)
3. Links the interrupt to what it interrupted (via INTERRUPTED_BY relationship)
4. Places the interrupt at the top of the stack
5. Displays the updated stack

## Examples

```bash
/interrupt Fix CI failure Tests breaking on main
/interrupt Urgent code review PR #620 needs immediate review
/interrupt Bug in badge verification Users reporting invalid badges
```

## Implementation

Use the `planning_interrupt_push` MCP tool:

```typescript
planning_interrupt_push({
  title: "<first few words>",
  reason: "<remaining words>",
});
```

Parse the arguments:

- Split into title and reason at a natural break point
- If ambiguous, use the first 3-5 words as title and the rest as reason

After pushing, display:

- The new interrupt that was added
- What was interrupted/paused
- Current stack depth
- A reminder: "Run /done when resolved to resume previous work"

## When to Use

- An urgent bug needs fixing
- Someone needs an immediate code review
- CI/CD pipeline is broken
- Any unplanned work that interrupts current focus

## Related

- `/goal` - For planned new work
- `/done` - To complete the interrupt and resume previous work
- `/plan status` - To see the full stack
