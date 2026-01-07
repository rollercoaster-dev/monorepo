# Issue #338 Research: Workflow Logging System for Autonomous Agents

**Date:** 2026-01-07
**Issue:** [#338](https://github.com/rollercoaster-dev/monorepo/issues/338) - Add workflow logging system for autonomous agents
**Parent Epic:** [#337](https://github.com/rollercoaster-dev/monorepo/issues/337) - Improve /auto-milestone and /auto-issue workflows

---

## Executive Summary

This research evaluates solutions for persisting workflow state across Claude Code sessions to enable resumption of `/auto-milestone` and `/auto-issue` workflows. The key challenge is maintaining context when sessions timeout, hit token limits, or need manual resumption.

**Recommendation:** A hybrid approach combining:

1. **Beads** for task/issue state tracking (git-native, agent-optimized)
2. **JSON checkpoint files** for workflow execution state (similar to Claude Code Workflow)
3. **MCP Memory Keeper** for cross-session context (optional enhancement)

---

## Problem Statement

When running `/auto-milestone` or `/auto-issue`, all context is lost if:

- Session times out
- Token limit is hit
- User needs to resume later

Current workarounds require manual re-establishment of project context, architectural decisions, and workflow progress.

---

## Solutions Evaluated

### 1. Beads (steveyegge/beads) ⭐ **RECOMMENDED FOR TASK STATE**

**What it is:** A distributed, git-backed issue tracker designed specifically for AI coding agents.

**Source:** [github.com/steveyegge/beads](https://github.com/steveyegge/beads)

| Aspect                 | Details                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Storage**            | JSONL files in `.beads/` directory, git-backed                                |
| **Architecture**       | SQLite local cache + background sync daemon                                   |
| **Agent Optimization** | JSON output format, automatic dependency tracking, "ready task" detection     |
| **Key Innovation**     | Hash-based IDs (`bd-a1b2`) eliminate merge conflicts in multi-agent scenarios |
| **Context Management** | Semantic compaction summarizes closed tasks to preserve context windows       |

**Key Commands:**

```bash
bd ready                    # Lists unblocked tasks
bd create "Title" -p 0      # Creates priority-0 task
bd dep add <child> <parent> # Links task dependencies
bd show <id>                # Views task details and audit trail
```

**Why it fits our use case:**

- Git-native storage aligns with our worktree-based parallel execution
- Hierarchical nesting (`bd-a3f8.1.1`) maps to milestone → issue → subtask structure
- Zero-conflict design handles parallel agents in `/auto-milestone`
- Built-in audit trail for workflow logging
- Stealth mode for local-only operation

**Limitations:**

- Focuses on task state, not execution state (checkpoints within a task)
- Requires separate mechanism for mid-task resumption

---

### 2. LangGraph Durable Execution ⭐ **REFERENCE ARCHITECTURE**

**What it is:** LangChain's graph-based agent framework with built-in checkpoint persistence.

**Sources:**

- [LangGraph Durable Execution Docs](https://docs.langchain.com/oss/python/langgraph/durable-execution)
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)

| Aspect              | Details                                          |
| ------------------- | ------------------------------------------------ |
| **Persistence**     | Automatic state save at every node transition    |
| **Storage Options** | Memory, SQLite, PostgreSQL, S3, MongoDB          |
| **Resumption**      | Thread-based - invoke with `thread_id` to resume |
| **Time Travel**     | Checkpoint-based replay for debugging            |

**Key Concepts:**

- **Checkpointers** save complete graph state at each step
- **Thread IDs** associate checkpoints with execution runs
- **State recovery** happens automatically on graph invocation

**Why it's relevant:**

- Proven pattern for LLM agent state persistence
- Time Travel debugging could help with failed workflow analysis
- Architecture separates orchestration (deterministic) from activities (LLM calls)

**Limitations:**

- Python-specific, not directly usable in our TypeScript/Bun environment
- Requires architectural changes to adopt graph-based approach
- Heavy framework dependency

---

### 3. Temporal Durable Workflows ⭐ **ENTERPRISE REFERENCE**

**What it is:** Production-grade workflow orchestration platform with durable execution guarantees.

**Sources:**

- [temporal.io](https://temporal.io/)
- [Temporal for AI Agents](https://temporal.io/solutions/ai)

| Aspect                | Details                                                             |
| --------------------- | ------------------------------------------------------------------- |
| **Core Feature**      | Workflows survive process crashes, resume automatically             |
| **State Persistence** | Event History as record of all decisions                            |
| **Recovery**          | Application recreates state on restart, continues where it left off |
| **Duration**          | Workflows can run for days, months, or years                        |

**Why it's relevant:**

- "Durable Execution" is exactly what we need conceptually
- No manual checkpointing required - framework handles it
- Activities (tool calls) are fault-tolerant by default

**Limitations:**

- Requires Temporal server infrastructure
- Significant architectural commitment
- Overkill for our current scale

---

### 4. Continuous Claude ⭐ **PRACTICAL INSPIRATION**

**What it is:** CLI tool that runs Claude Code in a persistent loop with external memory.

**Source:** [github.com/AnandChowdhary/continuous-claude](https://github.com/AnandChowdhary/continuous-claude)

| Aspect                 | Details                                                     |
| ---------------------- | ----------------------------------------------------------- |
| **Memory Mechanism**   | Shared markdown file (`SHARED_TASK_NOTES.md`)               |
| **Paradigm**           | "Relay race" - each run records progress for next iteration |
| **Loop Control**       | Max runs, cost budgets, or time-boxed durations             |
| **Parallel Execution** | Uses git worktrees (similar to our approach!)               |

**Key Design Principle:**

> "Keep notes as a clean handoff package between runs"

**Why it's relevant:**

- Already uses git worktrees for parallel execution
- Simple, proven approach to context handoff
- Bash-based, aligns with our scripting approach
- "Relay race" paradigm matches our multi-agent workflow

**Limitations:**

- Markdown-based, not structured data
- No mid-run checkpointing
- Assumes clean iteration boundaries

---

### 5. Claude Code Workflow (CCW)

**What it is:** JSON-driven multi-agent development framework.

**Source:** [github.com/catlog22/Claude-Code-Workflow](https://github.com/catlog22/Claude-Code-Workflow)

| Aspect            | Details                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| **State Storage** | `.task/IMPL-*.json` files as single source of truth                            |
| **Architecture**  | 4-tier layered memory system                                                   |
| **Artifacts**     | `diagnosis.json`, `impact.json`, `fix-plan.json`, `task.json`, `followup.json` |
| **Philosophy**    | Context-first - gather info before execution                                   |

**Why it's relevant:**

- JSON-first state management prevents drift
- Separates information gathering from execution
- Structured artifacts enable programmatic orchestration

**Limitations:**

- Complex multi-file structure
- Coupled to CCW's workflow model

---

### 6. MCP Memory Solutions

**What they are:** Model Context Protocol servers providing persistent memory across Claude sessions.

**Sources:**

- [MCP Memory Service](https://github.com/doobidoo/mcp-memory-service)
- [MCP Memory Keeper](https://github.com/mkreyman/mcp-memory-keeper)
- [@modelcontextprotocol/server-memory](https://www.npmjs.com/package/@modelcontextprotocol/server-memory)

| Solution                   | Focus                                                   | Storage         |
| -------------------------- | ------------------------------------------------------- | --------------- |
| **MCP Memory Service**     | Automatic context capture, dream-inspired consolidation | Semantic memory |
| **MCP Memory Keeper**      | Persistent context for Claude Code                      | Session-based   |
| **Official server-memory** | Knowledge graph with entities/relations                 | Local graph     |

**Why they're relevant:**

- Native Claude Code integration via MCP
- Designed specifically for Claude's context management
- Memory Keeper explicitly targets Claude Code session loss

**Limitations:**

- General-purpose memory, not workflow-specific
- May not capture structured workflow state well
- Additional MCP server dependency

---

### 7. Claude Code Native Features (Requested but not implemented)

**Status:** Multiple open issues requesting these features:

- [#2954](https://github.com/anthropics/claude-code/issues/2954) - Context persistence across sessions
- [#12646](https://github.com/anthropics/claude-code/issues/12646) - Local session history

**Requested Features:**

- Session detection and resumption prompts
- Storage in `.claude/sessions/` as structured JSON
- Multi-session support for different work streams

**Current Reality:**

- Not yet implemented by Anthropic
- Community building workarounds (62-agent systems, external memory platforms)

---

## Comparison Matrix

| Solution              | Task State   | Execution State | Git-Native | Agent-Optimized | Complexity |
| --------------------- | ------------ | --------------- | ---------- | --------------- | ---------- |
| **Beads**             | ✅ Excellent | ❌ None         | ✅ Yes     | ✅ Yes          | Low        |
| **LangGraph**         | ✅ Good      | ✅ Excellent    | ❌ No      | ✅ Yes          | High       |
| **Temporal**          | ✅ Good      | ✅ Excellent    | ❌ No      | ⚠️ Partial      | Very High  |
| **Continuous Claude** | ⚠️ Basic     | ⚠️ Basic        | ✅ Yes     | ✅ Yes          | Low        |
| **CCW**               | ✅ Good      | ✅ Good         | ❌ No      | ✅ Yes          | Medium     |
| **MCP Memory**        | ⚠️ Basic     | ⚠️ Basic        | ❌ No      | ✅ Yes          | Medium     |

---

## Recommended Approach

### Tier 1: Core Implementation (MVP)

**Adopt Beads for task/issue state tracking:**

```
.beads/
├── issues/          # Synced from GitHub issues
├── local/           # Local workflow tasks
└── .beads.db        # SQLite cache
```

**Custom checkpoint files for execution state:**

```
.claude/workflow-state/
├── auto-milestone-{name}/
│   ├── state.json           # Current phase, wave, progress
│   ├── issues/
│   │   ├── issue-{n}.json   # Per-issue execution state
│   │   └── ...
│   └── audit.jsonl          # Append-only action log
└── auto-issue-{n}/
    ├── state.json           # Phase, commits, review results
    └── audit.jsonl          # Action log
```

**State Schema Example:**

```json
{
  "workflow": "auto-milestone",
  "milestone": "OB3 Phase 1",
  "startedAt": "2026-01-07T10:00:00Z",
  "currentPhase": "execute",
  "currentWave": 2,
  "issues": {
    "123": {
      "status": "pr-created",
      "pr": 456,
      "worktree": ".worktrees/issue-123"
    },
    "124": { "status": "implementing", "commits": 2 },
    "125": { "status": "pending" }
  },
  "lastCheckpoint": "2026-01-07T11:30:00Z",
  "resumable": true
}
```

### Tier 2: Enhanced Context (Optional)

**Add MCP Memory Keeper** for cross-session context that complements structured state:

- Architectural decisions made during workflow
- Patterns discovered across issues
- Error resolutions that inform future runs

### Tier 3: Future Consideration

**Monitor LangGraph/Temporal patterns** for potential architectural evolution if:

- Workflow complexity significantly increases
- Need enterprise-grade audit/compliance
- Multi-user orchestration becomes required

---

## Implementation Recommendations

### Phase 1: State Persistence (Priority: Critical)

1. **Define state schema** for both `/auto-issue` and `/auto-milestone`
2. **Implement checkpoint writes** at phase transitions:
   - Research complete → Plan created
   - Plan approved → Implementation started
   - Commit made → Review started
   - Review complete → PR created
3. **Implement resumption logic** that reads state and continues from last checkpoint
4. **Add audit logging** (append-only JSONL) for debugging and analysis

### Phase 2: Beads Integration (Priority: High)

1. **Install Beads** in the monorepo
2. **Sync GitHub issues** to Beads for dependency tracking
3. **Use `bd ready`** in `/auto-milestone` to determine parallelizable issues
4. **Track subtasks** with hierarchical IDs during implementation

### Phase 3: Observability (Priority: Medium)

1. **Implement progress file** for real-time visibility (relates to #344)
2. **Add Langfuse-style tracing** for agent actions
3. **Create workflow analytics** for optimization

---

## Open Questions

1. **Beads adoption**: Should we fully adopt Beads or build a simpler custom solution?
2. **Storage location**: `.claude/workflow-state/` vs `.beads/` vs separate directory?
3. **Git tracking**: Should workflow state be committed or gitignored?
4. **Token efficiency**: How much state context can we include in resumption prompts?

---

## Sources

### Primary Sources

- [Beads - steveyegge/beads](https://github.com/steveyegge/beads)
- [LangGraph Durable Execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)
- [Temporal Durable Workflows](https://temporal.io/)
- [Continuous Claude](https://github.com/AnandChowdhary/continuous-claude)
- [Claude Code Workflow](https://github.com/catlog22/Claude-Code-Workflow)

### Claude Code Context Issues

- [#2954 - Context persistence across sessions](https://github.com/anthropics/claude-code/issues/2954)
- [#12646 - Local Session History](https://github.com/anthropics/claude-code/issues/12646)

### MCP Memory Solutions

- [MCP Memory Service](https://github.com/doobidoo/mcp-memory-service)
- [MCP Memory Keeper](https://github.com/mkreyman/mcp-memory-keeper)
- [@modelcontextprotocol/server-memory](https://www.npmjs.com/package/@modelcontextprotocol/server-memory)

### Framework Documentation

- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
- [Temporal for AI](https://temporal.io/solutions/ai)
- [Langfuse Observability](https://langfuse.com/blog/2024-07-ai-agent-observability-with-langfuse)
- [LangGraph 1.0 Release](https://medium.com/@romerorico.hugo/langgraph-1-0-released-no-breaking-changes-all-the-hard-won-lessons-8939d500ca7c)

### Related Articles

- [Agentic AI with Temporal](https://intuitionlabs.ai/articles/agentic-ai-temporal-orchestration)
- [AI Coding Tools in 2025](https://thenewstack.io/ai-coding-tools-in-2025-welcome-to-the-agentic-cli-era/)
- [Running Claude Code in a Loop](https://anandchowdhary.com/blog/2025/running-claude-code-in-a-loop)
