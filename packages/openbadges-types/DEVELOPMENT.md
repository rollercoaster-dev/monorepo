# Development Guide

This document provides guidelines and instructions for contributors to the OpenBadges Types package.

## Getting Started

### Prerequisites

- Node.js (v18.12.0 or higher)
- pnpm (v10 or higher)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/rollercoaster-dev/openbadges-types.git
   cd openbadges-types
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

## Development Workflow

### Building the Package

To build the package:

```bash
pnpm build
```

For development with automatic rebuilding:

```bash
pnpm dev
```

### Code Style and Linting

This project uses ESLint for linting and Prettier for code formatting.

To check for linting issues:

```bash
pnpm lint
```

To automatically fix linting issues:

```bash
pnpm lint:fix
```

To format code with Prettier:

```bash
pnpm format
```

To check if files are properly formatted:

```bash
pnpm format:check
```

### Testing

To run tests:

```bash
pnpm test
```

To run tests in watch mode:

```bash
pnpm test:watch
```

To run tests with coverage:

```bash
pnpm test:coverage
```

### Validation

To validate the codebase (lint, format check, and test):

```bash
pnpm validate
```

### Package Structure Validation

To validate the package structure and ensure it's compatible with both CommonJS and ESM:

```bash
pnpm validate:package
```

This runs:

1. `publint` - Validates package.json exports and entry points
2. `@arethetypeswrong/cli` - Checks for TypeScript type resolution issues

These tools are also integrated into the CI pipeline to ensure the package structure remains correct.

## Project Structure

```
openbadges-types/
├── src/
│   ├── v2/                 # Open Badges 2.0 types
│   ├── v3/                 # Open Badges 3.0 types
│   ├── shared/             # Shared types between versions
│   └── index.ts            # Main entry point
├── test/                   # Test files
├── dist/                   # Compiled output (generated)
├── package.json            # Package configuration
├── tsconfig.json           # TypeScript configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── .editorconfig           # Editor configuration
└── README.md               # Package documentation
```

## Adding New Types

When adding new types:

1. Place them in the appropriate directory (`v2/`, `v3/`, or `shared/`)
2. Export them from the corresponding `index.ts` file
3. Add tests for the new types
4. Update documentation if necessary
5. **Avoid using `any` type** - Use more specific types or `unknown` instead

### Type Safety Guidelines

- **Avoid `any`**: The `any` type defeats TypeScript's type checking and should be avoided in new code
- **Use `unknown` instead**: When the type is truly not known, use `unknown` instead of `any`
- **Use type guards**: Create type guards to narrow down `unknown` types to more specific types
- **Use generics**: When appropriate, use generics to maintain type safety while allowing flexibility
- **Use union types**: When a value can be one of several types, use union types instead of `any`

Existing uses of `any` in the codebase are being gradually refactored. New code should not introduce new `any` types.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass and linting rules are satisfied
4. Update documentation if necessary
5. Submit a pull request

## Troubleshooting

### Common Issues

#### TypeScript Compilation Errors

If you encounter TypeScript compilation errors:

1. Check that your types are correctly defined
2. Verify that all imports are correct
3. Run `pnpm clean:build` to ensure a clean build

#### Linting Errors

If you encounter linting errors:

1. Run `pnpm lint:fix` to automatically fix issues
2. For issues that can't be automatically fixed, manually address them according to the error messages

#### Test Failures

If tests are failing:

1. Check the error messages for specific issues
2. Verify that your changes don't break existing functionality
3. Update tests if necessary to reflect intended changes

## Release Process

This project uses conventional commits and automated releases. The release process is handled by the maintainers.

### Commit Message Format

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Commit messages should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types include:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Creating a Release

If you're a maintainer:

1. Ensure all tests pass and the build is successful
2. Run one of the following commands based on the type of release:

   ```bash
   # Automatic version bump based on commit messages
   npm run release

   # Specific version bumps
   npm run release:patch  # For bug fixes
   npm run release:minor  # For new features
   npm run release:major  # For breaking changes

   # Pre-releases
   npm run release:alpha  # Alpha release
   npm run release:beta   # Beta release
   ```

3. Push the changes and tags to GitHub:
   ```bash
   git push --follow-tags origin main
   ```
4. The GitHub Actions workflow will automatically create a GitHub Release and publish to npm
