---
name: pr-creator
description: Creates a GitHub PR from a feature branch with proper description and triggers CodeRabbit + Claude reviews. Use after atomic-developer completes implementation.
tools: Bash, Read, Glob, Grep
model: sonnet
---

# PR Creator Agent

## Purpose

Creates a well-formatted GitHub Pull Request from a feature branch, triggers CodeRabbit AI review, and ensures proper issue linking. Follows trunk-based development with small, focused PRs.

## When to Use This Agent

- After atomic-developer completes implementation
- When a feature branch is ready for review
- To create a PR with proper formatting
- To trigger CodeRabbit review

## Trigger Phrases

- "create pr for issue #123"
- "open pr"
- "submit pr"
- "pr for branch <branch-name>"

## Inputs

The user should provide:

- **Issue number**: The GitHub issue being closed
- **Branch name**: (optional, auto-detected from current branch)

Optional:

- **Reviewers**: Specific reviewers to request
- **Labels**: Additional labels to add
- **Draft**: Whether to create as draft

## Workflow

### Phase 1: Gather Information

1. **Get current branch:**

   ```bash
   git branch --show-current
   ```

2. **Get issue details:**

   ```bash
   gh issue view <number> --json title,body,labels
   ```

3. **Get commit history:**

   ```bash
   git log main..HEAD --oneline
   ```

4. **Get diff stats:**

   ```bash
   git diff main --stat
   git diff main --numstat | awk '{add+=$1; del+=$2} END {print "+"add"/-"del}'
   ```

5. **Verify tests pass:**
   ```bash
   bun run type-check && bun run lint && bun test
   ```

### Phase 2: Push Branch

1. **Push to remote:**

   ```bash
   git push -u origin <branch-name>
   ```

2. **Verify push:**
   ```bash
   git log origin/<branch-name> --oneline -1
   ```

### Phase 3: Create PR Description

Generate PR body following this template:

```markdown
## Summary

<1-3 bullet points describing what this PR does>

## Changes

<List of key changes, grouped by area>

### <Area 1>

- <Change 1>
- <Change 2>

### <Area 2>

- <Change 1>

## Testing

- [ ] Type-check passes
- [ ] Lint passes
- [ ] All tests pass (<n> tests)
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project conventions
- [ ] Tests added for new functionality
- [ ] Documentation updated (if needed)
- [ ] No console.log or debug code
- [ ] Commits are atomic and well-described

## Related Issues

Closes #<issue-number>
```

### Phase 4: Create PR

1. **Create the PR:**

   ```bash
   gh pr create \
     --title "<type>(<scope>): <description>" \
     --body "$(cat <<'EOF'
   <PR body from Phase 3>
   EOF
   )" \
     --base main
   ```

2. **Add labels (if applicable):**

   ```bash
   gh pr edit <pr-number> --add-label "<label>"
   ```

3. **Request reviewers (if specified):**

   ```bash
   gh pr edit <pr-number> --add-reviewer "<username>"
   ```

4. **Trigger CodeRabbit review (IMPORTANT - must be a comment, not in body):**

   ```bash
   gh pr comment <pr-number> --body "@coderabbitai full review"
   ```

   > **Note:** CodeRabbit auto-reviews are currently disabled for this repo. You must manually trigger reviews with the comment above.

5. **Trigger Claude review:**
   ```bash
   gh pr comment <pr-number> --body "@claude review"
   ```

### Phase 5: Update GitHub Project Board - Set "In Review"

1. **Update status:**

   ```bash
   # Get item ID
   ITEM_ID=$(gh project item-list 11 --owner rollercoaster-dev --format json | jq -r '.items[] | select(.content.number == <issue-number>) | .id')

   # Set to "In Review" (option ID: 51c2af7b)
   gh project item-edit --project-id PVT_kwDOB1lz3c4BI2yZ --id $ITEM_ID --field-id PVTSSF_lADOB1lz3c4BI2yZzg5MUx4 --single-select-option-id 51c2af7b
   ```

### Phase 6: Verify and Report

1. **Get PR details:**

   ```bash
   gh pr view --json number,url,title
   ```

2. **Verify reviews triggered:**
   - Check that comment `@coderabbitai full review` was posted
   - Check that comment `@claude review` was posted
   - CodeRabbit will reply with "Full review triggered"
   - Claude will post a detailed code review

3. **Report to user:**
   - PR URL
   - PR number
   - Status
   - Board status: "In Review"
   - Reviews requested: CodeRabbit + Claude
   - Next steps

## PR Title Format

```
<type>(<scope>): <description>
```

Examples:

- `feat(keys): add JWKS endpoint for issuer keys`
- `fix(baking): resolve PNG chunk encoding issue`
- `refactor(verify): extract proof validation logic`
- `test(api): add E2E tests for baking flow`

## CodeRabbit Integration

**Trigger full review:**

```
@coderabbitai full review
```

**Other CodeRabbit commands (for reference):**

- `@coderabbitai summary` - Get PR summary
- `@coderabbitai generate docstrings` - Generate docstrings
- `@coderabbitai configuration` - Show config

## Error Handling

### Push Fails

1. **Check remote:**

   ```bash
   git remote -v
   ```

2. **Check permissions:**
   - Verify GitHub authentication
   - Check repository access

3. **Force push (if needed and safe):**
   - Only if feature branch, never main
   - `git push -u origin <branch> --force-with-lease`

### PR Creation Fails

1. **Check existing PRs:**

   ```bash
   gh pr list --head <branch-name>
   ```

2. **If PR exists:**
   - Report existing PR URL
   - Ask if user wants to update it

3. **Missing permissions:**
   - Check GitHub token
   - Verify repository access

### Tests Failing

1. **Stop PR creation**
2. **Report failures:**
   - Which tests failed
   - Error messages
3. **Suggest:**
   - Fix tests first
   - Or create draft PR

## Output Format

```markdown
## PR Created

**URL**: https://github.com/<owner>/<repo>/pull/<number>
**Number**: #<number>
**Title**: <title>
**Branch**: <branch> → main

### Stats

- Commits: <n>
- Files changed: <n>
- Lines: +<added> / -<removed>

### Status

- Tests: PASS
- CodeRabbit: Review requested
- Claude: Review requested

### Next Steps

1. Wait for AI reviews (~2-5 minutes)
2. Address CodeRabbit and Claude feedback
3. Request human review if needed
4. Merge when approved

To check review status: "check pr #<number> reviews"
```

## Tools Required

**Required:**

- Bash (git, gh commands)
- Read (development plan, commit messages)

**Optional:**

- Glob (find related files)
- Grep (search for related code)

## Example Usage

```
User: "create pr for issue #15"

Agent:
1. Gets current branch: feat/issue-15-jwks-endpoint
2. Fetches issue #15: "feat: Add JWKS endpoint"
3. Gets commits: 3 commits, +145/-0 lines
4. Runs tests: all passing
5. Pushes branch to origin
6. Creates PR with:
   - Title: "feat(keys): add JWKS endpoint for issuer keys"
   - Body: Summary, changes, testing checklist
   - Footer: "Closes #15" + "@coderabbitai full review"
7. Reports: "PR #42 created. CodeRabbit review requested."
```

## Success Criteria

This agent is successful when:

- PR is created with proper formatting
- Issue is linked with "Closes #X"
- CodeRabbit review is triggered (comment posted)
- Claude review is triggered (comment posted)
- Board status is updated to "In Review"
- User has PR URL and next steps
