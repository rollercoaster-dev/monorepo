# Task System Integration Guide

## Overview

This guide documents the integration between Claude Code's native task system and the checkpoint workflow system. The integration provides two-tier progress tracking:

- **Checkpoint System (Source of Truth)**: Audit trail, phase tracking, metrics, workflow state
- **Native Task System (UI Layer)**: Progress visualization, blocking dependencies, user-facing status

### Design Philosophy

Tasks are **supplementary** to checkpoints. The checkpoint system remains the authoritative source of workflow state, while tasks provide enhanced UX through:

- Visual progress tracking (TaskList UI)
- Dependency enforcement (blockedBy relationships)
- Session-scoped task persistence (via checkpoint-plugin)

If task operations fail, the workflow continues normally - tasks enhance the experience but don't block functionality.

---

## Phase 1: /work-on-issue Integration

Gate-based task tracking for supervised workflows with human approval gates.

### Task Creation Pattern

Create one task per gate at workflow start, chaining them with `blockedBy` relationships:

```typescript
// After Phase 1: Setup complete
const gate1TaskId = TaskCreate({
  subject: "Gate 1: Review Issue #123",
  description: "Review issue details, check blockers, validate requirements",
  activeForm: "Reviewing issue #123",
  metadata: {
    issueNumber: 123,
    workflowId: "workflow-123-...",
    phase: "setup",
    gate: 1,
  },
});

// User approves Gate 1
TaskUpdate(gate1TaskId, { status: "completed" });

// Create Gate 2 task, blocked by Gate 1
const gate2TaskId = TaskCreate({
  subject: "Gate 2: Review Plan for #123",
  description: "Review development plan, approve implementation approach",
  activeForm: "Reviewing plan",
  metadata: {
    issueNumber: 123,
    workflowId: "workflow-123-...",
    phase: "research",
    gate: 2,
  },
  blockedBy: [gate1TaskId],
});

// Continue pattern for Gates 3, 4, then Finalize (not a gate)...
```

### Gate-to-Task Mapping

| Gate     | Phase     | Task Subject                   | Blocking Dependency |
| -------- | --------- | ------------------------------ | ------------------- |
| 1        | Setup     | "Gate 1: Review Issue #N"      | None                |
| 2        | Research  | "Gate 2: Review Plan for #N"   | Gate 1              |
| 3        | Implement | "Gate 3: Implement #N"         | Gate 2              |
| 4        | Review    | "Gate 4: Pre-PR Review for #N" | Gate 3              |
| Finalize | Finalize  | "Finalize: Create PR for #N"   | Gate 4              |

### When to Update Tasks

```typescript
// At each gate approval
TaskUpdate(currentGateTaskId, { status: "completed" });
TaskCreate({
  subject: "Gate N+1: ...",
  blockedBy: [currentGateTaskId],
  metadata: { ... },
});

// Show progress after phase transitions
TaskList(); // Display current state to user
```

### Progress Visualization Example

```text
Tasks for Issue #123:
├─ Gate 1: Review Issue #123      [COMPLETED] ✓
├─ Gate 2: Review Plan for #123   [COMPLETED] ✓
├─ Gate 3: Implement #123         [IN_PROGRESS] ...
├─ Gate 4: Pre-PR Review for #123 [PENDING, blocked by Gate 3]
└─ Finalize: Create PR for #123   [PENDING, blocked by Gate 4]
```

---

## Phase 2: /auto-milestone Integration

Wave-based task tracking for parallel issue execution with dependency coordination.

### Wave-Based Task Creation

Create tasks during Phase 1 (Planning) after dependency analysis:

```typescript
// After milestone-planner generates waves

// Wave 1 (no dependencies)
const wave1TaskIds = [];
for (const issue of wave1Issues) {
  const taskId = TaskCreate({
    subject: `Issue #${issue.number}: ${issue.title}`,
    description: issue.summary,
    activeForm: `Working on issue #${issue.number}`,
    metadata: {
      issueNumber: issue.number,
      workflowId: "milestone-ob3-phase-1-...",
      waveNumber: 1,
      milestoneId: "OB3 Phase 1",
      worktreeId: `/path/to/worktree-${issue.number}`,
    },
  });
  wave1TaskIds.push(taskId);
}

// Wave 2 (depends on Wave 1)
const wave2TaskIds = [];
for (const issue of wave2Issues) {
  const taskId = TaskCreate({
    subject: `Issue #${issue.number}: ${issue.title}`,
    description: issue.summary,
    activeForm: `Working on issue #${issue.number}`,
    metadata: {
      issueNumber: issue.number,
      workflowId: "milestone-ob3-phase-1-...",
      waveNumber: 2,
      milestoneId: "OB3 Phase 1",
      worktreeId: `/path/to/worktree-${issue.number}`,
    },
    blockedBy: wave1TaskIds, // Blocked by ALL Wave 1 tasks
  });
  wave2TaskIds.push(taskId);
}

// Wave N (depends on Wave N-1)
// blockedBy: waveNMinus1TaskIds
```

### Task Updates During Execution

```typescript
// Phase 2: Execute (parallel /auto-issue workers)

// When /auto-issue starts for an issue
TaskUpdate(taskId, { status: "in_progress" });

// When /auto-issue completes successfully (PR created)
TaskUpdate(taskId, { status: "completed" });

// When /auto-issue fails
TaskUpdate(taskId, {
  status: "completed",
  metadata: {
    failed: true,
    error: "Type-check failed after 3 retry attempts",
  },
});

// After each wave completes
TaskList(); // Show wave progress, next wave unblocked
```

### Progress Visualization Example

```
Milestone "OB3 Phase 1" Progress:

Wave 1 (No dependencies):
├─ Issue #153: Add KeyPair type      [COMPLETED] ✓
├─ Issue #154: Implement generator   [COMPLETED] ✓
└─ Issue #155: Add storage service   [IN_PROGRESS] ...

Wave 2 (Depends on Wave 1):
├─ Issue #156: Add JWKS endpoint     [PENDING, blocked by Wave 1]
└─ Issue #157: Integrate with auth   [PENDING, blocked by Wave 1]

Wave 3 (Depends on Wave 2):
└─ Issue #158: E2E tests             [PENDING, blocked by Wave 2]

Progress: 2/6 complete (33%)
```

---

## Task Metadata Schema

All tasks include standardized metadata for checkpoint cross-reference and debugging.

### Required Fields

```typescript
interface TaskMetadata {
  issueNumber: number; // GitHub issue number
  workflowId: string; // Checkpoint workflow ID
}
```

### Workflow-Specific Fields

**For /work-on-issue:**

```typescript
interface WorkOnIssueMetadata extends TaskMetadata {
  phase: WorkflowPhase; // "research" | "implement" | "review" | "finalize"
  gate?: number; // 1-4 (omit for finalize task which is not a gate)
}
```

**For /auto-milestone:**

```typescript
interface AutoMilestoneMetadata extends TaskMetadata {
  waveNumber: number; // 1, 2, 3, ...
  milestoneId: string; // Milestone name or ID
  worktreeId: string; // Path to worktree for this issue
}
```

### Optional Fields

```typescript
interface ExtendedTaskMetadata {
  failed?: boolean; // True if task completed with errors
  error?: string; // Error message for failed tasks
  retryCount?: number; // Number of retry attempts made
}
```

---

## Best Practices

### When to Create Tasks

✅ **Do create tasks for:**

- Gated workflows (/work-on-issue, /auto-milestone)
- Steps requiring user approval
- Parallel execution with dependencies
- Long-running operations needing visibility

❌ **Don't create tasks for:**

- Autonomous workflows (/auto-issue) - no gates to visualize
- Internal sub-steps within a phase
- Operations completing in seconds
- Read-only queries or analysis

### When to Update Tasks

**Update status when:**

- Gate is approved by user
- Wave completes and next wave unblocks
- Issue execution starts (/auto-issue launched)
- Issue execution completes (PR created or failed)

**Don't update for:**

- Internal phase transitions (use checkpoint.setPhase instead)
- Intermediate commits during implementation
- Review agent findings (log via checkpoint.logAction)

### Error Handling

Tasks should fail gracefully:

```typescript
try {
  const taskId = TaskCreate({ ... });
  // Store taskId for later updates
} catch (error) {
  // Log error but continue workflow
  logger.warn("Task creation failed", { error });
  // Workflow proceeds without task tracking
}
```

### Display Timing

Show TaskList at natural breakpoints:

- After each gate approval (/work-on-issue)
- After each wave completes (/auto-milestone)
- On user request ("show progress")
- At workflow completion

Avoid spamming TaskList during tight loops.

---

## Troubleshooting

### Task Not Appearing in TaskList

**Possible causes:**

1. Task creation failed silently - check logs
2. Session persistence not working - verify checkpoint-plugin enabled
3. Task was created in different session - tasks are session-scoped

**Solutions:**

- Check return value from TaskCreate (should be string task ID)
- Verify metadata includes workflowId for debugging
- Recreate tasks if session was lost

### Blocked Task Not Unblocking

**Possible causes:**

1. Blocking task not marked as completed
2. TaskUpdate failed silently
3. blockedBy array contained invalid task IDs

**Solutions:**

- Verify blocking task has status: "completed"
- Check TaskUpdate return value for errors
- Ensure all blockedBy task IDs exist

### Tasks Lost After Restart

**Expected behavior:** Tasks are session-scoped. After restart:

- Checkpoint state persists (workflow phase, commits, actions)
- Tasks must be recreated from checkpoint state

**Recovery pattern:**

```typescript
// On session start, check for active workflow
const workflow = checkpoint.workflow.load(workflowId);

if (workflow.status === "running") {
  // Recreate tasks based on current phase
  switch (workflow.phase) {
    case "research":
      // Recreate Gate 2 task (Gate 1 already passed)
      break;
    case "implement":
      // Recreate Gate 3 task
      break;
    // ...
  }
}
```

---

## Future Enhancements (Out of Scope for Phase 1-2)

### Phase 3: Metrics Integration

Track task effectiveness for dogfooding:

- Task completion rates by workflow
- Time-to-completion per gate
- Blocking dependency bottlenecks
- Task creation vs workflow phase correlation

### Task Recovery

Auto-recreate tasks from checkpoint state on session resume:

```typescript
// Pseudo-code
function recoverTasksFromCheckpoint(workflowId: string) {
  const checkpoint = workflow.load(workflowId);
  // Infer which gates passed from checkpoint.actions
  // Recreate pending tasks with correct blockedBy relationships
}
```

### Task Search

Query tasks by issue number or workflow ID:

```typescript
// Not yet supported by native task system
TaskQuery({ metadata: { issueNumber: 123 } });
```

### Task Hierarchy

Parent/child task relationships for complex workflows:

```typescript
// Not yet supported
TaskCreate({
  subject: "Milestone: OB3 Phase 1",
  subtasks: [gate1TaskId, gate2TaskId, ...],
});
```

---

## References

- Issue #577: Task system integration
- Full analysis: `.claude/output/task-system-integration-analysis.md`
- Workflow commands: `.claude/commands/work-on-issue.md`, `.claude/commands/auto-milestone.md`
- Checkpoint system: `packages/claude-knowledge/src/checkpoint/`
- Workflow rules: `.claude/rules/gate-workflow.md`

---

## Summary

The task system integration provides supplementary UX enhancements without replacing the checkpoint system's authoritative workflow state. Key takeaways:

1. **Checkpoint remains source of truth** - Tasks are a UI layer
2. **blockedBy enforces dependencies** - Prevents premature execution
3. **Metadata enables cross-reference** - Links tasks to checkpoint workflows
4. **Graceful degradation** - Workflow continues if task operations fail
5. **Session-scoped with persistence** - Checkpoint-plugin extends task lifetime

For implementation examples, see `.claude/commands/work-on-issue.md` (gate-based) and `.claude/commands/auto-milestone.md` (wave-based).
