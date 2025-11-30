# Agent Restructure Plan

## Overview

The migration is complete. We need to:

1. Adapt migration-specific agents for general development use
2. Add dependency checking to the PR workflow
3. Clean up/archive migration-only agents

## Current Agent Inventory

### Keep As-Is (General Purpose)

- `issue-researcher.md` - ✅ Already enhanced with dependency checking
- `atomic-developer.md` - Already general purpose
- `pr-creator.md` - Needs dependency validation added
- `review-handler.md` - Already general purpose
- `dev-orchestrator.md` - Already general purpose
- `github-master.md` - Already general purpose
- `documentation-updater.md` - Already general purpose
- `dependency-analyzer.md` - Useful for any dependency work
- `test-coverage-validator.md` - Useful for any test work
- `openbadges-compliance-reviewer.md` - Domain-specific, keep

### Adapt for General Use

| Migration Agent             | Rename To             | Purpose                                |
| --------------------------- | --------------------- | -------------------------------------- |
| `migration-executor.md`     | `feature-executor.md` | Execute dev plans with atomic commits  |
| `migration-finalizer.md`    | `pr-finalizer.md`     | Create comprehensive PRs, close issues |
| `migration-planner.md`      | `feature-planner.md`  | Create detailed implementation plans   |
| `migration-orchestrator.md` | `dev-workflow.md`     | Guide full issue→PR workflow           |

### Archive (Migration-Specific)

| Agent                       | Reason                                          |
| --------------------------- | ----------------------------------------------- |
| `migration-analyzer.md`     | Only for analyzing external repos for migration |
| `bun-package-integrator.md` | Migration-specific Bun setup                    |
| `test-migration.md`         | Jest/Vitest to Bun migration                    |

## Changes to Make

### 1. pr-creator.md - Add Dependency Validation

Add Phase 0.5 before pushing:

````markdown
### Phase 0.5: Check Dependencies

Before creating PR, verify all dependencies are met:

1. **Parse issue body for dependencies:**
   ```bash
   gh issue view <number> --json body | grep -iE "(blocked by|depends on|after) #[0-9]+"
   ```
````

2. **Check each dependency status:**

   ```bash
   gh issue view <dep-number> --json state,title
   ```

3. **Decision logic:**
   - If ANY "Blocked by" dependency is open → WARN and ask user to confirm
   - If "Depends on" dependencies are open → WARN but proceed
   - Add Dependencies section to PR body

4. **Update PR template with Dependencies section:**
   ```markdown
   ## Dependencies

   - [x] #123 - Merged ✅
   - [ ] #456 - Still open ⚠️
   ```

```

### 2. Rename and Adapt Migration Agents

#### migration-executor.md → feature-executor.md

Changes:
- Remove migration-specific terminology
- Remove Bun migration steps
- Keep atomic commit execution pattern
- Keep phase-based progress tracking
- Remove sub-agent calls to migration-specific agents
- Generalize to "execute any dev plan"

#### migration-finalizer.md → pr-finalizer.md

Changes:
- Remove migration-specific PR template
- Use standard PR template with Dependencies section
- Keep comprehensive PR description generation
- Keep sub-issue closing logic
- Generalize to "finalize any feature work"

#### migration-planner.md → feature-planner.md

Changes:
- Remove migration phases (Bun integration, dependency resolution)
- Keep atomic commit planning
- Keep validation step planning
- Keep rollback strategy
- Generalize to "plan any feature implementation"

#### migration-orchestrator.md → dev-workflow.md

Changes:
- Remove migration-specific phases
- New workflow:
  1. Research (issue-researcher)
  2. Plan (feature-planner) - optional for simple issues
  3. Execute (atomic-developer or feature-executor)
  4. Finalize (pr-finalizer)
- Add dependency checking at start
- Keep interactive/auto modes

### 3. Archive Migration Agents

Move to `.claude/agents/archive/`:
- `migration-analyzer.md`
- `bun-package-integrator.md`
- `test-migration.md`

Keep note in archive folder that these can be restored if needed.

## Implementation Order

1. ✅ Enhanced issue-researcher with dependency checking
2. 🔄 Enhance pr-creator with dependency validation
3. Create feature-executor.md (adapted from migration-executor)
4. Create pr-finalizer.md (adapted from migration-finalizer)
5. Create feature-planner.md (adapted from migration-planner)
6. Update dev-orchestrator.md to use new agents
7. Archive migration-specific agents
8. Update CLAUDE.md to reflect changes

## Testing

After changes:
- Test issue-researcher on an issue with dependencies (#167)
- Test pr-creator dependency warnings
- Verify dev-orchestrator workflow still works
```
