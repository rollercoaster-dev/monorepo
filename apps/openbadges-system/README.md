# OpenBadges System

> **Note:** This project is currently a Work In Progress (WIP).

An implementation of the OpenBadges standard for managing digital credentials.

## Tech Stack

- **Frontend**: Vue 3 with Vue Router, Pinia, and TailwindCSS
- **Backend**: Bun runtime with Hono framework
- **Package Management**: pnpm
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.2.10+)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for badge server integration)

### OAuth Integration

This system integrates with the OpenBadges modular server for badge management. The integration uses OAuth2 with JWT tokens for secure service-to-service communication.

**Quick Setup:**

1. Start the badge server: `docker-compose up -d`
2. Configure OAuth settings in `.env` (see `.env.example`)
3. Start the main application: `pnpm dev`

For detailed OAuth configuration and troubleshooting, see:

- [OAuth Integration Guide](docs/OAUTH_INTEGRATION_GUIDE.md)
- [OAuth Troubleshooting](docs/OAUTH_TROUBLESHOOTING.md)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/rollercoaster-dev/openbadges-system.git
cd openbadges-system
pnpm install
```

### Running the Development Environment

Start both the client and server in development mode:

```bash
pnpm dev
```

This will start:

- Backend server using Bun (with hot reloading) at `http://localhost:8888`
- Frontend Vue app using Vite at `http://localhost:7777`

### Alternative Run Commands

Run only the server:

```bash
pnpm server
```

Run only the client:

```bash
pnpm client
```

### Docker Support

Start the containerized environment:

```bash
pnpm docker:up
```

Stop containers:

```bash
pnpm docker:down
```

View logs:

```bash
pnpm docker:logs
```

### Building for Production

Build the frontend for production:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Project Structure

```
openbadges-system/
├── src/
│   ├── client/           # Vue frontend
│   │   ├── assets/       # Static assets
│   │   ├── components/   # Vue components
│   │   ├── composables/  # Vue composables
│   │   ├── layouts/      # Page layouts
│   │   ├── pages/        # Vue pages/routes
│   │   └── stores/       # Pinia stores
│   └── server/           # Bun + Hono backend
├── docker-compose.yml    # Docker configuration
├── package.json          # Project dependencies & scripts
└── vite.config.js        # Vite configuration
```

## Authentication and Authorization

- The backend issues and validates RS256 JWTs. Protected endpoints require an `Authorization: Bearer <token>` header.
- Middleware:
  - `requireAuth` protects authenticated endpoints
  - `requireAdmin` restricts to admin users
  - `requireSelfOrAdminFromParam('<param>')` allows access to the resource owner (matching `sub`) or admins

Applied protections:

- `GET /api/bs/users`: admin only
- `GET /api/bs/users/:id`: self or admin
- `POST /api/bs/users`: admin only
- `PUT /api/bs/users/:id`: self or admin
- `DELETE /api/bs/users/:id`: admin only
- `POST /api/auth/oauth-token`, `POST /api/auth/oauth-token/refresh`, `POST /api/auth/sync-user`, `GET /api/auth/badge-server-profile/:userId`: authenticated users

Proxy auth toggle:

- The badge server proxy `/api/bs/*` requires auth by default.
- To allow public access (dev/testing), set env `OPENBADGES_PROXY_PUBLIC=true`.

## Configuration

Environment variables (non-sensitive examples):

- `PORT` (default `8888`)
- `OPENBADGES_SERVER_URL` (default `http://localhost:8888`)
- `OPENBADGES_AUTH_ENABLED` (default `true`)
- `OPENBADGES_AUTH_MODE` (`docker` uses Basic, `local` uses API key/basic from env)
- `OPENBADGES_PROXY_PUBLIC` (`false` by default)
- `PLATFORM_JWT_PRIVATE_KEY` / `PLATFORM_JWT_PUBLIC_KEY` (PEM) or base64 variants `*_B64`
- `PLATFORM_JWT_ISSUER` (optional; defaults to `PLATFORM_CLIENT_ID` for backwards-compat)
- `PLATFORM_JWT_AUDIENCE` (optional; when set, enforced on sign/verify)
- `JWT_CLOCK_TOLERANCE_SEC` (optional; default `0`; allows small clock skew for `exp`/`nbf` checks)
- `PLATFORM_ID`, `PLATFORM_CLIENT_ID`

> Note: If `OPENBADGES_AUTH_ENABLED=false`, all endpoints are public regardless of `OPENBADGES_PROXY_PUBLIC`.
> When auth is enabled, setting `OPENBADGES_PROXY_PUBLIC=true` allows proxy endpoints (`/api/bs/*`) to bypass auth.

## License

[MIT](LICENSE)
