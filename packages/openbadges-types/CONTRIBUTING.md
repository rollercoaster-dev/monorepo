# Contributing to Open Badges Types

Thank you for your interest in contributing to the Open Badges Types package! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- TypeScript knowledge
- Understanding of Open Badges specifications

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/openbadges-types.git
   cd openbadges-types
   ```
3. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```
4. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/rollercoaster-dev/openbadges-types.git
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
   npm test
   # or
   yarn test
   ```

4. Run linting to ensure your code follows the style guidelines:

   ```bash
   npm run lint
   # or
   yarn lint
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

- Use TypeScript's strict mode
- Prefer interfaces over types for object definitions
- Use branded types for nominal typing (e.g., `IRI`, `DateTime`)
- Document all public interfaces, types, and functions with JSDoc comments
- Follow the existing code structure and organization

### Style Guidelines

This project uses ESLint and Prettier for code formatting:

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Keep line length under 100 characters
- Use camelCase for variables and functions
- Use PascalCase for types, interfaces, and classes

## Testing

All contributions should include appropriate tests:

- Write unit tests for new functionality
- Ensure existing tests pass with your changes
- Aim for high test coverage
- Test both positive and negative cases

Run tests with:

```bash
npm test
# or
yarn test
```

## Documentation

Documentation is a critical part of this project:

- Update the README.md if your changes affect the public API
- Add JSDoc comments to all public interfaces, types, and functions
- Include examples for new functionality
- Update the MIGRATION.md file if your changes affect migration between versions

## Release Process

The release process is handled by the maintainers:

1. Maintainers will review and merge approved PRs
2. Maintainers will update the version according to semantic versioning
3. Maintainers will create a new release on GitHub
4. The CI/CD pipeline will publish the new version to npm

**For a detailed, step-by-step release and changelog workflow, see:**
[.github/RELEASE_CHECKLIST.md](.github/RELEASE_CHECKLIST.md)

## Adding New Types

When adding new types:

1. Place them in the appropriate directory (`v2/`, `v3/`, or `shared/`)
2. Export them from the relevant index.ts file
3. Add appropriate JSDoc comments
4. Add type guards if applicable
5. Add tests for the new types
6. Update documentation to reflect the new types

## Questions?

If you have any questions or need help, please:

1. Check existing issues to see if your question has been answered
2. Open a new issue with the "question" label
3. Reach out to the maintainers

Thank you for contributing to Open Badges Types!
