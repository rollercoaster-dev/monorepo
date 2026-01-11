# Gate Workflow Rules

**Applies to:** `/work-on-issue`, orchestrated workflows

## Gate Guidelines

### Guideline 1: Gates Require Explicit Approval

When a workflow indicates a gate checkpoint:

- Pause execution
- Show the required information
- Wait for explicit user approval
- "proceed", "yes", "go", "approved" are valid approvals
- Silence is not approval
- "okay" or "looks good" without "proceed" is not approval

### Guideline 2: One Gate at a Time

- Don't batch multiple gates
- Don't preview future gates
- Don't assume approval for subsequent gates
- Complete current gate fully before mentioning next

### Guideline 3: Show Complete Information

At gates, show:

- The full issue content (verbatim)
- The full plan content (every line)
- The full diff for review

Avoid summarizing at gates - show the complete content.

### Guideline 4: File Changes After Gate Approval

Before file modifications during gated workflow:

- [ ] Gate 1 (Issue Review) passed
- [ ] Gate 2 (Plan Review) passed
- [ ] User approved specific commit/change

## Violation Recovery

If you realize you've skipped a gate:

1. Pause immediately
2. Acknowledge the skip
3. Return to the missed gate
4. Don't continue until gate is passed
