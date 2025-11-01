# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.3.1](https://github.com/rollercoaster-dev/rd-logger/compare/v0.3.0...v0.3.1) (2025-06-07)


### Features

* enhance logger functionality with precise timestamp formatting and remove relative time option ([abb2e14](https://github.com/rollercoaster-dev/rd-logger/commit/abb2e14dd51961f3ba6413862794e55bfffb1a65))

## [0.3.0](https://github.com/rollercoaster-dev/rd-logger/compare/v0.2.1...v0.3.0) (2025-05-06)


### Features

* Configure package.json exports and add vitest for validation ([041436a](https://github.com/rollercoaster-dev/rd-logger/commit/041436ac02244af54ee2cf0b96e3f2915ee68bcf))

### [0.2.1](https://github.com/rollercoaster-dev/rd-logger/compare/v0.2.0...v0.2.1) (2025-05-03)


### Bug Fixes

* lazily initialize FileTransport to prevent path errors during module load ([58d6fdd](https://github.com/rollercoaster-dev/rd-logger/commit/58d6fdd44a9cb17126cc174141f82300bb29724a))

## [0.2.0](https://github.com/rollercoaster-dev/rd-logger/compare/v0.1.0...v0.2.0) (2025-04-29)


### Features

* implement logger improvements - dynamic config, async file logging, and extensibility ([b89968b](https://github.com/rollercoaster-dev/rd-logger/commit/b89968b249792ff1f0b1a806e33175cc51f2c921))
* implement sensitive data protection ([98a390e](https://github.com/rollercoaster-dev/rd-logger/commit/98a390e91c1f9a9d41d3002a28f810ae75e92072))


### Bug Fixes

* add error handling around file transport initialization ([0a21254](https://github.com/rollercoaster-dev/rd-logger/commit/0a212548fedcb02bfdb7c1037e094aeeed9b689f))
* correct formatError parameter type ([6c8a5c6](https://github.com/rollercoaster-dev/rd-logger/commit/6c8a5c6569f276c85e04c4c57c9e9836c172f966))
* fix linting errors and add pre-push hooks for typecheck and linting ([d5fe0b0](https://github.com/rollercoaster-dev/rd-logger/commit/d5fe0b0b18f27d2492716baf6929414637e491d1))

## 0.1.0 (2025-04-24)


### Features

* add project docs and remove Elysia adapter ([d44f4d4](https://github.com/rollercoaster-dev/rd-logger/commit/d44f4d419966417e8fe6ab1c99f738d8499def1a))


### Bug Fixes

* correct order of steps in GitHub Actions workflows to install pnpm before using it ([0b1332d](https://github.com/rollercoaster-dev/rd-logger/commit/0b1332d5f71458aa74ab54000988250b969c8e89))

## [0.1.0] - 2025-04-24

### Added
- Initial project setup with TypeScript, ESM support, and Jest testing
- Core logger implementation with multiple log levels
  - Support for debug, info, warn, error, and fatal log levels
  - Human-readable timestamps
  - Colorized output with icons for better readability
  - Structured context support
- Framework adapters for web applications
  - Hono adapter for Hono framework integration
  - Express adapter for Express.js applications
  - Generic adapter for non-web applications
- Query logger for database query performance tracking
- Comprehensive documentation in README.md
- GitHub Actions workflows for CI/CD
  - Continuous integration with Node.js 18.x and 20.x
  - Pull request checks with test coverage
  - Automated release and publishing process
- Unit and integration tests with Jest
- Conventional commits and semantic versioning setup
