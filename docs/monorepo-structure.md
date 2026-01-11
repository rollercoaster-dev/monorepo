# Monorepo Structure

This document details the monorepo architecture, dependency management, and package organization.

## Directory Structure

```
monorepo/
├── apps/                           # Applications
│   ├── openbadges-modular-server/  # Open Badges 2.0/3.0 API server (Docker + Bun/Hono)
│   └── openbadges-system/          # Vue 3 + Bun/Hono full-stack badge management app
├── packages/                       # Shared libraries
│   ├── rd-logger/                  # Structured logging with ADHD-friendly formatting
│   ├── openbadges-types/           # Open Badges TypeScript type definitions
│   ├── openbadges-ui/              # Vue 3 component library for OpenBadges
│   └── shared-config/              # Shared build/lint configurations
├── experiments/                    # Research & prototypes
├── scripts/                        # Build and maintenance scripts
│   ├── install-dependencies.sh     # Auto-run on Claude Code session start
│   ├── migration-checklist.sh      # Validates package migrations
│   └── worktree-manager.sh         # Git worktree management for /auto-milestone
└── .claude/                        # Claude Code configuration
    ├── settings.json               # Team-shared settings (committed)
    └── settings.local.json         # Personal settings (not committed)
```

## Architecture

- **Package Manager**: Bun 1.3.2 with workspaces
- **Build System**: Turborepo for task orchestration and caching
- **TypeScript**: Project references for instant type checking
- **Monorepo Pattern**: Shared packages + independent apps
- **Version Control**: GitHub with Changesets for version management
- **Strict TypeScript**: No any

## Dependency Management Strategy

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

## Published Packages

### @rollercoaster-dev/rd-logger

- **Purpose**: Structured logging with neurodivergent-friendly formatting
- **Location**: `packages/rd-logger/`
- **npm**: [@rollercoaster-dev/rd-logger](https://www.npmjs.com/package/@rollercoaster-dev/rd-logger)

### openbadges-types

- **Purpose**: Open Badges 2.0 and 3.0 TypeScript type definitions
- **Location**: `packages/openbadges-types/`
- **npm**: [openbadges-types](https://www.npmjs.com/package/openbadges-types)

### openbadges-ui

- **Purpose**: Vue 3 component library for Open Badges
- **Location**: `packages/openbadges-ui/`
- **npm**: [openbadges-ui](https://www.npmjs.com/package/openbadges-ui)

### Internal Packages

#### shared-config

- **Purpose**: Shared TypeScript/build configurations
- **Location**: `packages/shared-config/`
- **Note**: Private package, not published to npm

## Working with Specific Packages

```bash
# Run commands in specific packages
bun --filter rd-logger test
bun --filter rd-logger run build

# Add dependencies to a package
bun --filter rd-logger add <package-name>
```

## Environment Variables

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

## Testing

- **Framework**: Bun test runner (native Bun testing)
- **Location**: Tests are colocated with source files (`*.test.ts`)
- **Run all tests**: Use `bun run test:unit` from monorepo root
- **Run package tests**: Use `bun --filter <package> test`
- **Exception**: openbadges-ui uses Vitest (`bun run test`) because Bun doesn't support `.vue` files

> **Important**: Avoid `bun test --filter X` from the root - use `bun run test:unit` instead.
> See [E2E Testing Guide](../apps/openbadges-modular-server/docs/e2e-testing-guide.md) for troubleshooting.

## Related Resources

- [Rollercoaster.dev](https://rollercoaster.dev)
- [GitHub Organization](https://github.com/rollercoaster-dev)
- [CI/CD Workflows](https://github.com/rollercoaster-dev/monorepo/actions)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements)
