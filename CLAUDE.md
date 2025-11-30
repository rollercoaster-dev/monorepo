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
├── apps/                           # Applications
│   ├── openbadges-modular-server/  # ✅ Open Badges 2.0/3.0 API server (Docker + Bun/Hono)
│   └── openbadges-system/          # ✅ Vue 3 + Bun/Hono full-stack badge management app
├── packages/                       # Shared libraries
│   ├── rd-logger/                  # ✅ Structured logging with ADHD-friendly formatting
│   ├── openbadges-types/           # ✅ Open Badges TypeScript type definitions
│   ├── openbadges-ui/              # ✅ Vue 3 component library for OpenBadges
│   └── shared-config/              # Shared build/lint configurations
├── experiments/                    # Research & prototypes
├── scripts/                        # Build and maintenance scripts
│   ├── install-dependencies.sh     # Auto-run on Claude Code session start
│   └── migration-checklist.sh      # Validates package migrations
└── .claude/                        # Claude Code configuration
    ├── settings.json               # Team-shared settings (committed)
    └── settings.local.json         # Personal settings (not committed)
```

## 🏗️ Architecture

- **Package Manager**: Bun 1.3.2 with workspaces
- **Build System**: Turborepo for task orchestration and caching
- **TypeScript**: Project references for instant type checking
- **Monorepo Pattern**: Shared packages + independent apps
- **Version Control**: GitHub with Changesets for version management
- **Strict TypeScript**: No any

## 📦 Dependency Management Strategy

### Shared Dependencies (Root)

Common dev dependencies are consolidated in the root `package.json` to ensure consistent versions across all packages:

| Dependency    | Version     | Purpose                  |
| ------------- | ----------- | ------------------------ |
| `typescript`  | `^5.8.3`    | TypeScript compiler      |
| `eslint`      | `^9.24.0`   | Linting                  |
| `prettier`    | `^3.7.3`    | Code formatting          |
| `@types/bun`  | `latest`    | Bun type definitions     |
| `@types/node` | `^22.15.21` | Node.js type definitions |
| `turbo`       | `^2.0.0`    | Build orchestration      |

### Package-Specific Dependencies

Individual packages should only declare dependencies they specifically need:

- **Build tools**: `tsup`, `vite`, `vue-tsc` (stay in package)
- **Framework-specific types**: `@types/express`, `@types/pg` (stay in package)
- **Test utilities**: `vitest`, `@vue/test-utils` (stay in package)
- **Runtime dependencies**: Always in the package that uses them

### Adding New Dependencies

```bash
# Add to root (shared across all packages)
bun add -d <package-name>

# Add to specific package
bun --filter <package-name> add <package-name>
```

### Why This Pattern?

1. **Single source of truth** for common tooling versions
2. **Bun workspace hoisting** automatically makes root deps available to all packages
3. **Smaller package.json files** in individual packages
4. **Easier upgrades** - update once in root, applies everywhere
5. **Consistent formatting/linting** across the entire monorepo

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
bun dev               # Start all apps in dev mode
bun run build         # Build all packages
bun test              # Run all tests
bun test --coverage   # Run tests with coverage

# Code Quality
bun run lint          # Lint all packages
bun run lint:fix      # Fix linting issues
bun run type-check    # TypeScript type checking
bun run format        # Format code with Prettier
bun run format:check  # Check formatting

# Package Management
bun install           # Install dependencies (auto-runs on session start)
bun run clean         # Clean build artifacts and node_modules

# Versioning (uses Changesets)
bunx changeset        # Create a changeset
bunx changeset version # Bump versions
bunx changeset publish # Publish to npm
```

### Working with Specific Packages

```bash
# Run commands in specific packages
bun --filter rd-logger test
bun --filter rd-logger run build

# Add dependencies to a package
bun --filter rd-logger add <package-name>
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

Migration is **complete** (December 2025).

All packages are published to npm and applications are fully operational:

- ✅ @rollercoaster-dev/rd-logger v0.3.4
- ✅ openbadges-types v3.2.3
- ✅ openbadges-ui v1.3.0
- ✅ openbadges-modular-server (Docker on GHCR)
- ✅ openbadges-system (Vue 3 + Bun/Hono)

### Migration Completion Checklist

Before marking a package migration complete, run:

```bash
./scripts/migration-checklist.sh packages/<package-name>
```

**Automated checks** (script enforces):

- [ ] `bun run lint` passes
- [ ] `bun run build` succeeds
- [ ] `package.json` types path exists after build
- [ ] No orphaned files (_.fixed, _.new, _.bak, _.orig)
- [ ] Documentation uses `bun` (not npm/yarn/pnpm)
- [ ] CSS @import rules at top of files
- [ ] SSR safety hints (warns on unguarded document/window access)

**Manual review** (verify yourself):

- [ ] No commented-out code blocks
- [ ] No TODO comments without issue references
- [ ] README updated for monorepo context
- [ ] Component lifecycle cleanup (`onUnmounted` for DOM modifications)
- [ ] Type guards handle both string and array values (use `typeIncludes()`)
- [ ] Template conditions guard against undefined

## 🧪 Testing

- **Framework**: Bun test runner (native Bun testing, migrated from Jest/Vitest)
- **Coverage**: Aim for high test coverage
- **Location**: Tests are colocated with source files (`*.test.ts`)

Run tests:

```bash
bun test                     # All packages
bun --filter rd-logger test  # Specific package
bun test --coverage          # With coverage report
```

## 📚 Key Documentation

- [README.md](README.md) - Project overview and getting started
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [Migration Project Board](https://github.com/orgs/rollercoaster-dev/projects/10)
- Package-specific READMEs in each `packages/*/README.md`

### Additional Documentation

Available in `apps/docs/`:

- Vision & Strategy docs
- Architecture Decision Records (ADRs)
- Development Processes

## 🤖 Claude Code Configuration

### Auto-Installation

On session start/resume, the `scripts/install-dependencies.sh` script runs automatically to:

- Detect environment (local vs web)
- Install Bun if needed (web only)
- Run `bun install` to update dependencies
- Load environment variables from `.env` (if present)

### Permissions

Team-shared permissions in `.claude/settings.json`:

- GitHub CLI operations (`gh issue`, `gh pr`)
- Tree/cat for file viewing
- bun commands (install, test, build, dev)

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
bunx changeset
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

## 🐳 Publishing Docker Images

The `openbadges-modular-server` application is published as a Docker image to GitHub Container Registry (GHCR).

### Automated Docker Publishing

Docker images are automatically built and published when:

- A new version is merged to `main` (detected via `package.json` version change)
- Changes are pushed to `apps/openbadges-modular-server/` or its dependencies

**Workflow:** `.github/workflows/docker-openbadges-modular-server.yml`

### Docker Image Details

**Registry:** `ghcr.io/rollercoaster-dev/openbadges-modular-server`

**Platforms:** Multi-architecture support

- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, including Apple Silicon, AWS Graviton)

**Tags:**

- `v1.2.3` - Full semantic version
- `v1.2` - Major.minor version
- `v1` - Major version only
- `latest` - Latest release on main branch

### Using the Docker Image

```bash
# Pull the latest image
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:latest

# Run with SQLite (default)
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_TYPE=sqlite \
  -v $(pwd)/data:/data \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:latest

# Run with PostgreSQL
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_TYPE=postgresql \
  -e DATABASE_URL=postgresql://user:pass@host:5432/dbname \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

### Manual Docker Build

You can manually trigger a Docker build from GitHub Actions:

1. Go to Actions → "Docker - OpenBadges Modular Server"
2. Click "Run workflow"
3. Optionally specify a version tag override
4. Choose whether to push to registry (uncheck for testing)

### Local Docker Development

```bash
# Build locally (from monorepo root)
cd apps/openbadges-modular-server
bun run docker:build                    # Single architecture
bun run docker:build:multiarch          # Multi-architecture

# Build and push (requires push access to ghcr.io)
bun run docker:build:multiarch:push
```

**Note:** The Dockerfile has been adapted for monorepo structure and includes workspace dependencies (`rd-logger`, `openbadges-types`).

## 🔗 Related Resources

- [Rollercoaster.dev](https://rollercoaster.dev)
- [GitHub Organization](https://github.com/rollercoaster-dev)
- [npm Package: rd-logger](https://www.npmjs.com/package/@rollercoaster-dev/rd-logger)
- [CI/CD Workflows](https://github.com/rollercoaster-dev/monorepo/actions)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements)

## 💡 Development Tips

1. **First-time setup**: Run `bun install` (auto-runs on Claude session start)
2. **Environment config**: Copy `.env.example` to `.env` for local dev
3. **Working on a package**: Use `bun --filter <package-name>` commands
4. **Creating changes**: Use `bunx changeset` before committing version changes
5. **Testing**: Write tests alongside features (TDD encouraged)
6. **Documentation**: Update READMEs when adding features

## 🎓 Learning Philosophy

This project follows a learning-focused approach:

- Test-driven development (TDD) encouraged
- Design before implementation
- Clear documentation for future maintainers
- Full-stack thinking across packages
- Neurodivergent-friendly processes and tooling
