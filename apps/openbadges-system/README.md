# OpenBadges System

A full-stack Vue 3 + Bun/Hono application for managing digital credentials using the OpenBadges standard.

> **Part of the [rollercoaster.dev monorepo](https://github.com/rollercoaster-dev/monorepo)**

## Features

- **Badge Management** - Create, issue, and manage OpenBadges 2.0 credentials
- **Badge Directory** - Browse and filter badges by issuer
- **User Authentication** - GitHub OAuth integration
- **Badge Server Integration** - Connects to [openbadges-modular-server](../openbadges-modular-server/) via OAuth2/JWT
- **Role-Based Access Control** - Admin and user permission levels
- **Responsive UI** - TailwindCSS with neurodivergent-friendly design

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, Vue Router, Pinia, TailwindCSS |
| Backend | Bun runtime, Hono framework |
| Database | SQLite (dev) / PostgreSQL (prod) via Kysely |
| Auth | GitHub OAuth, JWT (RS256) |
| Build | Vite (frontend), Bun (backend) |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.3.2
- [Docker](https://www.docker.com/) (for badge server integration)

### Installation

This app is part of the monorepo. Install from the root:

```bash
cd monorepo
bun install
```

### Development

```bash
# Start both frontend and backend
bun --filter openbadges-system dev

# Or from this directory
bun dev
```

This starts:
- **Backend** at `http://localhost:8888` (Bun with hot reload)
- **Frontend** at `http://localhost:7777` (Vite dev server)

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

See [Configuration](#configuration) for details on environment variables.

## Commands

### Development

```bash
bun dev              # Start client + server
bun run server       # Server only
bun run client       # Client only
```

### Testing

```bash
bun test             # All tests (client + server)
bun run test:client  # Frontend tests (Vitest + jsdom)
bun run test:server  # Backend tests (Bun test runner)
bun run test:coverage # Coverage report
```

### Code Quality

```bash
bun run lint         # ESLint
bun run lint:fix     # Auto-fix issues
bun run format       # Prettier
bun run type-check   # TypeScript checking
```

### Build & Deploy

```bash
bun run build        # Production build
bun run preview      # Preview production
bun run start        # Start production server
```

### Docker

```bash
bun run docker:up    # Start containers
bun run docker:down  # Stop containers
bun run docker:logs  # View logs
```

## Project Structure

```
openbadges-system/
├── src/
│   ├── client/           # Vue 3 frontend
│   │   ├── components/   # Vue components by domain
│   │   ├── composables/  # Composition API hooks
│   │   ├── pages/        # File-based routing
│   │   ├── stores/       # Pinia state management
│   │   └── services/     # API client services
│   └── server/           # Bun + Hono backend
│       ├── routes/       # API route handlers
│       ├── middleware/   # Auth, validation, CORS
│       └── services/     # Business logic
├── docs/                 # Additional documentation
├── docker-compose.yml    # Docker configuration
└── package.json
```

## Architecture

### Workspace Dependencies

This app uses packages from the monorepo:

```typescript
// TypeScript types for OpenBadges
import type { BadgeClass, Assertion } from 'openbadges-types'

// Vue component library
import { ObBadgeCard, ObBadgeList } from 'openbadges-ui'
```

### Authentication Flow

1. **User Auth**: Users authenticate via GitHub OAuth
2. **Service Auth**: App communicates with badge server using JWT tokens
3. **Token Verification**: Badge server verifies JWTs via JWKS endpoint

```
User → GitHub OAuth → Main App (8888) → JWT → Badge Server (3000)
```

### API Authorization

Protected endpoints use middleware:

| Middleware | Purpose |
|------------|---------|
| `requireAuth` | Validates JWT tokens |
| `requireAdmin` | Admin-only access |
| `requireSelfOrAdminFromParam()` | Owner or admin access |

**Endpoint Protections:**

| Endpoint | Access Level |
|----------|--------------|
| `GET /api/bs/users` | Admin only |
| `GET /api/bs/users/:id` | Self or admin |
| `POST /api/bs/users` | Admin only |
| `PUT /api/bs/users/:id` | Self or admin |
| `DELETE /api/bs/users/:id` | Admin only |

## Configuration

Key environment variables:

```bash
# Server
PORT=8888

# Badge Server Integration
OPENBADGES_SERVER_URL=http://localhost:3000
OPENBADGES_AUTH_ENABLED=true
OPENBADGES_AUTH_MODE=oauth    # 'oauth' for JWT, 'docker' for Basic
OPENBADGES_PROXY_PUBLIC=false # Set true to bypass auth on /api/bs/*

# JWT (RS256)
PLATFORM_JWT_PRIVATE_KEY=...  # PEM format (or *_B64 for base64)
PLATFORM_JWT_PUBLIC_KEY=...
PLATFORM_JWT_ISSUER=...       # Defaults to PLATFORM_CLIENT_ID
PLATFORM_JWT_AUDIENCE=...     # Optional, enforced if set
JWT_CLOCK_TOLERANCE_SEC=0     # Clock skew tolerance

# GitHub OAuth
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...
OAUTH_GITHUB_CALLBACK_URL=http://localhost:8888/api/oauth/github/callback
```

See `.env.example` for the complete list.

## Documentation

- [OAuth Integration Guide](docs/OAUTH_INTEGRATION_GUIDE.md) - Service-to-service authentication
- [OAuth Troubleshooting](docs/OAUTH_TROUBLESHOOTING.md) - Common issues and solutions
- [API Authentication](docs/development/api-auth.md) - Backend auth details
- [CLAUDE.md](CLAUDE.md) - Development context for AI assistants

## Related

- [openbadges-modular-server](../openbadges-modular-server/) - Badge API server
- [openbadges-types](../../packages/openbadges-types/) - TypeScript definitions
- [openbadges-ui](../../packages/openbadges-ui/) - Vue component library

## License

[MIT](LICENSE)
