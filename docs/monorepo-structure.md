# Monorepo Structure

Bun 1.3.7 + Turborepo + TypeScript (strict, no `any`).

## Testing

```bash
bun run test:unit              # Run all tests from root
bun --filter <package> test    # Run tests for specific package
```

- Tests colocated with source (`*.test.ts`)
- Exception: openbadges-ui uses Vitest (`bun run test`) - Bun doesn't support `.vue` files
- Avoid `bun test --filter X` from root

See [E2E Testing Guide](../apps/openbadges-modular-server/docs/e2e-testing-guide.md) for integration tests.

## Environment Variables

```bash
cp .env.example .env  # Local development
```

| Variable        | Purpose                         |
| --------------- | ------------------------------- |
| `NODE_ENV`      | development/production/test     |
| `LOG_LEVEL`     | debug/info/warn/error/fatal     |
| `DEBUG_QUERIES` | Enable verbose DB query logging |

Claude Code Web: Configure in Web UI, not .env files.

## Adding Dependencies

```bash
# Shared (root) - common tooling
bun add -d <package>

# Package-specific
bun --filter <package> add <package>
```

**Root package.json**: typescript, eslint, prettier, turbo, @types/bun, @types/node

**Package-specific**: Build tools (tsup, vite), framework types, test utilities, runtime deps

## Working with Packages

```bash
bun --filter rd-logger test
bun --filter rd-logger run build
bun --filter rd-logger add <package>
```

Each package has its own `CLAUDE.md` with package-specific patterns.

## Directory Structure

```text
monorepo/
├── apps/
│   ├── openbadges-modular-server/  # OB 2.0/3.0 API (Bun/Hono)
│   └── openbadges-system/          # Vue 3 + Bun/Hono full-stack
├── packages/
│   ├── rd-logger/                  # Logging (@rollercoaster-dev/rd-logger)
│   ├── openbadges-types/           # OB types (openbadges-types)
│   ├── openbadges-ui/              # Vue components (openbadges-ui)
│   └── shared-config/              # Build configs (internal)
├── scripts/                        # Build/maintenance scripts
└── .claude/                        # Claude Code config
```

## Related Resources

- [Publishing Guide](publishing-guide.md) - npm OIDC, Docker, Changesets
- [Development Workflows](development-workflows.md) - /work-on-issue, /auto-issue
- [Changesets Docs](https://github.com/changesets/changesets)
