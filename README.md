# Rollercoaster.dev Monorepo

[![CI](https://github.com/rollercoaster-dev/monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/rollercoaster-dev/monorepo/actions/workflows/ci.yml)

A unified monorepo for the Rollercoaster.dev ecosystem - an Open Badges system with neurodivergent-first design, local-first architecture, and federation capabilities.

## 🎯 Vision

Rollercoaster.dev is building a new kind of digital credentialing system that puts users first:

- **Self-signed badges** using Open Badges 3.0 (Verifiable Credentials + DIDs)
- **Local-first data ownership** - your badges, your control, optional sync
- **Federation between nodes** - interoperable badge networks, no vendor lock-in
- **Neurodivergent-first UX** - accessible, customizable, low cognitive load
- **Skill tree + Backpack** - visualize learning paths and manage credentials
- **Data marketplace** - consent-based credential sharing (future)

See [apps/docs/vision/](apps/docs/vision/) for detailed roadmap and principles.

## 🏗️ Architecture

This monorepo uses:

- **Bun 1.3.2** for package management and runtime
- **Turborepo** for task orchestration and caching
- **TypeScript project references** for instant type checking

## 📁 Structure

```
monorepo/
├── apps/                           # Applications
│   ├── openbadges-system/         # Primary badge system (Vue 3 + Bun/Hono)
│   ├── openbadges-modular-server/ # Stateless OB 2.0/3.0 API (Docker)
│   └── docs/                      # Living documentation (wiki structure)
├── packages/                       # Shared libraries
│   ├── rd-logger/                 # Structured logging (@rollercoaster-dev/rd-logger)
│   ├── openbadges-types/          # TypeScript types (openbadges-types)
│   ├── openbadges-ui/             # Vue components (openbadges-ui)
│   └── shared-config/             # Shared build/lint configurations
└── experiments/                    # Research & prototypes
```

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3.2

### Installation

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Clone the repository
gh repo clone rollercoaster-dev/monorepo
cd monorepo

# Install dependencies
bun install
```

### Environment Setup

The monorepo uses environment variables for configuration. To set up your local environment:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your local settings
# Most defaults work for local development
```

**Environment Files:**

- [.env.example](.env.example) - Root-level monorepo configuration (logging, CI/CD)
- [packages/rd-logger/.env.example](packages/rd-logger/.env.example) - Logger-specific variables

**Common Variables:**

- `NODE_ENV` - Environment mode (development, production, test)
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error, fatal)
- `DEBUG_QUERIES` - Enable verbose database query logging (true/false)

Individual packages and apps may have their own `.env.example` files. Check each package's README for specific configuration needs.

### Claude Code on the Web

This monorepo is configured for use with [Claude Code on the Web](https://claude.ai/code).

**Automatic Setup:**

- Dependencies install automatically when you start a session
- The SessionStart hook runs `scripts/install-dependencies.sh`
- Works in both local CLI and web environments

**Environment Variables for Web:**

1. Visit [claude.ai/code](https://claude.ai/code) and connect your GitHub account
2. Install the Claude GitHub app in this repository
3. Select or create an environment
4. Configure environment variables in the Web UI (use `.env.example` as reference):
   - `NODE_ENV=development`
   - `LOG_LEVEL=info`
   - `DEBUG_QUERIES=false`

**Note**: `.env` files are for local development only. Claude Code on the Web uses environment variables configured in the Web UI.

**Additional Context:**

- See [CLAUDE.md](CLAUDE.md) for detailed monorepo structure and workflows
- Team-shared settings are in `.claude/settings.json`
- Personal settings go in `.claude/settings.local.json` (not committed)

### Development

```bash
# Run all apps in development mode
bun dev

# Run specific app
bun --filter openbadges-system dev

# Build all packages
bun run build

# Run tests across all packages
bun test
```

## 📦 Packages & Applications

### Applications

- **openbadges-system**: Primary badge issuance and management application
  - Full-stack Vue 3 + Bun/Hono
  - Self-signed badges, local-first storage
  - User-facing badge creation and portfolio

- **openbadges-modular-server**: Stateless Open Badges API server
  - Supports both OB 2.0 and 3.0 specifications
  - Publishes Docker images to GitHub Container Registry
  - Domain-driven design, multi-database support

### Published Packages (npm)

- **@rollercoaster-dev/rd-logger**: Structured logging with ADHD-friendly formatting
- **openbadges-types**: TypeScript definitions for Open Badges 2.0 and 3.0
- **openbadges-ui**: Vue 3 component library with 7 neurodivergent-friendly themes

### Internal Packages

- **shared-config**: Shared ESLint, Prettier, and TypeScript configurations

## 🔄 Migration Status

Migration from multiple repositories is **complete** (December 2025).

All packages are published to npm and applications are fully operational:

- ✅ @rollercoaster-dev/rd-logger v0.3.4
- ✅ openbadges-types v3.2.3
- ✅ openbadges-ui v1.3.0
- ✅ openbadges-modular-server (Docker on GHCR)
- ✅ openbadges-system (Vue 3 + Bun/Hono)

## 📚 Documentation

Documentation is available in `apps/docs/`:

- Vision & Strategy
- Architecture Decisions (ADRs)
- Development Processes

**Quick Links:**

- [Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- [All Issues](https://github.com/rollercoaster-dev/monorepo/issues)
- [CLAUDE.md](CLAUDE.md) - Detailed monorepo context for Claude Code

## 🤝 Contributing

This is an internal monorepo for Rollercoaster.dev projects. For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md) (coming soon).

## 📄 License

Individual packages and applications maintain their original licenses. See each package's LICENSE file for details.

## 🔗 Links

- [Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- [Issues](https://github.com/rollercoaster-dev/monorepo/issues)
- [Rollercoaster.dev](https://rollercoaster.dev)

## ❓ Questions or Feedback?

Open an issue on the [monorepo](https://github.com/rollercoaster-dev/monorepo/issues) or check existing [discussions](https://github.com/orgs/rollercoaster-dev/discussions).
