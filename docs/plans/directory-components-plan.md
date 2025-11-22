# Feature: Implement Badge & Issuer Directory Components

**Branch:** `feat/directory-components`
**Created:** 2025-11-22
**Status:** Complete (PR #105)

---

## Overview

Implement reusable list components in `openbadges-ui` for displaying Badge Classes and Issuers, then integrate them into the `openbadges-system` directory pages.

## Open Badges Protocol Compliance

| OB2 Type | OB3 Equivalent | Key Display Fields |
|----------|----------------|-------------------|
| `Profile` | `Issuer` | id, name, url, email, description, image |
| `BadgeClass` | `Achievement` | id, name, description, image, criteria, issuer, tags, alignment |

Components will normalize between OB2/OB3 formats using existing `BadgeService` patterns.

---

## Phase 1: openbadges-ui Components

### Commit 1: `feat(openbadges-ui): Add IssuerCard component`

**File:** `packages/openbadges-ui/src/components/issuers/IssuerCard.vue`

**Props:**
```typescript
interface Props {
  issuer: OB2.Profile | OB3.Issuer;
  interactive?: boolean;        // default: false
  showDescription?: boolean;    // default: true
  showContact?: boolean;        // default: false
  density?: 'compact' | 'normal' | 'spacious'; // default: 'normal'
}
```

**Events:**
- `@click` - emits issuer object

**Display:**
- Image/logo with fallback
- Name (required)
- Description (truncated)
- URL (as link)
- Email (optional)

---

### Commit 2: `feat(openbadges-ui): Add IssuerList component`

**File:** `packages/openbadges-ui/src/components/issuers/IssuerList.vue`

**Props:**
```typescript
interface Props {
  issuers: (OB2.Profile | OB3.Issuer)[];
  layout?: 'grid' | 'list';     // default: 'grid'
  loading?: boolean;            // default: false
  pageSize?: number;            // default: 9
  currentPage?: number;         // default: 1
  showPagination?: boolean;     // default: false
  density?: 'compact' | 'normal' | 'spacious';
  ariaLabel?: string;
}
```

**Events:**
- `@issuer-click` - emits issuer object
- `@page-change` - emits page number
- `@update:density` - emits density value

**Features:**
- Search filter (name, description)
- Grid/list layout toggle
- Pagination
- Loading/empty states
- Neurodiversity-friendly density controls

---

### Commit 3: `feat(openbadges-ui): Add BadgeClassCard component`

**File:** `packages/openbadges-ui/src/components/badges/BadgeClassCard.vue`

**Props:**
```typescript
interface Props {
  badgeClass: OB2.BadgeClass | OB3.Achievement;
  interactive?: boolean;        // default: false
  showDescription?: boolean;    // default: true
  showCriteria?: boolean;       // default: false
  showIssuer?: boolean;         // default: true
  showTags?: boolean;           // default: true
  density?: 'compact' | 'normal' | 'spacious';
}
```

**Events:**
- `@click` - emits badge class object

**Display:**
- Badge image with fallback
- Name (required)
- Description (truncated)
- Issuer name (with link)
- Criteria summary
- Tags (as chips)

**Note:** Distinct from `BadgeDisplay` which shows issued badges (Assertions).

---

### Commit 4: `feat(openbadges-ui): Add BadgeClassList and export components`

**File:** `packages/openbadges-ui/src/components/badges/BadgeClassList.vue`

**Props:**
```typescript
interface Props {
  badgeClasses: (OB2.BadgeClass | OB3.Achievement)[];
  layout?: 'grid' | 'list';
  loading?: boolean;
  pageSize?: number;
  currentPage?: number;
  showPagination?: boolean;
  density?: 'compact' | 'normal' | 'spacious';
  ariaLabel?: string;
}
```

**Events:**
- `@badge-class-click` - emits badge class object
- `@page-change` - emits page number
- `@update:density` - emits density value

**Features:**
- Search filter (name, description)
- Issuer filter dropdown
- Tags filter
- Grid/list layout
- Pagination
- Loading/empty states

**Also:** Update `src/index.ts` to export all new components.

---

## Phase 2: openbadges-system Integration

### Commit 5: `feat(openbadges-system): Add API service for badges/issuers`

**File:** `apps/openbadges-system/src/client/services/badgeApi.ts`

**Methods:**
```typescript
export const badgeApi = {
  getIssuers(): Promise<Issuer[]>;
  getIssuerById(id: string): Promise<Issuer | null>;
  getBadgeClasses(): Promise<BadgeClass[]>;
  getBadgeClassById(id: string): Promise<BadgeClass | null>;
  getBadgeClassesByIssuer(issuerId: string): Promise<BadgeClass[]>;
};
```

Uses existing proxy at `/api/bs/` with auth headers.

---

### Commit 6: `feat(openbadges-system): Implement Badge Directory page`

**File:** `apps/openbadges-system/src/client/pages/badges/index.vue`

**Implementation:**
- Import `BadgeClassList` from `openbadges-ui`
- Fetch badge classes on mount using `badgeApi`
- Handle loading state
- Handle empty state with CTA to create
- Navigate to `/badges/:id` on click

---

### Commit 7: `feat(openbadges-system): Implement Issuer Directory page`

**File:** `apps/openbadges-system/src/client/pages/issuers/index.vue`

**Implementation:**
- Import `IssuerList` from `openbadges-ui`
- Fetch issuers on mount using `badgeApi`
- Handle loading state
- Handle empty state with CTA to create
- Navigate to `/issuers/:id` on click

---

## Phase 3: Testing & Documentation

### Commit 8: `test(openbadges-ui): Add tests for directory components`

**Files:**
- `src/components/issuers/IssuerCard.test.ts`
- `src/components/issuers/IssuerList.test.ts`
- `src/components/badges/BadgeClassCard.test.ts`
- `src/components/badges/BadgeClassList.test.ts`

**Test Coverage:**
- Rendering with OB2 and OB3 data
- Event emissions
- Filtering functionality
- Pagination
- Empty/loading states

---

### Commit 9: `docs(openbadges-ui): Add stories for directory components`

**Files:**
- `src/components/issuers/IssuerCard.story.vue`
- `src/components/issuers/IssuerList.story.vue`
- `src/components/badges/BadgeClassCard.story.vue`
- `src/components/badges/BadgeClassList.story.vue`

---

## Checklist

- [x] Commit 1: IssuerCard component
- [x] Commit 2: IssuerList component
- [x] Commit 3: BadgeClassCard component
- [x] Commit 4: BadgeClassList + exports
- [x] Commit 5: API service
- [x] Commit 6: Badge Directory page
- [x] Commit 7: Issuer Directory page
- [x] Commit 8: Tests (IssuerCard, BadgeClassCard)
- [x] Commit 9: Stories
- [x] Create PR (#105)
