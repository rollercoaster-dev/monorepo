# Task: Fix test configuration — bun:sqlite externalization errors (Issue #22)

Source: [GitHub Issue #22](https://github.com/rollercoaster-dev/openbadges-system/issues/22) *(legacy repo)*

## Problem Summary

- Tests fail with: `Module "bun:sqlite" has been externalized for browser compatibility. Cannot access "bun:sqlite.Database" in client code.`
- Mixed DB usage:
  - `src/server/services/user.ts` imports `bun:sqlite`
  - `database/factory.ts` uses `better-sqlite3` (via Kysely)
- Vitest configured with `environment: 'jsdom'` globally, so server modules load under browser-like env.

## Goal / Definition of Done

- Server tests run without externalization errors.
- Test env isolates server-only code from jsdom/browser.
- Pre-push hooks pass.

## Constraints & Notes

- Keep client tests in `jsdom`.
- Keep server tests in `node` env, no browser shims.
- Avoid hard dependency on Bun internals in general-purpose services used by tests.

## Plan (Phased)

1. Test Env Segmentation

- Update `vitest.config.ts` to support test project overrides (client vs server):
  - Default project: client with `environment: 'jsdom'` (current behavior)
  - Server project: matches pattern `src/server/**/__tests__/**/*.test.ts` and sets `environment: 'node'`
- Alternatively split via `defineProject` with two configs.

2. Mocking Strategy for native DBs

- For unit/integration tests that import `src/server/services/user.ts`, provide a mock for `bun:sqlite` under Node test env (or refactor to avoid bun-specific import in tests).
- Prefer refactor: add an adapter layer so `UserService` uses shared DB factory (Kysely) instead of direct `bun:sqlite`.

3. Refactor (recommended, may be a follow-up PR if large)

- Replace direct `bun:sqlite` in `src/server/services/user.ts` with Kysely via `database/factory.ts` for consistency.
- Benefit: one DB stack, easier mocking, no browser externalization hazard.

## Immediate Fix (minimal changes)

- Implement Vitest multi-project config:
  - Keep global `jsdom` for client tests
  - Add server project: `environment: 'node'`, `test.include: ['src/server/**/__tests__/**/*.test.ts']`
- Add a safe stub for `global.fetch` within server tests as they already do.
- Ensure no server tests import client code.

## Stretch Improvements

- Add `test:server` and `test:client` scripts.
- Add CI matrix to run both sets separately.
- Standardize on Kysely + better-sqlite3 for local/dev tests.

## Task Breakdown & Estimates

- Update Vitest config to multi-project: 30m
- Verify tests run green locally: 20-40m
- Optional adapter refactor to Kysely: 2-4h

## Risks

- Refactor scope creep; mitigate by shipping config split first.
- Hidden imports of `bun:sqlite` elsewhere; search and gate with node env.

## Acceptance Checklist

- [ ] `bun test` passes locally without externalization errors
- [ ] Server endpoint tests (`src/server/__tests__/endpoints.test.ts`) pass
- [ ] Pre-push hooks pass
- [ ] CI green

## References

- Issue context and root cause notes: [#22](https://github.com/rollercoaster-dev/openbadges-system/issues/22) *(legacy repo)*

