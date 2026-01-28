# Planning First Rules

**Applies to:** Session start, task selection, "what's next?" questions

---

## Core Principle

**Always check the planning stack before deciding what to work on.**

The planning stack tracks active goals, paused work, and interrupts across sessions. It is the source of truth for current priorities.

---

## Session Start

When a session begins or the user asks "what should I work on?" / "what's next?":

1. **Check `planning_stack_status`** — see what's active, paused, or stale
2. **Search knowledge** for milestone plans — `knowledge_search_similar("milestone plan")`
3. Only fall back to `gh issue list` / `gh milestone list` if the stack is empty AND no plans exist

---

## When to Use Planning Tools

| Situation                                     | Tool                        |
| --------------------------------------------- | --------------------------- |
| Starting a new work objective                 | `planning_goal_push`        |
| Unplanned context switch (bug, urgent review) | `planning_interrupt_push`   |
| Finished current work item                    | `planning_stack_pop`        |
| Checking what's active / what to resume       | `planning_stack_status`     |
| Browsing full stack as markdown               | `planning://stack` resource |
| Checking if a milestone has a plan            | `knowledge_search_similar`  |

---

## Why Stack > Ad Hoc

- **Continuity**: Stack persists across sessions — no re-discovery needed
- **Context**: Shows what was interrupted and why
- **Stale detection**: Warns about items that may need attention
- **History**: Completed items generate summaries stored as learnings

---

## Planning Skills

| Skill          | Purpose                                     |
| -------------- | ------------------------------------------- |
| `/plan status` | Formatted stack display with stale warnings |
| `/goal`        | Push a new goal                             |
| `/interrupt`   | Push an interrupt                           |
| `/done`        | Pop top item (complete + summarize)         |

---

## Storing Plans

When you analyze a milestone or plan execution order for a set of issues, **store it** with `knowledge_store` so future sessions can retrieve it without re-fetching from GitHub.
