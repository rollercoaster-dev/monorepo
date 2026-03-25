# OpenBadges System

Vue 3 + Bun/Hono full-stack app for OpenBadges digital credentials.

## Monorepo Context

Workspace dependencies: `openbadges-types`, `openbadges-ui`.
Run commands from monorepo root or use `bun --filter openbadges-system`.

**Stack:** Vue 3, Vue Router, Pinia, TailwindCSS, Hono, Kysely, SQLite/PostgreSQL.

## Development Commands

```bash
bun run dev              # Full dev environment (client + server)
bun run server           # Server only (Bun hot reload)
bun run client           # Client only (Vite dev server)
bun run build            # Production build
bun run start            # Production server
```

**Testing:**

```bash
bun run test             # All tests (client + server)
bun run test:client      # Client tests (Vitest + jsdom)
bun run test:server      # Server tests (Bun test)
bun run test:coverage    # Coverage report
```

**Quality:**

```bash
bun run lint:fix         # Auto-fix linting
bun run format           # Format code
bun run type-check       # TypeScript checking
```

**Docker:**

```bash
bun run docker:up        # Start containers
bun run docker:down      # Stop containers
bun run docker:logs      # View logs
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for directory structure, patterns, and testing strategy.

**Frontend:** Vue 3 Composition API, file-based routing, Pinia stores, composables.
**Backend:** Hono REST API, JWT RS256 auth, Kysely ORM.
**Auth:** `requireAuth`, `requireAdmin`, `requireSelfOrAdminFromParam()` middleware.

## Environment

- Copy `.env.example` to `.env` for local development
- Environment variables for OAuth, JWT keys, database URLs
- Docker Compose for local badge server development
