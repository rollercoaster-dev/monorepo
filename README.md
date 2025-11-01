# Rollercoaster.dev Monorepo

A unified monorepo for the Rollercoaster.dev ecosystem, containing all Open Badges applications, shared packages, and experimental projects.

## 🏗️ Architecture

This monorepo uses:
- **pnpm workspaces** for package management
- **Turborepo** for task orchestration and caching
- **TypeScript project references** for instant type checking

## 📁 Structure

```
monorepo/
├── apps/                    # Applications
│   ├── openbadges-system/  # Vue 3 + Bun/Hono badge system
│   ├── openbadges-modular-server/  # Modular badge server (Docker)
│   ├── docs/               # Consolidated documentation
│   └── landing/            # Rollercoaster.dev landing page
├── packages/               # Shared packages
│   ├── openbadges-types/  # Shared TypeScript types
│   ├── openbadges-ui/     # Vue component library
│   └── rd-logger/         # Logging utility
└── experiments/            # Experimental projects
    └── distributed-badges-concept/
```

## 🚀 Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) >= 8.0.0
- [Bun](https://bun.sh/) >= 1.0.0 (for backend apps)
- [Node.js](https://nodejs.org/) >= 20.0.0

### Installation

```bash
# Clone the repository
gh repo clone rollercoaster-dev/monorepo
cd monorepo

# Install dependencies
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific app
pnpm --filter openbadges-system dev

# Build all packages
pnpm build

# Run tests across all packages
pnpm test
```

## 📦 Packages

### Published Packages

- **openbadges-types**: Shared TypeScript types for Open Badges 2.0 and 3.0
- **openbadges-ui**: Vue 3 component library with neurodivergent-friendly themes
- **rd-logger**: Structured logging utility

### Applications

- **openbadges-system**: Full-stack Vue 3 + Bun/Hono badge issuance system
- **openbadges-modular-server**: Domain-driven Open Badges server (publishes Docker images)
- **landing**: Rollercoaster.dev marketing site

## 🔄 Migration Status

This monorepo is actively being migrated from multiple repositories. See our [migration project](https://github.com/orgs/rollercoaster-dev/projects/10) for current progress.

**Migration Timeline**: 5 weeks (Nov 1 - Dec 6, 2025)

### Milestones

- ✅ Phase 1: Foundation Setup (Week 1)
- ⏳ Phase 2: Migrate Shared Packages (Week 2)
- ⏳ Phase 3: Migrate Applications (Week 3)
- ⏳ Phase 4: CI/CD & Publishing (Week 4)
- ⏳ Phase 5: Documentation & Cleanup (Week 5)

## 📚 Documentation

- [Migration Plan](./docs/migration-plan.md) (coming soon)
- [Development Guide](./docs/development.md) (coming soon)
- [Architecture Decisions](./docs/architecture.md) (coming soon)

## 🤝 Contributing

This is an internal monorepo for Rollercoaster.dev projects. For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md) (coming soon).

## 📄 License

Individual packages and applications maintain their original licenses. See each package's LICENSE file for details.

## 🔗 Links

- [Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- [Issues](https://github.com/rollercoaster-dev/monorepo/issues)
- [Rollercoaster.dev](https://rollercoaster.dev)
