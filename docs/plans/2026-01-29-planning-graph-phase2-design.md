# Planning Graph Phase 2: Generic Plan/Step Model

## Context

Phase 1 (#625) shipped Goal/Interrupt stack with push/pop/status. It works, but the stack is flat — it knows _what you're doing_ but not _what comes next_. In practice, this means forgetting to `/goal` before starting an issue and `/done` after merging, because the planning graph is a side channel rather than the driver.

The learning graph vision doc describes the same problem for learners: goals with ordered steps, completion from external sources, status that drives next actions. Both need the same architecture.

## Problem

1. No structured representation of plan steps within a goal
2. `/plan status` can't recommend concrete next actions
3. Workflows (`/auto-issue`, `/work-on-issue`) don't interact with the planning graph
4. Manual `/goal` and `/done` are easy to forget
5. Planning graph is passive (reports state) rather than active (drives work)

## Design

### Core Model: Plan + PlanStep

A **Plan** is an ordered set of steps toward a Goal. A **PlanStep** is a concrete unit of work within a plan. Step completion is derived from an external source at query time — never stored.

```
Goal: "07 - UI Components milestone"
  └── Plan: "UI Components execution order"
       ├── Step 1: #594 "Define styling tokens" [DONE - issue closed]
       ├── Step 2: #595 "Refactor component styles" [DONE - PR merged]
       ├── Step 3: #598 "Badge card component" [NEXT]
       ├── Step 4: #599 "Badge list component" [BLOCKED by #598]
       ...
```

The same model serves the learning graph:

```
Goal: "AWS Solutions Architect"
  └── Plan: "CKA certification track"
       ├── Step 1: "Docker Fundamentals" [DONE - badge earned]
       ├── Step 2: "Kubernetes Basics" [NEXT]
       ├── Step 3: "CKA Exam Prep" [BLOCKED by Step 2]
       ...
```

### Schema

```typescript
interface Plan {
  id: string;
  title: string;
  goalId: string; // PART_OF relationship to Goal
  sourceType: "milestone" | "epic" | "learning-path" | "manual";
  sourceRef?: string; // milestone number, epic issue number, curriculum ID, etc.
  createdAt: string;
}

interface PlanStep {
  id: string;
  planId: string; // PART_OF relationship to Plan
  title: string;
  ordinal: number; // global execution order
  wave: number; // parallelization group
  externalRef: {
    type: "issue" | "badge" | "manual";
    number?: number; // GitHub issue number
    criteria?: string; // badge match criteria
  };
  dependsOn: string[]; // PlanStep IDs (DEPENDS_ON relationship)
}

// Extension to existing Goal entity
interface Goal {
  // ...existing Phase 1 fields
  planStepId?: string; // links to PlanStep when started via /plan start
}
```

### Status Resolution

Step status is resolved at query time from the external source. Never stored locally (except for `manual` type).

```typescript
interface CompletionResolver {
  resolve(step: PlanStep): "done" | "in-progress" | "not-started";
}

// milestone → gh issue view <number> --json state
//   closed = "done"
//   open + has branch/PR = "in-progress"
//   open = "not-started"

// learning-path → query badge backpack for matching badge
//   found = "done", not found = "not-started"

// manual → check local completion flag in planning DB
//   only type where status IS stored
```

Resolution uses a 5-minute TTL cache (same pattern as existing stale detection) to avoid repeated GitHub API calls.

### Planning as the Orchestration Layer

The planning graph wraps workflows rather than being called by them. Workflows remain unaware of planning.

```
┌─ Planning Layer ──────────────────────┐
│  push goal                            │
│  ┌─ Workflow ──────────────────────┐  │
│  │  setup → research → implement   │  │
│  │  → review → finalize            │  │
│  └─────────────────────────────────┘  │
│  detect completion → pop goal         │
│  show next step                       │
└───────────────────────────────────────┘
```

### The `/plan start` Command

```
/plan start [issue-number]

1. Look up issue in any active Plan
   → Found: "Step 3/21 in UI Components plan"
   → Not found: "No plan context. Push as standalone goal?"

2. Push goal onto stack (linked to plan step via planStepId)

3. Ask: "How do you want to work on this?"
   → /auto-issue N (Recommended — fully autonomous)
   → /work-on-issue N (Supervised with gates)
   → Manual (just track the goal, work freestyle)

4. Delegate to chosen workflow (or do nothing for manual)

5. On completion (workflow finishes, issue closes):
   → Auto-pop goal
   → Show plan progress + next step
   → Offer to start next
```

### Surviving Compaction & Interruption

The wrapper intent is encoded in the data, not conversation context. When `/plan start` pushes a goal with a `planStepId`, that linkage persists in SQLite. Any future session can detect completion and auto-pop.

| Scenario                   | What preserves state                   | Recovery                                             |
| -------------------------- | -------------------------------------- | ---------------------------------------------------- |
| Normal completion          | Wrapper in context, pops synchronously | Immediate                                            |
| Compaction mid-workflow    | Goal + `planStepId` in SQLite          | Next `/plan status` detects closed issue, offers pop |
| Session dies               | Goal + `planStepId` in SQLite          | Same — next session's `/plan status`                 |
| Workflow checkpoint exists | Checkpoint tracks phase + workflow ID  | Resume workflow; planning state already durable      |

### Stale Detection Extension

Existing stale detection gains one new check: "Goal has `planStepId` and linked issue is closed on GitHub → offer auto-pop."

## Commands

### New

| Command                       | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `/plan create [milestone]`    | Create Plan from milestone analysis, link to active Goal           |
| `/plan create --epic [issue]` | Create Plan from epic's sub-issues and GitHub dependency graph     |
| `/plan start [issue]`         | Push goal with plan context, offer workflow choice, wrap execution |
| `/plan status`                | (Enhanced) Show plan progress, resolve step status, recommend next |

### Unchanged

| Command                         | Behavior                                         |
| ------------------------------- | ------------------------------------------------ |
| `/goal`                         | Push standalone goal (no plan context)           |
| `/interrupt`                    | Push interrupt                                   |
| `/done`                         | Pop stack (manual fallback, still works)         |
| `/auto-issue`, `/work-on-issue` | Callable directly, just without planning wrapper |

## Plan Creation Flow

### From Milestone

```
/plan create [milestone-name-or-number]

1. Fetch milestone issues from GitHub
2. Run milestone-planner analysis (dependency graph, waves)
3. Create Plan entity linked to active Goal (PART_OF)
   sourceType: "milestone", sourceRef: milestone number
4. Create PlanStep for each issue:
   - title from issue title
   - wave from planner output
   - ordinal within wave
   - externalRef: { type: "issue", number: N }
5. Create DEPENDS_ON relationships between steps
6. Display plan summary
```

### From Epic

```
/plan create --epic [issue-number]

1. Fetch epic issue from GitHub
2. Parse sub-issues:
   - GitHub sub-issues API (native sub-issues)
   - Task list checkboxes in body (fallback)
3. Read native GitHub dependency graph (blocking/blocked-by via GraphQL)
4. Compute waves from dependency topology:
   - Wave 1: issues with no blockers
   - Wave 2: issues blocked only by Wave 1
   - etc.
5. Create Plan entity linked to active Goal (PART_OF)
   sourceType: "epic", sourceRef: epic issue number
6. Create PlanStep for each sub-issue
7. Create DEPENDS_ON from GitHub blocking relationships
8. Display plan summary
```

The epic flow is simpler than the milestone flow — dependencies are already explicit in GitHub rather than inferred by the milestone planner. This makes it the more reliable source when available.

### From Learning Path

```
/plan create --type learning-path

1. User describes goal or imports curriculum
2. Create PlanSteps with externalRef: { type: "badge", criteria: "..." }
3. DEPENDS_ON for prerequisites
```

## Relationship to Vision Docs

This design implements the **Plan** entity type from the planning graph vision and the **LearningPath** entity type from the learning graph vision as a single generic model. Both are Plan + PlanStep with different `sourceType` values.

### Vision entities addressed

| Vision Entity                    | Phase 2 Implementation                            |
| -------------------------------- | ------------------------------------------------- |
| Plan (planning-graph.md)         | `Plan` with `sourceType: "milestone"` or `"epic"` |
| LearningPath (learning-graph.md) | `Plan` with `sourceType: "learning-path"`         |
| PART_OF relationship             | Plan → Goal, PlanStep → Plan                      |
| DEPENDS_ON relationship          | PlanStep → PlanStep                               |

### Vision entities deferred

Decision, Blocker, Bug, Sidequest, Sprint — not needed yet. Add when real usage demands them.

### Open questions resolved

- **Planning graph Q4** ("Should closed issues auto-pop?"): Yes, via `planStepId` detection.
- **Planning graph Q1** ("How detailed should plans be?"): Issue-level granularity for milestones, badge-level for learning.

## Success Criteria

1. `/plan status` shows concrete next issue with progress fraction
2. `/plan start` wraps workflows with automatic push/pop
3. No manual `/goal` or `/done` needed when using `/plan start`
4. Planning state survives compaction and session interruption
5. Same model works for milestone plans and learning paths
6. Workflows remain unmodified — planning wraps them, not the reverse

## Dependencies

- Phase 1 planning graph (#625) — done
- Milestone planner agent — exists, produces execution plans
- #622 (persist milestone plans) — related but separate; this design supersedes the storage approach with structured Plan/PlanStep entities

---

_Designed Jan 29, 2026. Extends planning-graph.md Phase 1. Generic model for both dev workflows and learning journeys._
