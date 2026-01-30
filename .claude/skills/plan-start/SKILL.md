---
name: plan-start
description: Start work on an issue with planning context. Links goals to plan steps, offers workflow choice, and enables auto-pop on completion.
---

# /plan start - Planning-Driven Workflow Wrapper

Start work on an issue with full planning context. This command wraps existing workflows (`/auto-issue`, `/work-on-issue`) with planning awareness, automatically linking Goals to PlanSteps and enabling auto-pop detection when work completes.

## Usage

```bash
/plan start <issue-number>
```

## What It Does

This skill orchestrates a 5-phase flow that transforms the planning graph from a passive reporting tool into an active orchestration layer:

### Phase 1: Look Up Issue in Active Plans

Query all active/paused goals to find if the issue is part of any plan:

```typescript
findStepByIssueNumber(issueNumber);
```

If found, extract plan context: plan title, step position, wave, dependencies.

### Phase 2: Push Goal with Planning Context

**If issue found in plan:**

```typescript
createGoal({
  title: `${step.title}`,
  issueNumber: issueNumber,
  planStepId: step.id, // Links goal to plan step
  metadata: {
    planTitle: plan.title,
    wave: step.wave,
    ordinal: step.ordinal,
  },
});
```

**If issue NOT found in any plan:**

```typescript
createGoal({
  title: `Issue #${issueNumber}: ${issueTitle}`,
  issueNumber: issueNumber,
  // No planStepId - standalone goal
});
```

### Phase 3: Display Context and Offer Workflow Choice

Show the user:

- Issue details (title, labels, milestone)
- Plan context (if found): plan title, wave, progress, dependencies
- Available workflows with recommendations

**Example output when issue is in a plan:**

```
Starting work on issue #594: Define styling tokens contract

Plan Context:
  Plan: 07 - UI Components Milestone
  Wave: 1 (no dependencies)
  Progress: 1/21 (5%)
  Next after this: #595 - Refactor component styles [Wave 2]

Choose workflow:
1. /auto-issue - Fully automated (recommended for straightforward issues)
2. /work-on-issue - Supervised with approval gates
3. Manual - Just track, I'll do the work myself

Which workflow? (1/2/3 or auto-issue/work-on-issue/manual)
```

**Example output when issue is NOT in a plan:**

```
Starting work on issue #650: Fix authentication bug

No plan found for this issue (not part of any active milestone/epic plan).
Proceeding with standalone goal.

Choose workflow:
1. /auto-issue - Fully automated
2. /work-on-issue - Supervised with approval gates
3. Manual - Just track, I'll do the work myself

Which workflow? (1/2/3 or auto-issue/work-on-issue/manual)
```

### Phase 4: Delegate to Chosen Workflow

Based on user response, invoke the chosen workflow:

```typescript
// Option 1: Fully automated
Skill({ skill: "auto-issue", args: String(issueNumber) });

// Option 2: Supervised
Skill({ skill: "work-on-issue", args: String(issueNumber) });

// Option 3: Manual
// No workflow invocation - just display "Goal pushed, ready to work"
```

Workflows remain unaware of the planning layer. They just work on the issue normally.

### Phase 5: Post-Completion Auto-Pop Detection

After workflow completes (or across sessions):

1. Stale detection checks if the issue is closed
2. If closed, `/plan status` shows: "Issue #N closed X ago - auto-pop recommended"
3. User runs `/done` to pop the goal
4. `/plan status` automatically shows the next step from the plan

This survives session boundaries and compaction because:

- `planStepId` is persisted in SQLite
- Stale detection queries GitHub API on each status check (with 5-min cache)
- Plan progress is recalculated from completed goals

## Error Handling

**Issue not found on GitHub:**

```
Error: Issue #123 not found in this repository.
Please check the issue number and try again.
```

**No active plans exist:**

This is a normal case. Proceed with standalone goal (no `planStepId`).

**Multiple plans contain the same issue:**

Unlikely scenario. If it happens, choose the first match and log a warning:

```
Warning: Issue #123 found in multiple plans. Using first match: "${plan.title}"
```

**Workflow not found:**

If user provides an invalid workflow choice:

```
Error: Unknown workflow "${choice}". Please choose:
- auto-issue (or 1)
- work-on-issue (or 2)
- manual (or 3)
```

## Implementation Notes

### Workflow Orchestration Pattern

The planning layer wraps workflows without modifying them:

- **Before workflow**: Push goal with `planStepId` link
- **During workflow**: Workflow executes normally, unaware of planning
- **After workflow**: Stale detection checks for completion, recommends auto-pop
- **User confirms**: Run `/done` to pop goal and show next step

This keeps workflows generic and reusable while planning adds context.

### Standalone Goal Fallback

If the issue isn't in any plan, `/plan start` still works. It just pushes a regular goal without `planStepId`. This ensures the command always succeeds and provides value even without a plan.

### Persistence Across Sessions

- `planStepId` stored in SQLite `planning_entities` table (in `data` JSON field)
- Survives compaction and interruption
- No special cleanup needed - popping the goal removes the link

### GitHub API Caching

Stale detection uses existing 5-minute TTL cache for issue state checks. Multiple calls within 5 minutes reuse cached data to avoid rate limiting.

## When to Use

- **Recommended**: Primary entry point when working from a milestone or epic plan
- **Alternative**: `/auto-issue` or `/work-on-issue` for ad-hoc issues not in a plan
- **Related**: Use `/plan status` to see what's next after completing work

## Examples

### Example 1: Issue in Active Plan

```
User: /plan start 594

Agent:
Starting work on issue #594: Define styling tokens contract

Plan Context:
  Plan: 07 - UI Components Milestone
  Wave: 1 (no dependencies)
  Progress: 1/21 (5%)
  Next after this: #595 - Refactor component styles [Wave 2]

Choose workflow:
1. /auto-issue - Fully automated
2. /work-on-issue - Supervised with approval gates
3. Manual - Just track, I'll do the work myself

Which workflow?

User: 1

Agent:
Starting /auto-issue for #594...
[Workflow executes normally...]
Done! Issue #594 completed.

Run /plan status to see what's next.
```

### Example 2: Issue Not in Any Plan

```
User: /plan start 650

Agent:
Starting work on issue #650: Fix authentication bug

No plan found for this issue (not part of any active milestone/epic plan).
Proceeding with standalone goal.

Choose workflow:
1. /auto-issue - Fully automated
2. /work-on-issue - Supervised with approval gates
3. Manual - Just track, I'll do the work myself

Which workflow?

User: manual

Agent:
Goal pushed for issue #650.
Ready to work - make your changes, then run /done when complete.
```

### Example 3: Resume After Session Break

```
User: /plan status

Agent:
Current stack (depth: 1):

1. [Goal] Define styling tokens contract #594 (active, 2d)
   ⚠️ Issue #594 closed 1 day ago - auto-pop recommended. Run /done to summarize.

Next action: Run /done to pop completed goal, then /plan status to see what's next.

User: /done

Agent:
Completed: Define styling tokens contract #594
Duration: 2 days

Next: Issue #595 - Refactor component styles [Wave 2, no blockers]
Use /plan start 595 to begin.
```

## Related Skills

- `/plan status` - View stack with plan progress
- `/plan create` - Create new milestone/epic plan
- `/goal` - Push standalone goal (no planning context)
- `/done` - Complete and pop current goal
- `/auto-issue` - Fully automated issue workflow
- `/work-on-issue` - Supervised issue workflow

## Future Enhancements (Out of Scope)

- Automatic workflow recommendation based on issue complexity
- Progress visualization showing all plan steps with status
- Batch start for multiple issues in a wave
- Integration with checkpoint system to auto-resume interrupted workflows

These can be added in future iterations based on user feedback.
