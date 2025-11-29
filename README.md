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
│   ├── docs/                      # Living documentation
│   └── landing/                   # Marketing website
├── packages/                       # Shared libraries
│   ├── openbadges-types/          # TypeScript types for OB 2.0/3.0
│   ├── openbadges-ui/             # Vue components with neurodivergent themes
│   ├── skill-tree/                # Skill tree visualization & backpack
│   ├── badge-image-system/        # Badge image generation (evaluating)
│   └── rd-logger/                 # Structured logging utility
└── experiments/                    # Research & prototypes
    ├── distributed-badges-concept/ # Federation research
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

- **landing**: Marketing and information website
  - Vue 3 frontend
  - Project showcase and onboarding

### Published Packages (npm)

- **openbadges-types**: TypeScript definitions for Open Badges 2.0 and 3.0
- **openbadges-ui**: Vue 3 component library with 7 neurodivergent-friendly themes
- **rd-logger**: Structured logging with ADHD-friendly formatting

### Internal Packages

- **skill-tree**: Skill tree visualization and backpack UI components
- **badge-image-system**: Badge image generation and S3 storage (under evaluation)

## 🔄 Migration Status

This monorepo is actively being migrated from multiple repositories. See our [migration project](https://github.com/orgs/rollercoaster-dev/projects/10) for current progress.

**Timeline**: 6 weeks (Nov 1 - Dec 12, 2025)

### Milestones

- ✅ **Phase 1**: Foundation Setup (Week 1) - COMPLETE
- 🏗️ **Phase 2**: Migrate Shared Packages (Week 2) ← In progress
  - ✅ rd-logger (migrated with full CI/CD)
  - ⏳ openbadges-types, openbadges-ui
  - ⏳ skill-tree package
  - ⏳ Evaluate badge-image-system integration
- ⏳ **Phase 3**: Migrate Applications (Week 3)
  - openbadges-system, openbadges-modular-server
  - Consolidate landing page
- ⏳ **Phase 4**: CI/CD & Publishing (Week 4)
  - Progressive CI with Turborepo
  - npm publishing for packages
  - Docker publishing for servers
- ⏳ **Phase 5**: Cleanup (Week 5)
- ⏳ **Phase 5.5**: Documentation Consolidation (Week 6)
  - Migrate rc-living-docs-starter (your vision docs)
  - Migrate distributed-badges-concept (architectural research)
  - Archive planning repo (different author, not current vision)

## 📚 Documentation

Comprehensive living documentation will be available in `apps/docs/` after Phase 5.5 migration.

**Key Documents** (coming from rc-living-docs-starter):

- Vision & Strategy - now/next/later roadmap
- Architecture Decisions (ADRs) - self-signed badges, local-first, federation
- User Stories - rich narratives for neurodivergent users
- Development Processes - weekly rituals, triage, contribution guidelines

**For Now:**

- [Migration Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- [All Issues](https://github.com/rollercoaster-dev/monorepo/issues)
- Individual repo CLAUDE.md files (in each package/app after migration)

## 🤝 Contributing

This is an internal monorepo for Rollercoaster.dev projects. For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md) (coming soon).

## 📄 License

Individual packages and applications maintain their original licenses. See each package's LICENSE file for details.

## 🔬 Research & Future Work

### Federation Protocol (Next Phase: 6-12 weeks)

Federation is a core vision component but not yet implemented. Research notes are in `experiments/distributed-badges-concept/`. Key questions:

- **Protocol**: AT Protocol, ActivityPub, or custom DID-based?
- **Trust Model**: How do nodes verify each other's badges?
- **Discovery**: How do users find and connect to other nodes?
- **Sync Strategy**: CouchDB-style replication, IPFS, or custom?

See [ADR-0003-federation-core-architecture](apps/docs/decisions/ADR-0003-federation-core-architecture.md) (after Phase 5.5) for detailed architectural thinking.

### Data Marketplace (Later: 12+ weeks)

User-controlled credential sharing with consent-based monetization.

### Potential Architecture Gaps (To Be Evaluated)

These components are referenced in vision docs but don't yet have dedicated packages. May exist within apps or need extraction:

1. **DID Management**
   - Vision: Self-signed badges using Verifiable Credentials + DIDs
   - Question: Is DID functionality in openbadges-modular-server or needs dedicated package?
   - Consider: `packages/did-manager/` for reusable DID operations

2. **Sync/Replication Engine**
   - Vision: Local-first with optional sync
   - Question: Is sync logic in openbadges-system or needs extraction?
   - Consider: `packages/sync-engine/` for offline-first replication

3. **AI Badge Validation**
   - Vision: AI-powered skill assessment and badge recommendations
   - Question: Where does AI validation live? External service or internal?
   - Consider: `packages/ai-validator/` or separate AI service

4. **Mobile Support**
   - Vision: Mobile-responsive design and progressive web app
   - Question: PWA only or native mobile apps planned?
   - Consider: Capacitor/Tauri wrapper or React Native app

**Action**: These will be evaluated during Phase 2-3 migrations. If functionality exists in apps, consider extracting to shared packages for reusability.

## 🔗 Links

- [Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- [Issues](https://github.com/rollercoaster-dev/monorepo/issues)
- [Rollercoaster.dev](https://rollercoaster.dev)

## ❓ Questions or Feedback?

Open an issue on the [monorepo](https://github.com/rollercoaster-dev/monorepo/issues) or check existing [discussions](https://github.com/orgs/rollercoaster-dev/discussions).
