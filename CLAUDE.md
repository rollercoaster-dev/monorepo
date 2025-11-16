# Rollercoaster.dev Monorepo - Claude Code Context

This file provides context for Claude Code when working in this monorepo.

## 🎯 Project Overview

Rollercoaster.dev is building an Open Badges credentialing system with:
- **Self-signed badges** using Open Badges 3.0 (Verifiable Credentials + DIDs)
- **Local-first architecture** - user data ownership with optional sync
- **Federation capabilities** - interoperable badge networks
- **Neurodivergent-first UX** - accessible, customizable, low cognitive load
- **Skill tree + Backpack** - visualize learning paths and manage credentials

## 📁 Monorepo Structure

```
monorepo/
├── apps/                           # Applications (empty - Phase 3 migration)
├── packages/                       # Shared libraries
│   ├── rd-logger/                  # ✅ Structured logging with ADHD-friendly formatting
│   └── shared-config/              # Shared build/lint configurations
├── experiments/                    # Research & prototypes
├── scripts/                        # Build and maintenance scripts
│   ├── install-dependencies.sh     # Auto-run on Claude Code session start
│   └── update-pnpm.js             # pnpm version updater
└── .claude/                        # Claude Code configuration
    ├── settings.json               # Team-shared settings (committed)
    └── settings.local.json         # Personal settings (not committed)
```

## 🏗️ Architecture

- **Package Manager**: pnpm v10.20.0 with workspaces
- **Build System**: Turborepo for task orchestration and caching
- **TypeScript**: Project references for instant type checking
- **Monorepo Pattern**: Shared packages + independent apps
- **Version Control**: GitHub with Changesets for version management
- **Strict Typescript**: No any

## 📦 Current Packages

### Published Packages (npm)

#### @rollercoaster-dev/rd-logger
- **Purpose**: Structured logging with neurodivergent-friendly formatting
- **Location**: `packages/rd-logger/`
- **Status**: ✅ Migrated, published, full CI/CD
- **Features**:
  - Multiple log levels (debug, info, warn, error, fatal)
  - Colored output with icons for readability
  - QueryLogger for database performance tracking
  - Framework adapters (Hono, Express, Generic)
  - Request context propagation

### Internal Packages

#### shared-config
- **Purpose**: Shared TypeScript/build configurations
- **Location**: `packages/shared-config/`

## 🚀 Development Workflow

### Common Commands

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm test:coverage    # Run tests with coverage

# Code Quality
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm type-check       # TypeScript type checking
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting

# Package Management
pnpm install          # Install dependencies (auto-runs on session start)
pnpm clean            # Clean build artifacts and node_modules

# Versioning (uses Changesets)
pnpm changeset        # Create a changeset
pnpm changeset:version # Bump versions
pnpm changeset:publish # Publish to npm
```

### Working with Specific Packages

```bash
# Run commands in specific packages
pnpm --filter rd-logger test
pnpm --filter rd-logger build

# Add dependencies to a package
pnpm --filter rd-logger add <package-name>
```

## 🌍 Environment Variables

### Local Development
Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

**Common Variables:**
- `NODE_ENV` - Environment mode (development/production/test)
- `LOG_LEVEL` - Logging verbosity (debug/info/warn/error/fatal)
- `DEBUG_QUERIES` - Enable verbose database query logging (true/false)

### Claude Code on the Web
- Environment variables are configured in the Web UI (not .env files)
- The SessionStart hook loads `.env` in local environments
- See `.env.example` for available variables

**Package-Specific Variables:**
- Check `packages/[package-name]/.env.example` for package-specific configuration
- Example: `packages/rd-logger/.env.example`

## 🔄 Migration Status

**Current Phase**: Phase 2 - Migrate Shared Packages (Week 2)
**Timeline**: 6 weeks (Nov 1 - Dec 12, 2025)

### Milestones

- ✅ **Phase 1**: Foundation Setup (Complete)
- 🏗️ **Phase 2**: Migrate Shared Packages (In Progress)
  - ✅ rd-logger (complete with CI/CD)
  - ⏳ openbadges-types, openbadges-ui
  - ⏳ skill-tree package
  - ⏳ badge-image-system evaluation
- ⏳ **Phase 3**: Migrate Applications
  - openbadges-system (Vue 3 + Bun/Hono)
  - openbadges-modular-server (Docker)
  - landing page
- ⏳ **Phase 4**: CI/CD & Publishing
- ⏳ **Phase 5**: Cleanup
- ⏳ **Phase 5.5**: Documentation Consolidation

## 🧪 Testing

- **Framework**: Vitest (for rd-logger, will expand to other packages)
- **Coverage**: Aim for high test coverage
- **Location**: Tests are colocated with source files (`*.test.ts`)

Run tests:
```bash
pnpm test                    # All packages
pnpm --filter rd-logger test # Specific package
pnpm test:coverage           # With coverage report
```

## 📚 Key Documentation

- [README.md](README.md) - Project overview and getting started
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [Migration Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- Package-specific READMEs in each `packages/*/README.md`

### Future Documentation (Phase 5.5)
Will be migrated to `apps/docs/`:
- Vision & Strategy docs
- Architecture Decision Records (ADRs)
- User Stories
- Development Processes

## 🤖 Claude Code Configuration

### Auto-Installation
On session start/resume, the `scripts/install-dependencies.sh` script runs automatically to:
- Detect environment (local vs web)
- Install pnpm if needed (web only)
- Run `pnpm install` to update dependencies
- Load environment variables from `.env` (if present)

### Permissions
Team-shared permissions in `.claude/settings.json`:
- GitHub CLI operations (`gh issue`, `gh pr`)
- Tree/cat for file viewing
- pnpm commands (install, test, build, dev)

Personal permissions can be added to `.claude/settings.local.json` (not committed).

### Hooks
- **SessionStart**: Runs dependency installation
- Uses `$CLAUDE_PROJECT_DIR` for reliable script paths
- Uses `CLAUDE_CODE_REMOTE` to detect web vs local
- Uses `CLAUDE_ENV_FILE` to persist environment variables

## 📦 Publishing Packages

This monorepo uses **Changesets** for version management and publishing.

### Publishing Workflow

**1. Create a Changeset (Manual - Required for Each PR)**
When making changes to a published package, run:
```bash
pnpm changeset
```

This prompts you to:
- Select which packages changed
- Choose version bump type (patch/minor/major)
- Write a changelog entry

Commit the generated `.changeset/*.md` file with your PR.

**2. Automated Release Process**
When your PR is merged to `main`:
- Changesets action detects changeset files
- Creates/updates "Version Packages" PR automatically
- PR includes version bumps and updated CHANGELOGs

**3. Publish to npm**
When "Version Packages" PR is merged:
- Packages are built automatically
- Published to npm using **OIDC Trusted Publishing** (no tokens needed!)
- GitHub releases created automatically
- Provenance attestations generated

### npm OIDC Trusted Publishing

This monorepo uses npm's **Trusted Publishing** (OIDC) for secure, automated releases:

✅ No long-lived npm tokens to manage
✅ No 2FA/OTP prompts
✅ Automatic provenance attestations
✅ Cryptographically verified package origins

**Configuration:**
- Trusted Publisher set up on npmjs.com for each package
- GitHub Actions workflow uses `id-token: write` permission
- npm CLI 11.5.1+ automatically detects and uses OIDC

**Note:** Previously used semantic-release; migrated to Changesets for monorepo compatibility.

## 🔗 Related Resources

- [Rollercoaster.dev](https://rollercoaster.dev)
- [GitHub Organization](https://github.com/rollercoaster-dev)
- [npm Package: rd-logger](https://www.npmjs.com/package/@rollercoaster-dev/rd-logger)
- [CI/CD Workflows](https://github.com/rollercoaster-dev/monorepo/actions)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements)

## 💡 Development Tips

1. **First-time setup**: Run `pnpm install` (auto-runs on Claude session start)
2. **Environment config**: Copy `.env.example` to `.env` for local dev
3. **Working on a package**: Use `pnpm --filter <package-name>` commands
4. **Creating changes**: Use `pnpm changeset` before committing version changes
5. **Testing**: Write tests alongside features (TDD encouraged)
6. **Documentation**: Update READMEs when adding features

## 🎓 Learning Philosophy

This project follows a learning-focused approach:
- Test-driven development (TDD) encouraged
- Design before implementation
- Clear documentation for future maintainers
- Full-stack thinking across packages
- Neurodivergent-friendly processes and tooling
