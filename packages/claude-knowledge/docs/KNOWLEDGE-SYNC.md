# Knowledge Sync (Git-Based)

> Sync learnings, patterns, and mistakes across machines via git using JSONL export/import.

## What It Does

The knowledge sync feature lets you version-control your accumulated knowledge (learnings, patterns, mistakes) and share it across machines through git. The database (`.claude/execution-state.db`) is gitignored, but the JSONL export can be committed.

## How It Works

### Automatic Sync

**On session start:**

- Checks if `.claude/knowledge.jsonl` exists and is newer than the database
- If yes, automatically imports the JSONL file
- Deduplicates by `content_hash` (for learnings) and entity ID
- Keeps the newer entry when conflicts occur

**On session end:**

- Automatically exports all knowledge entities to `.claude/knowledge.jsonl`
- Ready to commit and push to git

### Deduplication Strategy

When importing from JSONL:

1. **Learning deduplication**: Uses `content_hash` (SHA-256 of content)
   - Same content = same hash → skip or update existing entry
   - Keeps entry with newer `updated_at` timestamp

2. **Pattern/Mistake deduplication**: Uses entity ID
   - Same ID = same entity → skip or update existing entry
   - Keeps entry with newer `updated_at` timestamp

3. **Relationships**: Recreated from JSONL based on entity references

### Git Workflow

```bash
# Machine 1: Make changes during session
# (session end auto-exports to .claude/knowledge.jsonl)

git add .claude/knowledge.jsonl
git commit -m "feat(knowledge): add API validation learnings"
git push

# Machine 2: Pull changes
git pull
# (next session start auto-imports if JSONL is newer)
```

## Manual Commands

```bash
# Export knowledge to JSONL
bun checkpoint knowledge export-knowledge [--output <path>]

# Import knowledge from JSONL
bun checkpoint knowledge import-knowledge [--input <path>]
```

**Default path**: `.claude/knowledge.jsonl`

### Export Output

```json lines
{"type":"Learning","id":"learning-123","data":{"content":"Always validate...","codeArea":"API","confidence":0.9},"created_at":"2025-01-25T10:00:00Z","updated_at":"2025-01-25T10:00:00Z"}
{"type":"Pattern","id":"pattern-456","data":{"name":"Zod Validation","description":"Use Zod for...","codeArea":"API"},"created_at":"2025-01-25T10:00:00Z","updated_at":"2025-01-25T10:00:00Z"}
```

Each line is a complete JSON object representing one entity.

## Git Conflicts

If two machines add different learnings and you get a git conflict:

1. **Accept both sides** (manually merge the JSONL lines)
2. Commit the merged file
3. Next session start will deduplicate automatically

The JSONL format is line-based, making conflicts easier to resolve than binary database formats.

## Known Limitations

These are documented in [#624](https://github.com/rollercoaster-dev/monorepo/issues/624) for future improvement:

- **Full export**: Currently exports entire database each time (not incremental)
- **No schema versioning**: Format changes could break old files
- **Manual conflict resolution**: Git conflicts require manual merge (no CRDT)
- **No compression**: Large knowledge bases create large JSONL files

These aren't blockers for the core use case but would improve the feature for power users.

## File Structure

```
.claude/
├── execution-state.db    # SQLite database (gitignored)
└── knowledge.jsonl       # JSONL export (tracked in git)
```

## Integration with Sessions

The sync is integrated into the session lifecycle:

```typescript
// onSessionStart hook
if (jsonlIsNewer()) {
  await importFromJSONL(".claude/knowledge.jsonl");
}

// onSessionEnd hook
await exportToJSONL(".claude/knowledge.jsonl");
```

See `packages/claude-knowledge/src/session/hooks.ts` for implementation details.

## Related Issues

- [#608](https://github.com/rollercoaster-dev/monorepo/issues/608) - Initial implementation
- [#624](https://github.com/rollercoaster-dev/monorepo/issues/624) - Future improvements
