# Architecture Overview

## Directory Structure

```text
src/
├── client/           # Vue 3 frontend application
│   ├── components/   # Reusable Vue components organized by domain
│   ├── composables/  # Vue composition functions for business logic
│   ├── pages/        # File-based routing pages (vue-router auto-generated)
│   ├── stores/       # Pinia state management
│   ├── services/     # API client services
│   └── types/        # TypeScript type definitions
├── server/           # Bun + Hono backend
│   ├── routes/       # API route handlers by domain
│   ├── middleware/   # Authentication, validation, etc.
│   ├── services/     # Business logic and external integrations
│   └── __tests__/    # Backend test files
├── test/             # Shared test utilities and integration tests
└── types/            # Shared TypeScript types
```

## Workspace Dependencies

```typescript
// From openbadges-types
import type { BadgeClass, Assertion } from 'openbadges-types'

// From openbadges-ui
import { ObBadgeCard, ObBadgeList } from 'openbadges-ui'
```

## Key Architectural Patterns

**Frontend (Vue 3):**

- Composition API with TypeScript
- File-based routing via unplugin-vue-router
- Component auto-imports via unplugin-vue-components
- Pinia stores for state management
- Composables pattern for reusable logic

**Backend (Hono):**

- RESTful API design with route grouping
- JWT-based authentication with RS256
- Middleware for auth, validation, and CORS
- Kysely for type-safe database queries
- OpenBadges v2 specification compliance

**Database:**

- Kysely ORM with TypeScript schemas in `database/schema.ts`
- Migration system in `database/migrations/`
- SQLite for development, PostgreSQL for production

## Testing Strategy

**Client Tests (Vitest):**

- jsdom environment
- Vue Test Utils for component testing
- Tests in `src/client/**/*.{test,spec}.ts`
- Run with: `bun run test:client`

**Server Tests (Bun test):**

- Bun native test runner for unit tests (`**/*.bun.test.ts`)
- Vitest for integration tests (`**/*.{test,spec}.ts`)
- Test stubs for Bun-specific modules in `src/server/test-stubs/`
- Run with: `bun run test:server`

**Integration Tests:**

- End-to-end API testing in `src/test/integration/`
- OpenBadges verification flow testing

## Authentication & Authorization

JWT tokens with RS256 signing. Key middleware:

- `requireAuth`: Validates JWT tokens
- `requireAdmin`: Admin-only access
- `requireSelfOrAdminFromParam()`: Resource owner or admin access

Protected route patterns:

- `/api/bs/*`: Badge server proxy (auth configurable via `OPENBADGES_PROXY_PUBLIC`)
- User management endpoints with role-based access control

## OpenBadges Integration

- OAuth2 client credentials flow
- Badge creation, issuance, and verification
- OB2 specification validation middleware
- Badge server proxy at `/api/bs/*`
