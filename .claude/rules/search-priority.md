# Search Priority Rules

**Applies to:** All code search and exploration operations

---

## Core Principle

**Always use MCP tools first. Grep/Glob are fallback only.**

Tool usage is tracked and reported at session end. Aim for graph/search ratio > 1.0.

---

## Graph Tools (Code Structure)

| Tool                 | Use For              | Why Default                                     |
| -------------------- | -------------------- | ----------------------------------------------- |
| `graph_find`         | Locating definitions | AST-precise, finds declarations not just text   |
| `graph_what_calls`   | Finding callers      | Shows actual usage patterns, not string matches |
| `graph_blast_radius` | Impact analysis      | Transitive deps - prevents breaking changes     |

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
