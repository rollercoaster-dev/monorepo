### API Authentication & Authorization

All protected endpoints require an `Authorization: Bearer <token>` header. Tokens are RS256-signed and verified with the server public key.

Middleware behaviors:

- requireAuth: 401 if missing/invalid token
- requireAdmin: 403 if not admin
- requireSelfOrAdminFromParam(param): 403 unless `JWT.sub === req.params[param]` or admin

Protected routes overview:

- Users
  - GET `/api/bs/users`: admin only
  - GET `/api/bs/users/:id`: self or admin
  - POST `/api/bs/users`: admin only
  - PUT `/api/bs/users/:id`: self or admin
  - DELETE `/api/bs/users/:id`: admin only
  - Credentials endpoints under `/api/bs/users/:id/credentials*`: self or admin
- Auth
  - POST `/api/auth/oauth-token` (auth required)
  - POST `/api/auth/oauth-token/refresh` (auth required)
  - POST `/api/auth/sync-user` (auth required)
  - GET `/api/auth/badge-server-profile/:userId` (auth required)

Proxy gating:

- `/api/bs/*` requires auth by default.
- Set `OPENBADGES_PROXY_PUBLIC=true` to allow public access (dev/testing only).

Environment variables:

- `PLATFORM_JWT_PRIVATE_KEY` / `PLATFORM_JWT_PUBLIC_KEY` (PEM or base64 via `*_B64`)
- `OPENBADGES_SERVER_URL`, `OPENBADGES_PROXY_PUBLIC`
