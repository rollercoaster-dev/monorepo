# Commit Checklist - Changed Files by Category

## Git Status Summary

- **Modified (M):** 46 files
- **Deleted (D):** 1 file
- **Untracked (??):** 3 files
- **Total:** 50 files

---

## 1. Documentation

- `OAUTH_INTEGRATION_PLAN.md` (M)
- `FRONTEND_COMPLETION_PLAN.md` (??)

## 2. Server user-sync service + tests

- `src/server/services/user.ts` (M)
- `src/server/services/userSync.ts` (??)
- `src/server/services/__tests__/userSync.test.ts` (??)

## 3. Front-end badge create/edit implementation

### Badge Management Pages

- `src/client/pages/badges/[id]/edit.vue` (M)
- `src/client/pages/badges/[id]/index.vue` (M)
- `src/client/pages/badges/[id]/issue.vue` (M)
- `src/client/pages/badges/create.vue` (M)
- `src/client/pages/badges/index.vue` (M)
- `src/client/pages/badges/issued.vue` (M)

### Admin Badge Management

- `src/client/pages/admin/badges.vue` (M)

### Issuer Management Pages

- `src/client/pages/issuers/[id]/badges.vue` (M)
- `src/client/pages/issuers/[id]/edit.vue` (M)
- `src/client/pages/issuers/[id]/index.vue` (M)
- `src/client/pages/issuers/create.vue` (M)
- `src/client/pages/issuers/index.vue` (M)
- `src/client/pages/issuers/manage.vue` (M)

### User/Profile Management

- `src/client/pages/auth/profile.vue` (M)
- `src/client/pages/backpack.vue` (M)
- `src/client/pages/backpack/[id].vue` (M)
- `src/client/pages/backpack/index.vue` (M)

### Authentication & OAuth

- `src/client/pages/auth/oauth/callback.vue` (M)
- `src/client/pages/verify/[id].vue` (M)

### Core Pages

- `src/client/pages/index.vue` (M)
- `src/client/pages/admin/index.vue` (M)
- `src/client/pages/admin/system.vue` (M)
- `src/client/pages/admin/users.vue` (M)

### Components

- `src/client/components/Auth/LoginForm.vue` (M)
- `src/client/components/Auth/OAuthProviderButton.vue` (M)
- `src/client/components/Auth/RegisterForm.vue` (M)
- `src/client/components/Navigation/MainNavigation.vue` (M)
- `src/client/components/User/UserCard.vue` (M)
- `src/client/components/User/UserForm.vue` (M)
- `src/client/components/User/UserList.vue` (M)
- `src/client/components/User/UserSearch.vue` (M)

### Layout & Services

- `src/client/layouts/DefaultLayout.vue` (M)
- `src/client/services/openbadges.ts` (M)
- `src/client/services/__tests__/openbadges.test.ts` (M)

### Server Routes

- `src/server/routes/auth.ts` (M)
- `src/server/routes/oauth.ts` (M)

## 4. Environment / CI / docker-compose / scripts

- `.env.docker` (D) - Deleted file
- `.env.example` (M)
- `docker-compose.yml` (M)
- `scripts/dev-docker.sh` (M)
- `scripts/dev-local.sh` (M)

## 5. Shared component & lint/auto-import updates

- `eslint.config.js` (M)
- `src/client/auto-imports.d.ts` (M)
- `src/client/components.d.ts` (M)
- `src/client/typed-router.d.ts` (M)

---

## Staging Strategy Recommendations

1. **Start with Environment/Config** (Bucket 4) - Foundation changes
2. **Then Shared Components/Lint** (Bucket 5) - Build system updates
3. **Server user-sync service** (Bucket 2) - Backend functionality
4. **Front-end implementation** (Bucket 3) - Large feature set, may need sub-commits
5. **Documentation** (Bucket 1) - Final updates to docs

## Notes

- Bucket 3 (Front-end) is the largest with 33 files - consider breaking into logical sub-commits
- One deleted file (.env.docker) needs attention
- 3 new untracked files need to be added to the index
- Total of 50 files across all buckets
