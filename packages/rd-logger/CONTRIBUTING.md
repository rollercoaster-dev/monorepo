# Contributing to RD Logger

Thank you for your interest in contributing to the RD Logger package! This document provides guidelines and instructions for contributing.

## Table of Contents

* [Code of Conduct](#code-of-conduct)
* [Getting Started](#getting-started)
* [Development Workflow](#development-workflow)
* [Pull Request Process](#pull-request-process)
* [Coding Standards](#coding-standards)
* [Testing](#testing)
* [Documentation](#documentation)
* [Release Process](#release-process)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## Getting Started

### Prerequisites

* Node.js (v18 or later)
* pnpm
* TypeScript knowledge

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/rd-logger.git
   cd rd-logger
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/rollercoaster-dev/rd-logger.git
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   ```
2. Make your changes, following the [coding standards](#coding-standards)

3. Run tests to ensure your changes don't break existing functionality:
   ```bash
   pnpm test
   ```
4. Run linting to ensure your code follows the style guidelines:
   ```bash
   pnpm lint
   ```
5. Commit your changes with a descriptive commit message:
   ```bash
   git commit -m "feat: add support for new feature"
   # or
   git commit -m "fix: resolve issue with type definition"
   ```
6. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
7. Create a Pull Request from your fork to the original repository

## Pull Request Process

1. Ensure your PR includes tests for any new functionality
2. Update documentation to reflect any changes
3. Ensure all tests and linting pass
4. Fill out the PR template completely
5. Request a review from a maintainer
6. Address any feedback from reviewers
7. Once approved, a maintainer will merge your PR

## Coding Standards

This project follows strict coding standards to maintain consistency and quality:

### TypeScript Guidelines

* Use TypeScript's strict mode
* Prefer interfaces over types for object definitions
* Document all public interfaces, types, and functions with JSDoc comments
* Follow the existing code structure and organization

### Style Guidelines

This project uses ESLint and Prettier for code formatting:

* Use 2 spaces for indentation
* Use single quotes for strings
* Add semicolons at the end of statements
* Keep line length under 100 characters
* Use camelCase for variables and functions
* Use PascalCase for types, interfaces, and classes

## Testing

All contributions should include appropriate tests:

* Write unit tests for new functionality
* Ensure existing tests pass with your changes
* Aim for high test coverage
* Test both positive and negative cases

Run tests with:

```bash
pnpm test
```

## Documentation

Documentation is a critical part of this project:

* Update the README.md if your changes affect the public API
* Add JSDoc comments to all public interfaces, types, and functions
* Include examples for new functionality

## Release Process

The release process is handled by the maintainers:

1. Maintainers will review and merge approved PRs
2. Maintainers will update the version according to semantic versioning
3. Maintainers will create a new release on GitHub
4. The CI/CD pipeline will publish the new version to npm

**For a detailed, step-by-step release and changelog workflow, see:** [.github/RELEASE_CHECKLIST.md](.github/RELEASE_CHECKLIST.md)

## Questions?

If you have any questions or need help, please:

1. Check existing issues to see if your question has been answered
2. Open a new issue with the "question" label
3. Reach out to the maintainers

Thank you for contributing to RD Logger!
