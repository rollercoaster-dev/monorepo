# Development Plan Template

Use this template when planning implementation work for GitHub issues.

---

## Issue #[NUMBER]: [TITLE]

**Branch:** `<type>/issue-<number>-<short-description>`
**Base:** `main`
**Estimated Commits:** [N]

---

## Context

### Issue Summary
[1-2 sentences describing what the issue asks for]

### Dependencies
- **Depends on:** #X, #Y (if any)
- **Blocks:** #A, #B (if any)

### Related Code
- `path/to/relevant/file.ts` - [what it does]
- `path/to/another/file.ts` - [what it does]

---

## Implementation Steps

### Step 1: [Title]

**Commit:** `<type>(<scope>): <description>`

**Files:**
- [ ] `path/to/file.ts` - [action: create/modify/delete]

**Changes:**
- [What this step accomplishes]
- [Key implementation details]

**Validation:**
```bash
bun run type-check
```

---

### Step 2: [Title]

**Commit:** `<type>(<scope>): <description>`

**Files:**
- [ ] `path/to/file.ts` - [action]

**Changes:**
- [What this step accomplishes]

**Validation:**
```bash
bun run type-check
bun test path/to/relevant.test.ts
```

---

### Step 3: [Title]

**Commit:** `<type>(<scope>): <description>`

**Files:**
- [ ] `path/to/file.ts` - [action]

**Changes:**
- [What this step accomplishes]

**Validation:**
```bash
bun run type-check && bun run lint && bun test
```

---

## Final Validation

Before creating PR, run full validation:

```bash
bun run type-check
bun run lint
bun test
bun run build
```

---

## PR Checklist

- [ ] All commits are atomic and buildable
- [ ] Tests added for new functionality
- [ ] Documentation updated (if needed)
- [ ] No console.log or debug code
- [ ] Branch is under ~500 lines changed

---

## Notes

[Any additional context, edge cases to consider, or decisions made during planning]

---

## Post-Implementation

After PR is created:
1. Trigger `@coderabbitai full review` (comment)
2. Trigger `@claude review` (comment)
3. Update board status to "In Review"
4. Address review feedback
5. Merge when approved
