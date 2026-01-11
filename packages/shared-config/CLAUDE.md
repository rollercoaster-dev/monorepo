# shared-config Context

Package-specific context for Claude Code when working in `packages/shared-config/`.

## Purpose

Shared ESLint, TypeScript, and Prettier configurations for the monorepo.

## Key Patterns

### TypeScript Extension

```json
{
  "extends": "@rollercoaster-dev/shared-config/tsconfig"
}
```

### ESLint Extension

```js
// eslint.config.mjs
import { base } from '@rollercoaster-dev/shared-config/eslint';
export default [
  ...base,
  {
    /* overrides */
  },
];

// For Node.js projects:
import { node } from '@rollercoaster-dev/shared-config/eslint';
```

### Prettier Extension

```json
{
  "prettier": "@rollercoaster-dev/shared-config/prettier"
}
```

## Key Settings

- TypeScript: Strict mode, ES2022 target, ESM modules
- ESLint: TypeScript recommended, consistent type imports, `_` prefix for unused vars
- Prettier: 100 chars, 2 spaces, single quotes, trailing commas

## Conventions

- Use `.mjs` for ESLint config files (avoids TS declaration issues)
- This is a private package (not published to npm)
- Override specific rules in package configs when needed
