# Development Plan: Issue #911

## Issue Summary

**Title**: fix(server): VerificationController unit tests failing
**Type**: bug
**Complexity**: SMALL
**Estimated Lines**: ~10 lines changed

## Intent Verification

Observable criteria derived from the issue:

- [ ] `bun --filter openbadges-modular-server test:unit` exits with 0 failures for all 9 VerificationController tests
- [ ] CI `Unit Tests` job passes green for the `tests/api/verify.test.ts` file
- [ ] Running `verify.test.ts` and `verify-baked.test.ts` together in the same process produces no cross-file mock contamination

## Dependencies

No issue dependencies.

**Status**: All dependencies met

## Objective

Fix 9 failing VerificationController unit tests by preventing mock state from `verify-baked.test.ts` leaking into `verify.test.ts` when both files run in the same bun worker process (bun 1.3.7 behavior).

## Root Cause Analysis

### What is failing

Nine tests in `tests/api/verify.test.ts` under `describe("VerificationController")` consistently return:

```
status: "valid", isValid: true, credentialId: undefined, issuer: undefined, durationMs: 20
```

regardless of the credential content. Tests that expect rejection (missing issuer, invalid type, expired, invalid JWT) get `status: "valid"` instead. Tests that expect extraction (`credentialId`, `issuer`) get `undefined`.

### Why it happens

`tests/api/verify-baked.test.ts` calls `mock.module()` at the **top level** (outside any describe/beforeEach):

```typescript
const mockVerify = mock();

mock.module("@/services/verification/verification.service", () => ({
  verify: mockVerify,
}));
```

In **bun 1.3.7**, test files within the same directory run in the **same worker process** and share the module registry. When `verify-baked.test.ts` runs before `verify.test.ts` (alphabetically guaranteed), the mocked `verification.service` module remains active for the entire process lifetime.

The last describe block in `verify-baked.test.ts` ("Verification Options", line 479) configures `mockVerify.mockResolvedValue()` with:

```typescript
{
  isValid: true,
  status: "valid",
  checks: { proof: [], status: [], temporal: [], issuer: [], schema: [], general: [] },
  verifiedAt: new Date().toISOString(),
  metadata: { durationMs: 20 },
}
```

This stale mock value matches exactly what CI reports (including `durationMs: 20`). When `verify.test.ts` subsequently runs, `VerificationController.verifyCredential()` calls the mocked `verify()` instead of the real function, always returning the stale value.

**bun 1.3.8 (local)** isolates each test file in its own worker, so the mock does not leak — tests pass locally but fail in CI which pins `bun@1.3.7` via `packageManager` in `package.json`.

### Why bun 1.3.7 is used in CI

`package.json` specifies `"packageManager": "bun@1.3.7"`. The CI workflow uses `bun-version-file: "package.json"` which installs exactly that version. Local development uses bun 1.3.8 which has per-file worker isolation.

## Decisions

| ID  | Decision                                                       | Alternatives Considered                                                                                    | Rationale                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Add `afterAll(() => mock.restore())` to `verify-baked.test.ts` | (a) Add explicit restore per describe block; (b) Move tests to separate directory; (c) Upgrade bun version | `mock.restore()` is the standard bun API for cleaning up module mocks. Single `afterAll` at file scope is minimal, targeted, and does not affect other test files. Upgrading bun requires coordination across the whole team and CI. |

## Affected Areas

- `apps/openbadges-modular-server/tests/api/verify-baked.test.ts`: add `afterAll(() => mock.restore())` at the top-level scope to clean up `mock.module()` registrations after all tests in the file complete

## Implementation Plan

### Step 1: Add mock cleanup to verify-baked.test.ts

**Files**: `apps/openbadges-modular-server/tests/api/verify-baked.test.ts`
**Commit**: `fix(openbadges-server): restore module mocks after verify-baked tests`
**Changes**:

- [ ] Import `afterAll` from `"bun:test"` (already imports `describe, expect, it, beforeEach, mock`)
- [ ] Add `afterAll(() => mock.restore())` at the top level of the file, after the `mock.module()` calls and before the `describe` block
- [ ] Verify `verify-baked.test.ts` tests still pass (mock is only restored after all tests complete, not during them)

The change looks like:

```diff
-import { describe, expect, it, beforeEach, mock } from "bun:test";
+import { afterAll, describe, expect, it, beforeEach, mock } from "bun:test";

 // ... mock.module() calls ...

+// Restore mocked modules after all tests complete so verify.test.ts
+// gets the real verification service when run in the same bun worker.
+afterAll(() => {
+  mock.restore();
+});
+
 describe("POST /v3/verify/baked - Verify Baked Image Endpoint", () => {
```

## Testing Strategy

- [ ] Run `bun test apps/openbadges-modular-server/tests/api/verify-baked.test.ts apps/openbadges-modular-server/tests/api/verify.test.ts` to confirm both files pass when run together in the same process
- [ ] Run `bun --filter openbadges-modular-server test:unit` and confirm 0 failures for the 9 previously failing tests
- [ ] Confirm `verify-baked.test.ts` all 23 tests still pass (the `afterAll` runs after all tests, not during)

## Not in Scope

| Item                                                                                         | Reason                                                                                                                    | Follow-up                       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Upgrading `packageManager` from bun 1.3.7 to 1.3.8                                           | That's a separate coordination decision; fixing the test isolation is the correct long-term fix regardless of bun version | Separate chore issue if desired |
| Refactoring `verify-baked.test.ts` to use `beforeAll`/`afterAll` pattern for `mock.module()` | Larger refactor, not required for the fix                                                                                 | Could be a follow-up cleanup    |

## Discovery Log

<!-- Entries added by implement skill:
- [2026-04-10 22:00] Confirmed via CI log run 24263262328 that verify.test.ts receives stale mockVerify returning { status: "valid", durationMs: 20 } — exactly matching verify-baked.test.ts "Verification Options" beforeEach mock
- [2026-04-10 22:00] Confirmed tests pass locally on bun 1.3.8 due to per-file worker isolation introduced in that version
- [2026-04-10 22:00] bun.lock resolves zod@3.25.76 for openbadges-modular-server — not a version conflict issue
-->
