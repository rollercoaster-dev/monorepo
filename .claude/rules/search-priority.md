# Search Priority Rules

**Applies to:** All code search and exploration operations

---

## Core Principle

**Always use MCP tools first. Grep/Glob are fallback only.**

Tool usage is tracked and reported at session end. Aim for graph/search ratio > 1.0.

---

## Graph Tools with Examples

**`mcp__claude-knowledge__graph_find`** - Find where something is defined

```
# Find a function definition
graph_find(name="getTranscriptPath", type="function")
→ Returns: [{name, type, filePath, lineNumber}]

# Find a class
graph_find(name="BadgeService", type="class")

# Fuzzy search (partial match)
graph_find(name="Transcript")  # finds getTranscriptPath, TranscriptParser, etc.
```

**`mcp__claude-knowledge__graph_what_calls`** - Find all callers

```
# What calls this function?
graph_what_calls(name="getTranscriptPath")
→ Returns: [{caller, callerFile, callerLine, callee, calleeFile}]

# Useful before renaming or changing a function's signature
```

**`mcp__claude-knowledge__graph_blast_radius`** - Impact analysis

```
# What depends on this file?
graph_blast_radius(file="src/utils/transcript.ts")
→ Returns: All files that import/depend on this file (transitive)

# Use before refactoring to understand what might break
```

---

## Why Graph > Grep

- **Precision**: `graph_find(name="store")` finds the definition, not every usage of "store"
- **Context**: Returns file path + line number, ready to Read
- **Speed**: Pre-indexed AST, instant results
- **Efficiency**: 5 precise results vs 200 grep matches

---

## When to Use Graph vs Grep

| Looking For                 | Use This             | Why                                   |
| --------------------------- | -------------------- | ------------------------------------- |
| Function/class definition   | `graph_find`         | Finds declaration, not usages         |
| What calls a function       | `graph_what_calls`   | Actual call sites, not string matches |
| Impact of changing a file   | `graph_blast_radius` | Transitive dependencies               |
| Literal string in code      | `Grep`               | Graph only indexes code entities      |
| Config files (package.json) | `Grep/Glob`          | Not in code graph                     |
| Error message text          | `Grep`               | Strings aren't indexed                |

---

## Knowledge Tools (Past Context)

| Tool                       | Use For              | Why Default                                     |
| -------------------------- | -------------------- | ----------------------------------------------- |
| `knowledge_search_similar` | Finding related work | Semantic - "auth" finds "credential validation" |
| `knowledge_query`          | Exact lookups        | By area, file, or issue number                  |
| `knowledge_store`          | Capturing insights   | Persists for future sessions                    |

---

## Other MCP Tools

| Tool                    | Purpose                     |
| ----------------------- | --------------------------- |
| `checkpoint_workflow_*` | Manage workflow checkpoints |
| `output_save`           | Save long output to file    |
| `metrics_*`             | Query tool usage stats      |

---

## Fallback (Grep/Glob)

Use only when:

- MCP returned no results
- Searching for literal strings/regex patterns
- Looking outside the indexed codebase
- Config files, READMEs, or non-code content

---

## Capture Learnings

When you discover something interesting - a pattern, a gotcha, a non-obvious solution - store it with `knowledge_store`. Future sessions benefit from what you learn today.

**Resources** (browsable data):

- `knowledge://learnings` - Browse all learnings
- `knowledge://patterns` - Browse patterns
- `workflows://active` - Running workflows
