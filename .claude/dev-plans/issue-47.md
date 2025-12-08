# Development Plan: Issue #47

## Issue Summary
Simplify Docker workflow: auto-build on changes instead of version detection

**Current Problem:**
- Docker builds only trigger when package.json version changes
- Requires manual version bumps before deployment
- Easy to forget and feels unnecessarily manual

**Goal:**
- Auto-build Docker images on every merge to main that touches the app
- Use commit SHA + semver + latest tags for flexibility
- Eliminate manual version bump requirement for deployments

## Complexity Assessment
**SMALL** (~150 lines modified)
- Single workflow file modification
- Documentation updates
- No code changes to application logic
- 2-3 atomic commits expected

## Dependencies
- No blocking dependencies
- Issue is ready for implementation

## Affected Files
1. `.github/workflows/docker-openbadges-modular-server.yml` - Main workflow changes
2. `CLAUDE.md` - Update Docker publishing section
3. `apps/openbadges-modular-server/CLAUDE.md` - Update Docker publishing section
4. `apps/openbadges-modular-server/docs/docker-deployment-guide.md` - Update tagging strategy

## Implementation Steps

### Step 1: Update GitHub Actions Workflow
**File:** `.github/workflows/docker-openbadges-modular-server.yml`

**Changes:**
1. Remove `check-version` job entirely (lines 37-79)
2. Update `docker` job to remove dependency on version check:
   - Remove `needs: check-version` 
   - Remove conditional `if: needs.check-version.outputs.version_changed == 'true'`
3. Update version determination step:
   - Get version from package.json directly
   - Generate commit SHA tag
4. Update metadata/tags section:
   - Add `sha-{sha}` tag (short commit SHA, 7 chars)
   - Keep `v{version}` from package.json
   - Keep semantic version parsing (major.minor, major)
   - Keep `latest` tag
5. Update summary output to mention new tagging strategy

**New tag structure:**
```yaml
tags: |
  # Commit SHA (immutable, traceable)
  type=sha,prefix=sha-
  # Full semantic version from package.json (e.g., v1.2.3)
  type=raw,value=${{ steps.version.outputs.version }}
  # Major.minor version (e.g., v1.2)
  type=semver,pattern={{major}}.{{minor}},value=${{ steps.version.outputs.version }}
  # Major version (e.g., v1)
  type=semver,pattern={{major}},value=${{ steps.version.outputs.version }}
  # Latest tag
  type=raw,value=latest,enable={{is_default_branch}}
```

**Result:** Workflow builds on any push to main affecting the app, regardless of version changes.

### Step 2: Update Root CLAUDE.md Documentation
**File:** `CLAUDE.md`

**Changes:**
1. Update "Automated Docker Publishing" section (lines 329-336):
   - Change trigger description: "on every merge to main that touches the app"
   - Remove mention of version change detection
2. Update "Docker Image Details" section (lines 338-356):
   - Add SHA tag to the list
   - Update description to reflect new auto-build behavior
3. Update usage examples to show SHA-based deployment option

**New content:**
```markdown
### Automated Docker Publishing

Docker images are automatically built and published when:

- Changes are merged to `main` that affect the app or its dependencies
- Manual workflow trigger via GitHub Actions UI

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

**Note:** Version in package.json is still used for semantic versioning tags, but builds are no longer gated by version changes.
```

### Step 3: Update App-Specific CLAUDE.md
**File:** `apps/openbadges-modular-server/CLAUDE.md`

**Changes:**
1. Update "Automated Docker Publishing" section (lines 75-77):
   - Remove version change detection mention
   - Add SHA tag information
2. Update available tags list to include SHA tags

### Step 4: Update Docker Deployment Guide
**File:** `apps/openbadges-modular-server/docs/docker-deployment-guide.md`

**Changes:**
1. Add section explaining new tagging strategy after "Quick Start" section
2. Update pull examples to show different tag options
3. Add best practices for production (use SHA or semver, not latest)

**New section to add:**
```markdown
## Image Tagging Strategy

The OpenBadges Modular Server uses multiple Docker image tags to support different deployment workflows:

### Available Tags

- **SHA tags** (`sha-c7b8f5d`): Immutable, tied to specific commit. Best for production deployments requiring exact version tracking.
- **Semantic version** (`v1.2.3`): Full version from package.json. Updated manually for releases.
- **Partial versions** (`v1.2`, `v1`): Track latest patch/minor releases. Auto-update within version range.
- **Latest** (`latest`): Always points to most recent build. Good for development, avoid in production.

### Choosing the Right Tag

**Production deployments:**
```bash
# Best: Immutable SHA tag for exact traceability
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:sha-c7b8f5d

# Good: Full semantic version for stable releases
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:v1.2.3
```

**Development/Testing:**
```bash
# Latest changes from main branch
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

### Build Triggers

Images are automatically built and published when:
- Any changes are merged to `main` affecting the app or its workspace dependencies
- Manual workflow trigger via GitHub Actions UI

No manual version bumps required for builds to trigger.
```

## Testing Strategy
1. Create feature branch
2. Make workflow changes
3. Verify workflow syntax is valid
4. Update documentation
5. Create PR (will not trigger build until merged to main)
6. After merge, verify:
   - Build triggers automatically
   - All expected tags are created
   - Multi-architecture manifest is correct

## Success Criteria
- [ ] Workflow builds on every merge to main affecting the app
- [ ] SHA tags are generated correctly
- [ ] Semantic version tags still work from package.json
- [ ] Latest tag updates appropriately
- [ ] Documentation accurately reflects new behavior
- [ ] No manual version bump required for deployment

## Rollback Plan
If issues arise:
1. Revert workflow changes via git revert
2. Previous version-gated behavior will resume
3. No data loss or service interruption (only affects future builds)

## Estimated Effort
- Implementation: 30-45 minutes
- Testing: 15 minutes (verify workflow syntax, documentation)
- PR creation: 10 minutes
- Total: ~1 hour

## Notes
- This only affects Docker image builds, not npm package publishing
- npm packages continue using Changesets workflow
- Version in package.json is still meaningful for semantic version tags
- Manual version bumps can still be done for major releases
