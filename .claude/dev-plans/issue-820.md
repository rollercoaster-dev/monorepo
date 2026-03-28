# Development Plan: Issue #820

## Issue Summary

**Title**: refactor(openbadges-system): move auth token persistence to Kysely-backed data layer
**Type**: refactor
**Complexity**: MEDIUM
**Estimated Lines**: ~350 lines

## Dependencies

| Issue | Title                              | Status  | Type |
| ----- | ---------------------------------- | ------- | ---- |
| #788  | Refresh-token and OAuth fix        | Closed (prerequisite work this builds on) | Soft |

**Status**: All dependencies met — #788 is the prior work being refactored.

## Objective

Move `refresh_tokens` and `oauth_login_exchanges` table management from the legacy `bun:sqlite`
raw-SQL `UserService` class into the app's typed Kysely database layer
(`database/schema.ts`, `database/migrations/`, a new `database/repositories/` module).
The public auth behavior (cookie-backed refresh, one-time OAuth exchange, atomic token
rotation, bounded retry / reuse detection) must remain identical. The Kysely `DatabaseFactory`
singleton already exists and is used for migrations; it just needs new tables and query logic
wired on top of it.

## Affected Areas

- `apps/openbadges-system/database/schema.ts` — add `RefreshTokens` and `OAuthLoginExchanges` interfaces; update `DatabaseSchema`
- `apps/openbadges-system/database/migrations/007_create_auth_token_tables.sql` — new migration for the two tables and their indexes
- `apps/openbadges-system/database/repositories/refresh-token.repository.ts` — new Kysely-backed repository for `refresh_tokens`
- `apps/openbadges-system/database/repositories/oauth-login-exchange.repository.ts` — new Kysely-backed repository for `oauth_login_exchanges`
- `apps/openbadges-system/database/repositories/index.ts` — barrel export for repositories
- `apps/openbadges-system/src/server/services/refresh-token.ts` — remove dependency on `userService`; import new repository
- `apps/openbadges-system/src/server/routes/oauth.ts` — remove dependency on `userService` for login-exchange calls; import new repository
- `apps/openbadges-system/src/server/services/user.ts` — remove `refresh_tokens` and `oauth_login_exchanges` table creation, methods, and types that are migrated; keep the rest untouched
- `apps/openbadges-system/src/server/services/__tests__/refresh-token.test.ts` — update mocks to point at repository instead of userService
- (optional) `apps/openbadges-system/src/server/routes/__tests__/oauth.test.ts` — update exchange-endpoint mocks if needed

## Implementation Plan

### Step 1: Extend Kysely schema for auth token tables

**Files**: `apps/openbadges-system/database/schema.ts`

**Commit**: `refactor(openbadges-system): add RefreshTokens and OAuthLoginExchanges to Kysely schema`

**Changes**:

- Add `RefreshTokens` interface with columns: `id`, `user_id` (matches FK convention — use snake_case to match SQL), `token_hash`, `expires_at`, `revoked_at`, `revoked_reason`, `created_at`
- Add `OAuthLoginExchanges` interface with columns: `id`, `code`, `access_token`, `refresh_token`, `user_data`, `redirect_uri`, `created_at`, `expires_at`, `consumed_at`
- Add both to `DatabaseSchema` type as `refresh_tokens` and `oauth_login_exchanges`

Note on column naming: the existing Kysely tables use `snake_case` (matching SQL). The legacy `UserService` used `camelCase` column names (a `bun:sqlite` artifact). The repository layer will
expose camelCase TypeScript interfaces but map from snake_case SQL columns.

### Step 2: Add SQL migration for auth token tables

**Files**: `apps/openbadges-system/database/migrations/007_create_auth_token_tables.sql`

**Commit**: `refactor(openbadges-system): add migration 007 for refresh_tokens and oauth_login_exchanges`

**Changes**:

Create the migration file with:
- `refresh_tokens` table: `id TEXT PRIMARY KEY`, `user_id TEXT NOT NULL` (FK to users), `token_hash TEXT NOT NULL UNIQUE`, `expires_at TEXT NOT NULL`, `revoked_at TEXT`, `revoked_reason TEXT`, `created_at TEXT DEFAULT CURRENT_TIMESTAMP`, `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `oauth_login_exchanges` table: `id TEXT PRIMARY KEY`, `code TEXT NOT NULL UNIQUE`, `access_token TEXT NOT NULL`, `refresh_token TEXT NOT NULL`, `user_data TEXT NOT NULL`, `redirect_uri TEXT`, `created_at TEXT DEFAULT CURRENT_TIMESTAMP`, `expires_at TEXT NOT NULL`, `consumed_at TEXT`
- Indexes: `idx_refresh_tokens_user_id`, `idx_refresh_tokens_expires_at`, `idx_oauth_login_exchanges_code`, `idx_oauth_login_exchanges_expires_at`

The migration is additive — the legacy `UserService` tables in `data/users.sqlite` are a
different SQLite file entirely. These tables go into the Kysely-managed database file (`database/app.db`).

### Step 3: Create Kysely-backed refresh token repository

**Files**: `apps/openbadges-system/database/repositories/refresh-token.repository.ts`, `apps/openbadges-system/database/repositories/index.ts`

**Commit**: `refactor(openbadges-system): add Kysely refresh token repository`

**Changes**:

Create `RefreshTokenRepository` class backed by `getDatabaseInstance()`:

```ts
export interface RefreshToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  revokedAt: string | null
  revokedReason: RefreshTokenRevokeReason | null
  createdAt: string
}

export type RefreshTokenRevokeReason = 'rotated' | 'expired' | 'logout' | 'compromised'
```

Methods to implement (matching the existing `userService` surface used by `refresh-token.ts`):
- `store(userId, tokenHash, expiresAt): Promise<RefreshToken>`
- `findByHash(tokenHash): Promise<RefreshToken | null>`
- `consume(tokenHash, revokedReason): Promise<boolean>` — atomic UPDATE … RETURNING, returns true if row was updated
- `revoke(tokenHash, revokedReason): Promise<void>`
- `revokeAllForUser(userId, revokedReason): Promise<void>`
- `deleteExpired(): Promise<void>`

Use `getDatabaseInstance()` from `../../factory` (relative to `database/repositories/`).
Map snake_case DB columns to camelCase in a private `mapRow()` helper.

Create `database/repositories/index.ts` as a barrel export.

### Step 4: Create Kysely-backed OAuth login exchange repository

**Files**: `apps/openbadges-system/database/repositories/oauth-login-exchange.repository.ts`

**Commit**: `refactor(openbadges-system): add Kysely OAuth login exchange repository`

**Changes**:

Create `OAuthLoginExchangeRepository` class:

```ts
export interface OAuthLoginExchange {
  id: string
  code: string
  accessToken: string
  refreshToken: string
  userData: string
  redirectUri: string | null
  createdAt: string
  expiresAt: string
  consumedAt: string | null
}
```

Methods:
- `create(data: Omit<OAuthLoginExchange, 'id' | 'createdAt' | 'consumedAt'>): Promise<OAuthLoginExchange>`
- `consume(code: string): Promise<OAuthLoginExchange | null>` — atomic UPDATE SET consumed_at = now() WHERE code = ? AND consumed_at IS NULL AND expires_at >= now() RETURNING (simulate RETURNING with select-then-update for cross-DB compat if needed, but SQLite supports RETURNING)
- `deleteExpired(): Promise<void>`

Add export to `database/repositories/index.ts`.

### Step 5: Migrate refresh-token service to use repository

**Files**: `apps/openbadges-system/src/server/services/refresh-token.ts`

**Commit**: `refactor(openbadges-system): wire refresh-token service to Kysely repository`

**Changes**:

- Remove import of `userService` from `./user`
- Import `RefreshTokenRepository` from `../../../database/repositories`
- Instantiate `const refreshTokenRepository = new RefreshTokenRepository()` (module-level, lazy via `getDatabaseInstance`)
- Replace each `userService.*` call with the corresponding repository method:
  - `userService.storeRefreshToken(...)` → `refreshTokenRepository.store(...)`
  - `userService.getRefreshTokenByHash(...)` → `refreshTokenRepository.findByHash(...)`
  - `userService.consumeRefreshToken(...)` → `refreshTokenRepository.consume(...)`
  - `userService.revokeRefreshToken(...)` → `refreshTokenRepository.revoke(...)`
  - `userService.revokeAllUserRefreshTokens(...)` → `refreshTokenRepository.revokeAllForUser(...)`
  - `userService.cleanupExpiredRefreshTokens()` → `refreshTokenRepository.deleteExpired()`
- `getUserById` for token rotation still needs `userService` — keep that one import, or accept a `userId` lookup via a separate import. The simplest approach: keep `userService` imported solely for `getUserById`, document the remaining dependency clearly.

The `revokeRefreshToken` exported function already guards against `!userService` for best-effort
logout — replace that guard with a repository availability check or remove it (the Kysely
instance is always available after startup).

### Step 6: Migrate OAuth exchange calls in oauth route

**Files**: `apps/openbadges-system/src/server/routes/oauth.ts`

**Commit**: `refactor(openbadges-system): wire OAuth login exchange route to Kysely repository`

**Changes**:

In `oauth.ts`, the following calls on `userService` relate to the exchange table:
- `userService.cleanupExpiredOAuthLoginExchanges()`
- `userService.createOAuthLoginExchange(...)`
- `userService.consumeOAuthLoginExchange(...)`

Replace them with calls to `OAuthLoginExchangeRepository`:
- Import `OAuthLoginExchangeRepository` from `../../../database/repositories`
- Instantiate at module level
- Swap each `userService.*` call; remove the `if (!userService)` guards for exchange-only paths (repository is always available)
- Leave all other `userService` usage (OAuth provider management, user lookup) unchanged

### Step 7: Remove migrated code from UserService

**Files**: `apps/openbadges-system/src/server/services/user.ts`

**Commit**: `refactor(openbadges-system): remove auth token table management from UserService`

**Changes**:

- In `initializeDatabase()`: remove the `CREATE TABLE IF NOT EXISTS refresh_tokens` block, the `ALTER TABLE refresh_tokens ADD COLUMN revokedReason` migration, and the `CREATE TABLE IF NOT EXISTS oauth_login_exchanges` block
- In the index-creation block: remove `idx_oauth_login_exchanges_code`, `idx_oauth_login_exchanges_expiresAt`, `idx_refresh_tokens_userId`, `idx_refresh_tokens_expiresAt`
- Remove the entire set of methods: `storeRefreshToken`, `getRefreshTokenByHash`, `consumeRefreshToken`, `revokeRefreshToken`, `revokeAllUserRefreshTokens`, `cleanupExpiredRefreshTokens`, `createOAuthLoginExchange`, `consumeOAuthLoginExchange`, `cleanupExpiredOAuthLoginExchanges`
- Remove the exported types `RefreshToken`, `RefreshTokenRevokeReason`, `OAuthLoginExchange` (they are now owned by the repository modules)
- Do not remove `OAuthSession`, `OAuthProvider`, or any user/credential methods — those remain on `UserService`

### Step 8: Update tests

**Files**: `apps/openbadges-system/src/server/services/__tests__/refresh-token.test.ts`, `apps/openbadges-system/src/server/routes/__tests__/oauth.test.ts`

**Commit**: `test(openbadges-system): update refresh-token and oauth exchange tests for repository`

**Changes**:

In `refresh-token.test.ts`:
- Replace `vi.mock('../user', ...)` mock surface for refresh-token methods with a mock for the repository module (`../../../database/repositories` or adjust relative path)
- The mock object shape remains the same (same method names: `store`, `findByHash`, `consume`, `revoke`, `revokeAllForUser`, `deleteExpired`) — update test call assertions to match new names
- Keep `userService` mock for `getUserById` (still used by `rotateRefreshToken`)

In `oauth.test.ts`:
- Update the `vi.mock('../../services/user', ...)` mock to remove exchange methods
- Add a mock for the `OAuthLoginExchangeRepository` covering `create`, `consume`, `deleteExpired`

## Testing Strategy

- [ ] Unit tests for `RefreshTokenRepository` (can use an in-memory SQLite instance via `better-sqlite3` — follow existing test patterns)
- [ ] Unit tests for `OAuthLoginExchangeRepository`
- [ ] Existing `refresh-token.test.ts` updated to mock repository — all behavior assertions remain the same
- [ ] Existing `oauth.test.ts` exchange-endpoint tests updated — behavior assertions remain the same
- [ ] Run `bun run test:server` to confirm no regressions
- [ ] Run `bun run type-check` to confirm strict TypeScript passes

## Definition of Done

- [ ] `database/schema.ts` has `RefreshTokens` and `OAuthLoginExchanges` interfaces in `DatabaseSchema`
- [ ] Migration `007_create_auth_token_tables.sql` runs cleanly
- [ ] `database/repositories/refresh-token.repository.ts` and `oauth-login-exchange.repository.ts` exist and are fully typed
- [ ] `refresh-token.ts` service no longer calls `userService` methods for token storage
- [ ] `oauth.ts` route no longer calls `userService` for login-exchange operations
- [ ] `UserService` no longer creates or queries `refresh_tokens` or `oauth_login_exchanges` tables
- [ ] All existing behavioral tests pass
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes

## Notes

### Two SQLite databases

The legacy `UserService` opens `data/users.sqlite` (a file it manages itself). The Kysely factory
opens `database/app.db`. These are two separate databases currently coexisting. After this
refactor:
- `data/users.sqlite` continues to hold users, credentials, oauth_providers, oauth_sessions
- `database/app.db` now holds refresh_tokens and oauth_login_exchanges (via migration 007)

This is intentional and consistent with the issue scope ("avoid turning this into a full rewrite
of all user persistence"). A future issue can migrate the remaining tables.

### RETURNING clause

SQLite supports `RETURNING` since version 3.35 (2021). The existing `UserService` uses it
(see `consumeRefreshToken` and `consumeOAuthLoginExchange`). Kysely's `SQLiteDialect` supports
`.returning()` — use it for the atomic consume operations.

### No behavior changes

The `rotateRefreshToken` logic in `refresh-token.ts` — including the 5-second grace window for
in-flight rotation race conditions — must not change. Only the persistence layer changes.

### Migration gap

Migrations `002–005` do not appear in the directory. The numbering gap already exists (001, 006).
Using `007` as the next migration number is correct.
