# @rollercoaster-dev/openbadges-core

Core Open Badges functionality for baking, cryptography, and credentials.

## Purpose

This package provides the foundational implementations for working with Open Badges 2.0 and 3.0 specifications. It includes:

- **Baking**: Badge embedding in PNG and SVG images
- **Crypto**: Key generation, signing, and verification utilities
- **Credentials**: Verifiable Credentials creation and validation
- **Platform Detection**: Runtime environment detection

## Installation

This package is for workspace use only and is not published to npm.

```bash
# In package.json dependencies
"@rollercoaster-dev/openbadges-core": "workspace:*"
```

## Usage

```typescript
import { detectPlatform } from "@rollercoaster-dev/openbadges-core";

const platform = detectPlatform();
console.log(`Running on: ${platform}`);
```

## Package Structure

```
src/
  ├── baking/       # Badge baking implementations
  ├── crypto/       # Cryptographic utilities
  ├── credentials/  # Verifiable Credentials functionality
  ├── types/        # Internal type definitions
  ├── platform.ts   # Platform detection utilities
  └── index.ts      # Main entry point
```

## Development

```bash
# Build the package
bun run build

# Type-check
bun run type-check

# Run tests
bun test

# Lint
bun run lint
```

## Module Status

All modules are currently placeholders. Future issues will populate these with actual implementations extracted from `openbadges-modular-server`.

## License

MIT - See [LICENSE](../../LICENSE) for details.

## Links

- [Monorepo Documentation](../../docs/)
- [Open Badges Specification](https://www.imsglobal.org/spec/ob/v3p0/)
