# Bun 1.3.1 Migration Plan

**Status**: In Progress
**Created**: 2025-11-16
**Target Bun Version**: 1.3.1
**Feature Branch**: `feat/migrate-to-bun-1.3.1`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Background & Context](#background--context)
3. [Repository Analysis](#repository-analysis)
4. [Migration Strategy](#migration-strategy)
5. [Atomic Commits Plan](#atomic-commits-plan)
6. [Technical Implementation](#technical-implementation)
7. [Risk Assessment](#risk-assessment)
8. [Testing & Validation](#testing--validation)
9. [Rollback Procedures](#rollback-procedures)
10. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

This plan outlines the migration of the rollercoaster.dev monorepo from **pnpm workspaces** to **Bun 1.3.1 workspaces**, along with the integration of 7 repositories. The migration will result in a fully Bun-based development environment with improved performance and simplified tooling.

### Key Goals
- ✅ Migrate monorepo package manager from pnpm to Bun 1.3.1
- ✅ Leverage Bun's native Vue/Vite support (`bunx --bun vite`)
- ✅ Integrate 7 repositories in order of complexity
- ✅ Preserve existing publishing workflows (npm via OIDC, Docker to GHCR, Fly.io deployments)
- ✅ Maintain test coverage and CI/CD automation
- ✅ Eliminate all pnpm dependencies

### Decision Context
- **Previous setup**: pnpm workspaces was a mistake (per project owner)
- **Bun maturity**: Vite/Vue fully supported in Bun 1.3.1 with `bunx --bun vite`
- **Performance**: Bun offers faster installs, builds, and test execution
- **Simplification**: Single runtime/package manager instead of hybrid pnpm/Bun

---

## Background & Context

### Current State
The monorepo currently uses:
- **Package Manager**: pnpm v10.20.0
- **Runtime**: Mixed (Node.js for frontend, Bun for some backends)
- **Workspaces**: pnpm workspaces
- **Build Tool**: Turborepo
- **Migrated Packages**: rd-logger (only package currently in monorepo)

### Target State
After migration:
- **Package Manager**: Bun 1.3.1
- **Runtime**: Bun for all packages (with native Vite support)
- **Workspaces**: Bun workspaces
- **Build Tool**: Turborepo (Bun-compatible configuration)
- **All Packages**: Fully integrated and using Bun

### Why Bun 1.3.1?
- Latest stable version as of migration planning
- Full Vue 3 + Vite support (`bunx --bun vite`)
- Proven in production by existing repositories (openbadges-modular-server, rd-badge-image-system)
- Active development and community support

---

## Repository Analysis

### Repositories to Integrate

| Repository | Type | Current State | Bun Compat | Complexity | Must Keep pnpm? |
|------------|------|---------------|------------|------------|-----------------|
| **openbadges-types** | Package (npm) | pnpm + Node | High | 15/100 | ❌ No |
| **openbadges-ui** | Package (npm) | pnpm + Node | Medium | 35/100 | ❌ No (Bun supports Vite) |
| **openbadges-system** | App | pnpm + Bun (backend) | High | 30/100 | ❌ No (Bun supports Vite) |
| **openbadges-modular-server** | App (Docker) | 100% Bun | 100% | 8/100 | ❌ No |
| **skill-tree** | Docs | Documentation only | N/A | 0/100 | N/A |
| **rd-landing** | App (Fly.io) | pnpm + Bun (backend) | Medium | 65/100 | ❌ No (Bun supports Vite) |
| **rd-badge-image-system** | Experiment | Bun + Nx monorepo | 100% | N/A | ❌ Excluded |

### Exclusions
- **rd-badge-image-system**: Experimental repo, already a Bun + Nx monorepo, keeping separate

---

## Migration Strategy

### Phased Approach

#### Phase 1: Foundation (Week 1) - 8 commits
**Goal**: Migrate monorepo base from pnpm to Bun

**Changes**:
1. Update root `package.json` for Bun workspaces
2. Create `bunfig.toml` configuration
3. Update Turborepo for Bun compatibility
4. Migrate all scripts from pnpm to bun
5. Update dependency installation scripts
6. Update CI/CD workflows
7. Migrate rd-logger to Bun test
8. Update documentation

**Success Criteria**:
- `bun install` works across all current packages
- CI/CD pipelines pass with Bun
- rd-logger builds and tests with Bun

#### Phase 2: Pure TypeScript Packages (Week 2) - 9 commits
**Goal**: Integrate backend packages with minimal frontend dependencies

**Repositories**:
1. **openbadges-types** (5 commits)
   - Pure TypeScript, no frontend
   - Migrate Jest → Bun test
   - npm publishing via Changesets

2. **openbadges-modular-server** (4 commits)
   - Already 100% Bun
   - Just needs monorepo integration
   - Preserve Docker publishing

**Success Criteria**:
- Both packages build with Bun
- Tests pass with Bun test
- Publishing workflows functional

#### Phase 3: Frontend Packages (Week 3) - 21 commits
**Goal**: Integrate Vue/Vite applications using Bun's native support

**Repositories**:
1. **openbadges-ui** (6 commits)
   - Vue 3 component library
   - Use `bunx --bun vite`
   - Keep Vitest (Bun-compatible)
   - npm publishing

2. **rd-landing** (8 commits)
   - Vue 3 + Vite frontend
   - Bun + Hono backend
   - Update vite-ssg for Bun
   - Pure Bun Dockerfile
   - Fly.io deployment

3. **openbadges-system** (7 commits)
   - Vue 3 frontend (migrate to Bun + Vite)
   - Bun backend (already compatible)
   - Dual test framework unification

**Success Criteria**:
- All frontends work with `bunx --bun vite`
- Dev servers start correctly
- Production builds succeed
- Deployments work (Fly.io, npm)

#### Phase 4: Documentation & Validation (Week 4-5) - 3 commits
**Goal**: Finalize migration and validate

**Tasks**:
1. Migrate skill-tree documentation
2. Full system integration testing
3. Documentation updates
4. Performance benchmarking

**Success Criteria**:
- All packages build and test
- CI/CD fully green
- Documentation accurate
- No pnpm references remain

---

## Atomic Commits Plan

### Phase 1: Foundation Migration (8 commits)

#### Commit 1: `chore: upgrade to Bun 1.3.1 package manager`
**Files Changed**:
- `package.json` (root)
- `.gitignore`

**Changes**:
```json
// package.json
{
  "packageManager": "bun@1.3.1",
  "workspaces": ["packages/*", "apps/*"]
}
```

**Remove**:
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml` (if exists)

**Add to .gitignore**:
```
bun.lockb
```

---

#### Commit 2: `chore: create bunfig.toml with workspace configuration`
**Files Created**:
- `bunfig.toml`

**Content**:
```toml
[install]
frozen-lockfile = true
production = false

[install.cache]
dir = ".bun-cache"

[test]
coverage = true

[run]
shell = "bash"
```

---

#### Commit 3: `chore: update Turborepo for Bun compatibility`
**Files Changed**:
- `turbo.json`

**Changes**:
- Update cache outputs for Bun
- Add Bun-specific environment variables
- Optimize for Bun's faster execution

---

#### Commit 4: `chore: migrate scripts from pnpm to bun`
**Files Changed**:
- `package.json` (root)

**Script Updates**:
```json
{
  "scripts": {
    "dev": "bun run turbo dev",
    "build": "bun run turbo build",
    "test": "bun test",
    "lint": "bun run turbo lint",
    "format": "bunx prettier --write ."
  }
}
```

---

#### Commit 5: `chore: update install-dependencies.sh for Bun`
**Files Changed**:
- `scripts/install-dependencies.sh`

**Changes**:
- Replace pnpm installation with Bun
- Update install commands
- Remove pnpm-specific checks

---

#### Commit 6: `ci: update GitHub Actions to use Bun 1.3.1`
**Files Changed**:
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml` (if exists)
- Any other workflow files

**Changes**:
```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: 1.3.1
- run: bun install --frozen-lockfile
- run: bun test
- run: bun run build
```

---

#### Commit 7: `test(rd-logger): migrate from Vitest to Bun test`
**Files Changed**:
- `packages/rd-logger/package.json`
- `packages/rd-logger/bun.config.ts` (create if needed)
- Test files (if syntax changes needed)

**Changes**:
- Update test scripts to use `bun test`
- Remove Vitest if solely used for testing
- Update test configuration

---

#### Commit 8: `docs: update README and CLAUDE.md for Bun`
**Files Changed**:
- `README.md`
- `CLAUDE.md`
- `packages/rd-logger/README.md`

**Changes**:
- Update installation instructions
- Replace pnpm commands with bun
- Add Bun version requirement
- Update development workflow

---

### Phase 2: openbadges-types Migration (5 commits)

#### Commit 9: `feat(openbadges-types): migrate repository structure`
**Source**: https://github.com/rollercoaster-dev/openbadges-types
**Destination**: `packages/openbadges-types/`

**Files Copied**:
- All source files
- Tests
- Configuration files
- README.md

**Files Changed**:
- `package.json` (update for monorepo)

---

#### Commit 10: `chore(openbadges-types): update packageManager to Bun 1.3.1`
**Files Changed**:
- `packages/openbadges-types/package.json`

**Changes**:
```json
{
  "packageManager": "bun@1.3.1"
}
```

**Remove**:
- `pnpm-lock.yaml`

---

#### Commit 11: `test(openbadges-types): migrate Jest to Bun test`
**Files Changed**:
- `packages/openbadges-types/package.json`
- Test files (convert to Bun test syntax)
- `jest.config.js` (remove)

**Changes**:
- Remove Jest dependencies
- Update test scripts
- Convert test syntax if needed

---

#### Commit 12: `ci(openbadges-types): integrate with monorepo CI/CD`
**Files Changed**:
- Root `turbo.json`
- Root `.changeset/config.json`
- Remove `packages/openbadges-types/.github/workflows/`

**Changes**:
- Add to Turborepo pipeline
- Configure Changesets
- Remove standalone CI

---

#### Commit 13: `docs(openbadges-types): update for monorepo context`
**Files Changed**:
- `packages/openbadges-types/README.md`
- `packages/openbadges-types/package.json` (homepage, repository fields)

---

### Phase 3: openbadges-modular-server Migration (4 commits)

#### Commit 14: `feat(openbadges-modular-server): migrate repository structure`
**Source**: https://github.com/rollercoaster-dev/openbadges-modular-server
**Destination**: `apps/openbadges-modular-server/`

---

#### Commit 15: `ci(openbadges-modular-server): preserve Docker publishing`
**Files Changed/Created**:
- `.github/workflows/docker-publish.yml` or integrate into main workflows
- `apps/openbadges-modular-server/Dockerfile`

---

#### Commit 16: `chore(openbadges-modular-server): integrate with Turborepo`
**Files Changed**:
- Root `turbo.json`
- `apps/openbadges-modular-server/package.json`

---

#### Commit 17: `docs(openbadges-modular-server): update for monorepo`
**Files Changed**:
- `apps/openbadges-modular-server/README.md`

---

### Phase 4: openbadges-ui Migration (6 commits)

#### Commit 18: `feat(openbadges-ui): migrate repository structure`
**Source**: https://github.com/rollercoaster-dev/openbadges-ui
**Destination**: `packages/openbadges-ui/`

---

#### Commit 19: `chore(openbadges-ui): migrate to Bun with Vue/Vite support`
**Files Changed**:
- `packages/openbadges-ui/package.json`
- `packages/openbadges-ui/vite.config.ts`

**Script Updates**:
```json
{
  "scripts": {
    "dev": "bunx --bun vite",
    "build": "bunx --bun vite build",
    "preview": "bunx --bun vite preview"
  },
  "packageManager": "bun@1.3.1"
}
```

---

#### Commit 20: `test(openbadges-ui): verify Vitest with Bun`
**Files Changed**:
- `packages/openbadges-ui/vitest.config.ts` (if needed)
- Test scripts

---

#### Commit 21: `chore(openbadges-ui): update Histoire for Bun`
**Files Changed**:
- `packages/openbadges-ui/histoire.config.ts`
- `packages/openbadges-ui/.github/workflows/` (GitHub Pages workflow)

---

#### Commit 22: `ci(openbadges-ui): integrate with monorepo publishing`
**Files Changed**:
- Remove `packages/openbadges-ui/.github/workflows/release.yml`
- Update root Changesets config
- Remove semantic-release config

---

#### Commit 23: `docs(openbadges-ui): update for monorepo and Bun`
**Files Changed**:
- `packages/openbadges-ui/README.md`

---

### Phase 5: rd-landing Migration (8 commits)

#### Commit 24: `feat(rd-landing): migrate repository structure`
**Source**: https://github.com/rollercoaster-dev/rd-landing
**Destination**: `apps/landing/`

---

#### Commit 25: `chore(rd-landing): migrate frontend to Bun + Vite`
**Files Changed**:
- `apps/landing/package.json`
- `apps/landing/vite.config.ts`

**Script Updates**:
```json
{
  "scripts": {
    "dev": "concurrently \"bunx --bun vite\" \"bun run dev:backend\"",
    "dev:frontend": "bunx --bun vite",
    "dev:backend": "bun --hot src/backend/index.ts",
    "build": "bun run build:og && bunx --bun vite-ssg build && bun build src/backend",
    "preview": "bunx --bun vite preview"
  },
  "packageManager": "bun@1.3.1"
}
```

---

#### Commit 26: `chore(rd-landing): update vite-ssg for Bun`
**Files Changed**:
- `apps/landing/vite.config.ts`
- Build scripts

**Changes**:
- Verify vite-ssg works with Bun
- Test static site generation
- Update configuration if needed

---

#### Commit 27: `chore(rd-landing): update backend for Bun (already compatible)`
**Files Changed**:
- `apps/landing/src/backend/` (minimal changes, already Bun)

---

#### Commit 28: `build(rd-landing): update Dockerfile for pure Bun`
**Files Changed**:
- `apps/landing/Dockerfile`

**Changes**:
```dockerfile
FROM oven/bun:1.3.1 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3.1-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
CMD ["bun", "run", "start"]
```

---

#### Commit 29: `ci(rd-landing): update workflows for Bun`
**Files Changed**:
- `.github/workflows/` (landing-specific workflows or path-filtered root workflows)

**Changes**:
- Replace pnpm with Bun
- Update Fly.io deployment
- Preserve auto-release functionality

---

#### Commit 30: `chore(rd-landing): migrate from semantic-release to Changesets`
**Files Changed**:
- Remove `.releaserc` or semantic-release config
- Remove semantic-release from dependencies
- Integrate with root Changesets

---

#### Commit 31: `docs(rd-landing): update for monorepo and Bun`
**Files Changed**:
- `apps/landing/README.md`
- `apps/landing/.env.example`

---

### Phase 6: openbadges-system Migration (7 commits)

#### Commit 32: `feat(openbadges-system): migrate repository structure`
**Source**: https://github.com/rollercoaster-dev/openbadges-system
**Destination**: `apps/openbadges-system/`

---

#### Commit 33: `chore(openbadges-system): update frontend to bunx --bun vite`
**Files Changed**:
- `apps/openbadges-system/package.json`

**Script Updates**:
```json
{
  "scripts": {
    "dev": "concurrently \"bunx --bun vite\" \"bun run dev:server\"",
    "dev:client": "bunx --bun vite",
    "dev:server": "bun --hot src/server/index.ts",
    "build": "bunx --bun vite build && bun build src/server",
    "preview": "bunx --bun vite preview"
  },
  "packageManager": "bun@1.3.1"
}
```

---

#### Commit 34: `test(openbadges-system): unify test framework to Bun test`
**Files Changed**:
- `apps/openbadges-system/package.json`
- Test files (client tests if migrating from Vitest)

**Changes**:
- Backend already uses Bun test
- Migrate frontend tests to Bun test or verify Vitest compatibility

---

#### Commit 35: `chore(openbadges-system): update inter-package dependencies`
**Files Changed**:
- `apps/openbadges-system/package.json`
- Import statements throughout codebase

**Changes**:
- Update to workspace references
- Verify OAuth integration with openbadges-modular-server

---

#### Commit 36: `ci(openbadges-system): integrate with monorepo CI/CD`
**Files Changed**:
- Root `turbo.json`
- Remove standalone workflows

---

#### Commit 37: `docs(openbadges-system): update for monorepo`
**Files Changed**:
- `apps/openbadges-system/README.md`

---

### Phase 7: Cleanup & Documentation (3 commits)

#### Commit 38: `docs(skill-tree): migrate planning documentation`
**Source**: https://github.com/rollercoaster-dev/skill-tree
**Destination**: `docs/skill-tree/` or `experiments/skill-tree-planning/`

**Files Copied**:
- All markdown documentation
- Research findings
- Architecture diagrams

---

#### Commit 39: `ci: validate full monorepo build with Bun`
**Files Changed**:
- `.github/workflows/ci.yml`

**Changes**:
- Add full integration test job
- Verify all packages build
- Test all publishing workflows

---

#### Commit 40: `docs: comprehensive Bun migration documentation`
**Files Changed**:
- `README.md`
- `CONTRIBUTING.md`
- `CLAUDE.md`
- Create `docs/BUN-MIGRATION-GUIDE.md`

**Content**:
- Installation with Bun
- Development workflow updates
- Common commands
- Troubleshooting
- Migration lessons learned

---

## Technical Implementation

### Bun Configuration

#### bunfig.toml
```toml
[install]
# Freeze lockfile in CI
frozen-lockfile = true
# Install dev dependencies by default
production = false
# Respect package.json engines field
exact = false

[install.cache]
# Cache directory for faster installs
dir = ".bun-cache"
# Disable cache in CI
disable = false

[test]
# Enable code coverage
coverage = true
# Preload modules for tests
preload = []

[run]
# Default shell for scripts
shell = "bash"
# Automatic bun:* protocol support
bun = true
```

---

### Package.json Updates

#### Root package.json
```json
{
  "name": "@rollercoaster-dev/monorepo",
  "private": true,
  "packageManager": "bun@1.3.1",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "bun run turbo dev",
    "build": "bun run turbo build",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "lint": "bun run turbo lint",
    "lint:fix": "bun run turbo lint:fix",
    "type-check": "bun run turbo type-check",
    "format": "bunx prettier --write .",
    "format:check": "bunx prettier --check .",
    "clean": "bun run turbo clean && rm -rf node_modules .turbo .bun-cache",
    "changeset": "bunx changeset",
    "changeset:version": "bunx changeset version",
    "changeset:publish": "bunx changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1",
    "prettier": "^3.2.5",
    "turbo": "^2.0.0",
    "typescript": "^5.4.5"
  }
}
```

---

### Vue/Vite Package Configuration

#### Example: openbadges-ui package.json
```json
{
  "name": "@rollercoaster-dev/openbadges-ui",
  "version": "1.0.0",
  "packageManager": "bun@1.3.1",
  "type": "module",
  "scripts": {
    "dev": "bunx --bun vite",
    "build": "bunx --bun vite build && vue-tsc --noEmit",
    "preview": "bunx --bun vite preview",
    "test": "bunx --bun vitest",
    "test:ui": "bunx --bun vitest --ui",
    "story:dev": "bunx --bun histoire dev",
    "story:build": "bunx --bun histoire build"
  },
  "peerDependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.2.0",
    "vitest": "^1.5.0",
    "vue": "^3.4.0",
    "vue-tsc": "^2.0.0"
  }
}
```

**Key Points**:
- `bunx --bun vite` runs Vite with Bun runtime instead of Node.js
- Vitest works with Bun out of the box
- No need for separate Node.js installation

---

### Turborepo Configuration

#### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["NODE_ENV"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "out/**"]
    },
    "test": {
      "cache": false,
      "dependsOn": ["^build"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

### CI/CD Configuration

#### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Type check
        run: bun run type-check

      - name: Test
        run: bun test

      - name: Build
        run: bun run build

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    permissions:
      contents: write
      id-token: write # OIDC for npm

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: bunx changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Risk Assessment

### High Risk Items

#### 1. vite-ssg Compatibility with Bun (rd-landing)
**Risk Level**: 🔴 High
**Impact**: rd-landing deployment could fail
**Mitigation**:
- Test vite-ssg with Bun in isolated environment first
- Have fallback to Node.js + pnpm if needed
- Consider alternative SSG solutions (Astro, Vite's built-in SSG)

**Rollback**: Keep rd-landing on pnpm if vite-ssg incompatible

---

#### 2. CI/CD Publishing Workflows
**Risk Level**: 🟡 Medium
**Impact**: npm/Docker publishing could break
**Mitigation**:
- Test publishing in draft PRs
- Verify npm OIDC still works with Bun
- Test Docker multi-arch builds
- Validate Fly.io deployments

**Rollback**: Revert to pnpm-based publishing if issues

---

#### 3. Histoire Component Documentation
**Risk Level**: 🟡 Medium
**Impact**: Component documentation unavailable
**Mitigation**:
- Test Histoire with Bun before migration
- Alternative: Use Storybook if Histoire incompatible
- Document any configuration changes

**Rollback**: Keep Histoire on Node.js if needed

---

### Medium Risk Items

#### 4. PrimeVue Compatibility
**Risk Level**: 🟢 Low-Medium
**Impact**: openbadges-ui components broken
**Mitigation**:
- PrimeVue is Vue 3 compatible, should work
- Test thoroughly before migration
- Review PrimeVue docs for Bun compatibility

---

#### 5. OAuth Integration Between Apps
**Risk Level**: 🟢 Low-Medium
**Impact**: Authentication flow breaks
**Mitigation**:
- Test openbadges-system ↔ openbadges-modular-server OAuth
- Verify WebAuthn flows work
- Update environment variables carefully

---

### Low Risk Items

#### 6. Bun Test Migration from Jest
**Risk Level**: 🟢 Low
**Impact**: Some tests might need syntax updates
**Mitigation**:
- Bun test is Jest-compatible
- Syntax changes minimal
- Good documentation available

---

#### 7. TypeScript Compilation
**Risk Level**: 🟢 Low
**Impact**: Build failures
**Mitigation**:
- Bun has excellent TypeScript support
- tsup already Bun-compatible
- Project references should work

---

## Testing & Validation

### Pre-Migration Testing

#### 1. Local Environment Validation
```bash
# Install Bun 1.3.1
curl -fsSL https://bun.sh/install | bash
bun --version # Should show 1.3.1

# Create test branch
git checkout -b test/bun-local

# Test basic operations
bun install
bun test
bun run build
```

---

#### 2. Vite + Bun Integration Test
```bash
# Test Vue 3 + Vite with Bun
bun create vite@latest test-vue-app -- --template vue-ts
cd test-vue-app
bun install
bunx --bun vite # Should start dev server
bunx --bun vite build # Should build successfully
```

---

#### 3. vite-ssg Compatibility Test
```bash
# Test vite-ssg with Bun
bun add -D vite-ssg
# Update vite.config.ts with ssg config
bunx --bun vite-ssg build # Test if SSG works
```

---

### Post-Migration Validation

#### 1. Package Build Verification
```bash
# Build all packages
bun run build

# Expected output: All packages build successfully
# packages/openbadges-types ✓
# packages/openbadges-ui ✓
# packages/rd-logger ✓
# apps/openbadges-system ✓
# apps/openbadges-modular-server ✓
# apps/landing ✓
```

---

#### 2. Test Suite Execution
```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Expected: 100% of existing tests pass
```

---

#### 3. Development Server Validation
```bash
# Test each app's dev server
bun --filter openbadges-system dev
bun --filter openbadges-modular-server dev
bun --filter landing dev

# Expected: All servers start without errors
```

---

#### 4. CI/CD Pipeline Testing
- Create draft PR on feature branch
- Verify all GitHub Actions workflows pass
- Test publishing workflows (without actual publish)
- Validate Docker builds
- Check Fly.io deployment (staging)

---

#### 5. Integration Testing
```bash
# Test OAuth flow
# 1. Start openbadges-modular-server
# 2. Start openbadges-system
# 3. Test login/authentication

# Test package imports
# Verify openbadges-system can import from openbadges-ui, openbadges-types, rd-logger
```

---

#### 6. Performance Benchmarking
```bash
# Compare install times
time bun install # Bun
time pnpm install # pnpm (for comparison)

# Compare build times
time bun run build # Bun
time pnpm run build # pnpm (for comparison)

# Compare test execution
time bun test # Bun
time pnpm test # pnpm (for comparison)

# Expected: Bun should be significantly faster
```

---

### Acceptance Criteria

All items must be ✅ before merging to main:

- [ ] All packages build successfully with Bun
- [ ] All tests pass with Bun test
- [ ] CI/CD pipelines are green
- [ ] Vue/Vite dev servers work with `bunx --bun vite`
- [ ] npm publishing works (test in staging)
- [ ] Docker images build and publish
- [ ] Fly.io deployments succeed
- [ ] No pnpm dependencies remain
- [ ] Documentation is updated
- [ ] Performance benchmarks show improvement
- [ ] OAuth integration works
- [ ] Component documentation (Histoire) works
- [ ] Static site generation works (rd-landing)

---

## Rollback Procedures

### Immediate Rollback (Emergency)

If critical issues discovered after merge:

```bash
# Revert the merge commit
git revert <merge-commit-sha>
git push origin main

# Or hard reset if no other commits (DANGEROUS)
git reset --hard <commit-before-migration>
git push --force origin main
```

---

### Partial Rollback (Package-Specific)

If a specific package has issues:

```bash
# Revert specific package commits
git revert <commit-sha-1> <commit-sha-2> ...

# Or restore package from old branch
git checkout main~1 -- packages/problematic-package/
git commit -m "rollback: revert problematic-package to pnpm"
```

---

### Gradual Rollback (Maintain Both)

If needed to support both pnpm and Bun temporarily:

1. Keep feature branch active
2. Cherry-pick fixes to main (pnpm version)
3. Maintain parallel development
4. Re-attempt migration when issues resolved

**Not recommended** - adds maintenance burden

---

### Rollback Triggers

Initiate rollback if:

1. **Critical production failure** - Apps won't deploy/run
2. **Data loss risk** - Database migrations fail
3. **Security vulnerability** - Bun-specific security issue discovered
4. **Impossible to fix forward** - Fundamental incompatibility
5. **Performance regression** - Bun slower than pnpm (unexpected)

---

## Timeline & Milestones

### Week 1: Foundation
**Dates**: Nov 16 - Nov 22, 2025
**Commits**: 1-8
**Milestone**: Monorepo base migrated to Bun

**Deliverables**:
- ✅ Root package.json using Bun
- ✅ bunfig.toml created
- ✅ CI/CD using Bun
- ✅ rd-logger using Bun test
- ✅ Documentation updated

---

### Week 2: Backend Packages
**Dates**: Nov 23 - Nov 29, 2025
**Commits**: 9-17
**Milestone**: openbadges-types and openbadges-modular-server integrated

**Deliverables**:
- ✅ openbadges-types in `packages/`
- ✅ openbadges-modular-server in `apps/`
- ✅ Both building with Bun
- ✅ Tests passing
- ✅ Publishing workflows ready

---

### Week 3: Frontend Packages
**Dates**: Nov 30 - Dec 6, 2025
**Commits**: 18-37
**Milestone**: All Vue/Vite apps using Bun

**Deliverables**:
- ✅ openbadges-ui using `bunx --bun vite`
- ✅ rd-landing migrated with SSG working
- ✅ openbadges-system fully integrated
- ✅ All dev servers working
- ✅ Histoire component docs working

---

### Week 4-5: Validation & Documentation
**Dates**: Dec 7 - Dec 19, 2025
**Commits**: 38-40
**Milestone**: Migration complete and validated

**Deliverables**:
- ✅ skill-tree docs migrated
- ✅ Full test suite passing
- ✅ Performance benchmarks completed
- ✅ All documentation updated
- ✅ Migration guide written
- ✅ CI/CD fully green
- ✅ Ready to merge to main

---

### Post-Migration (Ongoing)
**Dates**: Dec 20+, 2025

**Tasks**:
- Monitor production deployments
- Address any issues quickly
- Gather performance metrics
- Update onboarding docs
- Share lessons learned
- Archive old pnpm branches

---

## Success Metrics

### Performance Improvements (Expected)

| Metric | pnpm (baseline) | Bun 1.3.1 (target) | Improvement |
|--------|-----------------|-------------------|-------------|
| Install time | ~30s | ~5s | 6x faster |
| Test execution | ~10s | ~3s | 3x faster |
| Build time | ~45s | ~20s | 2x faster |
| Dev server start | ~5s | ~2s | 2.5x faster |

---

### Quality Metrics

- **Test Coverage**: Maintain ≥90% (current level)
- **Type Safety**: 100% (no `any` types)
- **Build Success Rate**: 100% (all packages build)
- **CI/CD Pass Rate**: 100% (all workflows green)
- **Documentation**: 100% (all packages documented)

---

### Adoption Metrics

- **Developer Satisfaction**: Survey after 1 month
- **Onboarding Time**: New dev setup <5 minutes
- **Issue Resolution**: Bun-related issues <48 hours
- **Community Engagement**: Share migration guide publicly

---

## Lessons Learned (Post-Migration)

*This section will be filled after migration completion*

### What Went Well
- TBD

### Challenges Encountered
- TBD

### Unexpected Benefits
- TBD

### Recommendations for Future
- TBD

---

## References

### Documentation
- [Bun Official Docs](https://bun.sh/docs)
- [Bun with Vite](https://bun.sh/guides/ecosystem/vite)
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Turborepo with Bun](https://turbo.build/repo/docs/handbook/package-installation#bun)
- [Changesets](https://github.com/changesets/changesets)

### Related Repositories
- [openbadges-modular-server](https://github.com/rollercoaster-dev/openbadges-modular-server) - Already Bun-native
- [rd-badge-image-system](https://github.com/rollercoaster-dev/rd-badge-image-system) - Bun + Nx example

### Internal Documentation
- [CLAUDE.md](../CLAUDE.md)
- [README.md](../README.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Appendices

### Appendix A: Bun vs pnpm Comparison

| Feature | pnpm | Bun |
|---------|------|-----|
| **Install Speed** | Fast | **Faster** (native) |
| **Disk Usage** | Efficient (hardlinks) | Similar |
| **Workspace Support** | ✅ Excellent | ✅ Native |
| **Vue/Vite Support** | ✅ Via Node.js | ✅ Native (`bunx --bun`) |
| **Test Runner** | Vitest/Jest | **Built-in** |
| **TypeScript** | Via tsc | **Native** |
| **Package Scripts** | ✅ Full | ✅ Full |
| **Lock File** | pnpm-lock.yaml | bun.lockb (binary) |
| **Ecosystem** | Mature | Growing |

---

### Appendix B: Command Migration Reference

| pnpm Command | Bun Equivalent |
|-------------|----------------|
| `pnpm install` | `bun install` |
| `pnpm add <pkg>` | `bun add <pkg>` |
| `pnpm remove <pkg>` | `bun remove <pkg>` |
| `pnpm run <script>` | `bun run <script>` or `bun <script>` |
| `pnpm exec <cmd>` | `bunx <cmd>` |
| `pnpm test` | `bun test` |
| `pnpm --filter <pkg> <cmd>` | `bun --filter <pkg> <cmd>` |
| `pnpm -r <cmd>` | `bun -r <cmd>` (recursive) |

---

### Appendix C: Troubleshooting Guide

#### Issue: `bun install` fails
**Solution**:
```bash
# Clear cache
rm -rf .bun-cache node_modules
bun install --force
```

#### Issue: Vite dev server won't start
**Solution**:
```bash
# Ensure using --bun flag
bunx --bun vite

# Or add to bunfig.toml
[run]
bun = true
```

#### Issue: Tests failing after migration
**Solution**:
```bash
# Check test syntax compatibility
# Bun test is Jest-compatible, but verify:
# - describe/it/expect syntax
# - Mock imports
# - Async handling
```

#### Issue: Docker build fails
**Solution**:
```bash
# Ensure Dockerfile uses Bun image
FROM oven/bun:1.3.1

# Use frozen lockfile
RUN bun install --frozen-lockfile
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Status**: In Progress
**Next Review**: After Phase 1 completion
