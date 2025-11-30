# @rollercoaster-dev/rd-logger

A neurodivergent-friendly logger for Rollercoaster.dev projects.

[![CI](https://github.com/rollercoaster-dev/monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/rollercoaster-dev/monorepo/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40rollercoaster-dev%2Frd-logger.svg)](https://www.npmjs.com/package/@rollercoaster-dev/rd-logger)

> **Note:** This package is part of the [Rollercoaster.dev monorepo](https://github.com/rollercoaster-dev/monorepo). For development setup and contributing guidelines, please refer to the [monorepo documentation](https://github.com/rollercoaster-dev/monorepo#readme).

## Installation

```bash
# Using bun (recommended)
bun add @rollercoaster-dev/rd-logger

# Using npm
npm install @rollercoaster-dev/rd-logger

# Using yarn
yarn add @rollercoaster-dev/rd-logger
```

## Usage

Import the logger and start logging:

```typescript
import { Logger } from "@rollercoaster-dev/rd-logger";

const logger = new Logger({
  level: "debug", // Set the desired log level
});

logger.info("Application starting...");
logger.debug("Debugging some initial setup.");
logger.warn("Something seems off.");
logger.error("An error occurred!", new Error("Example error"));
```

## Features

The logger provides several features designed for clarity and ease of use:

- **Neuro-friendly formatting:** Uses colors, icons, and consistent spacing to improve readability, especially for neurodivergent developers.
- **Multiple log levels:** Supports standard levels like `debug`, `info`, `warn`, `error`, `fatal`.
- **Human-readable timestamps:** Displays timestamps in a clear, understandable format.
- **Structured context:** Allows attaching additional key-value data to log messages.
- **Request context propagation (optional):** Integrates with web frameworks to automatically include request IDs in logs for easier tracing.
- **Framework adapters:** Provides specific adapters for seamless integration:
  - **Hono:** Middleware for the Hono framework.
  - **Express:** Middleware for the Express framework.
  - **Generic:** Functions for wrapping arbitrary code blocks or background tasks in a logging context.
- **Customizable:** Allows configuration of log levels, formatting, and more.
- **Accessible:** Aims to follow accessibility best practices in output formatting.

## Query Logger

The package includes an optional `QueryLogger` to help track database query performance.

```typescript
import { Logger, QueryLogger } from "@rollercoaster-dev/rd-logger";

const logger = new Logger();
const queryLogger = new QueryLogger(logger, {
  slowQueryThreshold: 150, // Log queries slower than 150ms as warnings
  logDebugQueries: true, // Log all queries at debug level
});

// Example usage (e.g., inside a database adapter)
const startTime = Date.now();
const result = await databaseClient.execute(sql, params);
const duration = Date.now() - startTime;

// The `requestId` typically comes from the framework adapter's context (e.g., req.id)
const requestId = getCurrentRequestId(); // Replace with your actual method to get the ID
queryLogger.logQuery(sql, params, duration, "PostgreSQL", requestId);

// Later, you can retrieve stats:
const stats = queryLogger.getStats();
console.log("Query Stats:", stats);
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

### Development

```bash
# Install dependencies (from monorepo root)
bun install

# Run tests
bun --filter rd-logger test

# Build the package
bun --filter rd-logger run build
```

### CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow**: Runs on every push to main and pull requests to ensure code quality
- **PR Checks**: Additional checks that run on pull requests
- **Publish Workflow**: Automatically publishes the package to npm when a new release is created

### Versioning and Releases

This project follows [Semantic Versioning](https://semver.org/) and uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

#### Creating a Release

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Create a changeset (from monorepo root)
bunx changeset

# Version packages (automated via CI)
bunx changeset version

# Publish packages (automated via CI)
bunx changeset publish
```

See the [monorepo documentation](https://github.com/rollercoaster-dev/monorepo#publishing-packages) for details on the release process.

## License

MIT
