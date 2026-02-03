# Tool Selection Priority

**ALWAYS check tools in this order. Stop at the first one that works.**

## Decision Tree

```
Need to find files by name?
└─ "Files matching pattern" ────► Glob **/<pattern>

Need to find text in files?
└─ "Literal string in code" ────► Grep
```

## Quick Reference

```bash
# Glob (finding files by name)
# Use Glob tool, not bash find

# Grep (finding text in files)
# Use Grep tool, not bash grep
```

## Anti-Patterns (Don't Do This)

```bash
# BAD: Multiple greps when one will do
grep -r "functionName" --include="*.ts"
# Then read each file...
# Then grep for imports...
# Then read those files...

# GOOD: Targeted search with Glob + Read
Glob **/*service*.ts
Read <specific-file>
```

## Validation Checkpoint

Before making >3 search-related tool calls, STOP and ask:

- "Am I searching too broadly?"
- "Should I narrow my Glob pattern?"
