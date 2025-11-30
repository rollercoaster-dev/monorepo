# Architecture Overview

This document provides a high-level overview of the openbadges-system architecture, a full-stack Vue 3 + Bun/Hono application for managing Open Badges credentials.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        openbadges-system                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐      ┌─────────────────────────────┐  │
│  │   Vue 3 Frontend    │      │      Hono Backend           │  │
│  │   (Port 7777 dev)   │─────▶│      (Port 8888)            │  │
│  │                     │      │                             │  │
│  │  • Components       │      │  • REST API                 │  │
│  │  • Composables      │      │  • JWT Auth                 │  │
│  │  • File-based routes│      │  • WebAuthn                 │  │
│  │  • TailwindCSS      │      │  • OAuth (GitHub)           │  │
│  └─────────────────────┘      └──────────────┬──────────────┘  │
│                                              │                  │
│                                              ▼                  │
│                               ┌─────────────────────────────┐  │
│                               │   Kysely Database Layer     │  │
│                               │   SQLite (dev) / Postgres   │  │
│                               └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────┐
                        │  OpenBadges Modular Server  │
                        │  (External Badge Storage)   │
                        └─────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Vue 3 + Vite | Reactive UI with Composition API |
| **Styling** | TailwindCSS | Utility-first CSS framework |
| **Backend** | Hono + Bun | Fast, lightweight HTTP server |
| **Database** | Kysely | Type-safe SQL query builder |
| **Auth** | WebAuthn + JWT | Passwordless + token-based auth |
| **Runtime** | Bun | Fast JavaScript runtime |

## Design Principles

### 1. Full-Stack TypeScript

End-to-end type safety from database schemas to UI components. Shared types ensure API contracts are enforced at compile time.

### 2. Offline-First Architecture

- WebAuthn passkeys work offline after initial setup
- Local session markers persist authentication state
- Graceful degradation when badge server is unavailable

### 3. Composable Architecture

Vue 3 Composition API enables reusable logic through composables:
- `useAuth` - Authentication state and methods
- `useBadges` - Badge operations
- `useUsers` - User management

### 4. Multi-Auth Support

Flexible authentication supporting multiple methods:
- **WebAuthn** (primary) - Passwordless passkey authentication
- **GitHub OAuth** (optional) - Social login
- **JWT tokens** - API authentication (RS256)

### 5. Dual-Database Strategy

Development and production use different databases through Kysely abstraction:
- **SQLite** - Zero-config local development
- **PostgreSQL** - Production-ready with connection pooling

## Key Features

- **Badge Management** - Create, issue, and verify Open Badges
- **User Management** - Admin dashboard for user administration
- **Issuer Profiles** - Manage badge issuer identities
- **Backpack** - User badge collection and display
- **Verification** - Public badge verification endpoint

## Component Interaction

### Development Mode

```
Browser ──▶ Vite Dev Server (7777) ──proxy──▶ Hono API (8888) ──▶ Database
                                                    │
                                                    ▼
                                          OpenBadges Server
```

### Production Mode

```
Browser ──▶ Hono Server (serves static + API) ──▶ Database
                        │
                        ▼
              OpenBadges Server
```

## Directory Structure

```
apps/openbadges-system/
├── src/
│   ├── client/           # Vue 3 frontend
│   │   ├── components/   # Reusable UI components
│   │   ├── composables/  # Composition API hooks
│   │   ├── pages/        # File-based route pages
│   │   └── layouts/      # Page layouts
│   └── server/           # Hono backend
│       ├── routes/       # API route handlers
│       ├── services/     # Business logic
│       └── middleware/   # Request middleware
├── database/             # Kysely database layer
│   ├── migrations/       # SQL migrations
│   └── schema.ts         # Type definitions
└── docs/                 # Documentation
    ├── architecture/     # Architecture docs (you are here)
    ├── development/      # Development guides
    └── deployment/       # Deployment guides
```

## Related Documentation

- [Frontend Architecture](./frontend-architecture.md) - Vue 3 patterns and components
- [Backend Architecture](./backend-architecture.md) - Hono API and services
- [Integration Architecture](./integration-architecture.md) - Frontend-backend communication
- [Database Architecture](./database-architecture.md) - Kysely and migrations
- [Testing Guide](../development/testing-guide.md) - Testing strategies
- [Production Deployment](../deployment/production-deployment.md) - Deployment guide
