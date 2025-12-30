# Gate Workflow Rules

**Applies to:** `/work-on-issue`, orchestrated workflows

## HARD RULES - Non-Negotiable

### Rule 1: STOP Means STOP

When a workflow says "STOP and wait" or "GATE":

- Literally stop executing
- Show the required information
- Wait for explicit user approval
- "proceed", "yes", "go", "approved" are valid approvals
- Silence is NOT approval
- "okay" or "looks good" without "proceed" is NOT approval

### Rule 2: One Gate at a Time

- Do not batch multiple gates
- Do not preview future gates
- Do not assume approval for subsequent gates
- Complete current gate fully before mentioning next

### Rule 3: Show, Don't Summarize

At gates, show:

- The FULL issue content (verbatim)
- The FULL plan content (every line)
- The FULL diff for review

Never say "Here's a summary" at a gate.

### Rule 4: No File Changes Without Gate Approval

Before any file modification during gated workflow:

- [ ] Gate 1 (Issue Review) passed
- [ ] Gate 2 (Plan Review) passed
- [ ] User approved specific commit/change

## Violation Recovery

If you realize you've skipped a gate:

1. STOP immediately
2. Acknowledge the skip
3. Return to the missed gate
4. Do not continue until gate is passed
