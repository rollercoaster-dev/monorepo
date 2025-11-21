# Task: AuthN/AuthZ Middleware

- Priority: P0
- Branch: `feature/auth-middleware`
- Estimate: 0.5 day

## Goal

Add JWT-based authentication and role-based authorization middleware. Protect server routes; enforce admin checks for privileged operations.

## Scope

- Create `src/server/middleware/auth.ts` with:
  - `requireAuth`: verifies RS256 JWT via `jwtService.verifyToken`, attaches payload to context (e.g., `c.set('auth', payload)`)
  - `requireAdmin`: ensures `payload.metadata?.isAdmin === true`
  - `requireSelfOrAdminFromParam(paramName: string)`: ensures `payload.sub === param` or admin
- Apply middleware to routes:
  - `src/server/routes/users.ts`:
    - GET `/`: `requireAdmin` (implemented)
    - GET `/:id`: `requireSelfOrAdminFromParam('id')` (implemented)
    - POST `/`: `requireAdmin` (implemented)
    - PUT `/:id`: `requireSelfOrAdminFromParam('id')` (implemented)
    - DELETE `/:id`: `requireAdmin` (implemented)
    - Credentials endpoints: `requireSelfOrAdminFromParam('id')` (implemented)
  - `src/server/routes/auth.ts`:
    - `/oauth-token`, `/oauth-token/refresh`: `requireAuth` (implemented)
    - `/sync-user`: `requireAuth` (implemented)
    - `/badge-server-profile/:userId`: `requireAuth` + `requireSelfOrAdminFromParam('userId')` (implemented)
  - `src/server/index.ts` proxy `/api/bs/*`:
    - Gate with `requireAuth` (optional toggle via `OPENBADGES_PROXY_PUBLIC=true`), default to require auth (implemented)
- Standardize 401/403 responses from middleware (no sensitive info).

## Tests

- Unit tests for middleware logic (valid, missing, malformed, expired tokens; admin vs non-admin)
- Integration tests for protected routes:
  - Users routes: admin allowed; non-admin denied; self credential ops allowed
  - Auth routes: general authentication required; self-or-admin applies to user-specific routes (e.g., /users/:id, /auth/badge-server-profile/:userId)
  - Proxy gate: unauthorized access gets 401 if enabled

## Progress

- Implemented middleware in `src/server/middleware/auth.ts` with `requireAuth`, `requireAdmin`, `requireSelfOrAdminFromParam`
- Wired protections into `users` and `auth` routes; gated `/api/bs/*` proxy by default
- Added unit tests: `src/server/middleware/__tests__/auth.test.ts` (9 tests, passing)
- All tests green locally (81 passed, 16 skipped)
- Merged PR #15: feat(auth): add JWT auth middleware; protect routes and proxy; add tests (2025-08-08)
  - URL: https://github.com/rollercoaster-dev/openbadges-system/pull/15

## Notes

- Tokens come from `Authorization: Bearer <token>`; reuse existing `jwtService` claims (uses `metadata.isAdmin`).
- Keep responses consistent with existing error JSON format.
