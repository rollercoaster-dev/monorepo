# @rollercoaster-dev/shared-config

Shared configuration for ESLint, TypeScript, and Prettier across the Rollercoaster.dev monorepo.

## 📦 What's Included

- **TypeScript**: Base tsconfig with strict mode and modern ES2022 target
- **ESLint**: Flat config (v9+) with TypeScript support
- **Prettier**: Opinionated formatting with 100-char line width

## 🚀 Usage

### TypeScript

Extend the base config in your package's `tsconfig.json`:

```json
{
  "extends": "@rollercoaster-dev/shared-config/tsconfig",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### ESLint

Use the shared config in your package's `eslint.config.mjs`:

```js
import { base } from '@rollercoaster-dev/shared-config/eslint';

export default [
  ...base,
  {
    // Your package-specific overrides
  },
];
```

For Node.js/backend projects:

```js
import { node } from '@rollercoaster-dev/shared-config/eslint';

export default [...node];
```

> **Note**: We use `.mjs` for config files to avoid TypeScript type declaration issues with ESLint packages.

### Prettier

Reference the shared config in your package's `package.json`:

```json
{
  "prettier": "@rollercoaster-dev/shared-config/prettier"
}
```

Or extend it in `prettier.config.mjs`:

```js
import baseConfig from '@rollercoaster-dev/shared-config/prettier';

export default {
  ...baseConfig,
  // Your package-specific overrides
};
```

## 🎯 Philosophy

**Consistent**: Same rules across all packages
**Strict**: Catch bugs early with TypeScript strict mode
**Opinionated**: No bikeshedding - Prettier handles formatting
**Extensible**: Override when needed for specific packages

## 🔧 Key Settings

### TypeScript

- ✅ Strict mode enabled
- ✅ No unchecked indexed access
- ✅ Isolated modules
- ✅ ES2022 target
- ✅ ESM module system

### ESLint

- ✅ TypeScript recommended rules
- ✅ Consistent type imports
- ✅ No unused vars (except `_` prefix)
- ✅ Console warnings (allow warn/error)
- ✅ Prettier conflict resolution

### Prettier

- ✅ 100-char line width
- ✅ 2-space indentation
- ✅ Single quotes
- ✅ Trailing commas (ES5)
- ✅ LF line endings

## 📝 Notes

This is a private package - not published to npm. Used only within the monorepo via workspace protocol.
