# CLAUDE.md

This file provides guidance to Claude Code (<https://claude.ai/code>) when working with code in this repository.

## Project Overview

OpenBadges System is a Vue 3 + Bun/Hono application implementing the OpenBadges standard for digital credentials. The project uses a monorepo structure with client and server code in the same repository.

**Tech Stack:**

- Frontend: Vue 3, Vue Router, Pinia, TailwindCSS, TypeScript
- Backend: Bun runtime, Hono framework, SQLite/PostgreSQL via Kysely
- Build: Vite for frontend, Bun for backend
- Package Manager: pnpm

## Development Commands

### Core Development

```bash
# Start full development environment (client + server)
pnpm dev

# Start only server (Bun with hot reload)
pnpm server

# Start only client (Vite dev server)
pnpm client

# Alternative dev setups
pnpm dev:local    # Local development script
pnpm dev:docker   # Docker-based development
```

### Testing

```bash
# Run all tests (client + server)
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests once without watch mode
pnpm test:run

# Test coverage
pnpm test:coverage

# Client-only tests (Vitest + jsdom)
pnpm test:client

# Server-only tests (Bun test)
pnpm test:server

# Server tests via Vitest (alternative)
pnpm test:server:vitest
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type checking
pnpm type-check
```

### Build & Deploy

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview

# Start production server
pnpm start
```

### Docker Operations

```bash
# Start containers
pnpm docker:up

# Stop containers
pnpm docker:down

# View logs
pnpm docker:logs
```

## Architecture Overview

### Directory Structure

```
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

### Key Architectural Patterns

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

### Testing Strategy

**Client Tests:**

- Vitest with jsdom environment
- Vue Test Utils for component testing
- Tests in `src/client/**/*.{test,spec}.ts`

**Server Tests:**

- Bun test for unit tests (`**/*.bun.test.ts`)
- Vitest for integration tests (`**/*.{test,spec}.ts`)
- Test stubs for Bun-specific modules in `src/server/test-stubs/`

**Integration Tests:**

- End-to-end API testing in `src/test/integration/`
- OpenBadges verification flow testing

## Authentication & Authorization

The system uses JWT tokens with RS256 signing. Key middleware:

- `requireAuth`: Validates JWT tokens
- `requireAdmin`: Admin-only access
- `requireSelfOrAdminFromParam()`: Resource owner or admin access

Protected route patterns:

- `/api/bs/*`: Badge server proxy (auth configurable via `OPENBADGES_PROXY_PUBLIC`)
- User management endpoints with role-based access control

## OpenBadges Integration

The system integrates with an external OpenBadges server via:

- OAuth2 client credentials flow
- Badge creation, issuance, and verification
- OB2 specification validation middleware
- Badge server proxy at `/api/bs/*`

## Development Notes

**Package Management:**

- Use pnpm for all dependency management
- Lock file is committed (`pnpm-lock.yaml`)

**Code Style:**

- ESLint + Prettier configuration
- Pre-commit hooks via Husky and lint-staged
- TypeScript strict mode enabled

**Environment:**

- Environment variables for OAuth, JWT keys, database URLs
- Docker Compose for local badge server development
- Supports both local and containerized development

**Hot Reloading:**

- Bun provides native hot reload for server
- Vite handles client-side hot module replacement

When working on this codebase, always run tests and linting before committing changes. The project follows OpenBadges v2 specification standards for all badge-related functionality.
