# Tool Selection Priority

**ALWAYS check tools in this order. Stop at the first one that works.**

## Decision Tree

```
Need to understand code relationships?
├─ "What calls X?" ──────────────► graph what-calls <name>
├─ "What uses type X?" ──────────► graph what-depends-on <name>
├─ "Impact of changing file?" ───► graph blast-radius <file>
└─ "Where is X defined?" ────────► graph find <name> [type]

Need to find documentation?
├─ "How does X work?" ──────────► docs search "<query>"
├─ "Patterns for X?" ───────────► docs search "<pattern>"
└─ "Docs about entity?" ────────► docs for-code <entity>

Need to find files by name?
└─ "Files matching pattern" ────► Glob **/<pattern>

Need to find text in files?
└─ "Literal string in code" ────► Grep (LAST RESORT)
```

## Why This Order Matters

| Approach           | Tool Calls | Tokens     | Accuracy            |
| ------------------ | ---------- | ---------- | ------------------- |
| Graph query        | 1          | ~500       | High (AST-based)    |
| Docs search        | 1          | ~500       | High (semantic)     |
| Grep + Read        | 3-10       | 2000-8000  | Medium (text match) |
| Glob + Grep + Read | 5-15       | 3000-12000 | Low (guessing)      |

**Graph/Docs = 10x more efficient than Grep chains**

## Quick Reference (Use These Shortcuts)

```bash
# FIRST: Try graph (if code relationships)
bun run g:calls <function>    # Who calls this?
bun run g:deps <type>         # Who uses this type?
bun run g:blast <file>        # What breaks if I change?
bun run g:find <name>         # Where is this defined?
bun run g:summary             # Codebase stats

# SECOND: Try docs (if seeking understanding)
bun run d:search "<question>" # Semantic search docs

# THIRD: Glob (if finding files by name)
# Use Glob tool, not bash find

# LAST: Grep (only for literal text search)
# Use Grep tool, not bash grep
```

**Long form** (equivalent):

```bash
bun run checkpoint graph what-calls <function>
bun run checkpoint graph what-depends-on <type>
bun run checkpoint graph blast-radius <file>
bun run checkpoint docs search "<query>"
```

## Anti-Patterns (Don't Do This)

```bash
# BAD: Multiple greps to find callers (10+ tool calls)
grep -r "functionName" --include="*.ts"
# Then read each file...
# Then grep for imports...
# Then read those files...

# GOOD: One graph query (1 tool call)
bun run g:calls functionName
```

## Before Using Grep, Ask:

1. Can graph answer this? (callers, dependencies, blast radius)
2. Can docs search answer this? (patterns, how-to, concepts)
3. Am I just finding files? (use Glob)
4. Is this truly a literal text search? (only then use Grep)

## Validation Checkpoint

Before making >3 search-related tool calls, STOP and ask:

- "Should I have used a graph query instead?"
- "Is there a docs search that would answer this?"
