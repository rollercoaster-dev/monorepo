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
│   └── docs/                      # Living documentation
├── packages/                       # Shared libraries
│   ├── openbadges-types/          # TypeScript types for OB 2.0/3.0
│   ├── openbadges-ui/             # Vue components with neurodivergent themes
│   ├── rd-logger/                 # Structured logging utility
│   └── shared-config/             # Shared TypeScript/ESLint/Prettier configs
└── experiments/                    # Research & prototypes
    └── [future experiments]
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

- **[openbadges-types](https://www.npmjs.com/package/openbadges-types)**: TypeScript definitions for Open Badges 2.0 and 3.0
- **[openbadges-ui](https://www.npmjs.com/package/openbadges-ui)**: Vue 3 component library with 7 neurodivergent-friendly themes
- **[@rollercoaster-dev/rd-logger](https://www.npmjs.com/package/@rollercoaster-dev/rd-logger)**: Structured logging with ADHD-friendly formatting

### Internal Packages

- **shared-config**: Shared TypeScript, ESLint, and Prettier configurations

## 🔄 Migration Status

This monorepo consolidates multiple repositories into a unified codebase. See our [migration project](https://github.com/orgs/rollercoaster-dev/projects/10) for detailed tracking.

### Milestones

- ✅ **Phase 1**: Foundation Setup - COMPLETE
  - Turborepo, Bun workspaces, TypeScript project references
- ✅ **Phase 2**: Migrate Shared Packages - COMPLETE
  - ✅ rd-logger v0.3.4 (published to npm with full CI/CD)
  - ✅ openbadges-types v3.2.3 (published to npm)
  - ✅ openbadges-ui v1.3.0 (published to npm)
  - ✅ shared-config (internal)
- ✅ **Phase 3**: Migrate Applications - COMPLETE
  - ✅ openbadges-modular-server (Docker multi-arch publishing)
  - ✅ openbadges-system (Vue 3 + Bun/Hono)
- ✅ **Phase 4**: CI/CD & Publishing - COMPLETE
  - ✅ Progressive CI with Turborepo caching
  - ✅ npm OIDC Trusted Publishing (no tokens needed)
  - ✅ Docker multi-architecture images to GHCR
- 🏗️ **Phase 5**: Cleanup & Documentation - IN PROGRESS
  - ⏳ Documentation improvements ([tracking issues](https://github.com/rollercoaster-dev/monorepo/issues?q=is%3Aissue+is%3Aopen+label%3Adocumentation))
  - ⏳ Archive legacy repositories

## 📚 Documentation

Strategic documentation lives in `apps/docs/`:

- **[Vision & Strategy](apps/docs/vision/)** - now/next/later roadmap
- **[Architecture Decisions (ADRs)](apps/docs/decisions/)** - self-signed badges, local-first, federation
- **[Product Documentation](apps/docs/product/)** - user stories, feature specs

**Package & App Documentation:**

- Each package/app has its own README with usage examples
- [CLAUDE.md](CLAUDE.md) - detailed development context for AI assistants
- [CONTRIBUTING.md](CONTRIBUTING.md) - contribution guidelines

**Project Management:**

- [Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- [All Issues](https://github.com/rollercoaster-dev/monorepo/issues)

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines, including our neurodivergent-friendly development practices.

## 📄 License

Individual packages and applications maintain their original licenses. See each package's LICENSE file for details.

## 🔬 Future Work

### Federation Protocol

Federation is a core vision component for enabling interoperable badge networks. Key architectural questions being explored:

- **Protocol**: AT Protocol, ActivityPub, or custom DID-based?
- **Trust Model**: How do nodes verify each other's badges?
- **Discovery**: How do users find and connect to other nodes?

See [ADR-0003-federation-core-architecture](apps/docs/decisions/ADR-0003-federation-core-architecture.md) for detailed architectural thinking.

### Planned Features

- **Skill Tree Visualization** - Visual learning path representation
- **Data Marketplace** - Consent-based credential sharing
- **Enhanced Mobile Support** - PWA improvements

## 🔗 Links

- [Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- [Issues](https://github.com/rollercoaster-dev/monorepo/issues)
- [Rollercoaster.dev](https://rollercoaster.dev)

## ❓ Questions or Feedback?

Open an issue on the [monorepo](https://github.com/rollercoaster-dev/monorepo/issues) or check existing [discussions](https://github.com/orgs/rollercoaster-dev/discussions).
