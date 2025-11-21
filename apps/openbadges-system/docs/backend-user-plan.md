# Backend User Plan

This document serves as the single source of truth for the backend user management implementation plan across all contexts.

## 1. Create & Maintain Markdown Plan Document
Create `docs/backend-user-plan.md` at repo root (or `/docs`), containing the **exact plan** below.  
This file will be updated in-place by future agents, becoming the single source of truth across contexts.

## 2. Map the Current Backend Architecture
Inventory all backend entry points, routes, services, and utilities.  
Generate an architecture diagram (Mermaid in the markdown) showing data flow between:  
- Hono server → route modules → service layer → database (SQLite)  
- Proxy to external OpenBadges server  
List environment variables, ports, and build scripts.

## 3. Deep-Dive on User Management Implementation
Analyse `/src/server/services/user.ts` and `/src/client/composables/useAuth.ts`.  
Document:  
- CRUD API surface  
- Credential handling (WebAuthn)  
- JWT generation flow (`jwtService`)  
Capture assumptions (localStorage trust, token placeholders) and edge-cases (error handling, duplicate users).

## 4. Authentication & Authorization Flow Analysis
Trace: Client → WebAuthn → backend `/api/bs/users` → credential storage → login.  
Identify missing pieces: token validation middleware, refresh / logout, role-based checks.  
Add a sequence diagram to the markdown.

## 5. Database Schema & Integrity Review
Reverse-engineer current SQLite schema (`users`, `user_credentials`).  
Evaluate indices, foreign keys, cascades, unique constraints.  
List migrations required for Postgres parity (UUIDs, JSONB for roles / transports).

## 6. Security Assessment
Threat-model storage of public keys, passwordless auth, JWT secrets, CORS, Basic Auth proxy.  
Provide CVSS-like ratings and quick wins (rate-limiting, HTTPS, CSRF, helmet-style headers).

## 7. Design Dual-Database Strategy (SQLite ↔ PostgreSQL)
Propose a **database abstraction layer** using a lightweight query builder (e.g. <code>kysely</code>) or ORM (Prisma/Drizzle).  
Requirements:  
- Environment-selectable adapter (`DB_TYPE=sqlite|postgres`)  
- Shared migration files (SQL) runnable in both engines  
- Transaction support, foreign-key enforcement.  
Include ER diagram and compatibility table in markdown.

## 8. Refactor Services to Use the Abstraction Layer
Introduce repository pattern: `UserRepository`, `CredentialRepository`.  
Replace raw `sqlite3` calls with adapter queries.  
Ensure type-safe models, automatic serialization of JSON columns.  
Update route handlers (<code>userRoutes</code>) to depend on repositories (dependency injection).

## 9. Enhance Authentication Mechanism
Implement proper JWT issuance on login, validation middleware for protected routes, configurable expiry &amp; rotation.  
Optional: integrate refresh tokens &amp; revoke list stored in DB.  
Add RBAC helper (`isAdmin`, `hasRole`).  
Document token structure in the markdown.

## 10. Testing & Quality Gates
Set up Vitest matrix:  
- Unit tests (repositories, JWT utils) against SQLite in-memory  
- Integration tests spun up with Postgres test-container (e.g. <code>testcontainers</code>).  
Enable coverage threshold, ESLint + Prettier, and CI workflow in GitHub Actions.

## 11. Documentation & Roll-Out
Expand README with:  
- Quick-start for SQLite (zero-dep) &amp; Postgres (docker-compose)  
- Env var reference  
- Migration guide from legacy SQLite.
