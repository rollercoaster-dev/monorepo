# Migration Plan: openbadges-system

**Status**: PLANNED
**Created**: 2025-11-21
**Complexity**: MEDIUM-HARD
**Estimated Effort**: 4-6 days (32-48 hours)
**Related Issue**: #10

---

## Overview

### Package Information

- **Name**: openbadges-system
- **Current Version**: (not versioned - private package)
- **Type**: Full-stack Vue 3 + Bun/Hono application
- **Repository**: https://github.com/rollercoaster-dev/openbadges-system
- **Target Location**: `apps/openbadges-system/`

### Key Characteristics

- **Frontend**: Vue 3 + Vite + TailwindCSS + Pinia
- **Backend**: Bun + Hono (already Bun-native)
- **Database**: Kysely ORM with SQLite/PostgreSQL support
- **Package Manager**: pnpm (needs conversion to Bun workspaces)
- **Test Framework**: Dual - Vitest (client) + Bun test (server)

### File Counts

- 38 Vue components
- 46 TypeScript files
- 14 test files (5 client tests, 2 Bun tests, 7 Vitest server tests)

### Migration Objectives

1. Convert from pnpm to Bun workspaces
2. Replace npm dependencies with workspace dependencies (openbadges-types, openbadges-ui)
3. Adapt configuration for monorepo structure
4. Integrate with Turborepo build pipeline
5. Update CI/CD workflows
6. Maintain dual test runner strategy (Vitest for client, Bun test for server)

### Success Criteria

- All tests pass (14 tests across both runners)
- Build succeeds (`vite build` for client, Bun for server)
- Type-checking passes (`vue-tsc`)
- Both client and server start in development mode
- Docker Compose still works for openbadges-modular-server integration
- Documentation updated for monorepo context

---

## Prerequisites

### Required

- [x] Migration analysis complete
- [x] openbadges-types already in monorepo (`packages/openbadges-types`)
- [x] openbadges-ui already in monorepo (`packages/openbadges-ui`)
- [x] openbadges-modular-server already in monorepo (reference pattern)
- [ ] Migration branch created

### Dependencies Analysis

#### Workspace Dependencies (convert to workspace:\*)

| Package          | Current Version | Monorepo Version | Action        |
| ---------------- | --------------- | ---------------- | ------------- |
| openbadges-types | ^3.2.3          | 3.2.3            | `workspace:*` |
| openbadges-ui    | ^1.0.3          | 1.3.0            | `workspace:*` |

#### Dependencies to Update

| Package    | Current | Monorepo Concern                             | Action                 |
| ---------- | ------- | -------------------------------------------- | ---------------------- |
| zod        | ^4.0.15 | Different major (v4 vs v3 in modular-server) | Keep v4 - app-specific |
| hono       | ^4.7.10 | Compatible with modular-server (^4.7.8)      | Keep                   |
| typescript | ^5.3.3  | Root has ^5.3.3                              | Use root version       |

#### Native Module Concerns

| Package        | Issue                             | Mitigation                           |
| -------------- | --------------------------------- | ------------------------------------ |
| better-sqlite3 | Native Node module, devDependency | Bun has built-in SQLite              |
| sqlite3        | Native Node module, dependency    | May need replacement with bun:sqlite |
| pg             | PostgreSQL driver                 | Works with Bun                       |

---

## Migration Phases

### Phase 1: Initial Setup

**Commits**: 3-4
**Estimated Time**: 1-2 hours
**Risk Level**: LOW

#### Tasks

1. **Create migration branch and sub-issues**

   ```bash
   git checkout -b migrate/openbadges-system
   ```

   - Create sub-issues for each phase (optional)
   - Commit: N/A (branch creation only)

2. **Clone and import repository**

   ```bash
   gh repo clone rollercoaster-dev/openbadges-system temp-openbadges-system
   rm -rf temp-openbadges-system/.git
   cp -r temp-openbadges-system apps/openbadges-system
   rm -rf temp-openbadges-system
   ```

   - Remove standalone git history
   - Commit: `migrate(openbadges-system): import raw repository to monorepo`

3. **Clean up standalone repository artifacts**
   - Remove `.github/workflows/` (will use monorepo CI)
   - Remove `.husky/` (will use root husky if needed)
   - Remove `pnpm-lock.yaml` (will use bun.lock)
   - Remove `bun.lock` (will regenerate from root)
   - Keep `.env.example` (app-specific configuration)
   - Commit: `migrate(openbadges-system): remove standalone repository artifacts`

4. **Create migration documentation**
   - Create `apps/openbadges-system/MIGRATION.md` with status
   - Commit: `docs(openbadges-system): add migration tracking document`

#### Validation

- [ ] Package exists in `apps/openbadges-system/`
- [ ] Standalone workflows removed
- [ ] Lock files removed

#### Rollback

```bash
git checkout main
git branch -D migrate/openbadges-system
rm -rf apps/openbadges-system
```

---

### Phase 2: Package Manager Migration (pnpm -> Bun)

**Commits**: 2-3
**Estimated Time**: 2-3 hours
**Risk Level**: MEDIUM

#### Tasks

1. **Update package.json for Bun workspaces**

   Changes needed:

   ```json
   {
     "name": "openbadges-system",
     "private": true,
     "type": "module",
     "packageManager": "bun@1.3.2",
     "scripts": {
       "dev": "bun run --filter openbadges-system concurrently \"bun run server\" \"bun run client\"",
       "server": "bun run --hot src/server/index.ts",
       "client": "vite",
       "build": "vite build",
       "build:server": "echo 'Server runs directly with Bun'",
       "preview": "vite preview",
       "start": "bun run src/server/index.ts",
       "test": "bun run test:client && bun run test:server",
       "test:client": "vitest -c vitest.client.config.ts",
       "test:server": "bun test src/server/**/*.bun.test.ts",
       "lint": "eslint . --ext .vue,.ts,.js",
       "lint:fix": "eslint . --ext .vue,.ts,.js --fix",
       "format": "prettier --write \"src/**/*.{ts,vue,js,json}\"",
       "format:check": "prettier --check \"src/**/*.{ts,vue,js,json}\"",
       "type-check": "vue-tsc --noEmit"
     }
   }
   ```

   - Replace `pnpm` with `bun run` in scripts
   - Add `packageManager` field
   - Remove `pnpm` overrides section
   - Commit: `migrate(openbadges-system): convert package.json from pnpm to Bun`

2. **Update workspace dependencies**

   ```json
   {
     "dependencies": {
       "openbadges-types": "workspace:*",
       "openbadges-ui": "workspace:*"
     }
   }
   ```

   - Replace npm versions with workspace references
   - Commit: `migrate(openbadges-system): use workspace dependencies`

3. **Handle native SQLite modules**

   The project uses Kysely with better-sqlite3. Options:
   - **Option A (Recommended)**: Keep better-sqlite3 for Kysely compatibility
   - **Option B**: Migrate to bun:sqlite (requires Kysely adapter changes)

   For this migration, keep better-sqlite3 as Bun supports it.
   - Verify `better-sqlite3` works with Bun
   - Remove `sqlite3` if not needed (appears unused)
   - Commit: `migrate(openbadges-system): verify SQLite compatibility with Bun`

4. **Run bun install from monorepo root**
   ```bash
   cd /path/to/monorepo
   bun install
   ```

   - Verify all dependencies resolve
   - Check for workspace link creation

#### Validation

- [ ] `bun install` succeeds from monorepo root
- [ ] Workspace links created for openbadges-types and openbadges-ui
- [ ] No dependency warnings
- [ ] `node_modules` contains linked packages

#### Rollback

Restore original `package.json` from git history.

---

### Phase 3: Configuration Updates

**Commits**: 4-6
**Estimated Time**: 3-4 hours
**Risk Level**: MEDIUM

#### Tasks

1. **Update TypeScript configuration**

   Current `tsconfig.json` is already well-configured. Minor updates:

   ```json
   {
     "compilerOptions": {
       "moduleResolution": "Bundler",
       "types": ["unplugin-vue-router/client", "vite/client", "bun-types"]
     }
   }
   ```

   - Add `bun-types` for server code
   - Ensure path aliases work with monorepo structure
   - Commit: `migrate(openbadges-system): update TypeScript configuration for monorepo`

2. **Update Vite configuration**

   `vite.config.js` updates:
   - Update base URL handling for monorepo
   - Ensure openbadges-ui resolves from workspace
   - Add explicit dependency pre-bundling for workspace packages

   ```javascript
   optimizeDeps: {
     include: [
       'vue',
       'vue-router',
       'pinia',
       '@vueuse/core',
       // Workspace packages need explicit include
     ],
   },
   ```

   - Commit: `migrate(openbadges-system): update Vite configuration for monorepo`

3. **Update Vitest configuration**

   `vitest.client.config.ts` and `vitest.server.config.ts`:
   - Ensure test setup files resolve correctly
   - Update any relative paths
   - Commit: `migrate(openbadges-system): update Vitest configuration`

4. **Update ESLint configuration**

   `eslint.config.js`:
   - May be able to extend shared config later
   - For now, ensure it works standalone
   - Update any path references
   - Commit: `migrate(openbadges-system): update ESLint configuration`

5. **Update TailwindCSS configuration**

   `tailwind.config.js`:
   - Ensure content paths are correct
   - No monorepo-specific changes needed
   - Commit: (may be combined with other config commit)

6. **Update PostCSS configuration**

   `postcss.config.cjs`:
   - Verify works with monorepo structure
   - Commit: (may be combined with other config commit)

#### Validation

- [ ] `bun run type-check` passes (may have errors to fix in Phase 4)
- [ ] Vite dev server starts
- [ ] ESLint runs without config errors
- [ ] TailwindCSS processes correctly

#### Rollback

Restore original configuration files from git history.

---

### Phase 4: Code Adaptations

**Commits**: 3-5
**Estimated Time**: 4-8 hours
**Risk Level**: MEDIUM-HIGH

#### Tasks

1. **Fix TypeScript errors**

   Run type-check and fix errors:

   ```bash
   cd apps/openbadges-system
   bun run type-check
   ```

   Expected issues:
   - Import path resolution with workspace packages
   - Type mismatches with updated openbadges-types (v3.2.3)
   - Any strict mode violations

   - Commit: `migrate(openbadges-system): fix TypeScript errors`

2. **Update imports for workspace packages**

   Files using openbadges-types and openbadges-ui:
   - `src/client/main.ts`
   - `src/client/composables/useBadges.ts`
   - `src/client/components/Badge/BadgeCard.vue`
   - `src/client/pages/*.vue` (multiple)
   - `src/test/integration/verification.test.ts`

   Verify imports resolve correctly:

   ```typescript
   import { BadgeClass } from "openbadges-types";
   import { ObBadgeCard } from "openbadges-ui";
   ```

   - Commit: `migrate(openbadges-system): update imports for workspace packages`

3. **Update openbadges-ui type declarations**

   Check `src/client/types/openbadges-ui.d.ts`:
   - May need updates if openbadges-ui exports have changed
   - Or remove if types are now properly exported from workspace package
   - Commit: `migrate(openbadges-system): update openbadges-ui type declarations`

4. **Handle any Zod v4 differences**

   The project uses Zod v4 while some monorepo packages use v3:
   - Verify no cross-package Zod schema sharing issues
   - zod-form-data compatibility check
   - Commit: (if needed) `migrate(openbadges-system): handle Zod version differences`

5. **Update database factory for Bun compatibility**

   `database/factory.ts` uses better-sqlite3:
   - Verify Bun can load better-sqlite3 native module
   - Test database connections
   - Commit: (if needed) `migrate(openbadges-system): ensure database compatibility`

#### Validation

- [ ] `bun run type-check` passes
- [ ] All imports resolve
- [ ] No runtime errors when starting dev server
- [ ] Database connections work

#### Rollback

```bash
git checkout HEAD~n -- apps/openbadges-system/src/
```

---

### Phase 5: Test Migration & Validation

**Commits**: 2-4
**Estimated Time**: 3-5 hours
**Risk Level**: MEDIUM

#### Tasks

1. **Run client tests (Vitest)**

   ```bash
   cd apps/openbadges-system
   bun run test:client
   ```

   Expected test files:
   - `src/client/pages/badges/__tests__/create.test.ts`
   - `src/client/pages/badges/__tests__/validation.test.ts`
   - `src/client/services/__tests__/openbadges.test.ts`

   Fix any failures related to:
   - Import resolution
   - Mock setup
   - Test environment configuration

   - Commit: `migrate(openbadges-system): fix client test failures`

2. **Run server tests (Bun test)**

   ```bash
   cd apps/openbadges-system
   bun run test:server
   ```

   Test files:
   - `src/server/__tests__/endpoints.bun.test.ts`
   - `src/server/services/__tests__/jwt.bun.test.ts`

   Fix any failures related to:
   - Test setup (`bun.test.setup.ts`)
   - Mock dependencies

   - Commit: `migrate(openbadges-system): fix server test failures`

3. **Run integration tests (if applicable)**

   ```bash
   cd apps/openbadges-system
   # Integration tests in src/test/integration/
   ```

   - Commit: `migrate(openbadges-system): fix integration test failures`

4. **Verify full test suite**

   ```bash
   cd apps/openbadges-system
   bun run test
   ```

   - Document any skipped or pending tests
   - Ensure coverage is maintained

#### Validation

- [ ] All client tests pass (Vitest)
- [ ] All server tests pass (Bun test)
- [ ] Integration tests pass (if any)
- [ ] Test coverage documented

#### Test Summary Target

| Runner            | Files | Tests | Expected Result |
| ----------------- | ----- | ----- | --------------- |
| Vitest (client)   | 3+    | TBD   | PASS            |
| Bun test (server) | 2     | TBD   | PASS            |
| Integration       | TBD   | TBD   | PASS            |

---

### Phase 6: Build & Runtime Verification

**Commits**: 2-3
**Estimated Time**: 2-3 hours
**Risk Level**: MEDIUM

#### Tasks

1. **Verify development mode**

   ```bash
   cd apps/openbadges-system
   bun run dev
   ```

   Check:
   - Vite dev server starts on port 7777
   - Bun server starts on port 8888
   - Hot reload works for both client and server
   - API proxy works (client -> server)

   - Commit: (fix issues if needed)

2. **Verify client build**

   ```bash
   cd apps/openbadges-system
   bun run build
   ```

   Check:
   - Vite builds to `dist/client/`
   - No build warnings/errors
   - Output is valid

   - Commit: (fix issues if needed)

3. **Verify production mode**

   ```bash
   cd apps/openbadges-system
   bun run preview  # For client
   bun run start    # For server
   ```

   - Commit: `migrate(openbadges-system): verify build and production mode`

4. **Verify Docker Compose integration**

   The app uses Docker Compose to run openbadges-modular-server:

   ```bash
   cd apps/openbadges-system
   docker compose up -d
   ```

   Check:
   - openbadges-modular-server container starts
   - API proxy connects correctly
   - Volume mounts work

   - Commit: `migrate(openbadges-system): verify Docker Compose integration`

#### Validation

- [ ] `bun run dev` starts both servers
- [ ] `bun run build` succeeds
- [ ] `bun run start` works in production mode
- [ ] Docker Compose integration functional

---

### Phase 7: Monorepo Integration

**Commits**: 3-4
**Estimated Time**: 2-3 hours
**Risk Level**: LOW-MEDIUM

#### Tasks

1. **Add to Turborepo pipeline**

   Update root `turbo.json`:
   - Already configured for apps/\* pattern
   - Verify tasks work:
     - `build` -> `vite build`
     - `dev` -> concurrent client/server
     - `test` -> `bun run test`
     - `lint` -> `eslint`
     - `type-check` -> `vue-tsc`

   - Commit: `build(turbo): ensure openbadges-system in pipeline`

2. **Update root TypeScript references (if needed)**

   If using composite mode:

   ```json
   // root tsconfig.json
   {
     "references": [{ "path": "./apps/openbadges-system" }]
   }
   ```

   - Commit: `build(typescript): add openbadges-system project reference`

3. **Verify monorepo-wide commands**

   ```bash
   # From monorepo root
   bun run build           # Should build openbadges-system
   bun run test            # Should test openbadges-system
   bun run lint            # Should lint openbadges-system
   bun run type-check      # Should type-check openbadges-system
   ```

   - Commit: (fix issues if needed)

4. **Create/update CI workflow**

   Either:
   - Add to existing monorepo CI workflow
   - Create dedicated workflow for app testing

   Consider:
   - Vue-tsc type checking
   - Vitest + Bun test execution
   - Build verification

   - Commit: `ci(openbadges-system): add to monorepo CI workflow`

#### Validation

- [ ] Turborepo runs tasks for openbadges-system
- [ ] Root commands include openbadges-system
- [ ] CI workflow configured

---

### Phase 8: Documentation

**Commits**: 2-3
**Estimated Time**: 1-2 hours
**Risk Level**: LOW

#### Tasks

1. **Update package README**

   `apps/openbadges-system/README.md`:
   - Add monorepo context
   - Update installation instructions (use `bun install` from root)
   - Update development commands
   - Add workspace dependency information
   - Document Docker Compose usage

   - Commit: `docs(openbadges-system): update README for monorepo`

2. **Update CLAUDE.md**

   `apps/openbadges-system/CLAUDE.md`:
   - Update package manager references (pnpm -> bun)
   - Update command examples
   - Add monorepo context

   - Commit: `docs(openbadges-system): update CLAUDE.md for monorepo`

3. **Update root monorepo CLAUDE.md**

   Add openbadges-system to apps section:

   ```markdown
   ### Apps

   #### openbadges-system

   - **Purpose**: Full-stack Vue 3 + Bun/Hono OpenBadges application
   - **Location**: `apps/openbadges-system/`
   - **Status**: Migrated
   - **Features**:
     - Vue 3 frontend with TailwindCSS
     - Bun/Hono backend
     - Kysely database ORM
     - Integration with openbadges-modular-server
   ```

   - Commit: `docs(monorepo): add openbadges-system to CLAUDE.md`

4. **Archive migration documentation**

   Update this migration plan with completion status:
   - Mark phases as complete
   - Document any deviations
   - Record final statistics

   - Commit: `docs(migration): archive openbadges-system migration plan`

#### Validation

- [ ] Package README accurate and helpful
- [ ] CLAUDE.md files updated
- [ ] Monorepo docs reference openbadges-system

---

### Phase 9: Finalization

**Commits**: 1-2
**Estimated Time**: 1-2 hours
**Risk Level**: LOW

#### Tasks

1. **Final validation checklist**

   Run all checks:

   ```bash
   # From apps/openbadges-system
   bun run lint
   bun run type-check
   bun run test
   bun run build

   # From monorepo root
   bun run build --filter openbadges-system
   bun run test --filter openbadges-system
   ```

2. **Create Pull Request**

   PR title: `feat: Migrate openbadges-system to monorepo`

   PR body should include:
   - Summary of changes
   - Test results
   - Breaking changes (if any)
   - Screenshots (if UI changes)
   - Link to issue #10

   Use: `Closes #10`

3. **Request review**
   - Code review for configuration changes
   - Test verification

#### Validation

- [ ] All CI checks pass
- [ ] PR description complete
- [ ] Issue #10 linked with closing keyword

---

## Risk Assessment

### High Risk Areas

| Risk                                                  | Likelihood | Impact | Mitigation                                         |
| ----------------------------------------------------- | ---------- | ------ | -------------------------------------------------- |
| Native SQLite module (better-sqlite3) incompatibility | LOW        | HIGH   | Test early, have bun:sqlite fallback plan          |
| Zod v4 vs v3 conflicts                                | LOW        | MEDIUM | Keep Zod isolated to app, no cross-package sharing |
| Vitest/Vue Test Utils issues in monorepo              | MEDIUM     | MEDIUM | Ensure proper workspace resolution                 |
| Docker Compose path issues                            | LOW        | LOW    | Update paths as needed                             |

### Medium Risk Areas

| Risk                                               | Likelihood | Impact | Mitigation                      |
| -------------------------------------------------- | ---------- | ------ | ------------------------------- |
| openbadges-ui version differences (1.0.3 -> 1.3.0) | MEDIUM     | MEDIUM | Test UI components thoroughly   |
| Path alias resolution                              | MEDIUM     | LOW    | Update tsconfig and vite.config |
| ESLint configuration conflicts                     | LOW        | LOW    | Keep app-specific config        |

### Low Risk Areas

| Risk                         | Likelihood | Impact | Mitigation                |
| ---------------------------- | ---------- | ------ | ------------------------- |
| Script command changes       | LOW        | LOW    | Document clearly          |
| Environment variable changes | LOW        | LOW    | Keep .env.example updated |

---

## Rollback Strategy

### Quick Rollback (Before PR Merge)

```bash
# From monorepo root
git checkout main
git branch -D migrate/openbadges-system
rm -rf apps/openbadges-system

# Original repo remains at:
# https://github.com/rollercoaster-dev/openbadges-system
```

### Full Rollback (After PR Merge)

```bash
# Revert merge commit
git revert <merge-commit-sha> -m 1
git push origin main

# Remove package
rm -rf apps/openbadges-system

# Update documentation to remove references
# - CLAUDE.md
# - turbo.json (if modified)
# - Root tsconfig.json (if modified)
```

### Data Preservation

- **Git history**: Preserved in feature branch
- **Migration plan**: `docs/migrations/MIGRATION_PLAN_openbadges-system.md`
- **Original repo**: https://github.com/rollercoaster-dev/openbadges-system

---

## Timeline

**Start Date**: TBD
**Target Completion**: TBD
**Total Estimated Time**: 32-48 hours (4-6 days)

### Milestones

| Day   | Phases | Deliverables                             |
| ----- | ------ | ---------------------------------------- |
| Day 1 | 1-2    | Raw import, package manager migration    |
| Day 2 | 3      | Configuration updates                    |
| Day 3 | 4      | Code adaptations, TypeScript fixes       |
| Day 4 | 5      | Test migration and fixes                 |
| Day 5 | 6-7    | Build verification, monorepo integration |
| Day 6 | 8-9    | Documentation, finalization, PR          |

### Contingency

Add 20% buffer for unexpected issues:

- Native module compilation issues
- Complex test failures
- Integration problems

---

## Validation Checklist

### Code Quality

- [ ] All TypeScript errors resolved
- [ ] All tests passing
- [ ] Linting passes
- [ ] No console errors/warnings in development

### Package Manager Migration

- [ ] package.json uses Bun workspace syntax
- [ ] pnpm references replaced with bun
- [ ] Lock files cleaned up
- [ ] `bun install` works from root

### Workspace Dependencies

- [ ] openbadges-types uses `workspace:*`
- [ ] openbadges-ui uses `workspace:*`
- [ ] Imports resolve correctly

### Build & Runtime

- [ ] `bun run dev` starts successfully
- [ ] `bun run build` completes
- [ ] `bun run start` works
- [ ] Docker Compose integration works

### Testing

- [ ] Client tests pass (Vitest)
- [ ] Server tests pass (Bun test)
- [ ] Integration tests pass

### Monorepo Integration

- [ ] Turborepo tasks work
- [ ] Root commands include package
- [ ] CI workflow configured

### Documentation

- [ ] Package README updated
- [ ] CLAUDE.md files updated
- [ ] Monorepo docs updated

---

## Notes

### Key Differences from openbadges-modular-server Migration

1. **Dual test runners**: This package uses both Vitest (client) and Bun test (server), while modular-server uses only Bun test.

2. **Vue/Vite frontend**: Additional complexity from Vue 3, Vite, and related tooling (vue-tsc, unplugin-vue-router, etc.).

3. **Different database approach**: Uses Kysely instead of Drizzle ORM.

4. **Native modules**: Uses better-sqlite3 which requires native compilation.

5. **Zod version**: Uses Zod v4 (4.0.15) vs monorepo standard v3.

### Post-Migration Considerations

1. **Potential rd-logger integration**: Consider adding @rollercoaster-dev/rd-logger for consistent logging across apps.

2. **Shared ESLint config**: Could potentially extend shared-config later.

3. **Docker publishing**: May want to add Docker image publishing similar to openbadges-modular-server.

4. **Database alignment**: Consider whether to align with Drizzle ORM used in modular-server.

---

## Next Steps

After this plan is approved:

1. Create migration branch
2. Execute Phase 1 (Initial Setup)
3. Proceed through phases sequentially
4. Report progress and any blockers

**Next Agent**: `migration-executor` - to execute the migration plan

---

**Plan Version**: 1.0
**Last Updated**: 2025-11-21
