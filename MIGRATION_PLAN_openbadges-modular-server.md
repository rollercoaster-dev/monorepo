# Migration Plan: openbadges-modular-server

**Migration Date**: 2025-11-16
**Source Repository**: https://github.com/rollercoaster-dev/openbadges-modular-server
**Target Location**: `/Users/joeczarnecki/Code/rollercoaster.dev/monorepo/apps/openbadges-modular-server`
**Migration Type**: Application (Phase 3)
**Branch**: `migrate/openbadges-modular-server`

---

## Executive Summary

Migrating the openbadges-modular-server - a stateless, modular API server for Open Badges 2.0/3.0 - from a standalone repository into the monorepo's `apps/` directory. This is a Docker-based Bun/Hono application with multi-database support (SQLite, PostgreSQL) and comprehensive testing.

---

## Current Repository Analysis

### Repository Structure
- **Size**: 8.2MB (excluding .git)
- **Runtime**: Bun 1.x (compatible with monorepo's Bun 1.3.2)
- **Framework**: Hono web framework
- **Database**: Drizzle ORM with SQLite/PostgreSQL support
- **Testing**: Bun test runner (unit, integration, E2E tests)
- **Build System**: Bun build with custom scripts
- **Container**: Multi-architecture Docker support (amd64, arm64)

### Key Dependencies
- `@rollercoaster-dev/rd-logger@^0.3.0` - Already migrated to monorepo!
- `@hono/zod-openapi@^0.19.6` - API framework with OpenAPI support
- `drizzle-orm@^0.41.0` - Database ORM
- `openbadges-types@^3.2.3` - Type definitions (needs to be updated to workspace:*)
- `zod@^3.24.3` - Schema validation
- Multi-database drivers: `better-sqlite3`, `postgres`, `@neondatabase/serverless`

### Source Code Organization
```
src/
├── api/                  # API endpoints and controllers
├── config/               # Configuration management
├── core/                 # Core services
├── domains/              # Domain entities and repositories
│   ├── assertion/        # Badge assertions
│   ├── badgeClass/       # Badge classes
│   ├── issuer/           # Issuers
│   ├── auth/             # Authentication
│   ├── user/             # User management
│   ├── backpack/         # Badge backpack
│   └── status-list/      # Revocation lists
├── infrastructure/       # Infrastructure concerns
│   └── database/         # Database modules (SQLite, PostgreSQL)
└── utils/                # Utilities (crypto, JSON-LD, validation)
```

### Build Configuration
- **Entry Point**: `src/index.ts`
- **Build Outputs**:
  - `dist/index.js` - Main application
  - `dist/migrations/run.js` - Database migrations
- **Path Aliases**: Uses extensive TypeScript path aliases (`@/*`, `@core/*`, `@domains/*`, etc.)
- **TypeScript**: ES2022, non-strict mode (different from monorepo's strict config)

### Docker Configuration
- **Dockerfile**: Multi-stage build with platform support
- **docker-compose.yml**: API + PostgreSQL + migrations service
- **docker-compose.test.yml**: Test database setup
- **docker-compose.prod.yml**: Production configuration
- **Health checks**: Built-in health check script
- **Volumes**: SQLite data persistence, PostgreSQL data

### Environment Variables
**Critical Configuration** (from `.env.example`):
- `PORT`, `HOST`, `NODE_ENV`
- `DB_TYPE` (sqlite/postgresql)
- `DATABASE_URL` (PostgreSQL connection string)
- `SQLITE_FILE` (SQLite database path)
- `BASE_URL` (API base URL)
- `AUTH_ENABLED`, `JWT_SECRET`, `JWT_TOKEN_EXPIRY_SECONDS`
- `AUTH_ADMIN_USER_ENABLED`, `AUTH_ADMIN_USERNAME`, `AUTH_ADMIN_PASSWORD`
- `DB_QUERY_LOGGING`, `DB_SLOW_QUERY_THRESHOLD`

### Scripts & Tooling
- **Database**: Migration generation/running, Drizzle Studio
- **Testing**: Separate scripts for SQLite/PostgreSQL tests
- **Docker**: Build scripts for multi-architecture images
- **Release**: semantic-release (will be replaced with Changesets)
- **Git Hooks**: Husky with pre-commit linting

### CI/CD
- **Current**: GitHub Actions (`.github/workflows/main.yml`)
- **Jobs**: Lint, type-check, test (SQLite + PostgreSQL), Docker build
- **Will be replaced**: By monorepo's centralized CI/CD

---

## Target Location in Monorepo

**Path**: `apps/openbadges-modular-server/`

This follows the monorepo's convention:
- `packages/*` - Shared libraries (rd-logger, openbadges-types)
- `apps/*` - Applications (openbadges-modular-server will go here)

---

## Required Changes

### 1. Package Configuration (`package.json`)

**Changes Needed**:
```json
{
  "name": "@rollercoaster-dev/openbadges-modular-server",
  "version": "1.0.2",
  "private": true,
  "dependencies": {
    "@rollercoaster-dev/rd-logger": "workspace:*",
    "openbadges-types": "workspace:*"
  }
}
```

**Rationale**:
- Add `@rollercoaster-dev` scope for consistency
- Update rd-logger to use workspace protocol
- Update openbadges-types to use workspace protocol (once migrated)

### 2. TypeScript Configuration

**Current Issues**:
- Uses non-strict TypeScript (`"strict": false`)
- Has extensive path aliases that conflict with monorepo structure
- Not using project references

**Changes Needed**:
1. Create `tsconfig.json` that extends monorepo's shared config
2. Update path aliases to work within monorepo context
3. Add to monorepo's root `tsconfig.json` project references
4. Consider gradual migration to strict mode (separate task)

**Proposed `apps/openbadges-modular-server/tsconfig.json`**:
```json
{
  "extends": "../../packages/shared-config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@domains/*": ["src/domains/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@utils/*": ["src/utils/*"],
      "@config/*": ["src/config/*"],
      "@types/*": ["src/types/*"],
      "@tests/*": ["tests/*"]
    },
    "strict": false,  // Keep for now, migrate later
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "references": [
    { "path": "../../packages/rd-logger" },
    { "path": "../../packages/openbadges-types" }
  ]
}
```

### 3. Build System Integration

**Current Build Scripts**:
- `build`: Builds main application to `dist/`
- `build:migrations`: Builds migration runner

**Changes Needed**:
1. Add Turborepo task configuration
2. Ensure build outputs are cached properly
3. Update `.gitignore` to handle build artifacts

**Add to `apps/openbadges-modular-server/package.json`**:
```json
{
  "scripts": {
    "build": "bun build src/index.ts --target bun --outdir dist && bun build src/infrastructure/database/migrations/run.ts --target bun --outdir dist/migrations --bundle",
    "dev": "bun --watch run src/index.ts",
    "test": "bun test",
    "test:sqlite": "DB_TYPE=sqlite bun test tests/infrastructure/database/modules/sqlite",
    "test:pg": "NODE_ENV=test DB_TYPE=postgresql bun test tests/infrastructure/database/modules/postgresql",
    "test:e2e": "bun run test:e2e:sqlite && bun run test:e2e:pg",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "type-check": "tsc --noEmit --skipLibCheck"
  }
}
```

### 4. Import Path Updates

**No changes needed**:
- All imports use relative paths or path aliases
- Path aliases remain scoped to this application
- Workspace dependencies will be updated in package.json

### 5. Docker Configuration

**Changes Needed**:
1. Move `Dockerfile` to `apps/openbadges-modular-server/Dockerfile`
2. Update Docker build context to work from monorepo root or app directory
3. Keep docker-compose files for local development
4. Update paths in Dockerfile to account for monorepo structure

**Docker Build Context Options**:
- **Option A**: Build from app directory (simpler, current structure)
  ```bash
  cd apps/openbadges-modular-server
  docker build -t openbadges-modular-server .
  ```
- **Option B**: Build from monorepo root (better for shared dependencies)
  ```bash
  docker build -f apps/openbadges-modular-server/Dockerfile -t openbadges-modular-server .
  ```

**Recommendation**: Keep Option A for now, evaluate Option B later if needed.

### 6. Environment Variables

**Changes Needed**:
1. Move `.env.example` to app directory
2. Document environment variables in app README
3. No changes to variable names/structure needed

**Monorepo Environment Strategy**:
- Each app manages its own `.env` file
- Shared environment variables can be defined in root `.env` if needed
- CI/CD uses GitHub Actions secrets

### 7. Testing Configuration

**Current Test Structure**:
- Unit tests: Domain entities and services
- Integration tests: Database repositories (SQLite + PostgreSQL)
- E2E tests: Full API flows with both databases
- Database setup scripts for PostgreSQL via Docker Compose

**Changes Needed**:
1. Keep existing test structure (works well)
2. Ensure tests run via Turborepo
3. Update test scripts to work in monorepo context
4. CI/CD will handle database service setup

**No major changes required** - Bun test runner works as-is.

### 8. Documentation Updates

**Files to Update/Create**:
1. `apps/openbadges-modular-server/README.md` - Keep existing, update paths
2. Root `README.md` - Add reference to openbadges-modular-server
3. `CLAUDE.md` - Update with app migration status
4. App-specific docs remain in `apps/openbadges-modular-server/docs/`

### 9. CI/CD Integration

**Changes Needed**:
1. Remove `.github/workflows/` from app (handled by monorepo CI/CD)
2. Monorepo CI will run:
   - `turbo run lint` (includes this app)
   - `turbo run type-check` (includes this app)
   - `turbo run test` (includes this app)
   - `turbo run build` (includes this app)
3. Docker builds will be handled separately or via monorepo CI

**Note**: Issue #13 tracks monorepo CI/CD setup - coordinate with that work.

### 10. Version Management

**Current**: semantic-release with Conventional Commits
**Target**: Changesets (monorepo standard)

**Changes Needed**:
1. Remove semantic-release configuration files
2. Remove Husky git hooks (or integrate with monorepo hooks if present)
3. Use monorepo's Changesets workflow
4. Keep version in package.json as-is initially

**Files to Remove**:
- `.releaserc.json`
- `release-*.js` files
- `release-*.json` files
- `.husky/` (evaluate if monorepo needs hooks)

---

## Migration Steps (Incremental Commits)

### Phase 1: Initial Addition (Commit 1)
**Action**: Add raw repository to monorepo
**Commands**:
1. Clone repository without .git folder
2. Move to `apps/openbadges-modular-server/`
3. Commit as-is

**Approval Gate**: STOP - Present findings to user

---

### Phase 2: Dependency Updates (Commit 2)
**Action**: Update package.json for monorepo dependencies
**Changes**:
1. Update `@rollercoaster-dev/rd-logger` to `workspace:*`
2. Update `openbadges-types` to `workspace:*` (or add as external dependency for now)
3. Add `@rollercoaster-dev` scope to package name
4. Remove semantic-release dependencies

**Approval Gate**: Request confirmation before proceeding

---

### Phase 3: TypeScript Configuration (Commit 3)
**Action**: Integrate with monorepo TypeScript setup
**Changes**:
1. Update `apps/openbadges-modular-server/tsconfig.json`
2. Add project references to rd-logger and openbadges-types
3. Add to root `tsconfig.json` if present

**Approval Gate**: Request confirmation before proceeding

---

### Phase 4: Build System Integration (Commit 4)
**Action**: Ensure Turborepo can build the app
**Changes**:
1. Verify build scripts work
2. Test `bun run turbo build --filter=openbadges-modular-server`
3. Update `.gitignore` if needed

**Approval Gate**: Request confirmation before proceeding

---

### Phase 5: CI/CD Cleanup (Commit 5)
**Action**: Remove standalone CI/CD configuration
**Changes**:
1. Remove `.github/workflows/`
2. Remove semantic-release configuration
3. Remove or adapt Husky hooks
4. Keep commitlint config if monorepo uses it

**Approval Gate**: Request confirmation before proceeding

---

### Phase 6: Documentation Updates (Commit 6)
**Action**: Update all documentation
**Changes**:
1. Update app README with monorepo context
2. Update root CLAUDE.md with migration status
3. Update root README if needed
4. Keep app-specific docs as-is

**Approval Gate**: Request confirmation before proceeding

---

### Phase 7: Docker Configuration (Commit 7)
**Action**: Verify Docker setup works in monorepo
**Changes**:
1. Test Docker build from app directory
2. Test docker-compose setup
3. Update docker-compose paths if needed
4. Document Docker usage in monorepo context

**Approval Gate**: Request confirmation before proceeding

---

### Phase 8: Testing & Validation (Final)
**Action**: Comprehensive testing
**Tests**:
1. Run `bun install` from monorepo root
2. Run `bun run turbo build --filter=openbadges-modular-server`
3. Run `bun run turbo test --filter=openbadges-modular-server`
4. Run `bun run turbo lint --filter=openbadges-modular-server`
5. Run `bun run turbo type-check --filter=openbadges-modular-server`
6. Test Docker build
7. Test E2E with both SQLite and PostgreSQL

---

## Potential Risks & Considerations

### 1. TypeScript Strict Mode Mismatch
**Risk**: App uses non-strict TypeScript, monorepo may enforce strict mode
**Mitigation**: Keep `"strict": false` in app's tsconfig.json for now, plan gradual migration
**Decision Needed**: Should we enforce strict mode immediately or gradually? 
  - set strict to true, evaluate impact. base decision on that

### 2. Path Alias Conflicts
**Risk**: App has extensive path aliases that might conflict with monorepo conventions
**Mitigation**: Keep app-scoped aliases in app's tsconfig.json, isolate from monorepo
**Decision Needed**: None - this should work as-is

### 3. Database Dependencies
**Risk**: Multi-database testing requires PostgreSQL service
**Mitigation**: Use Docker Compose for local testing, GitHub Actions services for CI
**Decision Needed**: How should CI/CD handle PostgreSQL testing? 
  - Review existing ci. See what we can learn

### 4. Docker Build Context
**Risk**: Dockerfile expects certain build context structure
**Mitigation**: Start with app-directory builds, evaluate root builds later
**Decision Needed**: Build from app directory or monorepo root?

### 5. Version Management Transition
**Risk**: Moving from semantic-release to Changesets
**Mitigation**: Keep current version, use Changesets going forward
**Decision Needed**: Should we create an initial changeset for this migration?
  - evaluate and explain what benefits changesets bring. Why did we switch? 

### 6. Large Application Size
**Risk**: 8.2MB is relatively large for a single app
**Mitigation**: Monitor monorepo performance, use Turborepo caching effectively
**Decision Needed**: None - size is acceptable
  - where does the size come from? can we improve?

### 7. Dependency on openbadges-types
**Risk**: openbadges-types not yet migrated to monorepo
**Mitigation**: Keep as external dependency for now, update when migrated
**Decision Needed**: Should we migrate openbadges-types first, or proceed with external dep? 
  - openbadges-types is at packages/openbadges-types

---

## Breaking Changes

**None Expected** - This is an isolated application migration with no external consumers.

Internal changes:
- Package name will gain `@rollercoaster-dev` scope
- Build outputs remain in `dist/`
- API endpoints and behavior unchanged
- Database schemas unchanged

---

## Rollback Strategy

If migration fails or issues arise:

1. **Before any commits**: Simply delete the `apps/openbadges-modular-server/` directory
2. **After commits**:
   ```bash
   git checkout main
   git branch -D migrate/openbadges-modular-server
   ```
3. **If partially merged**: Revert the merge commit
4. **Original repository**: Remains intact at https://github.com/rollercoaster-dev/openbadges-modular-server

---

## Success Criteria

Migration is complete when:

- [ ] Application builds successfully via `turbo run build --filter=openbadges-modular-server`
- [ ] All tests pass via `turbo run test --filter=openbadges-modular-server`
- [ ] Linting passes via `turbo run lint --filter=openbadges-modular-server`
- [ ] Type checking passes via `turbo run type-check --filter=openbadges-modular-server`
- [ ] Docker image builds successfully
- [ ] docker-compose setup works for local development
- [ ] E2E tests pass with both SQLite and PostgreSQL
- [ ] Documentation is updated and accurate
- [ ] Workspace dependencies resolve correctly (rd-logger)
- [ ] No regressions in application functionality

---

## Questions for User

Before proceeding with migration, please clarify:

1. **openbadges-types dependency**: Should we migrate openbadges-types package first, or proceed with it as an external npm dependency?

2. **TypeScript strict mode**: Should we keep non-strict mode for this app, or plan immediate migration to strict mode?

3. **Docker build context**: Build from app directory (simpler) or monorepo root (better integration)?

4. **CI/CD coordination**: Should this migration wait for Issue #13 (CI/CD setup) to be completed first?

5. **Git history**: Should we preserve full git history via git subtree/filter-branch, or is a clean import acceptable?

6. **Database testing in CI**: How should PostgreSQL service be configured for CI testing?

---

## Next Steps

1. **Review this plan** - Provide feedback or approval
2. **Answer questions above** - Clarify any decisions needed
3. **Begin Phase 1** - Add raw repository to monorepo (awaiting approval)
4. **Proceed incrementally** - Each phase requires approval before continuing

---

## Notes

- This migration aligns with Phase 3 of the monorepo migration timeline
- The application is well-structured and follows domain-driven design
- Existing tests and documentation are comprehensive
- Docker support is production-ready with multi-architecture builds
- The application already uses rd-logger, which simplifies integration

---

**Migration Status**: PENDING APPROVAL
**Last Updated**: 2025-11-16
**Prepared By**: Claude Code Migration Agent
