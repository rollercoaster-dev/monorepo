# Publishing Guide

This document covers publishing packages to npm and Docker images to GHCR.

## npm Publishing with Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### Creating a Changeset

When making changes to a published package, run:

```bash
bunx changeset
```

This prompts you to:

- Select which packages changed
- Choose version bump type (patch/minor/major)
- Write a changelog entry

Commit the generated `.changeset/*.md` file with your PR.

### Automated Release Process

When your PR is merged to `main`:

1. Changesets action detects changeset files
2. Creates/updates "Version Packages" PR automatically
3. PR includes version bumps and updated CHANGELOGs

When "Version Packages" PR is merged:

1. Packages are built automatically
2. Published to npm using OIDC Trusted Publishing
3. GitHub releases created automatically
4. Provenance attestations generated

### npm OIDC Trusted Publishing

This monorepo uses npm's Trusted Publishing (OIDC) for secure, automated releases:

- No long-lived npm tokens to manage
- No 2FA/OTP prompts
- Automatic provenance attestations
- Cryptographically verified package origins

**Configuration:**

- Trusted Publisher set up on npmjs.com for each package
- GitHub Actions workflow uses `id-token: write` permission
- npm CLI 11.5.1+ automatically detects and uses OIDC

## Docker Publishing

The `openbadges-modular-server` application is published as a Docker image to GitHub Container Registry (GHCR).

### Automated Docker Publishing

Docker images are automatically built and published when:

- Changes are merged to `main` that affect the app or its workspace dependencies
- Manual workflow trigger via GitHub Actions UI

No manual version bumps required for builds to trigger.

**Workflow:** `.github/workflows/docker-openbadges-modular-server.yml`

### Docker Image Details

**Registry:** `ghcr.io/rollercoaster-dev/openbadges-modular-server`

**Platforms:** Multi-architecture support

- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, including Apple Silicon, AWS Graviton)

**Tags:**

- `sha-c7b8f5d` - Commit SHA (immutable, exact code traceability)
- `v1.2.3` - Full semantic version from package.json
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

The Dockerfile has been adapted for monorepo structure and includes workspace dependencies (`rd-logger`, `openbadges-types`).
