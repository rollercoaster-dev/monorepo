# Development Plan: Issue #200

## Issue Summary

**Title**: docs: Create architecture documentation for openbadges-system
**Type**: documentation
**Complexity**: MEDIUM
**Estimated Lines**: ~800-1000 lines across 5-7 documentation files

## Objective

Create comprehensive architecture documentation for the `apps/openbadges-system/` application, bringing it to parity with the excellent documentation in `openbadges-modular-server` (48 docs vs 12 docs currently). This will enable developers to understand the full-stack Vue 3 + Bun/Hono architecture, make informed architectural decisions, and onboard effectively.

## Affected Areas

All new documentation files in `apps/openbadges-system/docs/`:

- `docs/architecture/` (new directory)
  - `overview.md` - High-level architecture and design principles
  - `frontend-architecture.md` - Vue 3 component hierarchy, state, routing
  - `backend-architecture.md` - Hono API structure, middleware, services
  - `integration-architecture.md` - Frontend-backend communication, OpenBadges integration
  - `database-architecture.md` - Kysely-based dual-database system
- `docs/development/` (enhance existing)
  - `testing-guide.md` - Testing strategy for full-stack app
- `docs/deployment/` (new directory)
  - `production-deployment.md` - Deployment best practices

## Architecture Research Findings

### Frontend Architecture (Vue 3)

**Component Structure:**

- 11 Vue components organized by domain:
  - `Auth/` - LoginForm, RegisterForm, OAuthProviderButton
  - `Badge/` - BadgeCard
  - `Navigation/` - MainNavigation, UserMenu, Breadcrumb
  - `User/` - UserCard, UserForm, UserList, UserSearch

**State Management:**

- No centralized store (Pinia installed but not actively used)
- State managed via composables pattern (Vue 3 Composition API)
- 7 composables in `src/client/composables/`:
  - `useAuth.ts` - Authentication, WebAuthn, OAuth, user management
  - `useBadges.ts` - Badge operations
  - `useOAuth.ts` - OAuth flow handling
  - `useUsers.ts` - User CRUD operations
  - `useFormValidation.ts` - Form validation utilities
  - `useImageUpload.ts` - Image upload handling
  - `useNavigation.ts` - Navigation helpers

**Routing:**

- File-based routing via `unplugin-vue-router`
- Auto-generated from `src/client/pages/` directory structure
- 24 pages across domains:
  - `/admin/*` - Admin dashboard, users, badges, system
  - `/auth/*` - Login, register, profile, OAuth callback
  - `/badges/*` - Create, edit, issue, view badges
  - `/issuers/*` - Issuer management
  - `/backpack/*` - User badge backpack
  - `/verify/:id` - Badge verification

**Build System:**

- Vite for frontend with Vue plugin
- Auto-imports for components and composables via unplugin
- TailwindCSS for styling
- Path aliases: `@/` -> `src/client/`, `@server/` -> `src/server/`

### Backend Architecture (Hono)

**API Structure:**

- Hono framework with RESTful routes
- 5 route modules in `src/server/routes/`:
  - `auth.ts` - User authentication endpoints
  - `public-auth.ts` - Public auth endpoints (registration, user lookup)
  - `oauth.ts` - OAuth provider integration (GitHub)
  - `users.ts` - User management (admin)
  - `badges.ts` - Badge operations (proxy to OpenBadges server)

**Middleware Stack:**

- CORS configuration for Vite dev server
- Logger middleware (Hono built-in)
- JWT authentication middleware (`requireAuth`, `requireAdmin`, `requireSelfOrAdminFromParam`)
- OB2 validation middleware for badge operations

**Services:**

- `jwt.ts` - JWT token generation and verification (RS256)
- `oauth.ts` - OAuth provider management
- `user.ts` - User business logic
- `userSync.ts` - User synchronization with badge server

**Authentication Flow:**

- Multi-method authentication:
  - WebAuthn passkeys (primary)
  - GitHub OAuth (optional)
  - JWT tokens for API auth (RS256)
- JWT issued by platform, verified by badge server via JWKS endpoint (`/.well-known/jwks.json`)
- Local session markers for offline-first support

**OpenBadges Integration:**

- Proxy endpoint `/api/bs/*` forwards requests to badge server
- Auth modes: `docker` (Basic Auth), `oauth` (JWT), `local` (API key)
- Public badge endpoints at `/api/badges/*` (verify, assertions, badge-classes)
- OB2 validation for badge creation and issuance

### Database Architecture

**ORM:** Kysely query builder with TypeScript schemas

**Dual-Database Support:**

- SQLite (development) - File-based, zero configuration
- PostgreSQL (production) - Connection pooling, advanced features

**Schema:**

- 8 tables defined in `database/schema.ts`:
  - `users` - User accounts with WebAuthn credentials
  - `user_sessions` - Session management
  - `oauth_providers` - OAuth provider links
  - `oauth_sessions` - OAuth state management
  - `posts`, `comments`, `tags`, `post_tags` - Content management (legacy/future)

**Migrations:**

- SQL-based migrations in `database/migrations/`
- Migrator in `database/migrations/migrator.ts`
- Database factory pattern in `database/factory.ts`
- Transaction support in `database/transaction.ts`

### Integration Architecture

**Frontend-Backend Communication:**

- Frontend (Vite) runs on port 7777
- Backend (Bun/Hono) runs on port 8888
- Vite proxy forwards `/api/*` to backend
- Production: Backend serves static frontend files

**API Contracts:**

- No explicit API contract layer (RESTful conventions)
- Type safety via TypeScript interfaces shared across client/server
- Zod validation for API requests in some endpoints

**Error Handling:**

- Frontend: Try-catch with user-friendly error messages
- Backend: Structured JSON error responses with status codes
- Service layer handles retries for transient errors (OAuth token refresh)

**Environment Configuration:**

- `.env` file for local development
- Comprehensive environment variables:
  - Server: `PORT`, `NODE_ENV`
  - Database: `DB_TYPE`, `SQLITE_FILE`, `DATABASE_URL`
  - Auth: JWT keys, OAuth credentials
  - Badge Server: `OPENBADGES_SERVER_URL`, auth mode

## Implementation Plan

### Step 1: Create Architecture Overview

**Files**: `docs/architecture/overview.md`
**Commit**: `docs(openbadges-system): add architecture overview`
**Changes**:

- High-level system architecture diagram
- Technology stack summary (Vue 3, Hono, Bun, Kysely)
- Design principles (full-stack TypeScript, offline-first, composable architecture)
- Component interaction diagram (frontend → backend → badge server)
- Development vs production architecture differences
- Key features and capabilities
- References to detailed architecture docs

**Estimated lines**: ~150-200

### Step 2: Document Frontend Architecture

**Files**: `docs/architecture/frontend-architecture.md`
**Commit**: `docs(openbadges-system): document Vue 3 frontend architecture`
**Changes**:

- Vue 3 Composition API patterns
- Component hierarchy and organization (11 components across 4 domains)
- Composables pattern for state management (7 composables)
- File-based routing structure (24 pages)
- Auto-import configuration (components, composables)
- Build system (Vite, plugins, TailwindCSS)
- Path aliases and module resolution
- Component communication patterns
- Lifecycle and reactivity considerations
- Development workflow (hot reload, debugging)

**Estimated lines**: ~250-300

### Step 3: Document Backend Architecture

**Files**: `docs/architecture/backend-architecture.md`
**Commit**: `docs(openbadges-system): document Hono backend architecture`
**Changes**:

- Hono framework patterns and conventions
- API route structure (5 route modules)
- Middleware stack (CORS, auth, logging, validation)
- Service layer architecture (JWT, OAuth, user management)
- Authentication and authorization flows (WebAuthn, OAuth, JWT)
- Request/response patterns
- Error handling strategy
- OpenBadges server proxy design
- JWKS endpoint for JWT verification
- Development server setup (Bun hot reload)

**Estimated lines**: ~250-300

### Step 4: Document Integration Architecture

**Files**: `docs/architecture/integration-architecture.md`
**Commit**: `docs(openbadges-system): document frontend-backend integration`
**Changes**:

- Frontend-backend communication patterns
- Vite proxy configuration for development
- Production deployment (backend serves frontend)
- API request/response flow
- Authentication flow across layers (WebAuthn → JWT → badge server)
- OpenBadges server integration architecture
- Error propagation and handling
- Environment-specific configuration
- Service-to-service authentication (OAuth2, JWT)
- Public vs authenticated endpoints

**Estimated lines**: ~200-250

### Step 5: Document Database Architecture

**Files**: `docs/architecture/database-architecture.md`
**Commit**: `docs(openbadges-system): document Kysely database architecture`
**Changes**:

- Kysely query builder overview
- Dual-database strategy (SQLite vs PostgreSQL)
- Database factory pattern
- Schema definition and type safety
- Migration system and workflow
- Transaction management
- Connection handling per database type
- Database compatibility matrix
- Development vs production database configuration
- Performance considerations
- Entity relationship diagram (8 tables)

**Estimated lines**: ~200-250

### Step 6: Create Testing Guide

**Files**: `docs/development/testing-guide.md`
**Commit**: `docs(openbadges-system): add comprehensive testing guide`
**Changes**:

- Testing architecture (Bun test, Vitest, Vue Test Utils)
- Client-side testing (Vitest + jsdom)
- Server-side testing (Bun test runner)
- Integration testing patterns
- Test file organization and naming conventions
- Test utilities and helpers
- Mocking strategies (API, database, OAuth)
- WebAuthn testing patterns
- Coverage requirements and reporting
- CI/CD testing workflow
- Best practices and common pitfalls

**Estimated lines**: ~150-200

### Step 7: Create Production Deployment Guide

**Files**: `docs/deployment/production-deployment.md`
**Commit**: `docs(openbadges-system): add production deployment guide`
**Changes**:

- Production architecture overview
- Build process (`bun run build`)
- Environment variable configuration
- Database migration workflow
- Static asset serving (frontend build)
- Security considerations (JWT keys, OAuth secrets)
- PostgreSQL setup and configuration
- OpenBadges server integration
- Monitoring and logging
- Backup and recovery strategies
- Performance optimization
- Common deployment issues and solutions

**Estimated lines**: ~200-250

## Testing Strategy

This is a documentation-only change, so traditional testing is not applicable. However, validation includes:

- [ ] All documentation follows consistent Markdown formatting
- [ ] Code examples are syntactically correct
- [ ] Cross-references between documents are valid
- [ ] Diagrams (if using Mermaid) render correctly
- [ ] No broken links to files or external resources
- [ ] Documentation matches actual codebase structure
- [ ] Examples use current API patterns
- [ ] Terminology is consistent across all docs

## Definition of Done

- [ ] All 7 documentation steps complete
- [ ] Documentation reviewed for accuracy
- [ ] Cross-references validated
- [ ] Examples tested against current codebase
- [ ] Markdown formatting consistent
- [ ] No typos or grammatical errors
- [ ] Ready for PR submission

## Notes

### Reference Documentation

- Use `apps/openbadges-modular-server/docs/database-architecture-overview.md` as structural reference
- Follow existing doc style in `apps/openbadges-system/docs/OAUTH_INTEGRATION_GUIDE.md`
- Maintain consistency with monorepo `CLAUDE.md` and root `README.md`

### Architectural Highlights to Emphasize

1. **Full-stack TypeScript**: End-to-end type safety from database to UI
2. **Offline-first**: WebAuthn + local session markers support offline usage
3. **Composable architecture**: Vue 3 Composition API enables code reuse
4. **Multi-auth**: WebAuthn (primary), GitHub OAuth (optional), JWT (API)
5. **Dual-database**: SQLite dev, PostgreSQL prod via Kysely abstraction
6. **OpenBadges integration**: Proxy pattern for badge server communication

### Documentation Principles

- **Developer-focused**: Written for developers joining the project
- **Example-driven**: Include code snippets showing actual patterns
- **Visual aids**: Use diagrams where helpful (Mermaid if possible)
- **Cross-linked**: Reference related docs and code files
- **Maintainable**: Easy to update as architecture evolves

### Future Enhancements (Out of Scope)

- API contract documentation (OpenAPI/Swagger)
- Performance benchmarking documentation
- Security audit documentation
- Troubleshooting guide expansion
- Video tutorials or walkthroughs

## Recommended Next Step

After review and approval, proceed with atomic implementation following the 7-step commit sequence. Each commit should be independently reviewable and mergeable.
