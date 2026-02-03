# Learning Graph: Journey Management for Badge Earners

## Problem Statement

Learning is non-linear. Goals get interrupted by life, discoveries lead to new interests, and context-switching causes priorities to drift. Badge platforms track _what was achieved_ (credentials, certifications) but not _what the plan is_ or _where the learner is in their journey_.

**Symptoms:**

- Setting a learning goal in January, forgetting it exists by March
- Getting lost 3 levels deep in prerequisite rabbit holes
- Badge collections that don't tell a coherent story
- Decisions made about learning paths forgotten weeks later
- No visibility into how current activity relates to stated goals

**Root cause:** No persistent, queryable representation of the _learning plan_ that a system can reference to provide guidance.

---

## Vision

A **learning graph** that gives learners (and their tools) the context to actively manage learning journeys:

- Know the goals and their priorities
- Track the learning stack (what interrupted what)
- Remember decisions and their rationale
- Provide appropriate nudges when learning drifts
- Facilitate prioritization and reflection

**The shift:** From badge platform as credential store → badge platform as informed learning companion.

---

## Concept Mapping

The [Planning Graph](./planning-graph.md) defines project management for developer workflows. The same concepts map directly to learning management:

| Planning Graph (dev) | Learning Graph (learner)                        |
| -------------------- | ----------------------------------------------- |
| **Goal**             | Learning Goal ("Get AWS cert", "Master Vue.js") |
| **Plan**             | Learning Path (courses, projects, practice)     |
| **Decision**         | Career/learning pivot with rationale            |
| **Blocker**          | Prerequisite gap, resource constraint           |
| **Bug**              | Knowledge gap discovered mid-project            |
| **Sidequest**        | Interesting tangent from main learning          |
| **Sprint**           | Learning sprint ("January: TypeScript focus")   |
| **PR merged**        | Badge earned                                    |
| **Git commits**      | Practice sessions, course modules completed     |
| **Git activity**     | Badge earning activity                          |
| **Drift detection**  | Learning drift detection                        |

---

## Core Concepts

### Entities

| Entity             | Purpose                                  | Example                                 |
| ------------------ | ---------------------------------------- | --------------------------------------- |
| **LearningGoal**   | High-level outcome you're working toward | "AWS Solutions Architect certification" |
| **LearningPath**   | Concrete approach to achieve a goal      | "Complete Cantrill course + labs"       |
| **Decision**       | Choice made with rationale               | "Focus frontend, defer backend"         |
| **Prerequisite**   | Something needed before progress         | "Need Docker basics first"              |
| **KnowledgeGap**   | Deficiency discovered during learning    | "Don't understand IAM roles"            |
| **Sidequest**      | Exploration tangent from main learning   | "Exploring Rust for fun"                |
| **LearningSprint** | Time-boxed focus period                  | "Q1 2026: Cloud fundamentals"           |

### Relationships

| Relationship     | Meaning            | Example                                 |
| ---------------- | ------------------ | --------------------------------------- |
| `PART_OF`        | Hierarchy          | Path → Goal                             |
| `DEPENDS_ON`     | Prerequisite       | "AWS exam depends on networking basics" |
| `BLOCKED_BY`     | Cannot proceed     | Goal → Prerequisite                     |
| `INTERRUPTED_BY` | Life interrupt     | Learning → Job change                   |
| `PAUSED_FOR`     | Intentional switch | Goal → Sidequest                        |
| `INFORMED_BY`    | Decision basis     | Path → Decision                         |
| `DEFERRED_TO`    | Pushed to future   | Goal → Sprint                           |
| `EVIDENCED_BY`   | Proof of progress  | Goal → Badge                            |

### The Learning Stack

Learning is modeled as a stack of contexts:

```
LearningGoal: AWS Solutions Architect [PAUSED]
  └── Prerequisite: Learn Docker [PAUSED]
       └── Interrupt: Job needs Python urgently [ACTIVE]
            └── Current Focus
```

- **Push**: Interrupt or prerequisite adds a level
- **Pop**: Completing learning returns to previous context
- **Depth**: How many levels deep (trigger for reflection prompts)

**Neurodivergent-first design**: Stack depth is visibility, not shame. Non-linear learning is expected and supported. The stack helps you find your way back, not judge how you got there.

---

## Badges as Ground Truth

Just as git commits prove development work happened, **badges prove learning happened**:

- Verifiable timestamps
- Specific achievement claims
- Issuer attribution (including self)
- Portable evidence

### Self-Signed Badges Fit Perfectly

Not all learning produces third-party credentials. Self-signed badges fill the gap:

| Learning Activity        | Self-Signed Badge                    |
| ------------------------ | ------------------------------------ |
| Read a technical book    | "Completed: Designing Data Apps"     |
| Built a practice project | "Built: Vue Todo App"                |
| Completed online module  | "Finished: Docker Fundamentals Ch.3" |
| Attended workshop        | "Attended: Local Python Meetup"      |
| Practiced skill          | "Practice: 10 hours TypeScript"      |

These self-signed badges become the "commit history" of learning - small, verifiable units that accumulate toward larger goals.

### Badge-Goal Linking

```
LearningGoal: "Full-Stack Developer"
  ├── Badge: "Vue.js Fundamentals" (earned)
  ├── Badge: "TypeScript Basics" (earned)
  ├── Badge: "Node.js APIs" (in progress)
  └── Badge: "PostgreSQL" (not started)

Progress: 2/4 core badges (50%)
```

---

## Behaviors

### Design Principles

1. **Pull, not push**: Learning context is queried on demand, not auto-injected
2. **Factual tone**: State data without judgment. Let facts speak.
3. **Badges as ground truth**: Earned credentials are objective evidence
4. **Same infrastructure**: Extends planning graph, uses same persistence

### On-Demand Status (`/learning status`)

User queries when they need context:

```
Current stack:
  Python for work [ACTIVE]
    ↑ interrupted: Docker basics
    ↑ paused: AWS Solutions Architect

Badge activity (last 30 days):
  - 3 Python badges earned
  - 0 AWS badges earned
  - 1 Docker badge earned

Observations:
  - AWS marked as Q1 priority, no badges in 30 days
  - Stack depth: 3
  - Python interrupt ongoing for 2 weeks
```

### Factual Nudges

No emotional calibration - just state what the data shows:

| Situation         | Factual Statement                                                      |
| ----------------- | ---------------------------------------------------------------------- |
| Stack depth       | "Stack depth: 3. Current: Python. Interrupted: Docker. Paused: AWS."   |
| Drift detected    | "Last 30 days: 3 Python badges, 0 AWS badges. AWS is marked priority." |
| Goal stale        | "AWS goal created 3 months ago. No linked badges yet."                 |
| Sprint ending     | "Q1 sprint ends in 2 weeks. 1/4 planned badges earned."                |
| Prerequisite loop | "Docker was a prerequisite for AWS. Now 3 levels deep in prereqs."     |

### Drift Detection via Badges

The learning graph syncs against badge activity:

```typescript
// On /learning status or session start
const recentBadges = getBadgesLast30Days();
const activeGoal = getActiveLearningGoal();

const goalBadges = recentBadges.filter((b) => b.relatedTo(activeGoal));
const otherBadges = recentBadges.filter((b) => !b.relatedTo(activeGoal));

if (goalBadges.length === 0 && otherBadges.length > 3) {
  // Factual observation
  report(
    `No badges toward "${activeGoal.title}" in 30 days. ${otherBadges.length} badges elsewhere.`,
  );
}
```

---

## Capture Patterns

### 1. Explicit (Commands)

```
/learn-goal Master Kubernetes           # Add learning goal
/learn-path CKA certification track     # Add path for current goal
/decide Focus on EKS not GKE because AWS job  # Log decision
/prereq Need Linux basics first         # Create prerequisite
/interrupt Work needs urgent Python     # Create life interrupt
/sidequest Exploring Rust for fun       # Create intentional tangent
/done                                   # Pop stack, return to previous
/defer Push to Q2                       # Move current to future
```

### 2. Badge-Triggered

When a badge is earned, prompt for linking:

> **System:** "You earned 'Docker Fundamentals'. Link to a learning goal?"
> **Options:** [AWS Solutions Architect] [Create new goal] [No link]

### 3. Reflection Prompts

Weekly or on-demand:

```
Weekly learning review:

Badges earned this week:
- Docker Basics (self-signed)
- Python Data Structures (Coursera)

Current stack:
- Python for work (active, 2 weeks)
- Docker (paused)
- AWS (paused)

Reflection prompts:
- Python interrupt ongoing 2 weeks. Expected duration?
- AWS hasn't moved in 30 days. Still a priority?
```

---

## Integration with Open Badges

### OB3 Credentials as Milestones

Major achievements become verifiable OB3 credentials:

| Badge Type     | Use Case                              |
| -------------- | ------------------------------------- |
| Self-signed    | Practice, reading, informal learning  |
| Issuer-signed  | Course completion, certification      |
| OB3 Credential | Major milestone, shareable credential |

### Backpack as Learning History

The badge backpack becomes the equivalent of a git commit history:

```
Backpack View:

2026-01-28  [Self] Practice: TypeScript generics (2 hours)
2026-01-25  [Udemy] TypeScript Advanced Patterns
2026-01-20  [Self] Read: Effective TypeScript Ch. 4-6
2026-01-15  [Self] Built: Type-safe API client
2026-01-10  [Udemy] TypeScript Fundamentals

Goal: "TypeScript Mastery"
Progress: ████████░░ 80%
```

### Achievement Unlocking

When badge patterns indicate goal completion:

```
Goal: "Docker Proficiency"
Required evidence:
  ✓ Fundamentals course badge
  ✓ 5+ practice session badges
  ✓ Built containerized app badge
  ○ Production deployment badge

Status: 3/4 requirements met
Suggested: Deploy a containerized app to earn final badge
```

---

## Minimal Implementation

Start with the simplest useful version, add complexity only when needed.

### Phase 1: Three Entity Types

| Entity           | Purpose                           |
| ---------------- | --------------------------------- |
| **LearningGoal** | What you're trying to learn       |
| **Interrupt**    | Life event that paused the goal   |
| **BadgeLink**    | Connection between badge and goal |

### Phase 1: Four Commands

| Command               | Action                                     |
| --------------------- | ------------------------------------------ |
| `/learn-goal <title>` | Push a learning goal onto the stack        |
| `/interrupt <title>`  | Push an interrupt (links to current focus) |
| `/done`               | Pop current item, return to previous       |
| `/learning status`    | Show stack, badge activity, observations   |

### Phase 1: One Integration

| Integration   | Description                                      |
| ------------- | ------------------------------------------------ |
| Badge linking | When badge earned, prompt to link to active goal |

### Prototype Location

Prototype in **claude-knowledge** package:

- Same SQLite infrastructure as knowledge graph
- Same JSONL sync pattern for persistence
- MCP tools for querying learning state
- Dogfood with developer learning goals first

---

## Product Differentiator

### What Badge Platforms Do Today

- Issue credentials
- Display achievements
- Verify authenticity
- Store in backpack

### What the Learning Graph Adds

- Track the _journey_, not just destinations
- Explicit support for non-linear learning paths
- Visibility into interrupts and context switches
- Drift detection and reflection prompts
- Badges as evidence linked to goals

### The Value Proposition

> "Most badge platforms tell you what you've achieved. We help you manage the journey to get there."

For neurodivergent learners especially, the explicit stack model validates that non-linear paths are normal. Getting interrupted isn't failure - it's just pushing to the stack. The system helps you find your way back.

---

## Success Criteria

1. **Journey visibility**: Always know your learning stack and how to get back to main goals
2. **Drift awareness**: Factual nudges when badge activity doesn't match stated goals
3. **Decision memory**: "Why did I choose X path?" is answerable months later
4. **Progress evidence**: Badges accumulate as proof toward goals
5. **Reflection habits**: Weekly review becomes natural with system support
6. **Non-linear acceptance**: Stack depth is information, not judgment

---

## Open Questions

1. **Badge-goal inference**: Should the system suggest goal links based on badge content?
2. **Social features**: Share learning stacks? Follow others' journeys?
3. **Gamification**: Streak tracking, achievements for consistency? (risk: anxiety)
4. **Time tracking**: Estimate time spent? Or just count badges?
5. **Cross-platform**: Import badges from other platforms into learning graph?

---

## Relationship to Planning Graph

This document extends the [Planning Graph](./planning-graph.md) vision:

- **Same concepts**: Goals, Interrupts, Stack model, Drift detection
- **Different domain**: Learning instead of development
- **Same infrastructure**: SQLite, JSONL sync, MCP tools
- **Prototype together**: Both get built in claude-knowledge first

The planning graph helps manage the _work_ of building rollercoaster.dev.
The learning graph helps users manage the _learning_ that earns badges.

Both are expressions of the same core idea: **explicit context for non-linear journeys**.

---

## Next Steps

1. [x] Document vision (this document)
2. [ ] Implement minimal schema in claude-knowledge (LearningGoal, Interrupt, BadgeLink)
3. [ ] Implement `/learn-goal`, `/interrupt`, `/done` commands
4. [ ] Implement `/learning status` with badge activity
5. [ ] Add badge linking prompt on badge creation
6. [ ] Dogfood with personal learning goals
7. [ ] Iterate based on real usage
8. [ ] Design user-facing product based on prototype learnings

---

_Vision documented Jan 28, 2026. Companion to planning-graph.md. Start minimal, evolve based on real usage._
