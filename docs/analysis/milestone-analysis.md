# Milestone Analysis - Working Document

Deep analysis of all open issues to determine optimal milestone structure and dependencies.

**Created:** 2026-01-16
**Purpose:** Working document for reorganization discussion

---

## Current Milestones Overview

**Updated 2026-01-16:** Milestones renumbered by dependency order. `-i` suffix = independent track.

| #    | Milestone              | Open Issues | Focus                                  |
| ---- | ---------------------- | ----------- | -------------------------------------- |
| 01   | OB3 Phase 1: Core Spec | 0           | ✅ COMPLETE                            |
| 02   | Badge Generator        | 0           | ✅ COMPLETE                            |
| 03   | Infrastructure         | 17          | **BLOCKING** - Build/type bugs         |
| 04   | OB3 Phase 2: UI Layer  | 6           | UI OB3 compliance                      |
| 05   | OB3 Phase 3: Quality   | 3           | Final OB3 polish                       |
| 06   | Issuer Model UI        | 13          | Creation/management primitives         |
| 07   | UI Components          | 15          | Display components                     |
| 08   | Badge Backpack         | 7           | Collection interface (backend done)    |
| 09   | Core Services          | 13          | API keys, verification polish          |
| 10-i | Self-Signed Badges     | 4           | Independent: Client-side signing, DIDs |
| 11-i | Developer Experience   | 13          | Independent: Testing, tooling          |
| 12-i | Documentation          | 8           | Independent: Docs                      |
| -    | Claude Knowledge       | 18          | Tooling (separate track)               |

---

## Code Graph Reality Check

**Analysis Date:** 2026-01-16

Used `g:find`, `g:calls`, and `d:search` to compare issues/vision against actual implementation.

### Key Findings

| Feature             | Vision/Issues Say  | Code Graph Reality                                                                               | Gap                                          |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **Backpack**        | "Missing" (Vision) | **42 entities exist** - complete backend domain with controller, service, repositories, entities | **UI only** - backend done, no UI components |
| **Baking**          | "In Progress"      | ✅ **COMPLETE** - `POST /v3/credentials/:id/bake` endpoint exists, E2E tested                    | **Done** - issues #115-120 all closed        |
| **Verification**    | "In Progress"      | `VerificationController` connected to `api.router.ts`, multiple implementations                  | **Functional** - actually wired              |
| **DID Support**     | Not mentioned      | `resolveDIDWeb`, `resolveDIDKey`, `DidDocument` interfaces                                       | **Partial** - resolution exists              |
| **Self-Signed**     | "Missing" (Vision) | **Zero entities found**                                                                          | **Truly missing** - nothing started          |
| **Badge Generator** | 5 open issues      | **No generator app code** (only key-generator for crypto)                                        | **Truly missing**                            |

### Test Coverage Reality

```
apps/openbadges-modular-server: 3 test files
  - sqlite-repository.coordinator.cascade-deletion.test.ts
  - signature.test.ts
  - verification-status.test.ts

Baking tests: 0
Verification service tests: 0
Backpack tests: 0
```

### What This Means

1. **Backpack milestone (#04) should focus on UI** - backend is complete, issues correctly target openbadges-ui
2. **Baking issues (#115-120) are COMPLETE** - all closed, service fully integrated with E2E tests
3. **Self-Signed (#03) is accurately scoped** - truly greenfield work
4. **Badge Generator (#02) is accurately scoped** - no code exists

### "Dark Matter" Code

Code that exists but isn't fully connected:

| Code             | Location                | Status                          |
| ---------------- | ----------------------- | ------------------------------- |
| Backpack backend | `src/domains/backpack/` | ⚠️ Orphaned - no UI consumes it |

**Note:** Baking was initially flagged as "dark matter" but investigation revealed it IS wired via CredentialsController. The code graph query for `createBakingService` missed this because the integration uses a different code path.

**Lesson:** Code graph queries should check multiple entry points, not just direct function calls.

---

## Issues by Milestone

### 03 - Self-Signed Badges (4 issues)

The differentiating feature per VISION.md.

| #   | Title                                          | Labels                                    | Notes                                 |
| --- | ---------------------------------------------- | ----------------------------------------- | ------------------------------------- |
| #83 | Support self-signed badge workflow             | priority:high, order:3, dep:blocked       | Depends on #84, #85                   |
| #84 | Add verifiable credential proof to badges      | priority:high, order:2, dep:blocked       | Depends on #85                        |
| #85 | Implement DID support in backend               | priority:high, order:1, dep:foundation    | Foundation - start here               |
| #87 | Refactor badge creation into multi-step wizard | priority:medium, order:1, dep:independent | **OVERLAPS with #526 BadgeDesigner?** |

**Observations:**

- Clear dependency chain: #85 (DID) -> #84 (proofs) -> #83 (workflow)
- #87 (multi-step wizard) is labeled `dep:independent` - could start now
- #87 overlaps conceptually with Issuer Model UI BadgeDesigner work

---

### 04 - Badge Backpack (7 issues)

Personal badge collection interface.

| #   | Title                          | Labels                | Notes                 |
| --- | ------------------------------ | --------------------- | --------------------- |
| #66 | BackpackToolbar.vue            | pkg:openbadges-ui     | Collection actions    |
| #67 | BackpackStats.vue              | pkg:openbadges-ui     | Collection statistics |
| #68 | BackpackFilters.vue            | pkg:openbadges-ui     | Collection filtering  |
| #70 | IssuedBadgesView.vue           | pkg:openbadges-ui     | /badges/issued route  |
| #74 | AssertionsTable.vue            | pkg:openbadges-ui     | Badge management      |
| #75 | BadgeDisplay flexibility       | pkg:openbadges-ui     | Accept flexible data  |
| #89 | Implement basic badge backpack | app:openbadges-system | Main feature          |

**Observations:**

- Mostly openbadges-ui components
- #89 is the orchestrating feature in openbadges-system
- Could run in parallel with Issuer Model UI (different focus: viewing vs creating)

**Code Graph Reality:**

- ✅ **Backend is COMPLETE** - `BackpackController`, `BackpackService`, repositories all exist (42 entities)
- ❌ **No UI exists** - `BackpackView` component not found
- Issues correctly target UI work - the backend is done
- Client services exist in openbadges-system (`getUserBackpack`, `addBadgeToBackpack`, etc.)

---

### 05 - Core Services (12 issues)

Baking, verification, and API key management.

| #    | Title                              | Labels                | Notes               |
| ---- | ---------------------------------- | --------------------- | ------------------- |
| #58  | Maximum OB Protocol Conformance    | pkg:openbadges-types  | OB2 & OB3 spec work |
| #88  | Add OB2 badge verification service | app:openbadges-system | Verification        |
| #91  | OpenBadges Conformance Suite       | app:openbadges-server | Validation          |
| #92  | Production Security & Performance  | app:openbadges-server | Hardening           |
| #93  | Credential Refresh Service         | app:openbadges-server | Refresh             |
| #94  | Service Discovery Enhancement      | app:openbadges-server | Discovery           |
| #95  | JSON Schema Validation Engine      | app:openbadges-server | Validation          |
| #96  | OAuth 2.0 Authorization Server     | app:openbadges-server | Auth                |
| #164 | SQLite API Key repository          | app:openbadges-server | API keys            |
| #165 | PostgreSQL API Key repository      | app:openbadges-server | API keys            |
| #166 | Integrate ApiKeyRepository         | app:openbadges-server | API keys            |
| #167 | API key management endpoints       | app:openbadges-server | API keys            |

**Observations:**

- Heavy server-side work
- API key management (#164-167) is a clear sub-group
- #91 (Conformance Suite) is key for validation
- Some issues are quite large (#92, #96)

**Code Graph Reality:**

- ✅ **Baking: COMPLETE** - `POST /v3/credentials/:id/bake` endpoint exists with E2E tests (issues #115-120 closed)
- ✅ **Verification: Functional** - `VerificationController` connected to `api.router.ts`
- Only missing: dedicated unbake endpoint (now tracked in #535)
- **Note:** Initial code graph query missed integration - baking uses CredentialsController, not direct function calls

---

### 07 - OB3 Phase 2: UI Layer (7 issues)

UI components handling OB3 correctly.

| #    | Title                                  | Labels                | Notes        |
| ---- | -------------------------------------- | --------------------- | ------------ |
| #152 | OB3 spec compliance test coverage      | app:openbadges-server | Server tests |
| #154 | BadgeClassCard OB3 Achievement arrays  | pkg:openbadges-ui     | UI fix       |
| #155 | OB3 VerifiableCredential test coverage | pkg:openbadges-ui     | UI tests     |
| #158 | Validate OB3 @context array format     | pkg:openbadges-ui     | Validation   |
| #159 | BadgeIssuerForm OB3 Achievement fields | app:openbadges-system | System fix   |
| #163 | OB3 badge creation/issuance tests      | app:openbadges-system | System tests |
| #61  | Enhanced Schema Validation             | pkg:openbadges-types  | Types        |

**Observations:**

- Mix of UI, system, and types work
- #159 (BadgeIssuerForm OB3 fields) - this form is being deprecated in #534
- Should #159 be closed/moved if we're replacing BadgeIssuerForm?

---

### 08 - OB3 Phase 3: Quality (3 issues)

Final OB3 polish.

| #    | Title                                  | Labels            | Notes         |
| ---- | -------------------------------------- | ----------------- | ------------- |
| #153 | OB3 validFrom/validUntil test coverage | pkg:openbadges-ui | Tests         |
| #156 | Export typeIncludes() type guard       | pkg:openbadges-ui | API fix       |
| #157 | ARIA labels for OB3 credentialSubject  | pkg:openbadges-ui | Accessibility |

**Observations:**

- Small, focused issues
- Could be merged into Phase 2 or moved to UI Components

---

### 09 - UI Components (15 issues)

Display-focused components.

| #   | Title                                  | Labels                | Notes                |
| --- | -------------------------------------- | --------------------- | -------------------- |
| #62 | BadgeMetadataPanel.vue                 | pkg:openbadges-ui     | Metadata display     |
| #63 | BadgeDetailView.vue                    | pkg:openbadges-ui     | Detail views         |
| #64 | VerificationResultCard.vue             | pkg:openbadges-ui     | Verification display |
| #65 | BadgeVerifyView.vue                    | pkg:openbadges-ui     | Standalone verify    |
| #71 | AssertionDetailDrawer.vue              | pkg:openbadges-ui     | Assertion details    |
| #72 | BatchOperationsBar.vue                 | pkg:openbadges-ui     | Bulk actions         |
| #73 | IssuedBadgesFilters.vue                | pkg:openbadges-ui     | Filtering            |
| #76 | Complete Histoire Documentation        | pkg:openbadges-ui     | Docs                 |
| #77 | Prepare v0.1.0 Release                 | pkg:openbadges-ui     | Release              |
| #78 | Complete Neurodiversity Implementation | pkg:openbadges-ui     | A11y                 |
| #79 | Enhance BadgeList.vue neurodiversity   | pkg:openbadges-ui     | A11y                 |
| #80 | JSON viewer for assertions             | app:openbadges-system | Dev tool             |
| #81 | Contextual help tooltips               | app:openbadges-system | Help                 |
| #82 | OB2/OB3 comparison page                | app:openbadges-system | Docs                 |
| #86 | Consistent visual hierarchy            | app:openbadges-system | Styling              |

**Observations:**

- Mostly DISPLAY components (viewing badges)
- Clear separation from Issuer Model UI (CREATION components)
- Could rename to "Display Components" for clarity

---

### 12 - Issuer Model UI (13 issues) - NEW

Creation and management primitives.

| #    | Title                     | Labels          | Notes               |
| ---- | ------------------------- | --------------- | ------------------- |
| #522 | IssuerSelector            | priority:high   | Personal/org picker |
| #523 | EvidenceSettings          | priority:high   | Evidence config     |
| #524 | ApprovalMethodPicker      | priority:high   | Self/review/claim   |
| #525 | BadgePreviewCard          | priority:high   | Preview thumbnail   |
| #526 | BadgeDesigner             | priority:high   | **Similar to #87?** |
| #527 | ShapeSelector             | priority:high   | Template shapes     |
| #528 | ColorPicker               | priority:high   | Color swatches      |
| #529 | ImageUploader             | priority:high   | Upload area         |
| #530 | ApplicationCard           | priority:medium | Review queue        |
| #531 | MembersTable              | priority:medium | Org members         |
| #532 | RoleBadge                 | priority:medium | Role indicator      |
| #533 | StatusBadge               | priority:medium | Status indicator    |
| #534 | Deprecate BadgeIssuerForm | priority:medium | Cleanup             |

**Observations:**

- All CREATION/MANAGEMENT focused
- #526 (BadgeDesigner) potentially overlaps with #87 (multi-step wizard)
- #534 deprecates BadgeIssuerForm, but #159 adds OB3 fields to it - conflict?

---

### Unmilestoned Issues of Note

| #        | Title                              | Labels                     | Notes               |
| -------- | ---------------------------------- | -------------------------- | ------------------- |
| #224     | openbadges-ui path aliases         | bug                        | **Blocking build?** |
| #227     | openbadges-ui type errors in Vue   | bug                        | **Blocking build?** |
| #228     | openbadges-ui type errors in tests | bug                        | **Blocking tests?** |
| #251     | detectBadgeVersion array logic     | bug, app:openbadges-server | Bug fix             |
| #273     | Test infrastructure conflict       | bug, app:openbadges-system | Vitest/Bun conflict |
| #445     | E2E tests fail SQLite migrations   | bug, app:openbadges-server | Test fix            |
| #496     | Badge Generator review             | ob3-compliance             | Review needed       |
| #100-104 | Badge generator features           | -                          | No milestone!       |

**Critical:** #224, #227, #228 are build/type issues that may block other openbadges-ui work.

---

## Identified Conflicts & Overlaps

### 1. #87 vs #526 - Badge Creation Wizard/Designer

**#87 (Self-Signed milestone):** "Refactor badge creation into multi-step wizard"
**#526 (Issuer Model UI):** "BadgeDesigner component"

These seem to be the same thing. Options:

- [ ] Close #87 as duplicate of #526
- [ ] Merge #87 into #526 with additional context
- [ ] Keep both - #87 is about the flow, #526 is about the component

### 2. #159 vs #534 - BadgeIssuerForm fate

**#159 (OB3 Phase 2):** "BadgeIssuerForm missing OB3 Achievement fields"
**#534 (Issuer Model UI):** "Deprecate BadgeIssuerForm"

If we're deprecating BadgeIssuerForm, should we still add OB3 fields to it?

- [ ] Close #159 - don't invest in deprecated component
- [ ] Keep #159 - maintain old form until new primitives ready
- [ ] Combine - #159 becomes "minimal OB3 support before deprecation"

### 3. UI Components Split

Currently:

- **09 - UI Components:** Display components (viewing)
- **12 - Issuer Model UI:** Creation components (creating)

Consider renaming for clarity:

- 09 -> "Display Components" or "Badge Viewing UI"
- 12 -> "Creation Components" or "Badge Creation UI"

---

## Dependency Analysis

### What blocks what?

```
OB3 Phase 1 (DONE)
    │
    ├── OB3 Phase 2 (#07)
    │       │
    │       ├── OB3 Phase 3 (#08)
    │       │
    │       ├── Issuer Model UI (#12)
    │       │       │
    │       │       └── Badge Generator UI (uses primitives)
    │       │
    │       └── Display Components (#09)
    │               │
    │               └── Badge Backpack (#04)
    │
    ├── Core Services (#05)
    │       │
    │       └── Self-Signed Badges (#03)
    │               │
    │               └── (needs DID, proofs, then workflow)
    │
    └── Infrastructure (#10) - parallel track
```

### Self-Signed Badges Dependencies

Per labels on issues:

1. #85 (DID support) - `dep:foundation` - START HERE
2. #84 (proofs) - `dep:blocked` by #85
3. #83 (workflow) - `dep:blocked` by #84
4. #87 (wizard) - `dep:independent` - can start anytime

The wizard (#87) doesn't depend on crypto - it's just UI refactoring.

---

## Proposed Changes

### Option A: Minimal Changes

1. Merge #87 into #526 (avoid duplicate wizard work)
2. Close #159 (don't add OB3 to deprecated form)
3. Add #224, #227, #228 to milestone 10 (Infrastructure) as blocking bugs
4. Keep milestones as-is otherwise

### Option B: Reorganize UI Milestones

1. Rename milestones:
   - 09 -> "Badge Display UI"
   - 12 -> "Badge Creation UI"
2. Move #87 from Self-Signed to Badge Creation UI
3. Merge OB3 Phase 3 (#08) into Phase 2 (#07) - only 3 issues
4. Close #159

### Option C: Consolidate Further

1. Merge 09 + 12 into single "UI Components" milestone
2. Sub-categorize within milestone (display vs creation)
3. Move #87 out of Self-Signed (it's UI, not crypto)
4. Focus Self-Signed purely on DID/proof/crypto work

---

## Questions for Discussion

1. **#87 vs #526:** Same thing? Different scope? Which milestone?

2. **BadgeIssuerForm:** Fix it (#159) or just deprecate it (#534)?

3. **OB3 Phase 3:** Merge into Phase 2? Only 3 small issues.

4. **Milestone naming:** Should UI milestones be clearer about display vs creation?

5. **Self-Signed scope:** Should #87 (wizard) move out since it's not crypto-related?

6. **Build blockers:** Should #224, #227, #228 be prioritized before other UI work?

---

## Recommendations (Based on Code Graph Analysis)

### Decisions

| Question              | Recommendation                  | Rationale                                                                                                                      |
| --------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **#87 vs #526**       | **Keep both**                   | #87 is the self-signing workflow wizard (needs crypto context). #526 is the visual badge editor (pure UI). Different purposes. |
| **#159 vs #534**      | **Close #159**                  | Don't invest in deprecated form. New Issuer Model UI creates OB3-native components from scratch.                               |
| **OB3 Phase 3**       | **Keep separate**               | Small issues, but provides clear completion signal. Merge only if velocity is blocked.                                         |
| **Self-Signed scope** | **Keep #87 in Self-Signed**     | The wizard flow depends on what data DIDs/proofs need. Can't design wizard without crypto context.                             |
| **Build blockers**    | **Prioritize #224, #227, #228** | Any new openbadges-ui work will hit same type/build issues. Fix once, unblock all.                                             |

### Proposed Action Items

1. [x] **Close #159** - Closed with note pointing to #534 as replacement path
2. [x] **Add #224, #227, #228 to Infrastructure milestone** - Added with blocking comments
3. [x] **Update Vision doc** - Backpack clarified as "UI needed", baking confirmed complete
4. [x] **Review baking issues (#115-120)** - All COMPLETE and closed
5. [x] **Create unbake endpoint issue** - #535 created for extracting credentials from baked images

### Dependency Chain (Validated)

```
Infrastructure (#03) - BLOCKING
    │
    └── OB3 Phase 2 (#04)
            │
            ├── OB3 Phase 3 (#05)
            │
            ├── Issuer Model UI (#06)
            │       │
            │       └── Badge Generator uses primitives
            │
            └── UI Components (#07)
                    │
                    └── Badge Backpack (#08) - backend DONE, UI needed

Core Services (#09) - API keys, verification polish

INDEPENDENT TRACKS (can run in parallel):
├── Self-Signed Badges (#10-i): #85 (DID) → #84 (proofs) → #83 (workflow)
├── Developer Experience (#11-i): rd-logger integration
└── Documentation (#12-i): Always welcome
```

---

## Raw Data

### Issues without milestone that might need one

| #                | Title                    | Suggested Milestone            |
| ---------------- | ------------------------ | ------------------------------ |
| #100-104         | Badge generator features | 02 - Badge Generator           |
| #224, #227, #228 | openbadges-ui bugs       | 10 - Infrastructure (blocking) |
| #251             | detectBadgeVersion bug   | 07 - OB3 Phase 2               |
| #273             | Test infrastructure      | 06 - Developer Experience      |
| #445             | E2E tests SQLite         | 06 - Developer Experience      |
| #496             | Badge Generator review   | 02 - Badge Generator           |

---

_This is a working document. Edit freely._
