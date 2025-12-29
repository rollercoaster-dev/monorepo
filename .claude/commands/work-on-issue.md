# /work-on-issue

End-to-end workflow from GitHub issue to PR creation with gate-based approval.

## Usage

```
/work-on-issue <issue-number>
```

## Workflow Overview

```
GATE 1: Issue Review
├── Fetch and display issue
├── Check for blockers
└── WAIT for user approval

GATE 2: Feature Development
├── Launch /feature-dev plugin
├── 7-phase workflow
└── WAIT for user approval

GATE 3: Pre-PR Review
├── Run pr-review-toolkit agents
├── Run openbadges-compliance (if badge code)
├── Fix critical issues
└── WAIT for user approval

GATE 4: Create PR
├── Create PR with issue reference
└── CI takes over (CodeRabbit + Claude)
```

---

## GATE 1: Issue Review

### Step 1.1: Fetch Issue

```bash
gh issue view $ARGUMENTS --json number,title,body,labels,milestone,assignees
```

### Step 1.2: Display Issue Summary

Present to user:

- **Issue #**: Number and title
- **Labels**: List of labels
- **Milestone**: Associated milestone
- **Description**: Issue body (summarized if long)
- **Acceptance Criteria**: Extract from body if present

### Step 1.3: Check for Blockers

```bash
gh issue view $ARGUMENTS --json body | grep -i "blocked by\|depends on"
```

If blockers found, warn user and ask if they want to proceed.

### Step 1.4: GATE - User Approval

Ask user:

> "Ready to start working on issue #X? This will launch the feature-dev workflow."

Options:

- **Yes, proceed** - Continue to Gate 2
- **Show more details** - Display full issue body
- **Cancel** - Exit workflow

---

## GATE 2: Feature Development

### Step 2.1: Launch /feature-dev

Pass issue context to feature-dev plugin:

```
/feature-dev Implement issue #X: {issue title}

Context from GitHub issue:
{issue body}

Acceptance criteria:
{extracted criteria}
```

### Step 2.2: Feature-dev 7-Phase Workflow

The feature-dev plugin handles:

1. **Discovery** - Clarify requirements
2. **Exploration** - code-explorer analyzes codebase
3. **Questions** - Fill gaps
4. **Architecture** - code-architect designs approaches
5. **Implementation** - Build the feature
6. **Quality Review** - code-reviewer checks
7. **Summary** - Document what was built

### Step 2.3: GATE - Implementation Approval

After feature-dev completes, ask user:

> "Implementation complete. Ready for pre-PR review?"

Options:

- **Yes, review** - Continue to Gate 3
- **Make changes** - Return to implementation
- **Cancel** - Exit workflow

---

## GATE 3: Pre-PR Review

### Step 3.1: Identify Changed Files

```bash
git diff --name-only main...HEAD
```

### Step 3.2: Run pr-review-toolkit Agents

Launch in parallel:

1. **pr-review-toolkit:code-reviewer**
   - General code quality
   - CLAUDE.md compliance
   - Style violations

2. **pr-review-toolkit:pr-test-analyzer**
   - Test coverage quality
   - Critical gaps

3. **pr-review-toolkit:silent-failure-hunter**
   - Error handling
   - Catch block issues

4. **pr-review-toolkit:type-design-analyzer** (if new types added)
   - Type design quality
   - Invariant enforcement

### Step 3.3: Run Domain-Specific Review (if applicable)

If changes involve badge/credential code:

```
Launch openbadges-compliance-reviewer agent
```

Check for:

- OB2/OB3 spec compliance
- Correct context URLs
- Valid credential structure

### Step 3.4: Consolidate Review Results

Present findings grouped by severity:

**Critical (must fix):**

- {list critical issues}

**High (should fix):**

- {list high issues}

**Medium (consider fixing):**

- {list medium issues}

### Step 3.5: Auto-fix Critical Issues

For Critical and High issues with clear fixes:

- Apply fixes automatically
- Show diff of changes
- Re-run affected reviewers

### Step 3.6: GATE - Review Approval

Ask user:

> "Review complete. X critical issues fixed, Y medium issues noted. Ready to create PR?"

Options:

- **Create PR** - Continue to Gate 4
- **Fix more issues** - Address remaining issues
- **Show all findings** - Display full review
- **Cancel** - Exit workflow

---

## GATE 4: Create PR

### Step 4.1: Generate PR Title

Based on issue:

```
fix: {issue title} (#issue-number)
feat: {issue title} (#issue-number)
```

### Step 4.2: Generate PR Body

```markdown
## Summary

Implements #{issue-number}: {issue title}

## Changes

- {list of changes from feature-dev summary}

## Test Plan

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Review Notes

Pre-PR review completed:

- Code quality: PASSED
- Test coverage: PASSED
- Error handling: PASSED
- {domain review if applicable}: PASSED

Closes #{issue-number}
```

### Step 4.3: Create PR

```bash
gh pr create --title "{title}" --body "{body}" --base main
```

### Step 4.4: Report Success

Display:

- PR URL
- Next steps (CI will run CodeRabbit + Claude review)
- How to address review feedback

---

## Error Handling

### Issue Not Found

```
Error: Issue #X not found. Please check the issue number and try again.
```

### No Changes to Commit

```
Warning: No changes detected. Did you complete the implementation?
```

### Review Failures

If critical issues can't be auto-fixed:

```
Critical issues require manual attention:
1. {issue description} at {file:line}
   Suggestion: {how to fix}
```

### PR Creation Failed

```
Error creating PR. Please check:
- You have push access to the repository
- The branch doesn't already have an open PR
- All changes are committed
```

---

## Integration Points

### Plugins Used

- **feature-dev** - 7-phase development workflow
- **pr-review-toolkit** - Code review (6 agents)

### Custom Agents Used

- **openbadges-compliance-reviewer** - OB spec validation (if badge code)

### CI Integration

After PR creation, CI handles:

- **CodeRabbit** - AI code review
- **Claude** - Additional review
- **Tests** - Automated test suite

---

## Example Session

```
User: /work-on-issue 147

Claude: ## Issue #147: Add validFrom/validUntil fields to OB3 credentials

**Labels**: ob3, enhancement
**Milestone**: OB3 Phase 1: Core Spec

**Description**:
Add support for temporal validity (validFrom, validUntil) to OB3
credential types per the W3C VC specification.

**Acceptance Criteria**:
- [ ] Add validFrom field (ISO 8601 datetime)
- [ ] Add validUntil field (ISO 8601 datetime)
- [ ] Validate validFrom < validUntil when both present
- [ ] Add tests for validity period logic

No blockers detected.

Ready to start working on issue #147? This will launch the
feature-dev workflow.

[Yes, proceed] [Show more details] [Cancel]

User: Yes, proceed

Claude: Launching /feature-dev workflow...

[... feature-dev 7-phase workflow runs ...]

Implementation complete. Ready for pre-PR review?

[Yes, review] [Make changes] [Cancel]

User: Yes, review

Claude: Running pre-PR review...

- pr-review-toolkit:code-reviewer... PASSED
- pr-review-toolkit:pr-test-analyzer... PASSED
- pr-review-toolkit:silent-failure-hunter... PASSED
- openbadges-compliance-reviewer... PASSED

No critical issues found. 2 medium suggestions noted.

Ready to create PR?

[Create PR] [Show all findings] [Cancel]

User: Create PR

Claude: PR created successfully!

**PR #156**: feat: Add validFrom/validUntil fields to OB3 credentials (#147)
https://github.com/rollercoaster-dev/monorepo/pull/156

Next steps:
- CI will run CodeRabbit and Claude reviews
- Address any review feedback
- Merge when approved
```
