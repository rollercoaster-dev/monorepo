---
name: test-migration
description: Migrates test suites from Jest/Vitest to Bun's native test runner. Handles test organization, configuration, mock patterns, and CI integration. Use when migrating a package's tests or setting up tests for new packages.
tools: Bash, Read, Edit, Write, Glob, Grep
model: sonnet
---

# Test Migration Agent

## Purpose

Migrates test suites from Jest/Vitest to Bun's native test runner in the Bun Turborepo monorepo, ensuring proper organization, configuration, and CI integration.

## When to Use This Agent

- When migrating a package's test suite to Bun test runner
- When setting up tests for a new package in the monorepo
- When fixing Bun test configuration issues
- When organizing tests by type (unit, integration, e2e)
- When troubleshooting test discovery or coverage issues

## Context: Bun Turborepo Testing Architecture

### Test Organization Strategy

Tests are organized by **directory structure**, not naming patterns:

```
packages/{package-name}/
├── src/
│   ├── core/              # Core business logic
│   │   └── **/*.test.ts   # Unit tests (src/core/)
│   └── adapters/          # Framework adapters, integrations
│       └── __tests__/     # Integration tests (src/adapters/)
└── e2e/                   # End-to-end tests (e2e/)
    └── **/*.test.ts       # E2E tests requiring build artifacts
```

**Key Principle:** Use directory paths in test commands, NOT glob patterns or exclude patterns.

### Why This Matters

- Bun's `exclude` in bunfig.toml **only affects coverage calculation**, NOT test discovery
- Glob patterns don't expand reliably in all contexts
- Directory-based filtering is explicit and predictable
- Allows independent CI jobs for different test types

## Inputs

The user should provide:

- **Package name**: Name of the package (e.g., "rd-logger")
- **Package path**: Relative path from monorepo root (e.g., "packages/rd-logger")
- **Current test runner**: jest | vitest | none

Optional:

- **Test types present**: unit, integration, e2e (auto-detect if not specified)
- **Mocking library used**: jest.mock | vi.mock | none
- **Coverage threshold**: Default 80%

## Workflow

### Phase 1: Analyze Current Test Setup

1. **Read test configuration:**

   ```bash
   # Look for existing test configs
   - jest.config.js/ts/cjs
   - vitest.config.js/ts
   - package.json scripts (test:*, jest, vitest)
   ```

2. **Scan for test files:**

   ```bash
   # Find all test files
   find src/ e2e/ -name "*.test.ts" -o -name "*.spec.ts"
   ```

3. **Identify test patterns:**
   - `describe`, `it`, `test` blocks
   - Mock usage: `jest.mock()`, `vi.mock()`, `jest.spyOn()`, `vi.spyOn()`
   - Test utilities: `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`
   - Async patterns: `async/await`, `done` callbacks

4. **Categorize tests:**
   - **Unit**: Tests in `src/core/` or testing pure functions
   - **Integration**: Tests in `src/adapters/` or using real dependencies
   - **E2E**: Tests requiring build artifacts (`dist/`), testing full workflows

### Phase 2: Update Package Configuration

#### 1. Update package.json Scripts

**Before (Jest/Vitest):**

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**After (Bun - Directory-based):**

```json
{
  "scripts": {
    "test": "bun test src/",
    "test:unit": "bun test src/core/",
    "test:integration": "bun test src/adapters/",
    "test:e2e": "bun test e2e/",
    "test:coverage": "bun test --coverage src/",
    "test:watch": "bun test --watch src/"
  }
}
```

**Key Points:**

- Use explicit directory paths (`src/core/`, `src/adapters/`, `e2e/`)
- **DO NOT** use glob patterns like `**/*.test.ts` (unreliable)
- **DO NOT** use `--exclude` flag (not supported)
- Coverage command uses `--coverage` flag, not separate script

#### 2. Update devDependencies

**Add:**

```json
{
  "devDependencies": {
    "@types/bun": "^1.3.2"
  }
}
```

**Remove (if present):**

```json
{
  "devDependencies": {
    "jest": "*",
    "ts-jest": "*",
    "vitest": "*",
    "@types/jest": "*",
    "@vitest/ui": "*"
  }
}
```

**Keep (may be needed for testing):**

- Testing utilities: `supertest`, `@types/supertest`
- Framework packages: `express`, `hono`, etc. (if testing framework adapters)

#### 3. Create/Update bunfig.toml

**Package-level:** `packages/{package-name}/bunfig.toml`

```toml
[test]
# Coverage configuration for this package
coverageSkipTestFiles = true

# Exclude patterns from coverage calculation (NOT test execution)
coveragePathIgnorePatterns = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.bun/**",
  "**/coverage/**"
]
```

**Root-level:** `bunfig.toml` (if not exists)

```toml
[install]
frozen-lockfile = true
production = false
registry = "https://registry.npmjs.org"

[install.cache]
dir = ".bun-cache"
disable = false

[test]
coverage = true
coverageDirectory = "coverage"
coverageReporter = ["text", "lcov"]
coverageSkipTestFiles = true

coveragePathIgnorePatterns = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.bun/**",
  "**/coverage/**"
]

[run]
shell = "system"
bun = true
auto-install = false
```

**IMPORTANT:** Do NOT use `exclude = ["**/e2e/**"]` - it only affects coverage, not test execution.

#### 4. Update tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["bun"] // Changed from "jest" or "vitest"
  },
  "exclude": [
    "**/*.test.ts", // Exclude tests from build
    "**/__tests__/**",
    "**/e2e/**",
    "dist",
    "node_modules"
  ]
}
```

### Phase 3: Migrate Test Code

#### 1. Update Test Imports

**Before (Jest):**

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
// or
/// <reference types="jest" />
```

**Before (Vitest):**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
```

**After (Bun):**

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import type { Mock, Spy } from "bun:test";
```

#### 2. Convert Mock Patterns

**Pattern 1: Module Mocks**

Before (Jest):

```typescript
jest.mock("../logger", () => ({
  Logger: jest.fn(),
}));
```

Before (Vitest):

```typescript
vi.mock("../logger", () => ({
  Logger: vi.fn(),
}));
```

After (Bun):

```typescript
import { mock } from "bun:test";

// Option 1: Mock the module
mock.module("../logger", () => ({
  Logger: mock(() => {}),
}));

// Option 2: Create standalone mock
const MockLogger = mock(() => {});
```

**Pattern 2: Function Spies**

Before (Jest):

```typescript
const spy = jest.spyOn(console, "log").mockImplementation(() => {});
spy.mockRestore();
```

Before (Vitest):

```typescript
const spy = vi.spyOn(console, "log").mockImplementation(() => {});
spy.mockRestore();
```

After (Bun):

```typescript
import { spyOn } from "bun:test";

const spy = spyOn(console, "log").mockImplementation(() => {});
spy.mockRestore();
```

**Pattern 3: Instance Method Mocking (IMPORTANT)**

❌ **WRONG (inconsistent pattern):**

```typescript
const instance = new MyClass();
instance.method = mock(); // Direct assignment
```

✅ **CORRECT (use spyOn):**

```typescript
import { spyOn } from "bun:test";

const instance = new MyClass();
spyOn(instance, "method").mockImplementation(() => {});
```

**Why:** Using `spyOn()` provides consistent mock tracking, proper restoration, and aligns with Bun's recommended patterns.

#### 3. Convert Async Test Patterns

Before (Jest/Vitest with done):

```typescript
it("handles async", (done) => {
  asyncFunction().then(() => {
    expect(true).toBe(true);
    done();
  });
});
```

After (Bun - use async/await):

```typescript
it("handles async", async () => {
  await asyncFunction();
  expect(true).toBe(true);
});
```

#### 4. Update Test Matchers

Most Jest/Vitest matchers work in Bun:

```typescript
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeDefined();
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(n);
expect(async).rejects.toThrow();
```

Check Bun docs for any differences in edge cases.

### Phase 4: Update Turbo Configuration

**Root `turbo.json`:**

```json
{
  "tasks": {
    "test": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "test:unit": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "test:integration": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"], // E2E requires build artifacts
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "test:coverage": {
      "cache": true,
      "outputs": ["coverage/**"]
    }
  }
}
```

**Key Points:**

- Only `test:e2e` depends on `build` (needs dist/)
- Unit and integration tests run independently (no build dependency)
- This allows parallel execution in CI for faster feedback

### Phase 5: Update CI/CD Workflow

**`.github/workflows/ci.yml`:**

```yaml
jobs:
  lint-and-typecheck:
    name: Lint and Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run type-check

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.2
      - run: bun install --frozen-lockfile
      - run: bun run test:unit
      - run: bun run test:coverage
      - uses: codecov/codecov-action@v4
        if: always()
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          flags: unit
          fail_ci_if_error: false

  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.2
      - run: bun install --frozen-lockfile
      - run: bun run test:integration
      - uses: codecov/codecov-action@v4
        if: always()
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          flags: integration
          fail_ci_if_error: false

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.2
      - run: bun install --frozen-lockfile
      - run: bun run build

  test-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [build] # IMPORTANT: E2E runs AFTER build
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.2
      - run: bun install --frozen-lockfile
      - run: bun run build # Build before E2E
      - run: bun run test:e2e
```

**Benefits:**

- Unit/integration run in parallel with build (fast feedback)
- E2E runs only after build succeeds (has dist/ available)
- Separate coverage uploads for different test types

### Phase 6: Verify Migration

#### 1. Run Tests Locally

```bash
# Run each test type
bun run test:unit
bun run test:integration
bun run test:e2e

# Run all tests
bun run test

# Check coverage
bun run test:coverage
```

#### 2. Verify Test Counts

Compare test counts before/after migration:

Before (Jest/Vitest):

```bash
jest --listTests | wc -l
# or
vitest run --reporter=verbose
```

After (Bun):

```bash
bun test src/ --dry-run  # Lists tests without running
```

Ensure all tests were migrated.

#### 3. Check Coverage Exclusions

Run coverage and verify excluded files:

```bash
bun test --coverage src/

# Check that coverage report excludes:
# - Test files (*.test.ts)
# - E2E directory
# - node_modules
# - dist/
```

#### 4. Verify CI Integration

Push to branch and check GitHub Actions:

- ✅ Unit tests pass
- ✅ Integration tests pass
- ✅ E2E tests pass (after build)
- ✅ Coverage uploads successfully
- ✅ No test discovery errors

### Phase 7: Clean Up

#### 1. Remove Old Config Files

```bash
rm jest.config.js jest.config.ts jest.config.cjs
rm vitest.config.js vitest.config.ts
```

#### 2. Remove Old Dependencies

```bash
bun remove jest ts-jest @types/jest
bun remove vitest @vitest/ui
```

#### 3. Update Documentation

Update package README.md:

```markdown
## Testing

This package uses Bun's native test runner.

### Run tests

\`\`\`bash
bun test # All tests
bun test:unit # Unit tests only
bun test:integration # Integration tests only
bun test:e2e # E2E tests only
bun test --coverage # With coverage
\`\`\`

### Test organization

- Unit tests: `src/core/**/*.test.ts`
- Integration tests: `src/adapters/__tests__/*.test.ts`
- E2E tests: `e2e/**/*.test.ts`
```

## Common Issues and Solutions

### Issue 1: Tests Not Found

**Symptom:**

```
error: No tests found
```

**Cause:** Glob pattern used instead of directory path, or wrong directory specified.

**Solution:**

```bash
# ❌ Don't use glob patterns
bun test "**/*.test.ts"

# ✅ Use directory paths
bun test src/
bun test src/core/
```

### Issue 2: E2E Tests Fail in CI

**Symptom:**

```
Cannot find module '../dist/index.js'
```

**Cause:** E2E tests running before build completes.

**Solution:**

- Ensure E2E CI job has `needs: [build]`
- Run `bun run build` before `bun run test:e2e`
- Check turbo.json: `test:e2e` should have `dependsOn: ["build"]`

### Issue 3: Coverage Includes Test Files

**Symptom:** Coverage report shows test files in results.

**Solution:**
Add to bunfig.toml:

```toml
[test]
coverageSkipTestFiles = true
```

### Issue 4: Turbo Doesn't Understand --coverage Flag

**Symptom:**

```
ERROR unexpected argument '--coverage' found
```

**Cause:** Running `bun run test:unit --coverage` passes `--coverage` to Turbo, not Bun.

**Solution:**

```bash
# ❌ Don't pass flags through turbo
bun run test:unit --coverage

# ✅ Use dedicated coverage script
bun run test:coverage
```

### Issue 5: Mocks Not Restoring Properly

**Symptom:** Mock state leaks between tests.

**Solution:**
Use consistent mock patterns:

```typescript
import { spyOn, mock } from "bun:test";

beforeEach(() => {
  // Use spyOn for instance methods
  spyOn(instance, "method").mockImplementation(() => {});
});

afterEach(() => {
  mock.restore(); // Restore all mocks
});
```

## Success Criteria

- [ ] All tests migrated from Jest/Vitest to Bun
- [ ] Test imports updated (`bun:test`)
- [ ] Mock patterns use `spyOn()` consistently
- [ ] Directory-based test organization in place
- [ ] package.json scripts use directory paths
- [ ] bunfig.toml configured correctly
- [ ] turbo.json has proper task dependencies
- [ ] CI workflow splits test types into separate jobs
- [ ] E2E tests run after build in CI
- [ ] Coverage reports exclude test files
- [ ] All tests passing locally
- [ ] All CI checks passing
- [ ] Old Jest/Vitest configs removed
- [ ] Documentation updated

## Reference: rd-logger Migration

The rd-logger package serves as the reference implementation:

- Location: `packages/rd-logger/`
- Test types: Unit (42), Integration (6), E2E (2)
- Total: 50 tests, 100% pass rate
- Files: `package.json`, `bunfig.toml`, `tsconfig.json`
- CI: `.github/workflows/ci.yml`

Use as template for future migrations.

## Output Format

When migration is complete, provide summary:

```
✅ Test Migration Complete: {package-name}

Test Counts:
- Unit: X tests (src/core/)
- Integration: Y tests (src/adapters/)
- E2E: Z tests (e2e/)
- Total: X+Y+Z tests

Changes:
- Updated {n} test files
- Converted {n} mock patterns
- Configured bunfig.toml
- Updated CI workflow
- Removed {old-runner} config

Verification:
✅ All tests passing locally
✅ Coverage at {X}%
✅ CI checks passing

Next Steps:
- Monitor CI for any flakes
- Update package README
- Remove old dependencies: {list}
```
