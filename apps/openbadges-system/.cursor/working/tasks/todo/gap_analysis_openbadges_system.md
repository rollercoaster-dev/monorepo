# Gap Analysis and Task Plan — OpenBadges System

## Progress

- PR #3 opened: feat(auth): add /api/auth/validate and verify platform token on badges proxy. All tests pass locally. Branch: `feature/real-jwt-auth-integration`.
- Completed: Real JWT auth integration (#6) merged via PR #3.
- Completed: Secure key management for platform JWT (#7) merged via PR #13.
- Completed: AuthN/AuthZ middleware (#30) merged via PR #15.

## Top priorities (P0)

- **Replace placeholder auth tokens**
  - Fix: Issue real JWTs from backend to client (`useAuth`) instead of `'backend-jwt-token-*'`
  - Add: `/api/auth/validate` to verify and refresh tokens; validate on init
  - Update: Client `useAuth.initializeAuth` to validate token on load
  - Branch: `fix/real-jwt-auth`
  - Est: 0.5–1 day

- **Harden key management for platform JWT**
  - Replace: FS key reads with env or KMS-backed loader; fail-safe boot check
  - Add: Rotation hooks + docs; avoid printing key errors/paths
  - Branch: `security/secure-key-management`
  - Est: 0.5 day

- **Input validation and error handling**
  - Add: Zod schemas for all request bodies (`users`, `auth`, `oauth`, `badges` proxies)
  - Centralize: Error responses and logging (no sensitive info)
  - Branch: `chore/add-zod-validation`
  - Est: 1 day

- **AuthN/AuthZ middleware** (Completed via PR #15)
  - Add: JWT verification middleware for protected routes; role checks for admin ops
  - Branch: `feature/auth-middleware`
  - Est: 0.5 day

## High priorities (P1)

- **OpenBadges 2.0 completeness checks**
  - Review: Client `openbadges.ts` endpoints vs target server API; align paths and error cases
  - Add: Public verify view flow and service method
  - Branch: `feature/ob2-alignment`
  - Est: 0.5–1 day

- **OAuth flows robustness**
  - Improve: State/PKCE storage integrity and expiry; replay detection
  - Add: Non-GitHub provider scaffolds with config gates
  - Handle: Token refresh for providers that support it
  - Branch: `improve/oauth-robustness`
  - Est: 1 day

- **Testing expansion and CI**
  - Unskip: `src/server/__tests__/endpoints.test.ts` and stabilize server import/mocks
  - Add: Unit tests for `routes/users.ts`, `routes/auth.ts`, `routes/oauth.ts`
  - Add: Integration tests for proxy flows (`/api/badges`, `/api/bs`)
  - Configure: Coverage thresholds (>=80%); wire in CI job
  - Branch: `test/server-coverage`
  - Est: 1–1.5 days

## Medium priorities (P2)

- **Logging and observability**
  - Structure: JSON logs with request IDs; mask secrets
  - Add: Minimal metrics hooks (timings for proxy and DB ops)
  - Branch: `chore/structured-logging`
  - Est: 0.5 day

- **Configuration normalization**
  - Document: All env vars used by server and client
  - Provide: `.env.example` (no secrets)
  - Branch: `docs/config-hardening`
  - Est: 0.25 day

- **Database consistency**
  - Decide: Use Kysely or `bun:sqlite` consistently; remove unused `database/` Kysely schema if not used, or migrate services to it
  - Branch: `chore/db-layer-consolidation`
  - Est: 0.5–1 day

- **API docs**
  - Add: Minimal OpenAPI for server routes (`/api/auth`, `/api/bs/users`, `/api/oauth`, `/api/badges` proxy contract)
  - Branch: `docs/openapi-basics`
  - Est: 0.5 day

## CI fixes (PR #2)

- **YAML trailing spaces**: Clean up in `.github/ISSUE_TEMPLATE/*.yml` and workflows.
  - Branch: `chore/ci-yamllint-fixes`
- **actionlint event**: Fix invalid `pull_request` event type `merged` in `issue-management.yml`.
  - Branch: `fix/actionlint-events`
- **Security scan job**: Add checkout + pnpm install steps; ensure correct file paths.
  - Branch: `ci/security-scan-job-fix`
- **markdownlint**: Add language specifiers to fenced code blocks; convert emphasized headings to proper headings.
  - Branch: `docs/markdownlint-fixes`
- **Custom actions polish**: Add `branding`, `permissions`, default inputs, and package metadata (`private`, `license`, `engines`).
  - Branch: `chore/actions-metadata`
- **Shellcheck warnings**: Address unused vars in `scripts/setup-github-project.sh` or pass them through usage.
  - Branch: `chore/scripts-shellcheck`

## Future (Parking lot)

- **OpenBadges 3.0 planning**
  - Research: OB 3.0 VC issuance/verification (Ed25519/EdDSA), JSON-LD/VC data model, key binding to issuer
  - Plan: Service boundaries for signing and verification; revocation/expiration checks
  - Branch: `research/ob3-planning`
  - Est: 1–2 days research

- **Badge Connect / interoperability**
  - Explore: External validator integration; federated backpack
  - Branch: `feature/badge-connect-exploration`
  - Est: Research first

---

# Detailed gap list

- **Token placeholders in client**
  - Files: `src/client/composables/useAuth.ts` (token assignment and init validation TODOs)
  - Impact: Users are “authenticated” without server verification

- **JWT key handling**
  - Files: `src/server/services/jwt.ts` (reads from `keys/` on FS, logs errors)
  - Risk: Key exposure via logs, dev-only key path assumptions, no rotation

- **Missing validation**
  - Files: `src/server/routes/*.ts` lack body/query validation; `userService` trusts input
  - Action: Introduce Zod schemas per route; sanitize and bound pagination

- **Authorization gaps**
  - Admin-only actions not enforced consistently; no middleware

- **Test gaps**
  - Server endpoint tests are skipped; users, oauth, and proxy routes lack coverage
  - OB client tests present and good baseline; extend to error edge cases already scaffolded

- **DB layer duplication**
  - `database/` Kysely schema + migrations unused by runtime services (which use `bun:sqlite` directly)

- **Logging**
  - Mixed console logs; lacks structured logging and correlation IDs

- **Docs**
  - README is basic; env/config and API docs missing; security practices not reflected in code

- **CI**
  - CI guidance exists in docs; ensure actual workflow enforces lint, type-check, test, coverage

- **OpenBadges 3.0**
  - No issuance/verification; only OB2-style interactions via external server proxy

---

# Branch mini-plans

## fix/real-jwt-auth

- Add server login endpoint issuing RS256 JWT; verify middleware
- Update `useAuth` to use real token on register/login and validate on init
- Tests: unit (jwt), integration (auth flow), client composable

## security/secure-key-management

- Load keys via env/base64 or KMS adapter; remove raw FS dependency by default
- Masked logging; rotation support hooks; docs
- Tests: constructor with missing keys, rotation path

## chore/add-zod-validation

- Define schemas: Create/Update User, Credential add/remove, Auth payloads, OAuth callbacks
- Add validation in routes; map validation errors to 400
- Tests: happy/invalid cases per route

## feature/auth-middleware

- Create `requireAuth` and `requireRole('ADMIN')`; apply to protected endpoints
- Tests: role denial/allowance

## test/server-coverage

- Unskip endpoint tests; add users/oauth/badges proxy tests; set coverage >=80%

## chore/db-layer-consolidation

- Decide Kysely vs direct sqlite; implement single approach and remove the other

## docs/openapi-basics

- Write OpenAPI 3.0 for server routes; publish JSON via `/api/docs`

## feature/ob2-alignment

- Cross-check OB2 endpoints used; add public verify page/service

## research/ob3-planning

- Draft design for OB3 VC signing/verification, keys, and revocation

## Frontend gaps and tasks

- **Auth token wiring (client)**
  - Replace placeholder tokens in `useAuth` with real backend JWT; validate on load; handle 401 global
  - Add route guards for auth/admin where needed
  - Branch: `fix/frontend-auth-integration`
  - Est: 0.5 day

- **Backpack page completeness**
  - Implement share, download, export actions; persist layouts/filters; real verification status
  - Integrate `openbadges.ts` for fetching images/details for IRI badges
  - Branch: `feature/backpack-enhancements`
  - Est: 0.5–1 day

- **Badge verify flow UI**
  - Implement `pages/verify/[id].vue`: fetch assertion, show validity, issuer, signature state
  - Reuse `openbadges-ui` verification display if available; else minimal renderer
  - Branch: `feature/verify-ui`
  - Est: 0.5 day

- **Badge directory and details**
  - Implement listing, filtering, and detail fetch in `badges/index.vue` and `badges/[id]/index.vue`
  - Wire to `useBadges.fetchBadges/getBadgeById`
  - Branch: `feature/badge-directory`
  - Est: 0.5 day

- **Badge create/issue UX**
  - Finish edit/assertion detail modals in `admin/badges.vue`; handle revoke confirmations
  - Improve image upload error states; persist draft form
  - Branch: `improve/badge-create-issue-ux`
  - Est: 0.5–1 day

- **OAuth UI polish**
  - Add provider linking management UI in profile; handle unlink and errors
  - Add callback page parsing and success/failure messaging
  - Branch: `improve/oauth-ui`
  - Est: 0.5 day

- **Global error/loading UX**
  - Central toast system; loading overlays; empty states consistent
  - Branch: `chore/ui-feedback`
  - Est: 0.25 day

- **E2E-like integration tests (frontend)**
  - Add component tests for `useBadges`, `useOAuth`, key pages (backpack, admin badges, create)
  - Branch: `test/frontend-coverage`
  - Est: 1 day
