# Dependency Checking

Shared patterns for detecting and handling issue dependencies.

## Detection Patterns

Look for these patterns in issue body:

| Pattern         | Meaning         | Action             |
| --------------- | --------------- | ------------------ |
| `Blocked by #X` | Hard blocker    | STOP if #X is open |
| `Depends on #X` | Soft dependency | WARN if #X is open |
| `After #X`      | Ordering hint   | WARN if #X is open |
| `- [ ] #X`      | Checkbox list   | WARN if #X is open |

## GitHub CLI Commands

### Check for Blockers in Issue Body

```bash
gh issue view $ISSUE --json body -q '.body' | grep -iE "blocked by|depends on|after #"
```

### Get Dependency Status

```bash
# Extract issue numbers from body
DEPS=$(gh issue view $ISSUE --json body -q '.body' | grep -oE '#[0-9]+' | tr -d '#' | sort -u)

# Check each dependency
for dep in $DEPS; do
  STATE=$(gh issue view $dep --json state -q '.state')
  echo "#$dep: $STATE"
done
```

### Single Dependency Check

```bash
gh issue view $DEP_ISSUE --json state -q '.state'
```

## Decision Logic

### Gated Workflows (/work-on-issue)

```
IF "Blocked by #X" found:
  IF #X is OPEN:
    STOP - Show blocker to user
    Wait for guidance
  ELSE:
    CONTINUE - Blocker resolved

IF "Depends on #X" found:
  IF #X is OPEN:
    WARN - Show dependency status
    CONTINUE - User can proceed with awareness
```

### Autonomous Workflows (/auto-issue)

```
IF "Blocked by #X" found:
  IF #X is OPEN:
    WARN - Log blocker (don't stop)
    CONTINUE - Proceed anyway

IF "Depends on #X" found:
  IF #X is OPEN:
    WARN - Log dependency
    CONTINUE
```

## Implementation

### For issue-researcher Agent

```typescript
// Phase 1.5: Check dependencies
const body = await fetchIssueBody(issueNumber);
const blockers = body.match(/blocked by #(\d+)/gi) || [];
const depends = body.match(/depends on #(\d+)/gi) || [];

for (const blocker of blockers) {
  const num = blocker.match(/\d+/)[0];
  const state = await getIssueState(num);
  if (state === "OPEN") {
    console.log(`BLOCKER: Issue #${num} is still open`);
    // Gated: STOP here
    // Autonomous: WARN and continue
  }
}

for (const dep of depends) {
  const num = dep.match(/\d+/)[0];
  const state = await getIssueState(num);
  if (state === "OPEN") {
    console.log(`WARNING: Dependency #${num} is still open`);
    // Always continue, just warn
  }
}
```

### For pr-creator Agent

```typescript
// Phase 0: Check blockers before PR
const blockers = extractBlockers(issueBody);

for (const blocker of blockers) {
  const state = await getIssueState(blocker);
  if (state === "OPEN") {
    console.log(`Cannot create PR: Blocked by #${blocker}`);
    return; // STOP
  }
}
```

### For milestone-planner Agent

```typescript
// Build dependency graph
const graph = new Map<number, number[]>();

for (const issue of milestoneIssues) {
  const deps = extractDependencies(issue.body);
  graph.set(issue.number, deps);
}

// Identify free issues (no open dependencies)
const freeIssues = [...graph.entries()]
  .filter(([_, deps]) => deps.every((d) => !openIssues.includes(d)))
  .map(([num, _]) => num);
```

## Output Format

When reporting dependencies:

```markdown
## Dependencies for #365

| Issue | Type       | Status | Impact        |
| ----- | ---------- | ------ | ------------- |
| #364  | Depends on | CLOSED | OK to proceed |
| #366  | Blocked by | OPEN   | **BLOCKING**  |

**Decision:** Cannot proceed - #366 must be closed first.
```

## Extraction Regex

```typescript
// All dependency patterns
const BLOCKER_REGEX = /blocked by #(\d+)/gi;
const DEPENDS_REGEX = /depends on #(\d+)/gi;
const AFTER_REGEX = /after #(\d+)/gi;
const CHECKBOX_REGEX = /- \[ \] #(\d+)/gi;

function extractAllDependencies(body: string): {
  blockers: number[];
  softDeps: number[];
} {
  const blockers = [...body.matchAll(BLOCKER_REGEX)].map((m) => parseInt(m[1]));
  const softDeps = [
    ...body.matchAll(DEPENDS_REGEX),
    ...body.matchAll(AFTER_REGEX),
    ...body.matchAll(CHECKBOX_REGEX),
  ].map((m) => parseInt(m[1]));

  return { blockers, softDeps };
}
```

## Error Handling

If dependency issue doesn't exist:

```bash
if ! gh issue view $DEP --json state -q '.state' 2>/dev/null; then
  echo "WARNING: Referenced issue #$DEP not found"
  # Continue anyway - might be in different repo
fi
```
