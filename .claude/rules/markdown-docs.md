# Markdown Documentation Rules

**Applies to:** All markdown files in `.claude/` directory

---

## Fenced Code Blocks

Always include a language identifier on fenced code blocks:

```markdown
<!-- BAD - triggers markdownlint -->
```

TaskCreate({...})

````

<!-- GOOD -->
```text
TaskCreate({...})
````

````

**Common language tags:**
- `text` - Pseudo-code, workflow examples, ASCII diagrams
- `typescript` - TypeScript code or interfaces
- `bash` - Shell commands
- `json` - JSON examples
- `yaml` - YAML configuration

---

## Consistent Numbering

When a document states a specific count, all references must match:

```markdown
<!-- BAD - says 4 gates but shows 5 -->
**Mode:** 4 hard gates
...
Gate 5: Finalize

<!-- GOOD - consistent count -->
**Mode:** 4 hard gates
...
Finalize: (not a gate, just a phase)
````

If adding a new step to a numbered list, update the count in all locations.

---

## Type Examples Must Match Definitions

When documenting TypeScript interfaces or types, ensure example values match the actual type:

```typescript
// If WorkflowPhase is defined as:
type WorkflowPhase = "research" | "implement" | "review" | "finalize";

// BAD - "setup" is not in WorkflowPhase
interface Metadata {
  phase: WorkflowPhase; // Example: "setup" <- WRONG
}

// GOOD - use actual type values
interface Metadata {
  phase: WorkflowPhase; // Example: "research"
}
```

Before using a type in examples, verify its definition in `packages/claude-knowledge/src/types.ts` or the relevant source.

---

## Progress Visualization

When showing task/progress trees, use consistent formatting:

```text
Tasks for Issue #123:
├─ Gate 1: Review Issue #123      [COMPLETED]
├─ Gate 2: Review Plan for #123   [COMPLETED]
├─ Gate 3: Implement #123         [IN_PROGRESS]
├─ Gate 4: Pre-PR Review for #123 [PENDING, blocked by Gate 3]
└─ Finalize: Create PR for #123   [PENDING, blocked by Gate 4]
```

Use `└─` for the last item, `├─` for all others.

---

## Validation Checklist

Before committing markdown documentation:

- [ ] All code blocks have language tags
- [ ] Counts (gates, steps, phases) are consistent throughout
- [ ] Type examples use actual type values
- [ ] No orphaned or mismatched references
