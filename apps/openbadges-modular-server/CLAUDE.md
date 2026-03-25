# OpenBadges Modular Server

## Essential Development Commands

```bash
bun run dev                 # Start development server with hot reload
bun run start              # Start production server
bun run check:all          # Run lint, typecheck, and test suite
bun run typecheck          # TypeScript type checking
bun run lint:fix           # Auto-fix linting issues
```

**Testing:**

```bash
bun test                   # Full test suite (auto-detects databases)
bun run test:core          # Core tests only
bun run test:sqlite        # SQLite-specific tests
bun run test:pg:with-docker # PostgreSQL tests using Docker
bun run test:e2e           # E2E tests for both databases
bun run test:coverage      # Coverage report
```

**Database operations:**

```bash
bun run db:generate        # Generate migrations for current DB_TYPE
bun run db:migrate         # Run migrations for current DB_TYPE
bun run db:studio          # Open Drizzle Studio
```

**Docker:**

```bash
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
bun run docker:build       # Build locally
```

Docker images auto-publish to GHCR on merge to `main`. Tags: `latest`, `sha-<hash>`, `v1.2.3`.

## Architecture

See [docs/architecture.md](docs/architecture.md) for full architecture details.

**Core domains:** `src/domains/{issuer,badgeClass,assertion}/`
**Multi-database:** SQLite + PostgreSQL via modular adapter pattern
**API:** Hono REST with OpenAPI docs at `/docs`

## Open Badges Implementation

**Status:** Full OB 2.0 hosted spec. OB 3.0 planned (see `docs/ob3-roadmap.md`).

**Entities:** Issuer → BadgeClass → Assertion
**Endpoints:** `/v2/` (current), `/v3/` (planned), `/docs` (OpenAPI)

## Development Guidelines

- TypeScript strict mode, ESLint, Conventional Commits
- Always use repository pattern, never direct database calls
- Database-agnostic code in domain layer; DB-specific logic in infrastructure
- See [docs/database-integration-guide.md](docs/database-integration-guide.md) for adding new database adapters

**Authentication:** Multi-adapter (API keys, Basic Auth, OAuth2), RBAC middleware, JWT sessions.

**Error handling:** Custom classes in `src/infrastructure/errors/`, structured responses with correlation IDs.
