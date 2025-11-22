# Feature: Server-side Badge Class Filtering by Issuer

**Branch:** `feat/server-side-badge-filtering`
**Created:** 2025-11-22
**Status:** In Progress
**Issue:** #106

---

## Overview

Add server-side filtering support for badge classes by issuer ID, replacing the current inefficient client-side filtering approach.

## Problem Statement

The `getBadgeClassesByIssuer` method in `badgeApi.ts` currently:
1. Fetches ALL badge classes from the server
2. Filters them client-side by issuer ID

This is inefficient for large datasets and wastes bandwidth.

## Proposed Solution

Add a `?issuer={issuerId}` query parameter to the badge server API:
```
GET /api/bs/v2/badge-classes?issuer={issuerId}
GET /api/bs/v3/achievements?issuer={issuerId}
```

## Key Discovery

The badge server **already has** `findByIssuer` implemented in the repository layer. We only need to expose it via query parameter in the API router.

---

## Phase 1: Badge Server Changes (openbadges-modular-server)

### Commit 1: `feat(openbadges-modular-server): add issuer query param to badge-classes endpoint`

**Files:**
- `apps/openbadges-modular-server/src/api/api.router.ts`
- `apps/openbadges-modular-server/src/api/controllers/badgeClass.controller.ts`

**Changes:**
1. Update `getAllBadgeClasses` controller method to accept optional `issuerId` parameter
2. Update router to parse `issuer` query parameter and pass to controller
3. Use existing `findByIssuer` repository method when `issuerId` is provided

**Controller Update:**
```typescript
async getAllBadgeClasses(
  version: BadgeVersion = BadgeVersion.V3,
  issuerId?: string
): Promise<BadgeClassResponseDto[]> {
  const badgeClasses = issuerId
    ? await this.badgeClassRepository.findByIssuer(toIRI(issuerId) as Shared.IRI)
    : await this.badgeClassRepository.findAll();
  return badgeClasses.map((bc) => this.mapBadgeClassToDto(bc, version));
}
```

**Router Update:**
```typescript
router.get('/achievements', requireAuth(), async (c) => {
  const issuerId = c.req.query('issuer');
  const result = await badgeClassController.getAllBadgeClasses(version, issuerId);
  return c.json(result);
});
```

---

### Commit 2: `test(openbadges-modular-server): add tests for issuer query param filtering`

**Files:**
- `apps/openbadges-modular-server/tests/e2e/badgeClass.e2e.test.ts`

**Test Cases:**
- GET /achievements?issuer={validId} returns filtered results
- GET /achievements?issuer={invalidId} returns empty array
- GET /achievements without query param returns all badge classes
- Same tests for /v2/badge-classes endpoint

---

## Phase 2: Client Changes (openbadges-system)

### Commit 3: `feat(openbadges-system): use server-side filtering in getBadgeClassesByIssuer`

**Files:**
- `apps/openbadges-system/src/client/services/badgeApi.ts`

**Changes:**
1. Update `getBadgeClassesByIssuer` to use query parameter
2. Remove client-side filtering logic
3. Remove TODO comment referencing issue #106

**Before:**
```typescript
async getBadgeClassesByIssuer(issuerId: string): Promise<BadgeClass[]> {
  // TODO: Add server-side filtering endpoint to badge server
  const allBadgeClasses = await this.getBadgeClasses();
  return allBadgeClasses.filter((badgeClass) => { ... });
}
```

**After:**
```typescript
async getBadgeClassesByIssuer(issuerId: string): Promise<BadgeClass[]> {
  const response = await fetch(
    `/api/bs/v2/badge-classes?issuer=${encodeURIComponent(issuerId)}`,
    { method: 'GET', headers: this.getHeaders() }
  );
  // ... handle response
}
```

---

## Phase 3: Documentation & PR

### Commit 4: `docs: update plan with completion status`

**Files:**
- `docs/plans/server-side-badge-filtering-plan.md` (update status)

---

## Checklist

- [ ] Commit 1: Server-side query parameter support
- [ ] Commit 2: Server tests
- [ ] Commit 3: Client update to use server filtering
- [ ] Commit 4: Documentation update
- [ ] Create PR (closes #106)

## Acceptance Criteria (from Issue #106)

- [ ] Badge server supports `issuer` query parameter on `/v2/badge-classes`
- [ ] Client `getBadgeClassesByIssuer` uses the server-side filter when available
- [ ] Fallback to client-side filtering if server doesn't support the parameter

## Related

- Issue #106 - Add server-side filtering for badge classes by issuer
- PR #105 - Directory components implementation (introduced the client method)
