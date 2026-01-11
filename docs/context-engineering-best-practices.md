# Context Engineering Best Practices for Claude Code (Opus 4.5)

> **Core Principle:** "Claude is already smart enough—intelligence is not the bottleneck, context is."
> — [Anthropic Engineering](https://www.anthropic.com/engineering/claude-code-best-practices)

This guide synthesizes best practices from Anthropic's official documentation and community research.

## Table of Contents

1. [Opus 4.5 Behavioral Changes](#opus-45-behavioral-changes)
2. [CLAUDE.md Architecture](#claudemd-architecture)
3. [Context Window Management](#context-window-management)
4. [Multi-Context Workflows](#multi-context-workflows)
5. [Skill & Subagent Design](#skill--subagent-design)
6. [Tool Design Principles](#tool-design-principles)
7. [Prompt Engineering for Opus 4.5](#prompt-engineering-for-opus-45)
8. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Opus 4.5 Behavioral Changes

Opus 4.5 behaves differently from previous models. Adjust prompts accordingly:

| Behavior                  | Previous Models | Opus 4.5             | Mitigation                             |
| ------------------------- | --------------- | -------------------- | -------------------------------------- |
| System prompt sensitivity | Moderate        | High                 | Remove "CRITICAL", "MUST" language     |
| Word sensitivity          | Normal          | Sensitive to "think" | Use "consider", "evaluate", "believe"  |
| Over-engineering          | Moderate        | Aggressive           | Add explicit "keep it minimal" prompts |
| Tool triggering           | Under-trigger   | Over-trigger         | Dial back aggressive tool instructions |
| Verbosity                 | Detailed        | Concise              | Request summaries explicitly if needed |

### Over-Engineering Prevention

Add to your CLAUDE.md:

```markdown
## Implementation Philosophy

Avoid over-engineering. Only make changes that are directly requested or clearly necessary.

- Don't add features beyond what was asked
- Don't refactor surrounding code during bug fixes
- Don't add error handling for impossible scenarios
- Don't create abstractions for one-time operations
- Reuse existing patterns; follow DRY
```

Source: [Claude 4.5 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)

---

## CLAUDE.md Architecture

### Size Guidelines

| Level   | Location                | Max Size      | Purpose                  |
| ------- | ----------------------- | ------------- | ------------------------ |
| Root    | `CLAUDE.md`             | 100-200 lines | Universal project rules  |
| Package | `packages/*/CLAUDE.md`  | 50-100 lines  | Package-specific context |
| Feature | `src/feature/CLAUDE.md` | 30-50 lines   | Localized rules          |
| Global  | `~/.claude/CLAUDE.md`   | 50 lines      | Personal preferences     |

### Structure Template

```markdown
# Project Name

## Architecture

[2-3 sentences on high-level structure]

## Commands

[Essential commands only - the ones used daily]

## Conventions

[Code style, naming patterns, file organization]

## Testing

[How to run tests, coverage requirements]

## Do NOT

[Explicit prohibitions - keep brief]
```

### Key Principles

1. **Less is more**: Every line competes for attention
2. **Universal applicability**: Only include rules that apply to ALL tasks
3. **Iterate and test**: Treat CLAUDE.md like production prompts
4. **Use child files**: Move specialized rules to subdirectory CLAUDE.md files

Source: [Anthropic Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

---

## Context Window Management

### The Context Budget

Opus 4.5 has 200K tokens, but effective capacity is lower:

```
Total: 200,000 tokens
─────────────────────────────────
System prompt:     ~2,000 tokens
CLAUDE.md:         ~1,000 tokens
Conversation:     ~50,000 tokens (grows)
File contents:    ~80,000 tokens (variable)
Tool outputs:     ~30,000 tokens (variable)
─────────────────────────────────
Remaining for reasoning: ~37,000 tokens
```

### Optimization Strategies

| Strategy                     | When to Use               | Implementation                      |
| ---------------------------- | ------------------------- | ----------------------------------- |
| `/clear` frequently          | Between unrelated tasks   | Use liberally                       |
| Subagents                    | Complex research, reviews | Delegate to preserve main context   |
| Fresh starts over compaction | After major milestones    | Clear and re-orient from filesystem |
| Just-In-Time loading         | Large data needs          | Pass IDs, fetch on demand           |

### Context Awareness Prompt

Add to system prompt for long tasks:

```markdown
Your context window will be automatically compacted as it approaches its limit.
Do not stop tasks early due to token budget concerns. Before the context
refreshes, save progress to files. Complete tasks fully regardless of
remaining context.
```

Source: [Claude Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)

---

## Multi-Context Workflows

### First Window vs Subsequent Windows

| First Context Window | Subsequent Windows   |
| -------------------- | -------------------- |
| Set up framework     | Execute todo-list    |
| Write tests          | Iterate on failures  |
| Create setup scripts | Use existing scripts |
| Establish patterns   | Follow patterns      |

### State Persistence Across Windows

```
Structured Data (JSON)     Unstructured Notes (Markdown)     Version Control
─────────────────────      ──────────────────────────────    ───────────────
tests.json                 progress.md                       git commits
{                          Session 3:                        - Each window ends
  "passing": 150,          - Fixed auth flow                   with a commit
  "failing": 25,           - Next: user mgmt                 - Git log = history
  "total": 200             - Note: don't edit tests          - Cherry-pick rollback
}
```

### Fresh Start Prompt

When resuming after context clear:

```markdown
Review the following to understand current state:

1. `git log --oneline -20` for recent history
2. `progress.md` for session notes
3. `tests.json` for test status
4. Run fundamental integration test before new work
```

---

## Skill & Subagent Design

### Skill File Structure

```
.claude/skills/my-skill/
├── SKILL.md          # Main instructions (< 500 lines)
├── examples.md       # Detailed examples (loaded on demand)
└── reference.md      # Technical reference (loaded on demand)
```

### SKILL.md Template

```markdown
---
name: skill-name
description: One-line description for agent discovery
allowed-tools: Bash, Read, Edit
---

# Skill Name

## When to Use

[Clear trigger conditions]

## Commands

[Specific CLI commands]

## Examples

[1-2 minimal examples]

## Do NOT

[Explicit prohibitions]
```

### Subagent Design Principles

| Principle       | Implementation                                  |
| --------------- | ----------------------------------------------- |
| Isolation       | Each subagent gets fresh context window         |
| Focus           | One specific task per subagent                  |
| Minimal tools   | Only tools needed for the task                  |
| Model selection | Use `haiku` for quick tasks, `opus` for complex |

Source: [Claude Code Docs](https://code.claude.com/docs/en/sub-agents)

---

## Tool Design Principles

### Characteristics of Good Tools

1. **Simple, accurate names** - `graph_query`, not `queryGraphDatabase`
2. **Non-overlapping** - Each tool has unique purpose
3. **Single responsibility** - One action per tool
4. **Detailed descriptions** - Claude reads these to decide usage
5. **Clear input/output examples** - Show expected formats
6. **Explicit failure modes** - What errors look like

### Tool Search Pattern (for large tool sets)

Instead of loading 50+ tools upfront, use tool discovery:

```typescript
// Bad: All tools loaded (consumes ~50K tokens)
tools: [tool1, tool2, ..., tool50]

// Good: Tool search discovers on demand
tools: [
  {
    name: "find_tool",
    description: "Search for available tools by capability",
    // Returns relevant tool definitions dynamically
  }
]
```

This reduced token usage by 85% in Anthropic's testing.

Source: [Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)

---

## Prompt Engineering for Opus 4.5

### Effective Patterns

| Pattern               | Example                                                              |
| --------------------- | -------------------------------------------------------------------- |
| Explicit action       | "Change this function" not "Can you suggest changes?"                |
| Context + motivation  | "Use rd-logger because it provides structured context for debugging" |
| Positive framing      | "Write in flowing prose" not "Don't use bullet points"               |
| Modifiers for quality | "Include as many relevant features as possible"                      |

### Word Sensitivity

When extended thinking is disabled, avoid "think":

```markdown
# Less effective

Think about the best approach...

# More effective

Consider the best approach...
Evaluate the options...
Determine the optimal strategy...
```

### Parallel Tool Calling

Opus 4.5 aggressively parallelizes. Steer with:

```markdown
# Maximize parallelism

If tool calls are independent, make all calls in parallel.
Never use placeholders—either have the value or call sequentially.

# Reduce parallelism (if causing issues)

Execute operations sequentially with brief pauses between steps.
```

---

## Anti-Patterns to Avoid

### Context Rot

| Problem             | Symptom                              | Solution                   |
| ------------------- | ------------------------------------ | -------------------------- |
| Context Poisoning   | Outdated info causes wrong reasoning | Use `/clear`, update files |
| Context Distraction | Irrelevant info reduces focus        | Prune CLAUDE.md            |
| Context Confusion   | Similar items get conflated          | Use distinct naming        |
| Context Clash       | Conflicting instructions             | Audit for contradictions   |

### CLAUDE.md Anti-Patterns

```markdown
# BAD: Too long, too specific

## Database Configuration

PostgreSQL uses these exact settings for connection pooling...
[500 lines of config details]

# GOOD: Concise, universal

## Database

Use SQLite for development, PostgreSQL for production.
See `docs/database.md` for configuration details.
```

### Prompt Anti-Patterns

```markdown
# BAD: Aggressive language (causes over-triggering)

CRITICAL: You MUST ALWAYS use this tool when...
NEVER proceed without...
IMPORTANT: ALWAYS check...

# GOOD: Normal language (Opus 4.5 is highly responsive)

Use this tool when...
Before proceeding, check...
Prefer this approach when...
```

---

## Quick Reference Card

### Context Budget Rules

- CLAUDE.md: < 200 lines
- `/clear` between unrelated tasks
- Subagents for research/review
- Fresh start > compaction

### Opus 4.5 Adjustments

- Remove "CRITICAL", "MUST", "ALWAYS"
- Replace "think" with "consider"
- Add anti-over-engineering prompts
- Request summaries explicitly

### State Persistence

- JSON for structured data (tests, status)
- Markdown for notes (progress, findings)
- Git commits at context boundaries

### Skill Design

- < 500 lines per SKILL.md
- Progressive disclosure for details
- Clear trigger conditions
- Minimal tool allowlist

---

## Sources

- [Claude Code: Best Practices for Agentic Coding](https://www.anthropic.com/engineering/claude-code-best-practices) - Anthropic
- [Claude 4.5 Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices) - Anthropic Docs
- [Context Engineering Playbook](https://01.me/en/2025/12/context-engineering-from-claude/) - Bojie Li
- [Context Engineering for Claude Code](https://clune.org/posts/anthropic-context-engineering/) - Arthur Clune
- [Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use) - Anthropic
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents) - Claude Code Docs
