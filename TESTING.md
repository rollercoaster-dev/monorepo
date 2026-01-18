# Testing Standards

## Guiding Principle

> **If a test wouldn't catch a real bug that affects users, don't write it.**

High coverage numbers mean nothing if the tests don't catch real problems. Write fewer, better tests.

## What to Test

**Test these (in priority order):**

1. **Public API contracts** - Endpoints, exported functions, component props
2. **Business logic** - Decisions, transformations, validations that matter
3. **Regression tests** - Bugs that actually happened, so they don't happen again
4. **Integration points** - Database queries, external APIs, auth flows

**Don't test these:**

- Trivial code (getters, setters, pass-through functions)
- Framework behavior (Vue reactivity, Hono routing, TypeScript types)
- Implementation details (private methods, internal state)
- Things the type system already guarantees

## Test Granularity

**Prefer integration tests over unit tests.**

One integration test that exercises a real flow is worth more than ten unit tests of internal functions.

```
❌ 10 unit tests mocking everything
✅ 1 integration test hitting the real code path
```

Unit test only when:

- The logic is complex and isolated (pure functions, algorithms)
- Integration testing would be too slow or flaky
- You need to test specific edge cases

## Where Tests Go

**New tests:** Colocate in `src/__tests__/` next to the code they test.

```
src/
  services/
    BadgeService.ts
    __tests__/
      BadgeService.test.ts
```

**Existing tests:** Various locations exist (`tests/`, `test/`). Migrate when touching that code, don't refactor just to move files.

## Naming

| Type        | Pattern                 | Example                      |
| ----------- | ----------------------- | ---------------------------- |
| Unit        | `*.test.ts`             | `BadgeService.test.ts`       |
| Integration | `*.integration.test.ts` | `badges.integration.test.ts` |
| E2E         | `*.e2e.test.ts`         | `badge-flow.e2e.test.ts`     |

## Framework

| Package Type   | Framework | Why                        |
| -------------- | --------- | -------------------------- |
| Node packages  | Bun test  | Native, fast, no config    |
| Vue components | Vitest    | Vue Test Utils integration |

## Running Tests

```bash
# All tests
bun test

# Single package
bun --filter openbadges-system test

# Single file
bun test src/services/__tests__/BadgeService.test.ts

# With coverage
bun test --coverage
```

## Coverage

**Target: 80%** - Enforced in CI for openbadges-system.

Coverage is a side effect of good tests, not a goal. Don't write tests just to hit a number.

## Before Writing a Test, Ask:

1. What user-facing bug would this catch?
2. Is there already a test that covers this?
3. Would an integration test cover this better than a unit test?
4. Am I testing my code or the framework's code?

If you can't answer #1, don't write the test.
