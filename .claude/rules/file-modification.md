# File Modification Rules

**Applies to:** All file creation, editing, deletion

## Default: Ask First

Before modifying files, consider:

1. Did the user explicitly request this change?
2. Am I in an approved workflow that permits this?
3. Has the relevant gate been passed?

If no to any: Ask before proceeding.

## Explicit Permission Patterns

These phrases grant file modification permission:

- "make the change"
- "implement this"
- "go ahead"
- "fix it"
- "create the file"
- "proceed" (within gated workflow)

These don't grant permission:

- "what do you think?"
- "how would you..."
- "can you show me..."
- "explain how to..."

## Safe Operations (Always Allowed)

- Reading files
- Searching with Glob/Grep
- Running read-only commands (git status, bun test, etc.)
- Analyzing code
- Providing recommendations

## Operations Requiring Permission

- Creating new files (Write tool)
- Editing existing files (Edit tool)
- Git commits
- Git push
- Package installation (bun add)
- Running scripts that modify state

## Recovery

If you've modified a file without permission:

1. Acknowledge the mistake
2. Offer to revert (git checkout)
3. Ask for guidance before continuing
