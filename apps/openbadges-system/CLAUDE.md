# CLAUDE.md

This file provides guidance to Claude Code (<https://claude.ai/code>) when working with code in this application.

## Monorepo Context

This app is part of the **rollercoaster.dev monorepo**. It uses workspace dependencies from:

- `packages/openbadges-types` - OpenBadges TypeScript type definitions
- `packages/openbadges-ui` - Vue 3 component library for OpenBadges

**Important:** Run all commands from the monorepo root or use `bun --filter openbadges-system`.

## Project Overview

OpenBadges System is a Vue 3 + Bun/Hono application implementing the OpenBadges standard for digital credentials.

**Tech Stack:**

- Frontend: Vue 3, Vue Router, Pinia, TailwindCSS, TypeScript
- Backend: Bun runtime, Hono framework, SQLite/PostgreSQL via Kysely
- Build: Vite for frontend, Bun for backend
- Package Manager: Bun (monorepo workspaces)

## Development Commands

### From Monorepo Root

```bash
# Install dependencies
bun install

# Run specific to this app
bun --filter openbadges-system dev
bun --filter openbadges-system test
bun --filter openbadges-system build
```

### From App Directory

```bash
# Start full development environment (client + server)
bun run dev

# Start only server (Bun with hot reload)
bun run server

# Start only client (Vite dev server)
bun run client

# Alternative dev setups
bun run dev:local    # Local development script
bun run dev:docker   # Docker-based development
```

### Testing

```bash
# Run all tests (client + server)
bun run test

# Run tests with UI
bun run test:ui

# Run tests once without watch mode
bun run test:run

# Test coverage
bun run test:coverage

# Client-only tests (Vitest + jsdom)
bun run test:client

# Server-only tests (Bun test)
bun run test:server

# Server tests via Vitest (alternative)
bun run test:server:vitest
```

### Code Quality

```bash
# Lint code
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format

# Check formatting
bun run format:check

# Type checking
bun run type-check
```

### Build & Deploy

```bash
# Build for production
bun run build

# Preview production build
bun run preview

# Start production server
bun run start
```

### Docker Operations

```bash
# Start containers
bun run docker:up

# Stop containers
bun run docker:down

# View logs
bun run docker:logs
```

## Architecture Overview

### Directory Structure

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

### Workspace Dependencies

This app uses workspace packages:

```typescript
// From openbadges-types
import type { BadgeClass, Assertion } from 'openbadges-types'

// From openbadges-ui
import { ObBadgeCard, ObBadgeList } from 'openbadges-ui'
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

- Part of Bun workspaces monorepo
- Run `bun install` from monorepo root
- Workspace dependencies resolve to local packages

**Code Style:**

- ESLint + Prettier configuration
- TypeScript strict mode enabled
- Run `bun run lint` before committing

**Environment:**

- Copy `.env.example` to `.env` for local development
- Environment variables for OAuth, JWT keys, database URLs
- Docker Compose for local badge server development
- Supports both local and containerized development

**Hot Reloading:**

- Bun provides native hot reload for server
- Vite handles client-side hot module replacement

When working on this codebase, always run tests and linting before committing changes. The project follows OpenBadges v2 specification standards for all badge-related functionality.
