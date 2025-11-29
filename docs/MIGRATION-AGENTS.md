# Migration Agent Architecture

This document describes the multi-agent architecture for migrating packages into the Bun-based monorepo.

## Overview

The migration system uses **10 specialized agents** that work together to migrate packages from standalone repositories into the monorepo. Each agent does one thing well and can be invoked independently.

**Important**: Claude Code subagents cannot call other subagents. The main Claude session orchestrates the workflow by invoking agents sequentially based on guidance from the orchestrator.

## Quick Start

**To migrate a package:**

```
User: "Migrate {package-name} from {repo-url}"
```

The main Claude session will guide you through:

1. **Phase 1**: Invoke `migration-analyzer` → get complexity assessment
2. **Phase 2**: Invoke `migration-planner` → get detailed plan
3. **Phase 3**: Invoke `migration-executor` → execute with atomic commits
4. **Phase 4**: Invoke `migration-finalizer` → create PR, close issues

Use `migration-orchestrator` to check current state and get the next step.

**Estimated time**: Varies by complexity (EASY: 1-2 days, MEDIUM: 3-5 days, HARD: 1-2 weeks)

## Architecture Diagram

```
Main Claude Session (orchestrates workflow)
│
├─► migration-orchestrator (advisory - guides next steps)
│
├─► Phase 1: migration-analyzer (analyzes package)
│
├─► Phase 2: migration-planner (creates plan)
│
├─► Phase 3: migration-executor (executes plan)
│   (handles deps, Bun config, tests, docs internally)
│
├─► Phase 4: migration-finalizer (creates PR)
│
└─► Utility agents (invoke as needed for complex issues):
    ├─► dependency-analyzer
    ├─► bun-package-integrator
    ├─► test-migration
    ├─► test-coverage-validator
    └─► documentation-updater
```

**Note**: Agents do not call each other. The main session invokes them sequentially.

## Agent Catalog

### Core Workflow Agents

These agents run in sequence for every migration:

#### 1. migration-analyzer

**Purpose**: Analyzes repository for migration feasibility
**Calls**: dependency-analyzer (parallel)
**Output**: Analysis report with complexity score and recommendation

**What it does**:

- Clones and analyzes repository structure
- Detects Bun API usage and compatibility
- Identifies Node.js-specific code
- Counts files, tests, dependencies
- Assesses migration complexity (score 0-100)
- Recommends: PROCEED | PROCEED_WITH_CAUTION | NEEDS_WORK | DO_NOT_MIGRATE

**Complexity Scoring**:

- 0-10: TRIVIAL (few hours)
- 11-25: EASY (1-2 days)
- 26-50: MEDIUM (3-5 days)
- 51-75: HARD (1-2 weeks)
- 76+: VERY HARD (2+ weeks)

#### 2. migration-planner

**Purpose**: Creates detailed step-by-step migration plan
**Input**: Analysis report
**Output**: MIGRATION*PLAN*{package}.md

**What it does**:

- Defines 8 migration phases with atomic commits
- Plans dependency resolution strategy
- Plans Bun integration steps
- Identifies code changes needed
- Defines validation steps per phase
- Creates rollback strategy
- Estimates timeline

**8 Standard Phases**:

1. Initial Setup (3-5 commits)
2. Dependency Resolution (2-4 commits)
3. Bun Integration (4-6 commits)
4. Code Adaptation (variable commits)
5. Validation (2-3 commits)
6. Documentation (2-3 commits)
7. Integration (2-3 commits)
8. Finalization (1-2 commits)

#### 3. migration-executor

**Purpose**: Executes migration plan with atomic commits
**Calls**: dependency-analyzer, bun-package-integrator, test-coverage-validator, documentation-updater
**Input**: Migration plan
**Output**: Execution report

**What it does**:

- Creates migration branch
- Creates sub-issues for tracking
- Executes each phase sequentially
- Makes atomic commits (format: `migrate({package}): {description}`)
- Calls specialized agents as needed
- Validates after each phase
- Reports progress

**Modes**:

- **Interactive** (default): Pause after each phase for approval
- **Auto**: Execute entire plan without pausing

#### 4. migration-finalizer

**Purpose**: Creates PR and finalizes migration
**Input**: Execution report
**Output**: PR URL and finalization report

**What it does**:

- Runs final validation (tests, build, type-check, lint)
- Creates comprehensive PR description
- Pushes branch to remote
- Creates PR via `gh` CLI
- Closes all sub-issues with completion comments
- Updates documentation with PR links

### Specialized Task Agents

These agents handle specific tasks and can be called independently:

#### 5. dependency-analyzer

**Purpose**: Analyzes dependencies for conflicts and Bun compatibility
**Reusable**: ✅ (dependency updates, troubleshooting, PR reviews)

**What it analyzes**:

- Version conflicts across packages
- Peer dependency issues
- Circular dependencies
- Bun-incompatible packages
- Node.js-only dependencies
- Missing type definitions
- Security vulnerabilities

**Output**: Dependency analysis report with:

- Conflict severity (CRITICAL | WARNING | INFO)
- Resolution strategies
- Risk assessment
- Recommended actions

#### 6. bun-package-integrator

**Purpose**: Integrates package into Bun monorepo
**Reusable**: ✅ (new packages, Bun upgrades)

**What it configures**:

- package.json for Bun (packageManager, scripts)
- TypeScript for Bun (moduleResolution: Bundler)
- Bun test runner migration
- Build configuration (bun build)
- TypeScript project references
- Workspace dependencies

**Handles**:

- Library vs application configuration
- Bun API detection and usage
- Test migration (Jest/Vitest → Bun test)
- Declaration file generation

#### 7. test-coverage-validator

**Purpose**: Validates test coverage before/after changes
**Reusable**: ✅ (PR reviews, refactoring, any code changes)

**What it validates**:

- Test execution (all tests pass)
- Coverage metrics (lines, statements, functions, branches)
- Coverage comparison (before/after)
- Coverage regression detection
- Threshold compliance

**Output**: Coverage validation report with:

- Overall coverage percentages
- Delta from baseline
- File-level coverage
- Uncovered code patterns
- Recommendations

#### 8. documentation-updater

**Purpose**: Updates all documentation for migrations and changes
**Reusable**: ✅ (features, version bumps, any structural changes)

**What it updates**:

- CLAUDE.md (package status, migration progress)
- README.md (package list, structure)
- MIGRATION.md (audit trail)
- Package README (monorepo context)
- Migration plan (archive to docs/migrations/)
- Cross-references

**Validates**:

- No broken links
- Consistent formatting
- Correct package manager commands (Bun)
- Version numbers aligned

### Orchestrator

#### 9. migration-orchestrator

**Purpose**: Guides migration workflow (advisory role)
**Does NOT call other agents** - returns instructions for what to invoke next

**What it does**:

- Entry point for understanding migration state
- Checks current progress and determines next step
- Returns clear instructions: "Invoke X agent next"
- Handles approval gates (interactive mode)
- Manages state between phases
- Provides progress updates

**Modes**:

- **Interactive** (default): User confirms before each phase
- **Guided**: Returns next step, user/main agent invokes it

**Can resume**: Yes, checks state and tells you where to continue

## Usage Examples

### Complete Migration

```
User: "Migrate openbadges-types from https://github.com/rollercoaster-dev/openbadges-types"

→ Main Claude session orchestrates:

  [Phase 1] User: "Use migration-analyzer"
  → migration-analyzer runs
  → Analysis: EASY complexity, FULL Bun compat, 2 dependency conflicts
  → "Ready for planning. Invoke migration-planner next."

  [Phase 2] User: "Use migration-planner" (or Claude invokes automatically)
  → migration-planner runs
  → Plan: 8 phases, ~22 commits, 12-16 hours estimated
  → "Plan created. Invoke migration-executor next."

  [Phase 3] User: "Use migration-executor"
  → migration-executor runs
  → Executes 8 phases with atomic commits...
  → All tests passing, coverage 91.2%
  → "Execution complete. Invoke migration-finalizer next."

  [Phase 4] User: "Use migration-finalizer"
  → migration-finalizer runs
  → PR created: #48

🎉 Migration complete!
PR: https://github.com/rollercoaster-dev/monorepo/pull/48
```

### Using Individual Agents

```
# Just analyze a package
User: "Analyze openbadges-ui for migration"
→ Launches migration-analyzer only

# Check dependencies
User: "Check dependencies for @rollercoaster-dev/api-client"
→ Launches dependency-analyzer only

# Integrate new package for Bun
User: "Set up Bun configuration for packages/new-package"
→ Launches bun-package-integrator only

# Validate coverage
User: "Check if PR maintains test coverage"
→ Launches test-coverage-validator only

# Update docs
User: "Update documentation for new feature in rd-logger"
→ Launches documentation-updater only
```

## Migration Workflow Detail

### Phase Flow

```
1. ANALYZE
   ├─ Clone repository
   ├─ Analyze structure, dependencies, tests
   ├─ Assess Bun compatibility
   ├─ Calculate complexity score
   └─ Recommend: proceed or not

2. PLAN
   ├─ Define 8 migration phases
   ├─ Plan atomic commits per phase
   ├─ Identify dependencies to resolve
   ├─ Plan Bun integration steps
   ├─ Define validation checkpoints
   ├─ Create rollback strategy
   └─ Estimate timeline

3. EXECUTE
   ├─ Create branch: migrate/{package}
   ├─ Create sub-issues for tracking
   │
   ├─ Phase 1: Initial Setup
   │   ├─ Import raw repository
   │   └─ Document initial state
   │
   ├─ Phase 2: Dependency Resolution
   │   ├─ Call dependency-analyzer
   │   ├─ Resolve version conflicts
   │   ├─ Add workspace dependencies
   │   └─ Remove duplicates
   │
   ├─ Phase 3: Bun Integration
   │   ├─ Call bun-package-integrator
   │   ├─ Configure package.json for Bun
   │   ├─ Configure TypeScript for Bun
   │   ├─ Migrate test runner
   │   ├─ Update build configuration
   │   └─ Add TypeScript references
   │
   ├─ Phase 4: Code Adaptation
   │   ├─ Fix TypeScript strict errors
   │   ├─ Update imports for ESM
   │   ├─ Adapt Bun-specific code
   │   └─ Remove standalone artifacts
   │
   ├─ Phase 5: Validation
   │   ├─ Call test-coverage-validator
   │   ├─ Fix failing tests
   │   ├─ Verify build works
   │   └─ Ensure coverage maintained
   │
   ├─ Phase 6: Documentation
   │   ├─ Call documentation-updater
   │   ├─ Update package README
   │   ├─ Update monorepo docs
   │   └─ Archive migration plan
   │
   ├─ Phase 7: Integration
   │   ├─ Add to Turborepo pipeline
   │   ├─ Configure CI/CD
   │   └─ Test full monorepo build
   │
   └─ Phase 8: Finalization
       └─ Final validation

4. FINALIZE
   ├─ Run final validation sweep
   ├─ Create comprehensive PR description
   ├─ Push branch and create PR
   ├─ Close sub-issues with summaries
   └─ Update docs with PR links
```

## Commit Standards

All migrations follow atomic commit standards:

**Format**: `migrate({package}): {specific change description}`

**Examples**:

```
migrate(openbadges-types): add raw repository to monorepo
migrate(openbadges-types): resolve zod version conflict
migrate(openbadges-types): configure for Bun monorepo
migrate(openbadges-types): fix TypeScript errors in core modules
migrate(openbadges-types): update imports for ESM compatibility
migrate(openbadges-types): remove standalone repository artifacts
```

**For documentation**:

```
docs: create migration plan for openbadges-types
docs: update monorepo docs for openbadges-types migration
docs: archive openbadges-types migration plan
```

**For build/CI**:

```
build: add openbadges-types to Turborepo pipeline
ci: configure CI/CD for openbadges-types
```

## Benefits of Multi-Agent Architecture

**Speed**:

- ✅ Parallel execution (dependency analysis + coverage check simultaneously)
- ✅ Faster than sequential monolith

**Quality**:

- ✅ Each agent is expert in one domain
- ✅ Deeper analysis without bloating
- ✅ Easier to test and validate

**Reusability**:

- ✅ dependency-analyzer: Every dependency change
- ✅ test-coverage-validator: Every PR, refactor
- ✅ documentation-updater: Every feature, version bump
- ✅ bun-package-integrator: Every new package

**Maintainability**:

- ✅ Small, focused agents (~200-400 lines)
- ✅ Fix/improve one without affecting others
- ✅ Easy to add new agents

**Developer Experience**:

- ✅ Single command for full migration (orchestrator)
- ✅ Can use agents individually for specific tasks
- ✅ Clear progress through phases
- ✅ Graceful error handling

## Comparison: Old vs New

### Old Architecture (rd-logger)

**Single Agent**: monorepo-migration-orchestrator

- Monolithic, did everything
- pnpm-focused
- Sequential execution
- Manual PR creation

**Result**: ✅ Successful migration but had gaps:

- TypeScript references incomplete
- Migration plan not archived
- No coverage comparison
- Sub-issues not preserved

### New Architecture (openbadges-types onward)

**10 Specialized Agents**: Composable, focused

- Bun-focused design
- Parallel execution where possible
- Automatic PR creation
- Comprehensive validation

**Expected Result**: ✅ Complete migrations with:

- TypeScript references integrated
- Migration plans archived
- Coverage validated
- Sub-issues preserved
- Better documentation

## Agent Locations

All agents are in `.claude/agents/`:

**Core Workflow**:

- `migration-analyzer.md`
- `migration-planner.md`
- `migration-executor.md`
- `migration-finalizer.md`

**Specialized Tasks**:

- `dependency-analyzer.md`
- `bun-package-integrator.md`
- `test-coverage-validator.md`
- `documentation-updater.md`

**Orchestrator**:

- `migration-orchestrator.md`

**Archived**:

- See `docs/migrations/ARCHIVED-original-migration-agent.md`

## Next Steps

### For Next Migration

1. **Migrate Monorepo to Bun** (FIRST!)
   - Current monorepo is pnpm-based
   - Need to migrate to Bun workspaces before migrating Bun packages
   - See: [Monorepo to Bun Migration Guide] (TODO)

2. **Then Migrate Packages**
   - Use migration-orchestrator
   - Start with EASY packages (openbadges-types)
   - Build experience before HARD packages

### For Continuous Improvement

Track migration metrics to improve agents:

- Actual vs estimated time
- Common errors encountered
- Agent effectiveness
- User feedback

Update agents based on learnings from each migration.

## Support

**Questions about agents**: See individual agent files for detailed documentation
**Migration issues**: Check `docs/migrations/README.md` for historical examples
**Bugs in agents**: Create GitHub issue with label `agent-improvement`

---

**Version**: 2.0 (Multi-Agent Architecture)
**Last Updated**: 2025-11-16
**Previous Version**: See `docs/migrations/ARCHIVED-original-migration-agent.md`
