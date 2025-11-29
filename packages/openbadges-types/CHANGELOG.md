# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.2.3](https://github.com/rollercoaster-dev/openbadges-types/compare/v3.2.2...v3.2.3) (2025-04-27)

### Bug Fixes

- resolve circular dependencies in imports ([fc689be](https://github.com/rollercoaster-dev/openbadges-types/commit/fc689be1420915d903c8ea4c2e508879a7144121))

### [3.2.2](https://github.com/rollercoaster-dev/openbadges-types/compare/v3.2.0...v3.2.2) (2025-04-27)

### Bug Fixes

- update package.json exports field for proper TypeScript type resolution ([911717d](https://github.com/rollercoaster-dev/openbadges-types/commit/911717d80ea288ba5232a6fa714747421a23457a))

## [3.2.0](https://github.com/rollercoaster-dev/openbadges-types/compare/v3.1.0...v3.2.0) (2025-04-17)

### Features

- export utility functions for developers ([e9834aa](https://github.com/rollercoaster-dev/openbadges-types/commit/e9834aa3adfb2fdba0322101d41c10c56e8a5c6c))

## [3.1.0](https://github.com/rollercoaster-dev/openbadges-types/compare/v3.0.2...v3.1.0) (2025-04-17)

### Features

- enhance type guards and add direct exports ([f61585f](https://github.com/rollercoaster-dev/openbadges-types/commit/f61585fad4ac70cc68ef89ff47dc4cf80ebfd71f))
- enhance type guards and add direct exports ([e94f575](https://github.com/rollercoaster-dev/openbadges-types/commit/e94f575b6c10d763744f1e367df353c5e7079cd1))

### [3.0.1](https://github.com/rollercoaster-dev/openbadges-types/compare/v3.0.0...v3.0.1) (2025-04-16)

### Features

- add composite type guards and badge normalization utilities for consuming applications ([ee8cd10](https://github.com/rollercoaster-dev/openbadges-types/commit/ee8cd107263e38c33bb90ec25fe8e0e427caaa67))
- expand OB2 sample objects, validation tests, and docs ([d96caa5](https://github.com/rollercoaster-dev/openbadges-types/commit/d96caa52b843ef25e876b1b141bf5a46716b5d40))
- **types:** add Open Badges 2.0 and 3.0 context schemas, mapping table, and type definitions for IdentityObject and CredentialSubject ([ed36adf](https://github.com/rollercoaster-dev/openbadges-types/commit/ed36adfe557a0470dd9670c45aceab88f9541016))
- **validation:** implement AJV schema validation for OB3 credentials and add corresponding tests ([61162d9](https://github.com/rollercoaster-dev/openbadges-types/commit/61162d93154afba0b1c6cc8b759731d5b052c0ad))

### Bug Fixes

- rename jest.config.js to jest.config.cjs for ESM compatibility; remove old file ([819417d](https://github.com/rollercoaster-dev/openbadges-types/commit/819417d30dba7c24c0f5a3d82038a770d50a0797))
- resolve IRI/Evidence type errors in getBadgeEvidence and OB3 test ([a10d649](https://github.com/rollercoaster-dev/openbadges-types/commit/a10d649313217526e923ac849882d71424592fce))

## [3.0.0](https://github.com/rollercoaster-dev/openbadges-types/compare/v1.0.1...v3.0.0) (2025-04-15)

### Features

- **protocol:** add OB3ImageObject and update image fields for OB3 compliance ([68fc659](https://github.com/rollercoaster-dev/openbadges-types/commit/68fc6590da3e01fba913518609a5c6dfb70769b4))
- **tests:** add Jest configuration and update test helpers for OB3 compliance ([d8e75ce](https://github.com/rollercoaster-dev/openbadges-types/commit/d8e75ce6b976dbc9447f244bf649ada14a26eace))

### Bug Fixes

- **test:** support ESM by renaming jest.config.js to jest.config.cjs ([2cae6ce](https://github.com/rollercoaster-dev/openbadges-types/commit/2cae6ce97aac15e053a3af8410c56211e6f8368b))

### Documentation

- add MIT license file ([93715ba](https://github.com/rollercoaster-dev/openbadges-types/commit/93715baf3d512b67a5d818bc77ec3b49833f6b27))

## [2.0.0](https://github.com/rollercoaster-dev/openbadges-types/compare/v1.0.1...v2.0.0) (2025-04-15)

### Features

- **protocol:** add OB3ImageObject and update image fields for OB3 compliance ([68fc659](https://github.com/rollercoaster-dev/openbadges-types/commit/68fc6590da3e01fba913518609a5c6dfb70769b4))
- **tests:** add Jest configuration and update test helpers for OB3 compliance ([d8e75ce](https://github.com/rollercoaster-dev/openbadges-types/commit/d8e75ce6b976dbc9447f244bf649ada14a26eace))

### Bug Fixes

- **test:** support ESM by renaming jest.config.js to jest.config.cjs ([2cae6ce](https://github.com/rollercoaster-dev/openbadges-types/commit/2cae6ce97aac15e053a3af8410c56211e6f8368b))

### Documentation

- add MIT license file ([93715ba](https://github.com/rollercoaster-dev/openbadges-types/commit/93715baf3d512b67a5d818bc77ec3b49833f6b27))

## [2.0.0] - 2024-06-10

> **Note:** This is the first major version bump for protocol and type safety compliance.

### 🚨 Breaking Changes

- **OB3 Protocol Compliance:** The `image` field in OB3 `Issuer`, `Profile`, and `Achievement` types is now `IRI | OB3ImageObject` (was just `IRI`/`string`).
- **Required Fields:** `id`, `type`, `name`, and `url` are now required in OB3 `Issuer` and `Achievement` types.
- **TypeScript Consumers:** You must update your code to provide these required fields and use the new image object format where needed.
- **ESLint/Config:** Migrated to ESLint v9+ flat config (`eslint.config.mjs`). If you contribute, use Node 18+ and ESLint 9+.

### ✨ Added

- `OB3ImageObject` type for strict Open Badges 3.0 image object compliance.
- PR template for consistent contributions.

### 📝 Changed

- Updated documentation: protocol-compliance, migration guide, and examples.
- All tests and helpers updated for stricter type safety.

### 🛠 Migration Notes

- If you see TypeScript errors about missing `id`, `type`, `name`, `url`, or about the `image` field, see the migration notes below.
- Update your OB3 badge objects to use the new `image` field type.
- See `MIGRATION.md` and `docs/protocol-compliance.md` for examples and details.

---

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.0.1](https://github.com/rollercoaster-dev/openbadges-types/compare/v2.0.0...v1.0.1) (2025-04-11)

### Bug Fixes

- set initial version to 1.0.0 ([a759b7b](https://github.com/rollercoaster-dev/openbadges-types/commit/a759b7b60bafc0acd1627f3abca92be9b0313c09))

## 2.0.0 (2025-04-11)

### Features

- enforce strict type safety by disallowing new any types ([75bba75](https://github.com/rollercoaster-dev/openbadges-types/commit/75bba7520fc386323ba1441a92f04387935d2fc8))
- enhance developer experience with ESLint, Prettier, and improved scripts ([2675e31](https://github.com/rollercoaster-dev/openbadges-types/commit/2675e3165c05a68624ac9e6deda185eb20da6a03))
- setup publishing workflow ([47d6427](https://github.com/rollercoaster-dev/openbadges-types/commit/47d6427d4e5a9fb215c8c83c109d6911c6010ce6))

### Bug Fixes

- add legacy-peer-deps flag to CI workflows ([f4f457a](https://github.com/rollercoaster-dev/openbadges-types/commit/f4f457a027182cd4cbc8b340e09efd044dd47514))
- correct order of GitHub Actions steps for pnpm ([7123d8f](https://github.com/rollercoaster-dev/openbadges-types/commit/7123d8f3e23819e75f023198e0d0b13843da71f1))
- migrate from npm to pnpm to resolve dependency conflicts ([4dd2273](https://github.com/rollercoaster-dev/openbadges-types/commit/4dd22735adc31eb06f70e88ce256a96a276ea64d))
- update Node.js requirements to v18.12.0 or higher ([4671685](https://github.com/rollercoaster-dev/openbadges-types/commit/4671685c1db334ae7bf8c2471bb0ebb915f735c7))
- use valid TypeScript command for type checking ([8854d2a](https://github.com/rollercoaster-dev/openbadges-types/commit/8854d2a39e7d7e69be72ebb3c092b5d2cde080a0))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of OpenBadges Types package
- Support for Open Badges 2.0 specification
- Support for Open Badges 3.0 specification
- Type guards and validation utilities
- Comprehensive documentation
