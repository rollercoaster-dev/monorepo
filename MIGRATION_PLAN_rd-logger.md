# Migration Plan: rd-logger

**Status:** Planning Phase
**Package Version:** 0.3.1
**Target Location:** `/packages/rd-logger`
**Migration Date:** 2025-11-01

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Target State](#target-state)
3. [Versioning & Publishing Strategy](#versioning--publishing-strategy)
4. [Required Changes](#required-changes)
5. [Migration Steps](#migration-steps)
6. [Testing & Validation](#testing--validation)
7. [Risks & Mitigation](#risks--mitigation)
8. [Rollback Strategy](#rollback-strategy)

---

## Current State Analysis

### Repository Structure
The rd-logger package is currently a standalone repository at:
- **GitHub:** https://github.com/rollercoaster-dev/rd-logger
- **NPM:** `@rollercoaster-dev/rd-logger@0.3.1`
- **Current Status:** Package has been copied to `/packages/rd-logger` but not yet integrated

### Package Characteristics
- **Type:** ESM-only package (`"type": "module"`)
- **Build System:** TypeScript Compiler (tsc)
- **Test Framework:** Jest with ts-jest (ESM mode)
- **Linting:** ESLint with TypeScript plugin (v7)
- **Current Version:** 0.3.1
- **Dependencies:**
  - Runtime: `chalk@5.4.1`, `on-finished@2.4.1`
  - Peer: `@sinclair/typebox`, `elysia`, `express`, `hono`

### Source Code Structure
```
src/
├── index.ts                          # Main entry point
├── core/
│   ├── logger.service.ts             # Core logger implementation
│   ├── logger.config.ts              # Configuration types
│   ├── query-logger.ts               # Database query logger
│   ├── utils.ts                      # Utility functions
│   ├── formatters/                   # Log formatters (text, json)
│   ├── transports/                   # Output transports (console, file)
│   ├── sensitive/                    # Sensitive data protection
│   └── __tests__/                    # Unit tests
└── adapters/
    ├── express.ts                    # Express.js middleware
    ├── hono.ts                       # Hono framework middleware
    ├── generic.ts                    # Generic context wrapper
    └── __tests__/                    # Integration tests
```

### Package Exports
```json
{
  ".": "./dist/index.js",
  "./core/logger.service": "./dist/core/logger.service.js"
}
```

### Current Versioning System
- **Tool:** standard-version (v9.5.0)
- **Convention:** Conventional Commits
- **Scripts:**
  - `pnpm release` - Auto-determine version bump
  - `pnpm release:patch` - Patch release (0.3.x)
  - `pnpm release:minor` - Minor release (0.x.0)
  - `pnpm release:major` - Major release (x.0.0)
  - `pnpm release:alpha` - Alpha prerelease
  - `pnpm release:beta` - Beta prerelease
- **Config:** `.versionrc.json` for changelog generation

### Current Publishing Workflow
1. **Manual Process:**
   - Developer runs `pnpm release:patch` (or minor/major)
   - standard-version bumps version, updates CHANGELOG.md, creates git tag
   - Developer pushes tag to GitHub
   - GitHub Action (release.yml) triggers on tag push
   - Action runs tests, builds, publishes to npm

2. **GitHub Actions:**
   - `publish.yml` - Publishes on GitHub release creation
   - `release.yml` - Creates GitHub release and publishes to npm on tag push
   - Both use `NPM_TOKEN` secret for authentication

### Git History Considerations
- Package already copied to monorepo (appears to be a fresh copy without git history)
- Original repository has ~100+ commits
- CHANGELOG.md preserved with version history

---

## Target State

### Monorepo Integration
- **Location:** `/packages/rd-logger` (already in place)
- **Build System:** Continue using tsc, integrated with Turbo
- **Test Framework:** Migrate from Jest to Vitest (monorepo standard, if applicable)
- **Linting:** Migrate to shared ESLint config from `@rollercoaster-dev/shared-config`
- **TypeScript:** Use TypeScript project references with shared base config

### Package Identity
- **Name:** `@rollercoaster-dev/rd-logger` (unchanged)
- **Version:** 0.3.1 (maintain current version)
- **Public Package:** YES - must remain publishable to npm
- **Access:** Public (`publishConfig.access: "public"`)

---

## Versioning & Publishing Strategy

### Recommended Approach: Changesets

**Why Changesets?**
1. **Industry Standard:** Used by major monorepos (MUI, Radix UI, Turborepo itself)
2. **Granular Control:** Each PR can declare its own version impact
3. **Automatic Changelogs:** Generates changelogs from changeset descriptions
4. **Monorepo Native:** Designed specifically for monorepo versioning
5. **CI/CD Friendly:** Excellent GitHub Actions integration
6. **Independent Versioning:** Each package can have its own version
7. **Conventional Commits Compatible:** Can work alongside existing commit standards

**Implementation Plan:**

1. **Install Changesets:**
   ```bash
   pnpm add -Dw @changesets/cli
   pnpm changeset init
   ```

2. **Configuration (`.changeset/config.json`):**
   ```json
   {
     "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
     "changelog": "@changesets/cli/changelog",
     "commit": false,
     "fixed": [],
     "linked": [],
     "access": "public",
     "baseBranch": "main",
     "updateInternalDependencies": "patch",
     "ignore": ["@rollercoaster-dev/shared-config"]
   }
   ```

3. **Workflow:**
   - **Developer:** Run `pnpm changeset` when making versioned changes
   - **Developer:** Select package(s), version bump type, write changelog entry
   - **Developer:** Commit changeset file with code changes
   - **CI:** Changesets bot creates/updates "Version Packages" PR
   - **Maintainer:** Merge "Version Packages" PR when ready to release
   - **CI:** Publish workflow automatically publishes changed packages to npm

4. **Scripts to Add (root package.json):**
   ```json
   {
     "changeset": "changeset",
     "changeset:version": "changeset version",
     "changeset:publish": "changeset publish"
   }
   ```

5. **GitHub Actions:**
   - Create `.github/workflows/release.yml` for automated releases
   - Use `changesets/action@v1` for version management
   - Publish to npm when changesets are merged to main

**Migration from standard-version:**
- Remove `standard-version` dependency from rd-logger
- Remove version-related scripts from package.json
- Keep CHANGELOG.md as-is (changesets will append to it)
- Remove `.versionrc.json` (changesets uses its own config)
- Update CONTRIBUTING.md to explain changeset workflow

**Alternative Considered: Continue standard-version**
- **Pros:** No new tooling to learn, works with current workflow
- **Cons:** Not monorepo-native, manual per-package management, less CI/CD integration
- **Decision:** Not recommended for monorepo long-term

---

## Required Changes

### 1. Configuration Files

#### A. TypeScript Configuration
**Current:** Standalone tsconfig.json
**Target:** Use TypeScript project references with shared config

**Changes:**
- Extend from `@rollercoaster-dev/shared-config/tsconfig`
- Add project references for better build performance
- Update paths to work with monorepo structure
- Ensure `composite: true` for project references

**File:** `packages/rd-logger/tsconfig.json`
```json
{
  "extends": "@rollercoaster-dev/shared-config/tsconfig",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*", "test/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### B. ESLint Configuration
**Current:** `.eslintrc.cjs` with custom config
**Target:** Use shared ESLint config

**Changes:**
- Migrate from `.eslintrc.cjs` to `eslint.config.mjs` (ESLint v9+)
- Extend from `@rollercoaster-dev/shared-config/eslint`
- Preserve rd-logger-specific rules if needed

**File:** `packages/rd-logger/eslint.config.mjs` (new)
```javascript
import sharedConfig from '@rollercoaster-dev/shared-config/eslint';

export default [
  ...sharedConfig,
  {
    // rd-logger-specific overrides if needed
    rules: {
      // Keep existing exceptions
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    }
  }
];
```

#### C. Prettier Configuration
**Current:** No explicit prettier config (uses defaults)
**Target:** Use shared prettier config

**Changes:**
- Add prettier config reference

**File:** `packages/rd-logger/package.json`
```json
{
  "prettier": "@rollercoaster-dev/shared-config/prettier"
}
```

#### D. Jest Configuration
**Current:** `jest.config.cjs` with ts-jest
**Target:** Option 1: Keep Jest, or Option 2: Migrate to Vitest

**Decision Required:** Should we migrate to Vitest for consistency, or keep Jest?

**If keeping Jest:**
- Update paths to be relative to package directory
- Ensure compatibility with monorepo structure
- Update turbo.json to handle jest

**If migrating to Vitest:**
- Create `vitest.config.ts`
- Migrate test files (minimal changes needed)
- Update test scripts
- Remove jest dependencies

**Recommendation:** Keep Jest for now to minimize migration risk, consider Vitest in future iteration.

### 2. Package.json Updates

**Changes needed:**
```json
{
  "name": "@rollercoaster-dev/rd-logger",
  "version": "0.3.1",
  "scripts": {
    "build": "tsc",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "clean": "rm -rf dist"
    // REMOVE: release scripts (handled by changesets)
    // REMOVE: prepare script (husky not needed in monorepo)
    // REMOVE: prepublishOnly (handled by CI)
  },
  "devDependencies": {
    // REMOVE: husky, lint-staged, standard-version
    // REMOVE: commitlint (monorepo handles this at root)
    // REMOVE: eslint, @typescript-eslint/* (provided by shared-config)
    // REMOVE: typescript (provided by root)
    // REMOVE: prettier (provided by shared-config)
    // KEEP: jest, ts-jest, @types/* packages
    // KEEP: framework test dependencies (express, hono, etc.)
    // ADD: @rollercoaster-dev/shared-config as devDependency
  },
  "dependencies": {
    // KEEP AS-IS: chalk, on-finished
  },
  "peerDependencies": {
    // KEEP AS-IS: framework dependencies
  }
}
```

### 3. File Cleanup

**Files to Remove:**
- `.versionrc.json` - standard-version config (replaced by changesets)
- `commitlint.config.js` - handled at monorepo root
- `.husky/` - git hooks handled at monorepo root
- `.github/workflows/*` - CI/CD handled at monorepo root
- `.gitignore` - covered by root .gitignore
- `.eslintrc.cjs` - replaced by eslint.config.mjs

**Files to Keep:**
- `CHANGELOG.md` - preserve version history
- `README.md` - package documentation
- `LICENSE` - MIT license
- `CODE_OF_CONDUCT.md` - community guidelines
- `CONTRIBUTING.md` - contribution guidelines (update for monorepo)
- `docs/` - package-specific documentation
- `IMPROVEMENTS.md`, `IMPROVEMENTS-IMPLEMENTED.md` - project notes

**Files to Update:**
- `CONTRIBUTING.md` - Update to reference monorepo workflow
- `README.md` - Update installation instructions, CI badge paths

### 4. Import Paths & Dependencies

**No changes needed:**
- Package uses relative imports internally
- External users import via `@rollercoaster-dev/rd-logger`
- No internal monorepo dependencies currently

**Future consideration:**
- If shared utilities are needed, can create `@rollercoaster-dev/shared-utils`
- Internal imports would use workspace protocol: `workspace:*`

### 5. Build Integration

**Turbo Configuration:**
- No changes needed to `turbo.json` - rd-logger already compatible
- Turbo will automatically detect and cache builds
- Test task will run jest as configured

**Build outputs:**
- `dist/` directory (already configured)
- Coverage reports in `coverage/` (already configured)

---

## Migration Steps

**IMPORTANT:** Each step is a separate commit. Get approval before proceeding.

### Phase 1: Cleanup (Completed - package already in monorepo)
- [x] Package copied to `/packages/rd-logger`

### Phase 2: Configuration Migration

#### Step 1: Migrate to Shared ESLint Config
**Commit:** `migrate(rd-logger): integrate shared ESLint configuration`

**Actions:**
1. Create `packages/rd-logger/eslint.config.mjs`
2. Remove `.eslintrc.cjs`
3. Update package.json to remove eslint dependencies
4. Add `@rollercoaster-dev/shared-config` as devDependency
5. Run `pnpm lint` to verify
6. Fix any new linting issues that arise

**Risk:** Low - linting errors won't break functionality
**Validation:** `pnpm --filter @rollercoaster-dev/rd-logger lint` succeeds

#### Step 2: Migrate TypeScript Configuration
**Commit:** `migrate(rd-logger): integrate TypeScript project references`

**Actions:**
1. Update `packages/rd-logger/tsconfig.json` to extend shared config
2. Add `composite: true` and `declarationMap: true`
3. Update root `tsconfig.json` to reference rd-logger if needed
4. Run `pnpm typecheck` to verify
5. Run `pnpm build` to ensure build works

**Risk:** Medium - could break builds if paths are wrong
**Validation:**
- `pnpm --filter @rollercoaster-dev/rd-logger typecheck` succeeds
- `pnpm --filter @rollercoaster-dev/rd-logger build` succeeds
- Generated `.d.ts` files are correct

#### Step 3: Update Package.json Scripts & Dependencies
**Commit:** `migrate(rd-logger): update scripts and remove standalone dependencies`

**Actions:**
1. Remove version-related scripts (release, release:patch, etc.)
2. Remove `prepare` script (husky)
3. Remove `prepublishOnly` script (CI handles this)
4. Update `lint` script to just `eslint .`
5. Add `clean` script
6. Remove devDependencies: husky, lint-staged, standard-version, commitlint
7. Remove `lint-staged` configuration from package.json
8. Update test scripts to remove explicit config path if needed
9. Run `pnpm install` to update lockfile

**Risk:** Low - scripts are development conveniences
**Validation:** All scripts still work locally

#### Step 4: Cleanup Unnecessary Files
**Commit:** `migrate(rd-logger): remove standalone repository artifacts`

**Actions:**
1. Remove `.versionrc.json`
2. Remove `commitlint.config.js`
3. Remove `.husky/` directory
4. Remove `.github/workflows/` directory
5. Remove `.gitignore` (covered by root)
6. Remove `.eslintrc.cjs` (already done in Step 1)

**Risk:** Very Low - these files are unused in monorepo
**Validation:** Package still builds and tests pass

#### Step 5: Update Documentation
**Commit:** `migrate(rd-logger): update documentation for monorepo`

**Actions:**
1. Update `CONTRIBUTING.md`:
   - Remove references to standard-version
   - Add section on changesets workflow
   - Update git workflow for monorepo
2. Update `README.md`:
   - Update CI badge URLs (once monorepo CI is set up)
   - Update installation instructions (should work as-is)
   - Add note about monorepo development
3. Update `package.json` repository field to point to monorepo

**Risk:** Very Low - documentation only
**Validation:** Manual review

### Phase 3: Versioning & Publishing Setup

#### Step 6: Install and Configure Changesets
**Commit:** `chore: setup changesets for monorepo versioning`

**Actions:**
1. Install `@changesets/cli` as root devDependency
2. Run `pnpm changeset init`
3. Configure `.changeset/config.json` as specified above
4. Add changeset scripts to root `package.json`
5. Create initial changeset to document migration:
   ```bash
   pnpm changeset
   # Select rd-logger
   # Choose "patch" (no breaking changes)
   # Describe: "Migrate to monorepo structure"
   ```

**Risk:** Low - no impact until we publish
**Validation:** `pnpm changeset` command works

#### Step 7: Setup GitHub Actions for Publishing
**Commit:** `ci: add automated release workflow with changesets`

**Actions:**
1. Create `.github/workflows/release.yml` at monorepo root:
   - Trigger on push to main
   - Use `changesets/action@v1`
   - Publish to npm using NPM_TOKEN
   - Create GitHub releases
2. Ensure `NPM_TOKEN` secret is configured in GitHub repository settings
3. Test workflow with initial changeset

**Risk:** Medium - could accidentally publish if not careful
**Validation:**
- Workflow runs successfully (dry-run first)
- Does not publish until "Version Packages" PR is merged

### Phase 4: Testing & Validation

#### Step 8: Run Full Test Suite
**Commit:** N/A (validation only)

**Actions:**
1. Run all tests: `pnpm --filter @rollercoaster-dev/rd-logger test`
2. Check coverage: `pnpm --filter @rollercoaster-dev/rd-logger test:coverage`
3. Verify all tests pass
4. Compare coverage to baseline

**Risk:** N/A
**Validation:** All tests pass with similar coverage to standalone repo

#### Step 9: Test Build & Type Checking
**Commit:** N/A (validation only)

**Actions:**
1. Clean build: `pnpm --filter @rollercoaster-dev/rd-logger clean`
2. Fresh build: `pnpm --filter @rollercoaster-dev/rd-logger build`
3. Type check: `pnpm --filter @rollercoaster-dev/rd-logger typecheck`
4. Lint: `pnpm --filter @rollercoaster-dev/rd-logger lint`
5. Verify dist/ output is correct
6. Check .d.ts files are generated

**Risk:** N/A
**Validation:** All build artifacts generated correctly

#### Step 10: Test Turbo Integration
**Commit:** N/A (validation only)

**Actions:**
1. Run from root: `pnpm build`
2. Run from root: `pnpm test`
3. Run from root: `pnpm lint`
4. Verify Turbo caches rd-logger tasks
5. Verify Turbo cache hits on second run

**Risk:** N/A
**Validation:** Turbo correctly orchestrates rd-logger tasks

#### Step 11: Test Local Package Consumption
**Commit:** N/A (validation only)

**Actions:**
1. Create temporary test app in `experiments/` folder
2. Add rd-logger as dependency using workspace protocol
3. Import and use rd-logger
4. Verify TypeScript types work
5. Verify runtime behavior is correct

**Risk:** N/A
**Validation:** Package can be consumed locally as expected

### Phase 5: Documentation & Communication

#### Step 12: Create Migration Summary
**Commit:** `docs: document rd-logger migration to monorepo`

**Actions:**
1. Update this migration plan with "Completed" status
2. Document any deviations from plan
3. Note any issues encountered and resolutions
4. Archive migration plan (move to `docs/migrations/`)

**Risk:** Very Low
**Validation:** Documentation is clear and complete

---

## Testing & Validation

### Pre-Migration Baseline
**Capture before starting migration:**
1. Test coverage percentage: [TO BE RECORDED]
2. Number of tests: [TO BE RECORDED]
3. Build output size: [TO BE RECORDED]
4. Type definitions generated: [TO BE RECORDED]

### Post-Migration Validation Checklist
- [ ] All tests pass
- [ ] Test coverage maintained or improved
- [ ] Package builds successfully
- [ ] Type definitions (.d.ts) generated correctly
- [ ] ESLint passes with no errors
- [ ] TypeScript compiles with no errors
- [ ] Turbo can build/test/lint the package
- [ ] Package can be consumed by other monorepo packages
- [ ] Changesets workflow functions correctly
- [ ] GitHub Actions workflow validated
- [ ] Documentation updated and accurate
- [ ] No regressions in functionality

### Integration Testing
**After migration:**
1. Create test app that uses rd-logger
2. Verify all exports work: main export, logger.service export
3. Verify adapters work: express, hono, generic
4. Verify transports work: console, file
5. Verify formatters work: text, json
6. Verify query logger functionality
7. Verify sensitive data protection works

### Publishing Test Plan
**Before first production publish:**
1. Use `npm pack` to create tarball locally
2. Extract and inspect tarball contents
3. Verify dist/ files are included
4. Verify source files are NOT included
5. Test publish to npm with `--dry-run` flag
6. Create test publish to npm with version 0.3.2-test.0
7. Install test version in external project
8. Verify functionality
9. Unpublish test version
10. Proceed with real publish

---

## Risks & Mitigation

### High Severity Risks

#### Risk: Breaking Published Package
**Likelihood:** Medium
**Impact:** High
**Scenario:** Configuration errors could cause published package to be broken

**Mitigation:**
- Use `npm pack` and test tarball before publishing
- Publish test version first (0.3.2-alpha.0)
- Validate test version in separate project
- Use `--dry-run` flag for initial publish attempts
- Have rollback plan ready (see below)

#### Risk: Version History Loss
**Likelihood:** Low
**Impact:** Medium
**Scenario:** Changelog or version history could be lost

**Mitigation:**
- Keep CHANGELOG.md in package
- Document migration in changelog
- Preserve git tags by referencing original repo
- Add note in README about version history

### Medium Severity Risks

#### Risk: Dependency Conflicts
**Likelihood:** Low
**Impact:** Medium
**Scenario:** Shared dependencies could conflict with rd-logger needs

**Mitigation:**
- Pin critical dependency versions
- Use peerDependencies for framework integrations
- Test thoroughly before publishing
- Document any version requirements

#### Risk: Build System Changes
**Likelihood:** Low
**Impact:** Medium
**Scenario:** Moving to monorepo build system could introduce issues

**Mitigation:**
- Validate build output matches standalone version
- Compare dist/ files before and after
- Test in isolation first
- Use same TypeScript compiler version

#### Risk: Test Framework Migration
**Likelihood:** Low (if keeping Jest)
**Impact:** Low
**Scenario:** Tests could break during migration

**Mitigation:**
- Keep Jest for initial migration
- Run tests frequently during migration
- Compare test output to baseline
- Consider Vitest migration as separate future task

### Low Severity Risks

#### Risk: Documentation Drift
**Likelihood:** Medium
**Impact:** Low
**Scenario:** Documentation could become outdated

**Mitigation:**
- Update all docs during migration
- Add migration notes to README
- Update contributing guide
- Schedule doc review after migration

---

## Rollback Strategy

### If Migration Fails During Development

**Option 1: Revert Commits**
1. Identify last good commit
2. Create new branch from last good state
3. Cherry-pick any successful commits
4. Abandon failed migration branch

**Option 2: Start Over**
1. Delete `/packages/rd-logger`
2. Re-clone from original repository
3. Review lessons learned
4. Adjust migration plan
5. Retry migration

### If Published Package is Broken

**Immediate Actions:**
1. Deprecate broken version on npm: `npm deprecate @rollercoaster-dev/rd-logger@<version> "Broken build, use version X.Y.Z instead"`
2. Identify issue
3. Fix issue locally
4. Test fix thoroughly
5. Publish patch version
6. Update deprecation message to point to fixed version

**Emergency Rollback:**
If fixes are not quick:
1. Re-publish last known good version with higher version number
2. Document the issue in CHANGELOG
3. Communicate to users via GitHub discussion/issue
4. Fix at leisure and publish corrected version

### Prevention

- **Never** delete previous npm versions
- **Always** test with `npm pack` before publishing
- **Always** use semver correctly
- **Always** document breaking changes
- Maintain communication channels for user reports

---

## Versioning Strategy Details

### Current Version: 0.3.1
**Maintain this version through migration.**

### Next Version: 0.3.2 (Post-Migration)
**Reason:** Migration itself is a patch-level change (no new features, no breaking changes)

**Changeset content:**
```markdown
---
"@rollercoaster-dev/rd-logger": patch
---

Migrate package to monorepo structure. No functional changes. Package now maintained at https://github.com/rollercoaster-dev/monorepo/tree/main/packages/rd-logger
```

### Future Versioning Workflow

**For contributors:**
1. Make changes to rd-logger
2. Run `pnpm changeset` before committing
3. Select `@rollercoaster-dev/rd-logger`
4. Choose version bump type:
   - `patch` - Bug fixes, documentation, internal refactors
   - `minor` - New features, non-breaking enhancements
   - `major` - Breaking changes
5. Write clear description (becomes changelog entry)
6. Commit changeset file with code changes
7. Create PR as normal

**For maintainers:**
1. Review PRs including their changesets
2. When ready to release, merge "Version Packages" PR created by Changesets bot
3. GitHub Action automatically publishes to npm
4. GitHub release automatically created with changelog

### Semantic Versioning Guidelines

**Patch (0.3.x):**
- Bug fixes
- Performance improvements
- Documentation updates
- Internal code refactoring
- Dependency updates (non-breaking)

**Minor (0.x.0):**
- New features (backwards compatible)
- New adapters/transports/formatters
- New configuration options (with defaults)
- Deprecations (with warnings)

**Major (x.0.0):**
- Breaking API changes
- Removed features
- Changed configuration schema (breaking)
- Dropped Node.js version support
- Changed peer dependency requirements

---

## Publishing Workflow Details

### Local Publishing (Emergency)
```bash
# From package directory
cd packages/rd-logger

# Ensure everything is clean
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Create tarball to inspect
npm pack

# Extract and verify contents
tar -xzf rollercoaster-dev-rd-logger-*.tgz
ls package/

# If good, publish (requires npm login)
npm publish --access public

# Clean up
rm -rf package rollercoaster-dev-rd-logger-*.tgz
```

### Automated Publishing (Preferred)

**Setup Requirements:**
1. `NPM_TOKEN` secret configured in GitHub repository settings
2. npm account has publish rights to `@rollercoaster-dev` scope
3. Changesets GitHub Action configured

**Process:**
1. Changesets bot creates "Version Packages" PR
2. Review version bumps and changelog updates
3. Merge PR to main
4. GitHub Action runs:
   - Installs dependencies
   - Runs all tests
   - Builds packages
   - Publishes changed packages to npm
   - Creates GitHub releases

**Monitoring:**
- Watch GitHub Actions for publish status
- Check npm for new version availability
- Verify package downloads correctly: `npm info @rollercoaster-dev/rd-logger`

---

## Success Criteria

Migration is considered complete when:

1. **Build System:**
   - [x] Package copied to `/packages/rd-logger`
   - [ ] Package builds successfully with monorepo tooling
   - [ ] TypeScript project references working
   - [ ] Turbo successfully caches builds

2. **Testing:**
   - [ ] All tests pass
   - [ ] Test coverage maintained (>= baseline)
   - [ ] Tests run via Turbo

3. **Configuration:**
   - [ ] ESLint uses shared config
   - [ ] TypeScript uses shared config
   - [ ] Prettier uses shared config
   - [ ] No duplicate configurations

4. **Versioning:**
   - [ ] Changesets installed and configured
   - [ ] Changeset workflow tested
   - [ ] Version history preserved in CHANGELOG

5. **Publishing:**
   - [ ] GitHub Actions workflow created
   - [ ] Test publish successful
   - [ ] Automated publishing validated

6. **Documentation:**
   - [ ] README updated
   - [ ] CONTRIBUTING updated
   - [ ] Migration documented
   - [ ] All docs reviewed

7. **Validation:**
   - [ ] Package consumable locally
   - [ ] No regressions identified
   - [ ] All exports functional
   - [ ] Integration tests pass

---

## Timeline Estimate

**Total Time:** 4-6 hours

- **Phase 2 (Configuration):** 2-3 hours
  - Step 1 (ESLint): 30 mins
  - Step 2 (TypeScript): 45 mins
  - Step 3 (Package.json): 30 mins
  - Step 4 (Cleanup): 15 mins
  - Step 5 (Documentation): 30 mins

- **Phase 3 (Versioning):** 1-2 hours
  - Step 6 (Changesets): 45 mins
  - Step 7 (GitHub Actions): 45 mins

- **Phase 4 (Testing):** 1 hour
  - Step 8-11 (Validation): 1 hour

- **Phase 5 (Documentation):** 30 mins
  - Step 12 (Summary): 30 mins

**Note:** Timeline assumes no major issues. Budget extra time for debugging.

---

## Open Questions

### Must Decide Before Migration:

1. **Test Framework:**
   - Keep Jest or migrate to Vitest?
   - **Recommendation:** Keep Jest for now, migrate later if desired

2. **Versioning Tool:**
   - Use Changesets (recommended) or standard-version or manual?
   - **Recommendation:** Changesets (as detailed above)

3. **ESLint Version:**
   - shared-config uses ESLint v9, rd-logger uses v8
   - Migration to flat config required
   - **Recommendation:** Migrate to ESLint v9 + flat config

4. **Package Manager:**
   - Monorepo uses pnpm@10.20.0
   - Standalone uses pnpm@8
   - **Recommendation:** Use monorepo version (already decided)

### Nice to Have Answers:

5. **Do we need to preserve git history?**
   - Current: History not preserved in monorepo
   - Options: Reference original repo in docs, or use advanced git techniques
   - **Recommendation:** Reference original repo URL in package.json and README

6. **Should we publish a "final" version from standalone repo?**
   - Options: Publish 0.3.2 from standalone noting migration, or just move forward
   - **Recommendation:** No, start publishing from monorepo immediately

7. **How to handle issues/PRs on old repository?**
   - Options: Archive repo, redirect to monorepo, keep open for old versions
   - **Recommendation:** Archive with redirect message in README

---

## Notes

- Package has **no internal monorepo dependencies** currently
- Package has **peer dependencies** on frameworks (express, hono, elysia)
- Package is **publicly published** to npm and must remain so
- Package uses **ESM only** (no CommonJS)
- Package has **comprehensive tests** (unit + integration)
- Package has **good documentation** (README, CONTRIBUTING, CODE_OF_CONDUCT)
- Migration should be **non-breaking** for consumers

---

## References

- **Original Repository:** https://github.com/rollercoaster-dev/rd-logger
- **NPM Package:** https://www.npmjs.com/package/@rollercoaster-dev/rd-logger
- **Changesets Documentation:** https://github.com/changesets/changesets
- **Turborepo Documentation:** https://turbo.build/repo/docs
- **GitHub Issue:** #7 (parent), #30, #31, #32, #33 (sub-issues)

---

**Migration Plan Created:** 2025-11-01
**Last Updated:** 2025-11-01
**Status:** ✅ COMPLETED

## Decisions Made

1. ✅ **Test Framework:** Keep Jest for now (Issue #34 created for future Vitest migration)
2. ✅ **Versioning Tool:** Use Changesets
3. ✅ **Publishing Strategy:** Test publish beta version first (0.3.2-alpha.0)
4. ✅ **Old Repository:** Archive with redirect message after successful migration
5. ✅ **Git History:** Reference original repo URL in docs

## Migration Summary

**Completed:** 2025-11-01
**Branch:** migrate/rd-logger
**Commits:** 9 atomic commits
**All Tests:** ✅ PASSING (10 suites, 48 tests)
**Build:** ✅ WORKING
**Lint:** ✅ PASSING
**Type-Check:** ✅ PASSING
**Turbo Integration:** ✅ WORKING
