# Architecture Overview

## Core Architecture Patterns

**Domain-Driven Design (DDD):** The codebase is organized around three main domains:

- `src/domains/issuer/` - Badge issuer management
- `src/domains/badgeClass/` - Badge class definitions
- `src/domains/assertion/` - Badge assertions (issued badges)

**Multi-Database Architecture:** The system supports both SQLite and PostgreSQL through a modular database adapter pattern:

- Database modules in `src/infrastructure/database/modules/`
- Each database has its own repositories, mappers, and connection management
- Tests automatically detect available databases and run accordingly

**Repository Pattern:** Each domain has repository interfaces and database-specific implementations:

- Generic interfaces in domain folders (e.g., `assertion.repository.ts`)
- Database-specific implementations in `src/infrastructure/database/modules/{sqlite|postgresql}/repositories/`

## Key Architectural Components

**Database Factory (`src/infrastructure/database/database.factory.ts`):**

- Registers and manages database modules based on `DB_TYPE` environment variable
- Provides unified interface for database operations

**Configuration System (`src/config/config.ts`):**

- Environment-driven configuration with sensible defaults
- Database connection string determination with priority order
- Comprehensive caching, auth, and logging configuration

**API Structure:**

- Hono-based REST API with OpenAPI/Swagger documentation
- Controllers in `src/api/controllers/`
- Request/response DTOs with Zod validation
- Interactive API docs available at `/docs` endpoint

## Database-Specific Considerations

**SQLite:**

- Uses bun:sqlite with WAL mode and optimized pragmas
- Connection pooling managed through singleton pattern
- Prepared statements for performance
- Supports in-memory databases for testing

**PostgreSQL:**

- Uses postgres.js driver with connection pooling
- Supports SSL connections and full PostgreSQL feature set
- Environment variables: `DATABASE_URL` or individual `POSTGRES_*` vars
- Docker Compose setup available for development

## Testing Strategy

**Multi-Database Testing:**

- Tests automatically skip if database is unavailable
- Use `bun run test:pg:with-docker` for PostgreSQL testing with Docker
- Database-specific test files in `tests/infrastructure/database/modules/`
- E2E tests validate complete API workflows

**Test Database Management:**

- SQLite tests use isolated database files
- PostgreSQL tests use dedicated test database with Docker
- Database reset helpers ensure test isolation
