# Migration Plan: openbadges-types

**Date Created**: 2025-11-16
**Source Repository**: https://github.com/rollercoaster-dev/openbadges-types
**Target Location**: `packages/openbadges-types/`
**Current Version**: 3.2.3
**Migration Status**: Phase 1 - Planning

---

## Migration Analysis: openbadges-types

### Current State

**Repository Overview:**
- **Description**: TypeScript type definitions for Open Badges 2.0 and 3.0 specifications
- **Current Version**: 3.2.3
- **Package Manager**: pnpm
- **Build Tool**: tsup (bundler)
- **Test Framework**: Jest
- **Lines of Code**: ~4,443 lines (source + tests)
- **Published to npm**: Yes (openbadges-types)

**Repository Structure:**
```
openbadges-types/
├── src/
│   ├── shared/           # Common types (jsonld, common)
│   ├── v2/              # Open Badges 2.0 types
│   ├── v3/              # Open Badges 3.0 types
│   ├── validation.ts    # Validation logic
│   ├── type-guards.ts   # Type guard utilities
│   ├── schemas.ts       # JSON schemas
│   ├── badge-normalizer.ts
│   ├── composite-guards.ts
│   ├── validateWithSchema.ts
│   └── index.ts
├── test/                # 15 test files
├── schemas/             # JSON schema files
├── docs/                # Documentation
├── examples/            # Usage examples
├── research/            # Research materials
└── .github/workflows/   # CI/CD workflows
```

**Dependencies:**
- **Runtime**: ajv (JSON schema validation)
- **Dev Dependencies**: Jest, ts-jest, ESLint, Prettier, tsup, TypeScript, standard-version, husky, commitlint
- **Peer Dependencies**: TypeScript >= 4.0.0

**Key Features:**
- Comprehensive TypeScript types for Open Badges 2.0 and 3.0
- Runtime validation using AJV and custom validators
- Type guards for OB2 and OB3
- Badge normalization utilities
- Composite guards for cross-version compatibility
- Dual format exports (ESM + CommonJS)
- Proper package exports with type definitions

---

## Proposed Changes

### 1. Package Structure Migration

**Target Structure:**
```
packages/openbadges-types/
├── src/                 # Copy all source files
├── test/                # Copy all test files
├── schemas/             # Copy schema files
├── package.json         # Adapted for monorepo
├── tsconfig.json        # TypeScript project reference config
├── README.md            # Updated for monorepo context
├── CHANGELOG.md         # Preserve existing changelog
├── LICENSE              # Copy license
└── .env.example         # If needed
```

**Files NOT to migrate:**
- `.git/` - Git history (will be preserved in monorepo)
- `node_modules/` - Dependencies managed by monorepo
- `.husky/` - Monorepo will have its own git hooks
- `.github/workflows/` - CI/CD will be configured at monorepo level
- `pnpm-lock.yaml` - Monorepo uses bun
- `.prettierrc`, `.prettierignore` - Use shared config
- `.editorconfig` - Monorepo level
- `commitlint.config.cjs` - Monorepo level
- `.versionrc` - Will use Changesets instead
- `CONTRIBUTING.md`, `DEVELOPMENT.md` - Monorepo docs

### 2. Package.json Updates

**Changes Required:**
- **name**: Keep as `openbadges-types` (or update to `@rollercoaster-dev/openbadges-types`)
- **version**: Keep current version (3.2.3)
- **repository**: Update to monorepo URL with directory
- **homepage**: Update to monorepo tree path
- **bugs**: Update to monorepo issues
- **scripts**: Adapt to Bun and Turborepo
  - Replace `pnpm` with `bun`
  - Update test script from Jest to Bun test
  - Simplify build (keep tsup or use tsc)
  - Remove release scripts (Changesets handles this)
  - Remove husky prepare script
- **devDependencies**:
  - Remove: Jest, ts-jest, husky, commitlint, standard-version, pnpm-specific tools
  - Add: @rollercoaster-dev/shared-config (workspace reference)
  - Keep: tsup, TypeScript, ESLint
- **packageManager**: Change to `bun@1.3.2`
- **exports**: Keep existing dual-format exports structure

### 3. Build Configuration

**Current**: Uses tsup for dual ESM/CJS output with proper type definitions

**Migration Strategy**:
- **Option A** (Recommended): Keep tsup configuration - it's well-configured for dual formats
- **Option B**: Migrate to tsc (like rd-logger) - simpler but need to handle dual formats

**Recommendation**: Keep tsup since it's already configured correctly for:
- Dual format (ESM + CJS)
- Proper type definitions (.d.ts + .d.cts)
- Sourcemaps
- Clean builds

**tsup.config.ts** - Keep as-is with minor updates if needed

### 4. Test Migration (Jest → Bun)

**Current Test Setup:**
- Jest with ts-jest
- 15 test files
- Configuration in jest.config.cjs

**Migration Strategy:**
1. Remove Jest dependencies (jest, ts-jest, @types/jest)
2. Update test files to use Bun's test API
3. Update imports from `import { describe, it, expect } from '@jest/globals'` to Bun's built-in test
4. Update test scripts in package.json
5. Verify all tests pass

**Bun Test API Compatibility:**
- Bun's test API is similar to Jest (describe, it, expect)
- Should require minimal changes
- May need to adjust some matcher functions

### 5. TypeScript Configuration

**Updates Required:**
- Extend `@rollercoaster-dev/shared-config/tsconfig`
- Set `composite: true` for project references
- Configure `outDir`, `rootDir`
- Set `moduleResolution: "NodeNext"` and `module: "NodeNext"` for ESM
- Update `types` array for Bun
- Keep source in `src/`, exclude test files from build

**Example (based on rd-logger):**
```json
{
  "extends": "@rollercoaster-dev/shared-config/tsconfig",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "moduleResolution": "NodeNext",
    "module": "NodeNext",
    "types": ["node", "bun"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage", "**/*.test.ts"]
}
```

### 6. Linting & Formatting

**Current**:
- Custom ESLint config (eslint.config.js + eslint.config.mjs)
- Prettier config

**Changes**:
- Use shared ESLint config from `@rollercoaster-dev/shared-config`
- Remove custom .prettierrc (use monorepo Prettier)
- Update lint scripts

### 7. Dependencies Consolidation

**Runtime Dependencies to Keep:**
- `ajv` (^8.17.1) - Critical for JSON schema validation

**DevDependencies Updates:**
- Add: `@rollercoaster-dev/shared-config` (workspace:*)
- Keep: `typescript`, `tsup`, `@types/node`, `eslint`
- Remove: All Jest-related, husky, commitlint, standard-version, pnpm-action-setup
- Add if needed: `@types/bun`

### 8. Documentation Updates

**README.md Updates:**
- Update installation instructions (reference monorepo)
- Update repository links
- Update CI/CD badge URLs
- Add note about monorepo context
- Keep all usage examples (they're excellent)

**CHANGELOG.md:**
- Preserve existing changelog
- Add entry for monorepo migration

### 9. CI/CD Integration

**Current Workflows:**
- `test.yml` - Runs lint, format check, type check, test, build
- `package-validation.yml` - Validates package with publint
- `release.yml` - Uses standard-version for releases

**Monorepo Integration:**
- Tests will run via Turborepo at monorepo level
- Publishing will use Changesets workflow
- Need to configure npm OIDC Trusted Publishing (like rd-logger)
- Package validation should be part of CI

**GitHub Actions Needed (Monorepo Level):**
- Existing CI should handle tests
- Need to add `openbadges-types` to publishing workflow
- Configure npm package provenance

### 10. Environment Variables

**Current**: No .env file in repository

**Required**: None identified (package is purely TypeScript types)

---

## Risks & Considerations

### High Priority Risks

1. **Test Migration Complexity**
   - 15 test files to migrate from Jest to Bun
   - Some tests may use Jest-specific features
   - Risk: Tests may fail after migration
   - Mitigation: Migrate incrementally, test each file

2. **Build Output Compatibility**
   - Package has dual ESM/CJS exports with separate type definitions
   - Risk: Incorrect exports could break consumers
   - Mitigation: Keep tsup, validate with publint

3. **Runtime Dependency (AJV)**
   - Package depends on `ajv` for validation
   - Risk: Version conflicts in monorepo
   - Mitigation: Verify no version conflicts with other packages

### Medium Priority Risks

4. **Existing Consumers**
   - Package is published to npm and may have external users
   - Risk: Breaking changes in migration
   - Mitigation: Keep version, maintain backward compatibility

5. **Documentation Examples**
   - Extensive documentation and examples
   - Risk: Examples may reference old package name
   - Mitigation: Update examples for monorepo context

### Low Priority Risks

6. **Research and Schema Files**
   - Contains research/ and schemas/ directories
   - Risk: Files may become outdated
   - Mitigation: Review and update if needed

---

## Migration Steps (Detailed)

### Phase 1: Initial Setup ✓
1. ✓ Create feature branch `migrate/openbadges-types`
2. ✓ Clone source repository for analysis
3. ✓ Analyze repository structure and dependencies
4. ✓ Create this migration plan document
5. **APPROVAL CHECKPOINT**: Review and approve migration plan

### Phase 2: Repository Copy
1. Remove .git folder from cloned repository
2. Copy entire repository to `packages/openbadges-types/`
3. Commit: "migrate(openbadges-types): add repository to monorepo"
4. Remove files not needed in monorepo (workflows, configs, etc.)
5. Commit: "migrate(openbadges-types): remove monorepo-redundant files"

### Phase 3: Package Configuration
1. Update package.json:
   - Repository URLs
   - Scripts (pnpm → bun)
   - Dependencies (add shared-config)
   - Package manager
2. Commit: "migrate(openbadges-types): update package.json for monorepo"

### Phase 4: Build System Integration
1. Update tsconfig.json for TypeScript project references
2. Verify tsup.config.ts works with Bun
3. Test build: `bun --filter openbadges-types run build`
4. Commit: "migrate(openbadges-types): configure TypeScript and build system"

### Phase 5: Test Migration
1. Update test imports from Jest to Bun
2. Remove Jest configuration
3. Update test scripts in package.json
4. Run tests: `bun --filter openbadges-types test`
5. Fix any failing tests
6. Commit: "migrate(openbadges-types): migrate from Jest to Bun test runner"

### Phase 6: Linting & Formatting
1. Remove custom ESLint configs
2. Add shared-config dependency
3. Update lint scripts
4. Run lint: `bun --filter openbadges-types run lint`
5. Fix any linting issues
6. Commit: "migrate(openbadges-types): integrate shared linting config"

### Phase 7: Documentation Updates
1. Update README.md for monorepo context
2. Update CHANGELOG.md with migration entry
3. Review and update examples if needed
4. Commit: "migrate(openbadges-types): update documentation for monorepo"

### Phase 8: Validation
1. Run full test suite
2. Build package
3. Type check
4. Lint and format check
5. Validate package structure (publint)
6. Commit: "migrate(openbadges-types): validate complete migration"

### Phase 9: CI/CD Preparation
1. Update monorepo CI workflows to include openbadges-types
2. Configure npm publishing with OIDC
3. Set up Changesets for version management
4. Document publishing process
5. Commit: "ci: configure openbadges-types for publishing"

---

## Rollback Strategy

If migration encounters critical issues:

1. **Immediate Rollback**:
   - Delete feature branch
   - Source repository remains unchanged
   - No impact on existing npm package

2. **Partial Rollback**:
   - Keep commits up to last working state
   - Document issues encountered
   - Adjust plan and retry

3. **Post-Merge Rollback**:
   - Revert merge commit
   - Restore from backup if needed
   - Original repository still exists independently

---

## Success Criteria

Migration is considered successful when:

- [ ] All source files copied and organized correctly
- [ ] Package builds successfully with Bun
- [ ] All tests pass with Bun test runner
- [ ] Linting and type checking pass
- [ ] Package exports validated with publint
- [ ] Documentation updated and accurate
- [ ] CI/CD pipeline configured
- [ ] No breaking changes for existing consumers
- [ ] Version published to npm successfully (post-migration)

---

## Next Steps After Approval

1. Execute Phase 2: Copy repository to monorepo
2. Execute Phase 3: Update package.json
3. Execute Phase 4: Configure build system
4. Execute Phase 5: Migrate tests
5. Execute Phase 6: Update linting
6. Execute Phase 7: Update documentation
7. Execute Phase 8: Validate migration
8. Execute Phase 9: Configure CI/CD
9. Create pull request with complete migration
10. Publish new version after merge

---

## Questions for Review

Before proceeding, please confirm:

1. **Package Naming**: Should we keep `openbadges-types` or rename to `@rollercoaster-dev/openbadges-types`?
2. **Build Tool**: Keep tsup (current, well-configured) or migrate to tsc (simpler, like rd-logger)?
3. **Documentation**: Should we keep `docs/`, `examples/`, and `research/` directories in the monorepo?
4. **Publishing**: Should this package continue to be published to npm?
5. **Version Strategy**: Keep current version (3.2.3) or reset to match monorepo versioning?

---

**Status**: Awaiting approval to proceed with Phase 2
