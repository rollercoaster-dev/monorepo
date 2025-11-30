# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-11-21

Initial release after migration to the rollercoaster.dev monorepo.

### Added

- **Badge Directory Components** - Browse and filter badges by issuer (#105)
- **Server-side Filtering** - Badge class filtering by issuer on the backend (#107)
- **Monorepo Integration** - Uses workspace packages:
  - `openbadges-types` for TypeScript definitions
  - `openbadges-ui` for Vue components
  - `shared-config` for ESLint/Prettier/TypeScript configs (#98)

### Changed

- **OB2 Validation** - Aligned validation with 1EdTech format specification (#185)
- **CI Integration** - Added test, lint, and type-check scripts for monorepo CI (#178, #184, #195)

### Infrastructure

- Migrated from standalone repository to monorepo (#52)
- Integrated with Turborepo build system
- Added comprehensive test infrastructure (Vitest for client, Bun test for server)
