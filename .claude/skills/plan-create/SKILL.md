---
name: plan-create
description: Create a structured Plan with PlanSteps from a GitHub milestone or epic. Analyzes dependencies, computes execution waves, and enables parallel execution via /auto-milestone.
allowed-tools: Bash, Read, Skill
---

# /plan create - Create Plan from Milestone or Epic

Create a structured Plan entity with wave-based PlanSteps from a GitHub milestone or epic.

## Usage

```bash
# Milestone mode
/plan create <milestone-name>
/plan create "Claude Knowledge Graph (SQLite)"

# Epic mode
/plan create --epic <issue-number>
/plan create --epic 635
```

## What It Does

1. Validates an active Goal exists on the planning stack
2. Checks if the Goal already has a Plan (prompts to confirm if it does)
3. Analyzes the milestone or epic for dependencies and execution order
4. Creates a Plan entity linked to the active Goal
5. Creates PlanSteps with wave assignments and dependencies
6. Displays a formatted summary with next actions

## Modes

### Milestone Mode

Uses the existing `milestone-planner` agent to analyze all issues in a milestone:

1. Fetches all milestone issues
2. Parses dependency markers (`Blocked by #X`, `Depends on #X`)
3. Builds dependency graph
4. Computes execution waves (topological sort)
5. Returns structured JSON with `execution_waves` and `dependency_graph`

The skill then maps this output to Plan/PlanStep entities.

**Example:**

```bash
/plan create "OB3 Phase 1"
```

### Epic Mode

Reads GitHub native sub-issues and blocking relationships directly:

1. Fetches epic issue using `gh issue view`
2. Parses sub-issues from GitHub native sub-issues (preferred)
3. Fallback: Parses task list checkboxes in body (`- [ ] #123`)
4. Reads GitHub dependency graph via GraphQL API (`trackedInIssues`, `trackedIssues`)
5. Computes execution waves from dependency topology
6. Creates Plan with `sourceType: "epic"`

**Example:**

```bash
/plan create --epic 635
```

## Plan Entity Structure

Created Plans have:

- **title**: Milestone name or "Epic #N: <title>"
- **sourceType**: `"milestone"` or `"epic"`
- **sourceRef**: Milestone number or epic issue number (string)
- **goalId**: ID of active Goal from stack
- **steps**: Array of PlanStep entities

## PlanStep Structure

Each step has:

- **title**: Issue title
- **wave**: Execution wave (0 = can start immediately)
- **ordinal**: Order within the plan (for display)
- **externalRef**: External reference object with `type` (e.g., "issue") and optional `number` (GitHub issue number)
- **dependsOn**: Array of step ordinals (DEPENDS_ON relationships)

## Wave Assignment

**Wave 0**: Issues with no blockers (can start immediately)
**Wave 1**: Issues blocked only by Wave 0
**Wave N**: Issues blocked by Waves 0..N-1

This enables `/auto-milestone` to execute issues in parallel within each wave.

## Implementation

### Step 1: Validate Preconditions

```typescript
// Check for active Goal
const status = await planning_stack_status({});
if (!status.stack.length || status.stack[0].type !== "goal") {
  throw new Error("No active goal. Run /goal first.");
}

const activeGoal = status.stack[0];

// Check for existing plan
const existingPlan = await planning_plan_get({ goalId: activeGoal.id });
if (existingPlan) {
  // Prompt user to confirm
}
```

### Step 2: Invoke milestone-planner or parse epic

**Milestone mode:**

```typescript
// Invoke milestone-planner agent
const result = await invokeMilestonePlanner({
  mode: "milestone",
  milestone_name: args.milestoneName,
  planning_mode: "plan",
});

// Parse execution_waves and dependency_graph from JSON output
```

**Epic mode:**

```bash
# Fetch epic
gh issue view <number> --json body,title,number,trackedIssues

# Parse sub-issues from task list
# Fetch dependencies via GraphQL
# Compute waves (topological sort)
```

### Step 3: Create Plan and PlanSteps

```typescript
// Create Plan entity
const planResult = await plan({
  title: milestoneName,
  sourceType: "milestone",
  sourceRef: String(milestoneNumber),
  goalId: activeGoal.id,
});

// Map execution_waves to PlanSteps
const stepsData = executionWaves.flatMap((wave, waveIndex) =>
  wave.issues.map((issueNumber, indexInWave) => ({
    title: dependencyGraph[issueNumber].title,
    wave: waveIndex,
    ordinal: waveIndex * 100 + indexInWave,
    externalRef: {
      type: "issue",
      number: issueNumber,
    },
    dependsOn: dependencyGraph[issueNumber].depends_on.map((depNum) => {
      // Find the ordinal of the dependency step (must be created earlier)
      const depWave = executionWaves.findIndex((w) =>
        w.issues.includes(depNum),
      );
      const depIndexInWave = executionWaves[depWave].issues.indexOf(depNum);
      return depWave * 100 + depIndexInWave;
    }),
  })),
);

// Batch create steps
await steps({
  planId: planResult.id,
  steps: stepsData,
});
```

### Step 4: Display Summary

Show:

- Plan title and source
- Total step count
- Wave breakdown (issues per wave)
- Issues that can start immediately (Wave 0)
- Dependency summary
- Next action

## Example Output

```
Created plan: "OB3 Phase 1" (milestone #5)

Progress: 0/21 steps (0%)

Wave breakdown:
  Wave 0: 3 issues (can start immediately)
  Wave 1: 5 issues
  Wave 2: 8 issues
  Wave 3: 5 issues

Immediate actions (Wave 0):
  #111 - Setup key management types
  #114 - Define PNG baking interface
  #117 - Define SVG baking interface

Dependencies: 18 steps have dependencies

Next: Start any Wave 0 issue with /work-on-issue <number>
```

## Error Handling

### No Active Goal

```
Error: No active goal on the planning stack.

Run /goal first to create a goal, then retry:
  /goal Work on OB3 Phase 1 5
  /plan create "OB3 Phase 1"
```

### Goal Already Has Plan

```
Warning: Active goal already has a plan.

Current plan: "OB3 Phase 1" (21 steps, 5% complete)

Continue and replace? (y/n)
```

### Milestone Not Found

```
Error: Milestone "OB3 Phase 999" not found.

Available milestones:
  - OB3 Phase 1
  - Claude Knowledge Graph (SQLite)
  - UI Components
```

### Epic Not Found

```
Error: Issue #9999 not found.

Verify the issue number and try again.
```

### Empty Milestone

```
Error: Milestone "OB3 Phase 1" has no open issues.

All issues are closed. Nothing to plan.
```

### Circular Dependencies

```
Error: Circular dependency detected.

Chain: #115 → #116 → #117 → #115

Resolve dependency cycle in GitHub before creating plan.
```

## When to Use

- Starting work on a milestone (use with `/goal`)
- Planning execution order for an epic
- Before running `/auto-milestone` to validate wave assignments
- To visualize dependency structure of a milestone

## Related

- `/goal` - Create the Goal first
- `/plan status` - View the current plan
- `/work-on-issue` - Start a specific issue from the plan
- `/auto-milestone` - Execute an entire milestone automatically
- `milestone-planner` agent - Dependency analysis for milestones

## Integration with milestone-planner

This skill delegates dependency analysis to the `milestone-planner` agent in milestone mode:

1. Skill validates preconditions (active Goal)
2. Skill invokes `milestone-planner` agent with milestone name
3. Agent returns JSON with `execution_waves` and `dependency_graph`
4. Skill maps JSON to Plan/PlanStep entities
5. Skill displays formatted summary

This separation ensures:

- Dependency logic stays in milestone-planner (single source of truth)
- Skill focuses on MCP operations and formatting
- Agent can be used independently for analysis

## Notes

- Plans are persisted in the planning graph (SQLite)
- PlanSteps track completion status (marked done when issue merged)
- Wave assignments enable parallel execution in `/auto-milestone`
- Epic mode uses GitHub native dependencies (no inference needed)
- Completion tracking handled by completion-resolver system (#638)
