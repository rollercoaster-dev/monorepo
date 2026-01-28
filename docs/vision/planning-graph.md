# Planning Graph: Project Management for Human-AI Collaboration

## Problem Statement

Development work is non-linear. Plans get interrupted by bugs, discoveries lead to sidequests, and context-switching causes priorities to drift. The current tooling tracks _what happened_ (commits, issues, checkpoints) but not _what the plan is_ or _where we are in it_.

**Symptoms:**

- Starting sessions with no context about priorities
- Getting lost 3 levels deep in interruptions
- Claude follows whatever is asked without understanding the bigger picture
- Decisions made weeks ago are forgotten and revisited
- No pushback when work drifts from stated goals

**Root cause:** No persistent, queryable representation of the _plan_ that Claude can reference and use to provide guidance.

---

## Vision

A **planning graph** that gives Claude the context to be an active project management partner:

- Know the goals and their priorities
- Track the work stack (what interrupted what)
- Remember decisions and their rationale
- Provide appropriate pushback when work drifts
- Facilitate prioritization discussions

**The shift:** From Claude as task executor → Claude as informed collaborator with opinions.

---

## Core Concepts

### Entities

| Entity          | Purpose                                  | Example                          |
| --------------- | ---------------------------------------- | -------------------------------- |
| **Goal**        | High-level outcome you're working toward | "Ship OB3 Badge Generator"       |
| **Plan**        | Concrete approach to achieve a goal      | "Phase 1: Core API with Hono"    |
| **Decision**    | Choice made with rationale               | "Use Hono not Express because X" |
| **Blocker**     | Something preventing progress            | "Need schema validation library" |
| **Bug**         | Defect requiring fix                     | "CI failing on main"             |
| **Sidequest**   | Exploration or tangent from main work    | "Improve DX tooling"             |
| **Sprint/Wave** | Time-boxed focus period                  | "January focus: OB3 + Knowledge" |

### Relationships

| Relationship     | Meaning            | Example                          |
| ---------------- | ------------------ | -------------------------------- |
| `PART_OF`        | Hierarchy          | Plan → Goal                      |
| `DEPENDS_ON`     | Prerequisite       | "API depends on schema decision" |
| `BLOCKED_BY`     | Cannot proceed     | Goal → Blocker                   |
| `INTERRUPTED_BY` | Urgent interrupt   | Work → Bug                       |
| `PAUSED_FOR`     | Intentional switch | Goal → Sidequest                 |
| `INFORMED_BY`    | Decision basis     | Plan → Decision                  |
| `DEFERRED_TO`    | Pushed to future   | Task → Sprint                    |
| `SUPERSEDES`     | Replaced           | New Plan → Old Plan              |

### The Work Stack

Work is modeled as a stack of contexts:

```
Goal: Ship OB3 Badge Generator [PAUSED]
  └── Sidequest: Improve claude-knowledge [PAUSED]
       └── Bug: CI failing on main [ACTIVE]
            └── Current Focus
```

- **Push**: Interrupt or sidequest adds a level
- **Pop**: Completing work returns to previous context
- **Depth**: How many levels deep (trigger for nudges)

---

## Behaviors

### Design Principles

1. **Pull, not push**: Planning context is a tool you query, not auto-injected. Saves tokens, gives you control.
2. **Factual tone**: No "nice" or "tough" - just state the data. Let the facts speak.
3. **Git as ground truth**: Commits, PRs, and issues are objective evidence. Use them to detect drift.
4. **Same sync infrastructure**: `planning.jsonl` alongside `knowledge.jsonl` - already solved.

### On-Demand Status (`/plan status`)

User queries when they need context:

```
Current stack:
  Bug #621 (transcript test isolation) [ACTIVE]
    ↑ interrupted: Knowledge cleanup
    ↑ paused: OB3 Phase 1

Git activity (last 7 days):
  - 12 commits on claude-knowledge
  - 0 commits on openbadges-*
  - 3 issues closed: #606, #608, #569

Observations:
  - OB3 marked as January focus, no commits in 7 days
  - Stack depth: 3
  - Issue #608 closed but stack still shows knowledge cleanup active
```

### Factual Nudges

No emotional calibration - just state what the data shows:

| Situation      | Factual Statement                                                         |
| -------------- | ------------------------------------------------------------------------- |
| Stack depth    | "Stack depth: 3. Current: bug. Interrupted: cleanup. Paused: OB3."        |
| Drift detected | "Last 7 days: 12 commits on knowledge, 0 on OB3. OB3 is marked priority." |
| Stale stack    | "Issue #608 closed 2 days ago. Stack still shows it active."              |
| Time on task   | "Issue #621 opened 4 days ago, 6 commits, no PR yet."                     |
| Scope growth   | "Issue started as 'fix test'. Now has 3 sub-tasks and schema changes."    |

### Drift Detection via Git

The planning graph syncs against git activity:

```typescript
// On /plan status or session start
const recentCommits = getCommitsLast7Days();
const activeGoal = getActiveGoal();

const goalCommits = recentCommits.filter((c) => c.touchesGoalArea(activeGoal));
const otherCommits = recentCommits.filter(
  (c) => !c.touchesGoalArea(activeGoal),
);

if (goalCommits.length === 0 && otherCommits.length > 5) {
  // Factual observation, not judgment
  report(
    `No commits on ${activeGoal.title} in 7 days. ${otherCommits.length} commits elsewhere.`,
  );
}
```

### Time Tracking via Issues/PRs

Real elapsed time is unknowable, but work artifacts have timestamps:

- Issue opened → work started
- Commits → active development
- PR opened → ready for review
- PR merged → complete

```
Issue #621: opened Jan 22, 6 commits over 3 days, no PR
Issue #608: opened Jan 20, closed Jan 25 (5 days), PR #623 merged
```

---

## Capture Patterns

### 1. Explicit (Slash Commands)

```
/goal Ship OB3 Badge Generator        # Add goal
/plan Use Hono for API layer          # Add plan for current goal
/decide Use Hono because [rationale]  # Log decision
/bug CI is failing                    # Create interrupt
/sidequest Explore new test runner    # Create intentional tangent
/block Need schema validation         # Log blocker
/done                                 # Pop stack, return to previous
/defer Push to February               # Move current work to future
```

### 2. Extracted (Conversational)

Claude detects planning-relevant statements and confirms:

> **You:** "Oh wait, I need to fix this CI thing first"
> **Claude:** "Should I log this as an interrupt? I'll track that you paused knowledge cleanup to fix CI."

> **You:** "Let's just use Hono, Express is overkill"
> **Claude:** "Got it. Want me to capture that decision? 'Chose Hono over Express because it's lighter weight for our use case.'"

### 3. Hybrid (Structured Prompts)

Skills that prompt for structured input:

**`/plan week`**

```
Let's set priorities for this week.

Current goals:
1. OB3 Badge Generator (paused 3 days)
2. Knowledge cleanup (in progress)

What are the top 3 things you want to accomplish?
Any blockers I should know about?
Anything to defer?
```

**`/plan review`**

```
Week review:

Completed:
- [x] JSONL git sync (#608)
- [x] Fix LLM extraction (#606)

Still open:
- [ ] OB3 Phase 1 (no progress)
- [ ] Knowledge cleanup (80% done)

Observations:
- You went deep on knowledge tooling
- OB3 hasn't moved in a week

Adjust priorities for next week?
```

---

## Integration

### With Existing Systems

| System              | Integration                                                           |
| ------------------- | --------------------------------------------------------------------- |
| **Knowledge Graph** | Planning graph uses same SQLite infrastructure, separate entity types |
| **JSONL Sync**      | Plans sync via `.claude/planning.jsonl` alongside knowledge           |
| **Checkpoints**     | Workflows reference current goal/plan for context                     |
| **GitHub Issues**   | Goals can link to milestones, bugs link to issues                     |
| **handoff.md**      | Auto-generated from planning graph state                              |

### Schema Extension

```typescript
// New entity types
type PlanningEntity =
  | {
      type: "Goal";
      data: {
        title: string;
        priority: number;
        status: "active" | "paused" | "completed" | "deferred";
      };
    }
  | { type: "Plan"; data: { title: string; goalId: string; status: string } }
  | {
      type: "Decision";
      data: { choice: string; rationale: string; context: string };
    }
  | { type: "Blocker"; data: { description: string; blocking: string } }
  | {
      type: "Bug";
      data: {
        title: string;
        severity: "p0" | "p1" | "p2";
        issueNumber?: number;
      };
    }
  | {
      type: "Sidequest";
      data: { title: string; origin: string; timeBoxed?: number };
    }
  | {
      type: "Sprint";
      data: {
        name: string;
        startDate: string;
        endDate: string;
        focus: string[];
      };
    };

// New relationship types
type PlanningRelationship =
  | "PART_OF"
  | "DEPENDS_ON"
  | "BLOCKED_BY"
  | "INTERRUPTED_BY"
  | "PAUSED_FOR"
  | "INFORMED_BY"
  | "DEFERRED_TO"
  | "SUPERSEDES";
```

---

## Success Criteria

1. **Context on start**: Every session begins with relevant planning context
2. **Pushback happens**: Claude challenges drift at least once per session when appropriate
3. **Decisions remembered**: "Why did we choose X?" is answerable months later
4. **Stack visible**: Always know depth and path back to main goals
5. **Priorities discussed**: Weekly planning becomes a habit with Claude's help
6. **Less lost**: Reduced "where was I?" moments after context switches

---

## Resolved Concerns

| Concern           | Resolution                                                 |
| ----------------- | ---------------------------------------------------------- |
| **Token budget**  | Pull-based, not auto-injected. User queries when needed.   |
| **Pushback tone** | Factual only. State data, no emotional calibration.        |
| **Stack drift**   | Sync against git - closed issues, merged PRs update state. |
| **Time tracking** | Use issue/PR timestamps as proxy for elapsed time.         |
| **Persistence**   | Extend existing JSONL sync to `planning.jsonl`.            |

## Open Questions

1. **Granularity**: How detailed should plans be? Start minimal, add structure if needed.
2. **Decay**: Old decisions/sidequests - archive after N days? Or keep indefinitely?
3. **Multi-project**: Repo-scoped for now. Cross-repo is future work.
4. **Auto-cleanup**: Should closed issues auto-pop from stack? Or require explicit `/done`?

---

## Minimal Implementation

Start with the simplest useful version, add complexity only when needed.

### Phase 1: Two Entity Types

| Entity        | Purpose                            |
| ------------- | ---------------------------------- |
| **Goal**      | What you're trying to accomplish   |
| **Interrupt** | Bug/sidequest that paused the goal |

That's it. No Plan, Decision, Blocker, Sprint yet.

### Phase 1: Three Commands

| Command              | Action                                     |
| -------------------- | ------------------------------------------ |
| `/goal <title>`      | Push a goal onto the stack                 |
| `/interrupt <title>` | Push an interrupt (links to current focus) |
| `/done`              | Pop current item, return to previous       |

### Phase 1: One Query

| Command        | Output                                         |
| -------------- | ---------------------------------------------- |
| `/plan status` | Show stack, git activity, stale item detection |

### Decay: Summarize Completed Work

When items are completed, don't just archive - summarize:

```
Completed: "JSONL git sync" (Goal)
  Duration: 5 days (Jan 20-25)
  Artifacts: PR #623, Issues #606 #608 closed
  Interrupts: 2 (CI fix, CodeRabbit review)
  → Summary stored as Learning in knowledge graph
```

**Done**: Beads summarization implemented. See `.claude/research/beads-summarization.md` for research.

### Reminder Pattern

When git activity suggests stack is stale:

```
Issue #608 was merged 2 days ago.
Stack still shows "knowledge cleanup" as active.

Run /done to complete it, or /plan status to review.
```

User controls the stack, Claude provides reminders.

---

## Next Steps

1. [x] Document vision
2. [x] Research Beads summarization approach (`.claude/research/beads-summarization.md`)
3. [x] Implement minimal schema (Goal, Interrupt entities) - `planning_entities` + `planning_relationships` tables
4. [x] Implement `/goal`, `/interrupt`, `/done` commands - MCP tools + skills
5. [x] Implement `/plan status` with git integration - stale detection via `gh` CLI
6. [x] Add stale detection + reminder pattern - closed issue + paused duration checks
7. [ ] Iterate: add Decision, Sprint, etc. only if needed

---

_Vision documented Jan 25, 2026. Phase 1 implemented Jan 28, 2026 (#625). Start minimal, evolve based on real usage._
