# @rollercoaster-dev/rd-logger

A neurodivergent-friendly logger for Rollercoaster.dev projects.

[![CI](https://github.com/rollercoaster-dev/rd-logger/actions/workflows/ci.yml/badge.svg)](https://github.com/rollercoaster-dev/rd-logger/actions/workflows/ci.yml)
[![PR Checks](https://github.com/rollercoaster-dev/rd-logger/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/rollercoaster-dev/rd-logger/actions/workflows/pr-checks.yml)

## Installation

```bash
npm install @rollercoaster-dev/rd-logger
# or
yarn add @rollercoaster-dev/rd-logger
# or
pnpm add @rollercoaster-dev/rd-logger
```

## Usage

Import the logger and start logging:

```typescript
import { Logger } from '@rollercoaster-dev/rd-logger';

const logger = new Logger({
  level: 'debug', // Set the desired log level
});

logger.info('Application starting...');
logger.debug('Debugging some initial setup.');
logger.warn('Something seems off.');
logger.error('An error occurred!', new Error('Example error'));
```

## Features

The logger provides several features designed for clarity and ease of use:

*   **Neuro-friendly formatting:** Uses colors, icons, and consistent spacing to improve readability, especially for neurodivergent developers.
*   **Multiple log levels:** Supports standard levels like `debug`, `info`, `warn`, `error`, `fatal`.
*   **Human-readable timestamps:** Displays timestamps in a clear, understandable format.
*   **Structured context:** Allows attaching additional key-value data to log messages.
*   **Request context propagation (optional):** Integrates with web frameworks to automatically include request IDs in logs for easier tracing.
*   **Framework adapters:** Provides specific adapters for seamless integration:
    *   **Hono:** Middleware for the Hono framework.
    *   **Express:** Middleware for the Express framework.
    *   **Generic:** Functions for wrapping arbitrary code blocks or background tasks in a logging context.
*   **Customizable:** Allows configuration of log levels, formatting, and more.
*   **Accessible:** Aims to follow accessibility best practices in output formatting.

## Query Logger

The package includes an optional `QueryLogger` to help track database query performance.

```typescript
import { Logger, QueryLogger } from '@rollercoaster-dev/rd-logger';

const logger = new Logger();
const queryLogger = new QueryLogger(logger, {
  slowQueryThreshold: 150, // Log queries slower than 150ms as warnings
  logDebugQueries: true,   // Log all queries at debug level
});

// Example usage (e.g., inside a database adapter)
const startTime = Date.now();
const result = await databaseClient.execute(sql, params);
const duration = Date.now() - startTime;

// The `requestId` typically comes from the framework adapter's context (e.g., req.id)
const requestId = getCurrentRequestId(); // Replace with your actual method to get the ID
queryLogger.logQuery(sql, params, duration, 'PostgreSQL', requestId);

// Later, you can retrieve stats:
const stats = queryLogger.getStats();
console.log('Query Stats:', stats);
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

### Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the package
pnpm build
```

### CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow**: Runs on every push to main and pull requests to ensure code quality
- **PR Checks**: Additional checks that run on pull requests
- **Publish Workflow**: Automatically publishes the package to npm when a new release is created

### Versioning and Releases

This project follows [Semantic Versioning](https://semver.org/) and uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

#### Creating a Release

To create a new release, you can use one of the following commands:

```bash
# Create a patch release (0.0.x)
pnpm release:patch

# Create a minor release (0.x.0)
pnpm release:minor

# Create a major release (x.0.0)
pnpm release:major

# Create a prerelease (alpha)
pnpm release:alpha

# Create a prerelease (beta)
pnpm release:beta
```

Alternatively, you can use the GitHub Actions workflow "Create Release" to create a new release directly from GitHub.

## License

MIT
