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
3. **For each goal**: searches knowledge for an associated plan (e.g. milestone plan, execution order)
4. Displays the full stack with status, warnings, and **concrete next steps from the plan**
5. Shows actionable next steps based on plan data, not generic advice

## Implementation

### Step 1: Get the stack

```typescript
planning_stack_status({});
```

### Step 2: Enrich each goal with its plan

For each item in the stack (especially goals), search knowledge for an associated plan:

```typescript
knowledge_search_similar({
  query: `${item.title} plan execution order`,
  limit: 3,
  threshold: 0.5,
});
```

If a plan is found, extract:

- **Progress** (e.g. "1/21 done, 5%")
- **Current wave/phase** and what's next
- **Specific next ticket(s)** with issue numbers

### Step 3: Format output

Include plan details inline with each stack item. The "Next action" must reference specific tickets, not generic advice.

```text
Current stack (depth: N):

1. [Type] Title (status, age)
   Progress: X/Y (Z%)
   Next: #123 - Specific ticket description [Wave N]
   Then: #456 - Next ticket [Wave N+1, blocked on #123]
   ⚠️ Warning if stale...

Stale items: N
Next action: Start #123 (ticket description) — use /work-on-issue 123
```

**If no plan is found** for a goal, say so explicitly:

```
   ⚠️ No plan found — run milestone analysis to create one
```

## Example Output

```text
Current stack (depth: 3):

1. [Interrupt] Fix CI failure (active, 2h)
   Reason: Tests breaking on main
   ↑ interrupted: Knowledge cleanup

2. [Goal] Knowledge cleanup #608 (paused, 3d)
   ⚠️ Issue #608 closed 1 day ago - run /done to summarize

3. [Goal] 07 - UI Components milestone (paused, 7d)
   Progress: 1/21 (5%)
   Next: #594 - Define styling tokens contract [Wave 1]
   Then: #595 - Refactor component styles [Wave 2, blocked on #594]

Stale items: 1
Next action: Fix CI, then /done to pop Knowledge cleanup, then start #594 with /work-on-issue 594
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
