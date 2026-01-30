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
3. **For active Goals with Plans**: resolves step completion status and computes progress
4. Displays the full stack with status, progress metrics, and **concrete next steps**
5. Shows actionable next steps based on plan data (done count, percentage, current wave, next actionable steps)

## Implementation

### Step 1: Get the enhanced stack

```typescript
planning_stack_status({});
```

The tool now returns progress data for active Goals with Plans. This includes:

- **Progress metrics**: total, done, inProgress, notStarted, blocked counts
- **Percentage**: overall completion percentage
- **Current wave**: the first wave with non-done steps
- **Next steps**: up to 3 actionable steps (non-done, dependencies met, in current wave)

### Step 2: Format output

Parse the MCP tool response and format it for display. Include plan details inline with each stack item. The "Next action" must reference specific tickets from the plan's nextSteps array, not generic advice.

```text
Current stack (depth: N):

1. [Type] Title (status, age)
   Plan: Plan title
   Progress: X/Y (Z%) — Wave N [current/complete]
   Next: #123 - Specific step description [Wave N]
   Then: #456 - Next step [Wave N, parallel]
   ⚠️ Warning if stale...

Stale items: N
Next action: Start #123 (step description) — use /plan start 123 or /work-on-issue 123
```

**If no plan exists** for an active goal, it won't have progress data:

```
1. [Goal] Feature work (active, 1d)
   ⚠️ No plan — create one with planning_plan_create
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
   Plan: UI Components execution order
   Progress: 3/21 (14%) — Wave 1 complete
   Next: #598 - Badge card component [Wave 2]
   Then: #599 - Badge list component [Wave 2, parallel]
   ⚠️ Paused for 7 days - consider resuming or closing

Stale items: 2
Next action: Fix CI, then /done to pop Knowledge cleanup, then resume milestone with /plan start 598
```

## When to Use

- Starting a new session (check where you left off)
- Feeling lost about priorities
- Checking if any items need attention
- Weekly planning reviews
- Before deciding what to work on next
- Tracking milestone/epic progress with real-time completion data

## Related

- `/goal` - Push a new goal
- `/interrupt` - Push an interrupt
- `/done` - Complete current item
- `planning://stack` - MCP resource for programmatic access
