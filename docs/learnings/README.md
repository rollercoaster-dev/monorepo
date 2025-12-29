# Project Learnings ("Dollar Store Memory")

This directory contains accumulated knowledge from working on the Rollercoaster.dev monorepo. Expert sub-agents check these learnings before making recommendations.

## Purpose

- **Capture discoveries** - Document things we learned the hard way
- **Avoid repeat mistakes** - Known gotchas and their solutions
- **Establish patterns** - How we do things in this project
- **Accelerate AI assistance** - Experts check here first for context

## Structure

```
docs/learnings/
├── openbadges/     # Open Badges 2.0/3.0 spec learnings
├── vue/            # Vue 3 patterns and gotchas
├── bun-hono/       # Bun runtime and Hono framework
├── typescript/     # TypeScript patterns in this project
└── general/        # Cross-cutting concerns
```

## When to Add a Learning

Add a learning document when you discover:

1. **A non-obvious solution** - Something that took research to figure out
2. **A gotcha** - Something that broke unexpectedly
3. **A pattern decision** - Why we do X instead of Y in this project
4. **Spec compliance** - Requirements from external specs (OB 2.0/3.0)

## Document Template

```markdown
# <Topic Title>

**Discovered:** <YYYY-MM-DD>
**Context:** <issue/PR/exploration that discovered this>
**Applies to:** <frameworks/areas>

## Summary

<1-2 sentences>

## The Learning

<detailed explanation>

## Example

<code or workflow example>

## Related

- <links to related learnings>
- <links to external docs>
```

## How Experts Use This

Each expert sub-agent is instructed to:

1. Check `docs/learnings/<domain>/` before researching
2. Include relevant learnings in their analysis
3. Propose new learnings when discoveries are made

## Contributing

When you discover something worth documenting:

1. Create a new `.md` file in the appropriate subdirectory
2. Use the template above
3. Keep it focused - one learning per file
4. Link to related learnings and external docs
