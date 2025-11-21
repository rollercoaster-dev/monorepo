# Task Breakdown: Issue #26 – Implement OB2 Badge Creation and Issuance

Issue: #26 “Implement badge creation and issuance (OB2)”
Branch: feat/26-ob2-badge-creation-issuance
Owner: TBD

Status legend:

- [ ] Not started
- [ ] In progress
- [x] Complete

---

## 0) Scope and Objectives

Enable creation of OB2-compliant BadgeClass objects and issuance of Assertions supporting key OB2 fields (criteria, evidence, alignment). Ensure artifacts validate against OB2 spec and are stored and retrievable.

Acceptance Criteria (from issue):

- [ ] Users can create and issue badges to recipients
- [ ] Generated badges validate against OB2 spec
- [ ] All OB2 fields supported (criteria, evidence, alignment)
- [ ] Badge creation form includes validation
- [ ] Issued badges are properly stored and retrievable

---

## 1) Architecture references (existing)

- Client service: src/client/services/openbadges.ts (createBadgeClass, getBadgeClasses, issueBadge)
- Create UI: src/client/pages/badges/create.vue (criteria and alignment controls, issuer selection)
- Public badge routes (proxy): src/server/routes/badges.ts (verify, assertions, badge-classes)
- Tests:
  - Client: src/client/services/**tests**/openbadges.test.ts
  - Server endpoints: src/server/**tests**/endpoints.test.ts
- Docs: docs/MILESTONES.md, docs/backend-architecture-inventory.md

Endpoints used (externally proxied/consumed):

- Authenticated badge server base: `VITE_BADGE_SERVER_URL` (default `http://localhost:3000`)
  - POST /api/v2/badge-classes (create)
  - GET /api/v2/badge-classes (list)
  - POST /api/v2/assertions (issue)
  - GET /api/v1/assertions (backpack & single‐assertion retrieval)

# Note: assertion retrieval remains on v1; v2 is used for create/issue endpoints.

- Public verification proxy: POST /api/badges/verify (for spec validation)

---

## 2) Phases and Tasks

### Phase A: Backend API readiness and validation

Goal: Ensure server-side integration supports spec-compliant payloads and verification.

- [x] A1. OB2 payload schema validation (server side)
  - Deliverables:
    - JSON schema or validator for OB2 BadgeClass (including criteria.narrative, optional criteria.id URL, alignment[])
    - JSON schema or validator for Assertion issuance (recipient email, evidence URL(s)/narrative, optional expires)
    - Validation middleware returning structured errors (code, details)
  - Acceptance:
    - Invalid payloads return 400 with clear messages
    - Valid payloads pass through unchanged
  - Links: src/server/routes/badges.ts (or new middleware module under src/server/middleware/)

- [x] A2. Verification integration for QA
  - Deliverables:
    - Helper to call POST /api/badges/verify in tests after creation/issuance
  - Acceptance:
    - Issued assertions verify as valid in test suite
  - Links: src/server/**tests**/endpoints.test.ts (extend); src/client/services/**tests**/openbadges.test.ts (extend)

- [x] A3. Storage/retrieval confirmation
  - Deliverables:
    - Confirm GET /api/v1/assertions (backpack) returns issued badges for the authenticated user
    - Add server test covering retrieval of an issued badge/assertion
  - Acceptance:
    - After issuance in tests, retrieval endpoint returns assertion
  - Links: src/server/**tests**/endpoints.test.ts

Dependencies: A1 → A2 → A3

### Phase B: Frontend UI for Badge Creation

Goal: Complete accessible, validated form covering OB2 fields.

- [x] B1. Criteria fields
  - Deliverables:
    - Criteria narrative (required)
    - Optional criteria URL mapped to criteria.id (OB2 IRI)
  - Acceptance:
    - Narrative required with min length; URL, if present, is valid IRI
  - Links: src/client/pages/badges/create.vue

- [x] B2. Alignment controls
  - Deliverables:
    - Add/remove alignment items with fields: targetName, targetUrl (IRI), targetDescription (optional), targetFramework (optional)
    - Accessible controls with labels and keyboard support
  - Acceptance:
    - Cannot save with invalid alignment URLs; can add/remove items
  - Links: src/client/pages/badges/create.vue

- [x] B3. Issuer selection defaults
  - Deliverables:
    - Default issuer profile using current user (already scaffolded), ensure correct type/name/url
  - Acceptance:
    - Form initializes issuer; can be overridden if multiple issuers supported
  - Links: src/client/pages/badges/create.vue

- [x] B4. Submit handler wiring to createBadgeClass
  - Deliverables:
    - Map form model to OB2 BadgeClass object and call OpenBadgesService.createBadgeClass
  - Acceptance:
    - Successful creation shows confirmation and routes appropriately
  - Links: src/client/pages/badges/create.vue, src/client/services/openbadges.ts

Dependencies: A1 (server validation) → B1/B2/B3 → B4

### Phase C: Issuance Flow UI

Goal: Enable issuing a created BadgeClass to a recipient with evidence.

- [ ] C1. Issue form (or modal) for recipient
  - Deliverables:
    - Inputs: recipientEmail (required), evidence URL(s) (optional), narrative (optional), expires (optional)
  - Acceptance:
    - Validates email, IRI for evidence URLs
  - Links: New or existing page/component under src/client/pages/badges/ or components/

- [ ] C2. Wire to OpenBadgesService.issueBadge
  - Deliverables:
    - Call issueBadge with selected badgeClassId and form inputs
  - Acceptance:
    - Success feedback with link to assertion view (or copy of assertion id)
  - Links: src/client/services/openbadges.ts

- [ ] C3. Retrieval UX (basic)
  - Deliverables:
    - After issue, optionally fetch and display summary from GET /api/v1/assertions for confirmation
  - Acceptance:
    - Newly issued badge appears in retrieval results
  - Links: New or existing backpack fetch hook; src/client/services/openbadges.ts (getUserBackpack)

Dependencies: A3 → C1 → C2 → C3

### Phase D: Testing and Spec Compliance

Goal: Ensure coverage and OB2 validation end-to-end.

- [ ] D1. Client unit tests
  - Deliverables:
    - Tests for createBadgeClass mapping of criteria.id and alignment
    - Tests for issueBadge payload (recipient, evidence, narrative)
  - Acceptance:
    - Tests pass; payloads match OB2 shapes
  - Links: src/client/services/**tests**/openbadges.test.ts

- [ ] D2. Server endpoint tests
  - Deliverables:
    - Tests for public proxy endpoints already present (add cases as needed)
    - Tests that simulate verify call after issuance (mocked network)
  - Acceptance:
    - Verification returns valid for successful issuance
  - Links: src/server/**tests**/endpoints.test.ts

- [ ] D3. Validation tests (negative cases)
  - Deliverables:
    - Ensure invalid URLs, missing criteria narrative, invalid emails yield 400 with clear messages (server) and visible errors (client)
  - Acceptance:
    - Negative tests pass and messages are accessible (aria-describedby)
  - Links: server validation middleware; create.vue validation composables

Dependencies: D1 and D2 depend on Phases A–C tasks; D3 depends on A1 and B1/B2/C1

---

## 3) Dependencies (sequence overview)

1. A1 Schema validation → 2. A2 Verification integration → 3. A3 Retrieval confirmation
2. B1/B2/B3 Form fields → 5. B4 Create submit wiring
3. C1 Issue form → 7. C2 Issue wiring → 8. C3 Retrieval UX
4. D1/D2/D3 Test coverage and negative cases

---

## 4) Specific deliverables and acceptance criteria (summary)

- Backend validation: rejects bad payloads; passes valid OB2 objects; structured errors
- Verification: issued assertions validate via /api/badges/verify
- Storage/retrieval: issuance is observable via GET /api/v1/assertions
- UI: accessible form with criteria, alignment, issuer default; issuance flow
- Tests: client + server + negative cases; all green in CI

---

## 5) Links to files/components to modify

- Server
  - src/server/routes/badges.ts (may add validation or split middleware)
  - New: src/server/middleware/ob2Validation.ts (if adding)
  - Tests: src/server/**tests**/endpoints.test.ts
- Client
  - src/client/pages/badges/create.vue
  - New issuance UI: src/client/pages/badges/[id]/issue.vue (or component)
  - Services: src/client/services/openbadges.ts (payload mapping/typing)
  - Tests: src/client/services/**tests**/openbadges.test.ts
- Docs
  - docs/MILESTONES.md (ensure alignment if needed)

---

## 6) Test coverage requirements

- Client service
  - createBadgeClass: criteria.id mapping, alignment array, issuer field
  - issueBadge: recipient, evidence, narrative, expires
- Client UI
  - Form validation rules; accessible error rendering; alignment add/remove
- Server
  - Validation middleware unit tests (valid/invalid)
  - Endpoint proxy tests (verify path happy path + failure)
- Integration
  - Flow: create → issue → verify → retrieve

---

## 7) Atomic commits strategy

Each bullet represents one atomic commit (or small set) with passing tests:

1. Add server OB2 validation middleware and tests (failing → implement → green)
2. Wire validation into routes (no behavior change for valid requests) + tests
3. Add verification helper and server tests invoking /api/badges/verify
4. Extend client service tests for createBadgeClass mapping (criteria/alignment)
5. Extend client service tests for issueBadge payload (evidence/narrative)
6. Complete create.vue criteria URL mapping and alignment UI; add validation
7. Implement issuance UI (form + wiring); add client tests
8. Add integration tests: create → issue → verify → retrieve (mocked network)
9. Docs update: checklist status + readme notes if needed

Note: Keep commits focused; update snapshots and CI as needed. Do not install packages without explicit approval; prefer existing openbadges-types and internal validation. If a validator lib is required, use the package manager (no direct file edits) and isolate in one commit.

---

## 8) Progress Checklist (track during development)

- [x] A1 Server validation middleware implemented + tests
- [x] A2 Verification integration in tests
- [x] A3 Retrieval tests after issuance
- [x] B1 Criteria narrative/URL in form + validation
- [x] B2 Alignment add/remove + validation (cleaned up duplicate components)
- [ ] B3 Issuer default correctness
- [ ] B4 Create submit wiring to service
- [ ] C1 Issuance form UI
- [ ] C2 Issue wiring to service
- [ ] C3 Post-issue retrieval UX
- [x] D1 Client unit tests extended (comprehensive create.test.ts)
- [ ] D2 Server endpoint tests extended
- [ ] D3 Negative validation tests (server + client)

---

## 9) Notes and risks

- Ensure VITE_BADGE_SERVER_URL and OPENBADGES_SERVER_URL are set in dev environments
- Public verify proxy returns JSON when underlying service does; handle non-JSON gracefully (already in badges.ts)
- Accessibility: ensure labels, aria-describedby for errors, and keyboard navigation in dynamic lists (alignment)
- If remote badge server behavior differs, adjust tests with appropriate mocks
