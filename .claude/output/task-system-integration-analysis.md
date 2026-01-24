# Integration Analysis: Native Task System vs. Checkpoint System

## Executive Summary

Claude Code's native task system (TaskCreate, TaskUpdate, TaskGet, TaskList) provides a complementary but largely overlapping capability set to the monorepo's existing checkpoint workflow system. The native tools offer cleaner UI/UX for progress visualization and better separation of concerns, while the checkpoint system is deeply integrated with workflow phases and milestone tracking for autonomous development. **Strategic integration is feasible and recommended, with the native task system best suited for sub-task tracking within workflows rather than replacing the checkpoint system entirely.**

---

## 1. Current Workflow Implementations

### 1.1 Gated Workflow (`/work-on-issue`)

**Architecture:**

- Four hard gates: Issue Review → Plan Review → Pre-PR Review → Create PR
- User approval required at each gate
- Supervised execution model
- Integration point: Users see gates and approve/reject at each stage

**Checkpoint Integration:**

- Creates workflow checkpoint at issue start
- Logs actions and phase transitions
- Tracks retry counts for manual fixes
- Stores commits made during workflow
- Uses `workflow.logAction()` to record gate outcomes

**Current Data Model:**

```typescript
Workflow {
  id: string;                // Generated from issue number
  issueNumber: number;
  branch: string;
  phase: "research" | "implement" | "review" | "finalize";
  status: "running" | "paused" | "completed" | "failed";
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

Action {
  workflowId: string;
  action: string;            // e.g., "issue_fetch", "plan_created", "review_passed"
  result: "success" | "failed" | "pending";
  metadata: Record<string, unknown>;
  createdAt: string;
}

Commit {
  workflowId: string;
  sha: string;
  message: string;
  createdAt: string;
}
```

### 1.2 Autonomous Workflow (`/auto-issue`)

**Architecture:**

- No gates between phases
- Auto-fix loop with MAX_RETRY = 3 attempts
- Escalation to user only on MAX_FIX_COMMITS or MAX_RETRY threshold
- Self-contained issue execution

**Checkpoint Integration:**

- Same workflow creation as gated workflow
- Additional retry tracking with `incrementRetry()`
- Logs classification of findings as high/standard priority
- Tracks auto-fix attempts as separate actions
- May create multiple action logs per finding

**Unique Requirements:**

- HIGH priority findings must be fixed within MAX_RETRY attempts
- If unresolved after MAX_RETRY, escalation occurs
- Validation failures cause escalation
- Each fix is a separate commit (not squashed)

### 1.3 Milestone Workflow (`/auto-milestone`)

**Architecture:**

- Five phases: Planning → Execute → Review → Merge → Cleanup
- Parallel execution of `/auto-issue` in multiple worktrees (default: 3)
- Dependency-aware wave planning
- Milestone-level coordination

**Checkpoint Integration:**

```typescript
Milestone {
  id: string;
  name: string;
  githubMilestoneNumber: number | null;
  phase: MilestonePhase;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

MilestoneCheckpointData {
  milestone: Milestone;
  baseline: Baseline;      // Pre-execution validation snapshot
  workflows: Workflow[];   // All linked issue workflows
}

// Baseline: lint/typecheck state before milestone execution
Baseline {
  milestoneId: string;
  capturedAt: string;
  lintExitCode: number;
  lintWarnings: number;
  lintErrors: number;
  typecheckExitCode: number;
  typecheckErrors: number;
}

// Junction table for wave-based execution
milestone_workflows {
  milestone_id: TEXT;
  workflow_id: TEXT;
  wave_number: INTEGER;   // Execution wave (1, 2, 3...)
}
```

**Key Functions:**

- `linkWorkflowToMilestone(workflowId, milestoneId, waveNumber)` - Batch issue linkage
- `listMilestoneWorkflows(milestoneId)` - Query all issues in milestone with wave ordering
- `saveBaseline(milestoneId, baselineData)` - Snapshot quality before execution
- `cleanupStaleWorkflows(thresholdHours)` - Mark abandoned workflows as failed

---

## 2. Existing Checkpoint System Analysis

### 2.1 Core Components

**Database Schema (SQLite):**

- `workflows` table: Core workflow state (11 rows per workflow)
- `actions` table: Audit log of all actions (N rows per workflow)
- `commits` table: Git commits made (N rows per workflow)
- `milestones` table: Milestone tracking (1 row per milestone)
- `baselines` table: Quality snapshots (1 row per milestone)
- `milestone_workflows` junction: Wave-based execution grouping

**Total Schema Size: ~150 lines**, optimized for workflow state tracking

### 2.2 Strengths

1. **Workflow-Aware**: Phases and statuses match the development workflow model
2. **Audit Trail**: Every action is logged with metadata for debugging
3. **Commit Tracking**: All commits during a workflow are recorded for retrospectives
4. **Milestone Integration**: Built-in support for parallel batch execution with wave ordering
5. **Baseline Snapshots**: Can capture lint/typecheck state before milestone execution
6. **Retry Tracking**: Native retry count for auto-issue workflows
7. **Foreign Key Constraints**: Data integrity ensured at DB level

### 2.3 Limitations

1. **No Sub-Task Tracking**: Actions are logged, but there's no hierarchical task structure
2. **No Dependencies Between Issues**: Workflow phase/status don't capture inter-issue dependencies
3. **No Progress Visualization**: No native way to show "X of Y issues completed" in a milestone
4. **No Ownership Tracking**: No "assigned to" field for shared responsibility
5. **No Priority Levels**: All workflows treated equally (no high/medium/low priority)
6. **Limited Metadata**: Actions have generic metadata object, not structured fields
7. **No Visualization Tools**: Requires custom parsing of DB to display progress

---

## 3. Native Task System Capabilities

### 3.1 Task Structure

**Core Capabilities (from tool definitions):**

```typescript
// TaskCreate
{
  subject: string;              // Brief imperative title
  description: string;          // Detailed requirements
  activeForm: string;          // "Running tests" (while in_progress)
  metadata?: Record<string, unknown>;
}

// TaskUpdate
{
  taskId: string;
  status?: "pending" | "in_progress" | "completed";
  subject?: string;             // Can be updated
  description?: string;         // Can be updated
  activeForm?: string;         // Can be updated
  owner?: string;              // Owner/assignee
  metadata?: Record<string, unknown>;
  addBlocks?: string[];        // This task blocks these
  addBlockedBy?: string[];     // This task is blocked by these
}

// TaskGet - Retrieve full task details
// TaskList - List all tasks with status and owner
```

**Key Features:**

1. **Status Tracking**: pending → in_progress → completed
2. **Dependency Management**: blocks/blockedBy relationships
3. **Ownership**: Can assign to specific agents/users
4. **Metadata**: Arbitrary key-value storage
5. **Blocking Semantics**: Tasks cannot be claimed if blockedBy is not empty
6. **List Queries**: Can see all tasks with status and blockedBy summary

### 3.2 Strengths

1. **Native Claude Integration**: Built into Claude Code, no additional tools
2. **Blocking Semantics**: Prevents claiming blocked tasks (workflow control)
3. **Ownership Tracking**: Each task can be assigned to a specific agent
4. **Priority Visualization**: UI naturally shows blocked vs. available tasks
5. **Clean UX**: Users see progress tracking in conversation naturally
6. **Dependency Visualization**: blocks/blockedBy creates a visual DAG

### 3.3 Limitations

1. **No Phases**: Status is binary (pending/in_progress/completed), not multi-phase
2. **No Audit Trail**: Updates overwrite previous state, no history
3. **No Metrics Capture**: No way to log custom metrics (retry attempts, findings, etc.)
4. **No Time-Based Data**: No built-in duration, timestamps, or time series
5. **No Hierarchies**: Sub-tasks must be represented as separate tasks with dependencies
6. **No Source Tracking**: No way to link task to source (issue number, PR, etc.)
7. **No Validation Hooks**: Cannot enforce business rules (e.g., "complete tests before PR")

---

## 4. Integration Opportunities

### 4.1 Best Fit: Sub-Task Tracking Within Workflows

**Scenario**: During `/work-on-issue`, break the 4 gates into trackable sub-tasks

```
Issue #123: Implement badge generator
├─ Task 1: Issue Review [COMPLETED]
│  └─ Checkpoint: workflow.phase = "research"
├─ Task 2: Create Dev Plan [COMPLETED]
│  └─ Checkpoint: workflow.logAction("plan_created", "success")
├─ Task 3: Implement Changes [IN_PROGRESS]
│  ├─ Sub-Task 3a: Create badge entity
│  ├─ Sub-Task 3b: Add validation
│  └─ Sub-Task 3c: Write tests
│     └─ Checkpoint: Each commit logged with workflow.logCommit()
├─ Task 4: Code Review [PENDING, blockedBy: Task 3]
│  └─ Checkpoint: workflow.phase = "review"
└─ Task 5: Create PR [PENDING, blockedBy: Task 4]
   └─ Checkpoint: workflow.phase = "finalize"
```

**Integration Points:**

1. **Gate Checkpoints → Task Status Updates**

   ```
   When Gate 1 passed:
   - checkpoint.setPhase("workflow-id", "research")
   - TaskUpdate(taskId, status="completed")  // Issue Review task
   ```

2. **Action Logging → Task Metadata**

   ```
   checkpoint.logAction("critical_finding", "pending", {
     severity: "high",
     file: "src/badge.ts",
     taskId: "task-3-impl"  // Link back to native task
   })
   ```

3. **Commit Logging → Task Progress**
   ```
   Each commit during task 3:
   - checkpoint.logCommit(workflowId, sha, message)
   - Update task metadata: { commitCount: 5, lastCommitSha: "abc123" }
   ```

### 4.2 Moderate Fit: Milestone Issue Tracking

**Scenario**: `/auto-milestone` orchestrates multiple `/auto-issue` workflows

```
Milestone: OB3 Phase 1
├─ Issue #120 [COMPLETED]
├─ Issue #121 [IN_PROGRESS]
├─ Issue #122 [PENDING, blockedBy: #121]
└─ Issue #123 [PENDING, blockedBy: #120, #121]

Wave 1: Issues #120, #121 (parallel)
Wave 2: Issue #122 (depends on #121)
Wave 3: Issue #123 (depends on #120 AND #121)
```

**Integration Points:**

1. **Wave Orchestration → Blocking Dependencies**

   ```
   For Wave 2 (Issue #122):
   TaskCreate({
     subject: "Issue #122: Implement X",
     description: "...",
     addBlockedBy: ["issue-121-task"]  // Points to issue #121's main task
   })

   Checkpoint: linkWorkflowToMilestone(workflowId, milestoneId, waveNumber=2)
   ```

2. **Milestone Progress Visualization**

   ```
   TaskList shows:
   - 3 completed (100% green)
   - 1 in_progress (yellow)
   - 2 pending but not blocked (ready to start)
   - Total: 6/6 issues in OB3 Phase 1
   ```

3. **Parallel Worktree Tracking**
   ```
   Task metadata: { worktreeId: "wt-3", workflowId: "wf-121" }
   Allows mapping between native task and checkpoint worktree
   ```

### 4.3 Light Fit: Issue-Level Progress Tracking

**Use Case**: User wants to see progress during `/auto-issue` execution

**Current Limitation:**

- Checkpoint logs actions, but no native way to ask "what's the current status?"
- Requires parsing checkpoint.load() output

**Native Task Solution:**

```
Issue #100: Badge filtering
├─ Phase 1: Research [COMPLETED]
├─ Phase 2: Implement [IN_PROGRESS]
│  ├─ 5/8 files modified
│  ├─ 3 high-priority findings
│  └─ Retry attempt 2/3 on critical finding
└─ Phase 3: Review [PENDING]

TaskUpdate on each phase transition:
checkpoint.setPhase(workflowId, "implement")
TaskUpdate(taskId, status="in_progress", metadata={
  phase: "implement",
  filesModified: 5,
  totalFiles: 8,
  highPriorityFindings: 3,
  retryAttempt: 2,
  maxRetries: 3
})
```

---

## 5. Potential Conflicts/Overlaps

### 5.1 Status Representation

| Aspect                | Checkpoint                                               | Native Task                                | Conflict                                  |
| --------------------- | -------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| **Phases**            | 8 distinct phases (research→finalize, planning→cleanup)  | 3 statuses (pending/in_progress/completed) | MAJOR: Different semantics                |
| **Granularity**       | Issue-level + action-level                               | Single entity per task                     | Minor: Task can represent phase or action |
| **State Transitions** | Directional phases (can only move forward with setPhase) | Free state changes                         | Minor: Allows invalid transitions         |

**Resolution:** Use native tasks for high-level progress, checkpoint for detailed phase tracking

### 5.2 Ownership/Assignment

| Aspect               | Checkpoint                    | Native Task     | Conflict                              |
| -------------------- | ----------------------------- | --------------- | ------------------------------------- |
| **Owner Tracking**   | None (implicit: orchestrator) | taskOwner field | Minor: Task owner could be agent name |
| **Multi-Assignment** | Not supported                 | Single owner    | Minor: No shared responsibility model |

**Resolution:** Use task owner for agent/human assignments, checkpoint for implicit orchestrator ownership

### 5.3 Metadata Storage

| Aspect               | Checkpoint                     | Native Task                | Conflict                         |
| -------------------- | ------------------------------ | -------------------------- | -------------------------------- |
| **Actions Metadata** | Unstructured JSON per action   | Unstructured JSON per task | Overlap: Could duplicate data    |
| **Historical Data**  | All actions kept (audit trail) | Only current metadata kept | MAJOR: Native tasks lose history |

**Resolution:** Checkpoint remains source of truth for audit trail; native tasks show current state snapshot

### 5.4 Data Persistence

| Aspect                | Checkpoint                             | Native Task                                | Conflict                             |
| --------------------- | -------------------------------------- | ------------------------------------------ | ------------------------------------ |
| **Storage**           | SQLite DB (.claude/execution-state.db) | Claude Code's native persistence           | None: Separate concerns              |
| **Query Interface**   | Programmatic (checkpoint.findByIssue)  | CLI-based (TaskList, TaskGet)              | None: Complementary interfaces       |
| **Session Lifecycle** | Persists across sessions               | Scoped to session (with checkpoint-plugin) | None: Both persist, different scopes |

**Resolution:** Use both - checkpoint for cross-session persistence, native tasks for session UI

---

## 6. Recommended Integration Strategy

### 6.1 Phase 1: Sub-Task Tracking (High Value, Low Risk)

**Goal**: Track work during `/work-on-issue` using native tasks

**Implementation:**

1. At workflow start: Create 5 tasks (Issue Review → PR Creation)
2. At each gate pass: Update task status and move to next
3. During implementation: Create sub-tasks for implementation work
4. Show task list to user for progress visibility

**Checkpoint Changes:** None (fully compatible)

**Native Task Usage:**

```
// At /work-on-issue start
TaskCreate({
  subject: "Gate 1: Review issue #123",
  description: "Fetch issue, check blockers, validate requirements",
  activeForm: "Reviewing issue"
})

// At gate pass
TaskUpdate(taskId, status="completed")
TaskCreate({
  subject: "Gate 2: Create dev plan",
  description: "Create detailed implementation plan",
  activeForm: "Creating dev plan",
  addBlockedBy: ["gate-1-task"]  // Ensure sequencing
})
```

**Expected Outcome:** Users see progress tracking UI naturally in conversation

### 6.2 Phase 2: Milestone Coordination (Medium Value, Medium Risk)

**Goal**: Track parallel `/auto-issue` execution in `/auto-milestone`

**Implementation:**

1. Create task per issue in milestone
2. Use blockedBy to enforce wave dependencies
3. Update task status as issues complete
4. Show milestone progress (X of Y complete)

**Checkpoint Changes:** Link workflow to task in metadata

**Native Task Usage:**

```
// Create issue task with wave constraints
for (const issue of wave1Issues) {
  TaskCreate({
    subject: `Issue #${issue}: ${issue.title}`,
    description: `Part of milestone: ${milestoneName}`,
    metadata: {
      issueNumber: issue,
      waveNumber: 1,
      workflowId: workflowId
    }
  })
}

// For wave 2, add blockedBy
for (const issue of wave2Issues) {
  const wave1Tasks = TaskList().filter(t => t.metadata.waveNumber === 1)
  TaskCreate({
    subject: `Issue #${issue}: ${issue.title}`,
    addBlockedBy: wave1Tasks.map(t => t.id),
    metadata: { waveNumber: 2 }
  })
}
```

**Expected Outcome:** `/auto-milestone` can show dependency graph visually, prevent out-of-order execution

### 6.3 Phase 3: Metrics Integration (Lower Priority)

**Goal**: Capture native task usage metrics for dogfooding

**Implementation:**

1. Log task list snapshots at phase boundaries
2. Calculate task completion rates
3. Track average task duration
4. Compare with checkpoint metrics

**Checkpoint Changes:** Add `native_task_metrics` table or extend context_metrics

**Not Recommended Yet**: Requires more dogfooding data to validate value

---

## 7. Implementation Roadmap

### 7.1 Minimal Integration (Recommended for MVP)

**What to do:**

1. Create native task for each gate in `/work-on-issue`
2. Update task status as gates pass
3. Show `TaskList()` to user after each phase

**Effort:** 1-2 hours
**Risk:** Low (non-breaking)
**Value:** Users see clear progress

### 7.2 Full Integration (Future)

**What to do:**

1. Add `native_task_metrics` table to checkpoint DB
2. Log task snapshots on phase transitions
3. Build `/status` command using TaskList
4. Enhance `/auto-milestone` to use blockedBy for wave enforcement

**Effort:** 4-6 hours
**Risk:** Medium (affects orchestrator logic)
**Value:** Unified progress tracking, dependency enforcement

---

## 8. Specific Code Locations

| Component                    | Location                                                       | Size          | Key Functions                                                            |
| ---------------------------- | -------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| **Checkpoint API**           | `packages/claude-knowledge/src/checkpoint/`                    | 1.5KB (index) | `checkpoint.create()`, `checkpoint.setPhase()`, `checkpoint.logAction()` |
| **Workflow Implementation**  | `packages/claude-knowledge/src/checkpoint/workflow.ts`         | 580 lines     | Complete workflow CRUD                                                   |
| **Milestone Implementation** | `packages/claude-knowledge/src/checkpoint/milestone.ts`        | 357 lines     | Milestone CRUD + baseline snapshots                                      |
| **MCP Tools**                | `packages/claude-knowledge/src/mcp-server/tools/checkpoint.ts` | 329 lines     | `checkpoint_workflow_find/create/update` tools                           |
| **SQLite Schema**            | `packages/claude-knowledge/src/db/sqlite.ts`                   | ~150 lines    | Tables: workflows, actions, commits, milestones, baselines               |
| **Type Definitions**         | `packages/claude-knowledge/src/types.ts`                       | 633 lines     | All data models (Workflow, Action, Commit, Milestone, etc.)              |
| **Workflow Rules**           | `.claude/rules/gate-workflow.md`                               | 53 lines      | Gate requirements and enforcement                                        |
| **Auto-Issue Rules**         | `.claude/rules/auto-issue-rules.md`                            | 301 lines     | Phase rules, retry logic, escalation                                     |
| **Development Workflows**    | `docs/development-workflows.md`                                | 116 lines     | Overview of all 3 workflow types                                         |

---

## 9. Key Insights

### 9.1 Why the Checkpoint System Exists

The checkpoint system was created because:

1. **Workflows are complex**: 4-8 phases with specific requirements
2. **Debugging is critical**: Audit trail of all actions essential for troubleshooting
3. **Parallel execution**: Milestones need to track multiple workflows with wave ordering
4. **Metrics/Dogfooding**: Need to capture what happened during execution for learning

The native task system wasn't available or hadn't been designed for these purposes at the time.

### 9.2 Why Native Tasks Don't Replace Checkpoint

1. **No audit trail**: Task updates are final; can't replay history
2. **No phases**: Task status is binary, not workflow-aware
3. **No metrics**: Can't capture retry counts, findings, etc. as structured data
4. **No wave ordering**: blockedBy creates DAG, but no "execution wave" concept
5. **Session-scoped**: Checkpoint persists across sessions; native tasks may not

### 9.3 Why Native Tasks Complement Checkpoint

1. **UI/UX**: Native progress visualization without parsing JSON
2. **Ownership**: Clear assignment of work to agents
3. **Blocking Semantics**: Prevents execution of unready tasks
4. **Natural Language**: Easier for users to understand (imperatives: "Run tests")
5. **Built-in**: No additional database or tool setup

---

## 10. Conclusion

**Strategic Recommendation: Two-Tier Model**

**Tier 1 (Source of Truth): Checkpoint System**

- Maintains phase tracking, audit trail, retry counts, metrics
- Used by orchestrator for workflow state management
- Persists across sessions
- Accessed programmatically

**Tier 2 (User Interface): Native Task System**

- Shows progress to user
- Enforces blocking dependencies
- Tracks ownership/assignment
- Accessed via TaskList/TaskCreate/TaskUpdate
- Recreated each session from checkpoint state

**Implementation Path:**

1. **Now**: Use native tasks for progress visualization in `/work-on-issue` (MVP)
2. **Next**: Extend to `/auto-milestone` wave coordination
3. **Future**: Build metrics aggregation across both systems

**Key Files to Watch:**

- `packages/claude-knowledge/src/checkpoint/workflow.ts` - Where phase transitions happen
- `.claude/rules/gate-workflow.md` - Where gate semantics are defined
- `docs/development-workflows.md` - Where workflows are documented

---

## Appendix: Data Flow Examples

### Example 1: Gated Workflow with Native Tasks

```
/work-on-issue #123

T+0min
  TaskCreate("Gate 1: Review issue", status=pending)
  checkpoint.create(123, "feat/issue-123")
  → workflow.phase = "research", workflow.status = "running"

T+5min (Gate 1 passed)
  TaskUpdate(gate1, status=completed)
  checkpoint.setPhase(workflow.id, "research")
  TaskCreate("Gate 2: Create plan", addBlockedBy=[gate1])

T+20min (Gate 2 passed)
  TaskUpdate(gate2, status=completed)
  TaskCreate("Gate 3: Implement", addBlockedBy=[gate2])
  checkpoint.logAction("plan_created", "success", {
    planPath: ".claude/dev-plans/issue-123.md"
  })

T+60min (Implementation done)
  checkpoint.logCommit(workflow.id, "abc123", "feat: add badge generator")
  checkpoint.logCommit(workflow.id, "def456", "test: add badge tests")
  TaskUpdate(implement, status=completed)

T+75min (Gate 3 passed)
  TaskUpdate(gate3, status=completed)
  TaskCreate("Gate 4: PR Review", addBlockedBy=[gate3])
  checkpoint.setPhase(workflow.id, "review")

T+90min (Gate 4 passed)
  TaskUpdate(gate4, status=completed)
  checkpoint.setPhase(workflow.id, "finalize")
  checkpoint.setStatus(workflow.id, "completed")
  → User creates PR manually
```

### Example 2: Auto-Milestone with Wave Coordination

```
/auto-milestone "OB3 Phase 1"

Phase 1: Planning
  checkpoint.createMilestone("OB3 Phase 1", 42)
  checkpoint.saveBaseline(milestone.id, { lintErrors: 0, ... })

  analyze dependencies → 3 waves identified
  Wave 1: #120 (free), #121 (free)
  Wave 2: #122 (depends on #121)
  Wave 3: #123 (depends on #120, #121)

Phase 2: Execute (parallel)
  For Wave 1:
    TaskCreate("Issue #120: X", waveNumber=1)
    TaskCreate("Issue #121: Y", waveNumber=1)
    checkpoint.create(120, "feat/issue-120")
    checkpoint.create(121, "feat/issue-121")
    spawn worktree 1 → /auto-issue #120
    spawn worktree 2 → /auto-issue #121

  Meanwhile, Wave 2 tasks blockedBy Wave 1:
    TaskCreate("Issue #122: Z", blockedBy=[task120, task121])
    (task not claimed until both Wave 1 tasks complete)

  When Wave 1 completes:
    TaskUpdate(task120, status=completed)
    TaskUpdate(task121, status=completed)
    TaskList shows task122 now ready (blockedBy empty)
    Auto-start Wave 2:
      spawn worktree 3 → /auto-issue #122

Phase 3: Review
  poll TaskList for in_progress tasks
  for each completed task: run review agents

Phase 4: Merge
  for each wave in order:
    for each completed issue:
      git push && create PR && merge

Phase 5: Cleanup
  checkpoint.listMilestoneWorkflows(milestone.id)
  delete all worktrees
  checkpoint.setMilestoneStatus(milestone.id, "completed")
```

---

## References

- Tool Definitions: `packages/claude-knowledge/src/mcp-server/tools/checkpoint.ts`
- Type System: `packages/claude-knowledge/src/types.ts` (lines 1-80 for Workflow types)
- Workflow Rules: `.claude/rules/gate-workflow.md`, `.claude/rules/auto-issue-rules.md`
- Development Overview: `docs/development-workflows.md`
- Database Schema: `packages/claude-knowledge/src/db/sqlite.ts` (lines 8-160)
