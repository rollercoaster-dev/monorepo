# Task: Create Reusable Logger Package

## Overview

Create a standalone, reusable logger package based on the existing logger implementation in the openbadges-modular-server. This package will provide consistent logging behavior across all Rollercoaster.dev repositories.

## Background

The openbadges-modular-server includes a well-designed, neuro-friendly logging system with features like:
- Multiple log levels (debug, info, warn, error, fatal)
- Neuro-friendly formatting with color-coding, icons, and proper spacing
- Human-readable timestamps with relative time support
- Structured context for log entries
- Environment-specific configuration
- Request context propagation
- Stack trace formatting
- File output support
- Special error object handling

Rather than duplicating this code across repositories, we should extract it into a standalone package that can be imported and used consistently.

## Steps

### 1. Create a New Package Repository

- [x] Create a new GitHub repository named `rd-logger` under the rollercoaster-dev organization
- [x] Initialize the repository with a basic package structure that includes source files, tests, configuration files, and documentation

### 2. Extract and Adapt the Logger Code

- [x] Extract the core logger implementation from `src/utils/logging/logger.service.ts`
- [x] Extract the request context middleware from `src/utils/logging/request-context.middleware.ts` (Now in `src/core/request-context.ts`)
- [x] Extract the query logger from `src/infrastructure/database/utils/query-logger.service.ts` (Now in `src/core/query-logger.ts`)
- [x] Adapt the code to work as a standalone package:
  - [x] Remove dependencies on the application's config system
  - [x] Create a configuration interface for the logger (`src/core/logger.config.ts`)
  - [x] Implement sensible defaults
  - [x] Make framework-specific parts (like Elysia middleware) optional or pluggable

### 3. Create Framework-Specific Adapters

- [x] Create adapters for different frameworks:
  - [x] Elysia adapter (for Bun applications) (`src/adapters/elysia.ts`)
  - [x] Hono adapter (for the rd-monolith) (`src/adapters/hono.ts`)
  - [x] Express adapter (for potential Express applications) (`src/adapters/express.ts`)
  - [x] Generic adapter (for non-web applications) (`src/adapters/generic.ts`)

### 4. Package Configuration

- [x] Set up package.json with:
  - [x] Dependencies (chalk, etc.)
  - [x] Build scripts
  - [x] TypeScript configuration
  - [x] Export configuration
- [x] Configure the package to support ESM (Added `"type": "module"`, updated `tsconfig.json`, `jest.config.cjs`)

### 5. Documentation

- [ ] Create comprehensive documentation:
  - [ ] Installation instructions
  - [ ] Basic usage examples
  - [ ] Configuration options
  - [ ] Framework-specific integration guides
  - [ ] Advanced usage examples
  - [ ] Add coverage badge to README
  - [x] Add documentation for Query Logger adapter
  - [ ] Add links to CONTRIBUTING.md and CODE_OF_CONDUCT.md in README

### 6. Testing

- [x] Write initial unit tests for core logger functionality (`src/core/__tests__/logger.service.test.ts`)
- [x] Create integration tests for framework adapters (Express, Hono)
- [x] Create integration tests for Generic adapter
- [x] Set up initial Jest configuration (`jest.config.cjs` for ESM)
- [x] Resolved initial testing setup issues (tests are passing)
- [x] Set up GitHub Actions for CI/CD

### 7. Publishing

- [ ] Set up npm publishing workflow
- [ ] Publish the package to npm under the @rollercoaster-dev organization

## Implementation Details

### Core Components

1. **Logger Service**
   - Main logging functionality with multiple log levels
   - Formatting and output handling
   - Context and error handling

2. **Request Context**
   - Request ID generation and propagation
   - Request timing and metrics
   - Framework-specific adapters

3. **Query Logger**
   - SQL query logging and performance tracking
   - Slow query detection
   - Query statistics

## Package Usage Patterns

### Basic Usage

The package should provide a simple way to create a logger instance with custom configuration options. Users should be able to log messages at different levels with optional context objects.

### Framework Integration

The package should provide middleware or plugins for different frameworks (Elysia, Hono, Express) that handle:
- Request ID generation and propagation
- Request/response logging
- Error handling and logging

### Database Integration

The package should provide adapters for different database clients to log queries, track performance, and identify slow queries.

## Success Criteria

- Package is published to npm and can be installed in other projects
- Logger works consistently across different frameworks
- All features from the original implementation are preserved
- Documentation is comprehensive and easy to follow
- Tests provide good coverage of functionality
- Package is used successfully in at least two repositories (openbadges-modular-server and rd-monolith)

## Accessibility Considerations

Based on research into neurodiversity and accessibility best practices, consider the following enhancements beyond the initial neuro-friendly features:

1.  **Reduce Sensory Overload:**
    *   Prioritize clean, simple formatting.
    *   Offer highly customizable themes (colors, icons, layout) including high-contrast, low-contrast, and colorblind-friendly options (check defaults against WCAG contrast ratios).
    *   Consider a "minimal" or "quiet" output mode to reduce visual clutter.

2.  **Support Different Processing Needs:**
    *   Ensure clear, consistent structure (icons, spacing, indentation).
    *   Provide configurable verbosity beyond standard log levels (e.g., toggle default display of stack traces, context details).
    *   Ensure output format facilitates easy filtering/searching (e.g., optional structured JSON output).

3.  **Enhance Customization:**
    *   Allow users extensive control over formatting: colors, icons/symbols, timestamp format (relative/absolute, custom formats), layout (single/multi-line), information density.

4.  **Maintain Consistency:**
    *   Ensure strict consistency in format, icons, and terminology across all log messages and levels.

5.  **Avoid Distractions:**
    *   Ensure logger output contains no blinking or animated elements.

6.  **Documentation:**
    *   Clearly document all customization options, especially those related to accessibility, with examples.
