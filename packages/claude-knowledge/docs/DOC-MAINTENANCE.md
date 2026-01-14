# Documentation Maintenance

Guide for maintaining the documentation index in claude-knowledge.

## Quick Commands

```bash
# Re-index all documentation (incremental, fast)
bun packages/claude-knowledge/scripts/bootstrap-docs.ts

# Search indexed documentation
bun run checkpoint docs search "your query here"

# Check if a specific file is indexed
bun run checkpoint docs status <file-path>

# Clean orphaned doc sections (removed files)
bun run checkpoint docs clean
```

## Maintenance Strategy: Manual Periodic Re-index

The monorepo uses a **manual periodic re-index** approach for documentation maintenance.

### When to Re-index

Run the bootstrap script:

- After adding new documentation files
- After editing existing documentation
- Monthly, or when search results seem stale
- After schema changes to doc indexing system

### Why Manual?

The manual approach is optimal for this monorepo because:

1. **Incremental indexing is fast** - Re-running takes ~100ms for 30 unchanged files (vs ~50s initial index)
2. **Small corpus** - 30 documentation files is manageable
3. **Low friction** - Single command, no setup required
4. **No session overhead** - Session hooks would add latency to every session start
5. **No pre-commit noise** - Pre-commit hooks would run on every commit, even when docs unchanged

### How It Works

The bootstrap script uses content-hash based incremental updates:

1. Hash file content (SHA-256)
2. Compare with stored hash in `doc_index` table
3. Skip unchanged files (no re-embedding)
4. Re-index only modified files
5. Update hash in database

This makes re-runs extremely fast.

## Bootstrap Script Details

Location: `packages/claude-knowledge/scripts/bootstrap-docs.ts`

### Indexing Priority

Files are indexed in priority order:

1. **Root context** - `CLAUDE.md`, `README.md`
2. **Monorepo docs** - `docs/*.md`
3. **Package context** - `packages/*/CLAUDE.md`
4. **Package docs** - `packages/*/docs/*.md`

### Files Skipped

The script automatically skips:

- `node_modules/` (dependency code)
- `.bun-cache/` (build cache)
- `.changeset/README.md` (changeset template)
- `.claude/dev-plans/**` (ephemeral dev plans)

### Output Example

```text
🟢  INFO  Starting documentation bootstrap...
🟢  INFO  [Priority 1] Indexing root context files...
🟢  INFO  Indexed: CLAUDE.md (9 sections)
🟢  INFO  Indexed: README.md (17 sections)
🟢  INFO  [Priority 2] Indexing monorepo docs/...
🟢  INFO  Monorepo docs: 24 indexed, 0 skipped, 0 failed
🟢  INFO  [Priority 3] Indexing package CLAUDE.md files...
🟢  INFO  Indexed: packages/openbadges-types/CLAUDE.md (8 sections)
🟢  INFO  [Priority 4] Indexing package docs/...
🟢  INFO  Documentation Bootstrap Complete
🟢  INFO  Total files indexed: 30
🟢  INFO  Total sections created: 654
🟢  INFO  Total failures: 0
```

### Incremental Re-index Example

```text
🟢  INFO  Starting documentation bootstrap...
🟢  INFO  [Priority 1] Indexing root context files...
🟢  INFO  Skipped (unchanged): CLAUDE.md
🟢  INFO  Skipped (unchanged): README.md
🟢  INFO  [Priority 2] Indexing monorepo docs/...
🟢  INFO  Monorepo docs: 0 indexed, 24 skipped, 0 failed
🟢  INFO  Documentation Bootstrap Complete
🟢  INFO  Total files indexed: 0
🟢  INFO  Total sections created: 0
🟢  INFO  Total failures: 0

Execution time: ~100ms
```

## Search Usage

### Basic Search

```bash
bun run checkpoint docs search "your query"
```

Returns top 10 results by semantic similarity.

### Example Queries

```bash
# Find checkpoint documentation
bun run checkpoint docs search "how does checkpoint work?"

# Find Open Badges docs
bun run checkpoint docs search "Open Badges 3.0 specification"

# Find specific patterns
bun run checkpoint docs search "development workflow gates"
```

### Search Results Format

```text
## Section Heading
   Location: /path/to/file.md#anchor
   Similarity: 72.8%
   Content preview (first ~200 chars)...
```

## Troubleshooting

### No Results Found

**Problem**: Search returns no results for a known topic.

**Solutions**:

1. Check if docs are indexed:
   ```bash
   bun run checkpoint docs status <file-path>
   ```
2. Re-run bootstrap if file not indexed:
   ```bash
   bun packages/claude-knowledge/scripts/bootstrap-docs.ts
   ```

### Stale Results

**Problem**: Search returns outdated content.

**Solutions**:

1. Re-run bootstrap to update index:
   ```bash
   bun packages/claude-knowledge/scripts/bootstrap-docs.ts
   ```
2. Force re-index (future enhancement):
   ```bash
   bun packages/claude-knowledge/scripts/bootstrap-docs.ts --force
   ```

### Orphaned Sections

**Problem**: Search returns results for deleted files.

**Solutions**:

1. Run clean command to remove orphans:
   ```bash
   bun run checkpoint docs clean
   ```
2. Re-run bootstrap to rebuild index:
   ```bash
   bun packages/claude-knowledge/scripts/bootstrap-docs.ts
   ```

### Bootstrap Script Failures

**Problem**: Bootstrap script reports failures.

**Check**:

1. File permissions (ensure files are readable)
2. File encoding (ensure UTF-8)
3. Markdown syntax (malformed markdown may fail to parse)
4. Database permissions (ensure SQLite DB is writable)

**Recovery**:

1. Check error logs for specific file paths
2. Fix problematic files
3. Re-run bootstrap
4. Script returns non-zero exit code on failures

## Alternative Strategies (Not Used)

### Session-Start Hook (Option A)

Automatically re-index on every session start.

**Why not used**:

- Adds 100ms latency to every session (even when docs unchanged)
- Unnecessary for incremental-aware system
- Manual approach is low friction for 30 files

### Pre-Commit Hook (Option B)

Re-index only changed docs on git commit.

**Why not used**:

- Adds complexity to commit workflow
- Runs on every commit (even non-doc commits)
- Git hooks require setup per clone
- Manual approach is simpler and predictable

## Future Enhancements

Potential improvements not in current scope:

- `--force` flag for bootstrap script (force re-embedding)
- Session-start hook integration (inject docs into context)
- Watch mode for development (auto re-index on file save)
- Selective re-index by path pattern
- Status dashboard showing index health
