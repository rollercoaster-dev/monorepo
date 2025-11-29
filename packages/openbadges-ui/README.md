# OpenBadges UI

[![npm version](https://img.shields.io/npm/v/openbadges-ui.svg)](https://www.npmjs.com/package/openbadges-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Vue 3 component library for implementing Open Badges functionality, with a focus on accessibility and customization. This library supports both Open Badges 2.0 and 3.0 specifications.

> **Note:** This package is part of the [Rollercoaster.dev monorepo](https://github.com/rollercoaster-dev/monorepo). For development instructions, see the [monorepo documentation](../../README.md).

## Features

- **Open Badges Compliant**: Supports both Open Badges 2.0 and 3.0 specifications, including verification
- **Framework-Agnostic Core Logic**: Business logic is decoupled from UI components
- **Accessibility First**: Follows WCAG guidelines with support for various accessibility needs
- **Themeable**: Uses CSS variables for easy customization
- **PrimeVue Integration**: Built on PrimeVue in unstyled mode for maximum flexibility
- **Histoire Integration**: Includes Histoire for component development and documentation

## Installation

### For External Projects

```bash
npm install openbadges-ui openbadges-types
# or
bun add openbadges-ui openbadges-types
```

### For Monorepo Development

This package is already configured within the monorepo. To work on it:

```bash
# From monorepo root
bun install

# Run Histoire dev server
bun --filter openbadges-ui run story:dev

# Run tests
bun --filter openbadges-ui test

# Build package
bun --filter openbadges-ui run build
```

## Quick Start

```javascript
import { createApp } from "vue";
import App from "./App.vue";
import { OpenBadgesUIPlugin } from "openbadges-ui";

// Import styles
import "openbadges-ui/dist/style.css";

const app = createApp(App);

// Use the plugin (configures PrimeVue in unstyled mode)
app.use(OpenBadgesUIPlugin);

app.mount("#app");
```

## Components

### Badge Display Components

- **BadgeDisplay**: Renders a single badge with its image, name, description, and issuer information
- **BadgeList**: Displays a collection of badges with filtering and sorting capabilities
- **ProfileViewer**: Shows a profile (issuer or recipient) along with their badges
- **BadgeVerification**: Displays verification status and details for a badge

### Badge Issuing Components

- **BadgeIssuerForm**: Form for creating and issuing new badges
- **IssuerDashboard**: Dashboard interface for managing badge issuance

## Composables

- **useBadgeIssuer**: Manages badge creation and issuance logic
- **useBadges**: Provides functionality for filtering, sorting, and displaying badges
- **useProfile**: Handles profile data for issuers and recipients
- **useBadgeVerification**: Provides functionality for verifying badge authenticity

## Theming

The library includes several built-in themes:

- Default theme
- Dark theme
- High contrast theme
- Large text theme
- Dyslexia-friendly theme
- ADHD-friendly theme
- Autism-friendly theme

To apply a theme:

```javascript
import { AccessibilityService } from "openbadges-ui";

// Apply dark theme
AccessibilityService.applyTheme("dark");
```

Or use CSS classes directly:

```html
<body class="ob-dark-theme">
  <!-- Your app content -->
</body>
```

## Accessibility

This library prioritizes accessibility with:

- Keyboard navigation support
- Screen reader compatibility
- Reduced motion options
- High contrast mode
- Support for neurodivergent users

## Component Documentation

The library includes Histoire integration for component development and documentation:

```bash
# Run Histoire development server (from monorepo root)
bun --filter openbadges-ui run story:dev

# Or from package directory
bun run story:dev

# Build static Histoire site
bun run story:build

# Preview the built Histoire site
bun run story:preview
```

Histoire provides interactive examples of all components with different configurations and themes.

### Live Component Documentation

You can view the live component documentation at [https://rollercoaster-dev.github.io/openbadges-ui/](https://rollercoaster-dev.github.io/openbadges-ui/)

## Testing

The library includes unit and integration tests for components and services using Vitest + Vue Test Utils:

```bash
# Run tests (from monorepo root)
bun --filter openbadges-ui run test

# Or from package directory
bun run test

# Run tests with coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

**Test Results:** ✅ 120/120 tests passing (100%)

**Important:** Always use `bun run test` (not `bun test`). The difference:

- `bun run test` → Runs Vitest (✅ all tests pass)
- `bun test` → Runs Bun's native test runner (❌ fails with `.vue` files)

Bun's native test runner doesn't support Vue Single File Components ([Issue #5967](https://github.com/oven-sh/bun/issues/5967)).

## Examples

Check out the [examples directory](./examples) for sample applications demonstrating how to use the OpenBadges UI components.

## Contributing

This package is part of the Rollercoaster.dev monorepo. See the [monorepo CONTRIBUTING.md](../../CONTRIBUTING.md) for general contribution guidelines.

### Making Changes

When making changes to this package:

1. Make your changes and ensure tests pass (when test infrastructure is resolved)
2. Update documentation as needed
3. Create a changeset for versioning:

```bash
# From monorepo root
bunx changeset
```

4. Select `openbadges-ui` when prompted
5. Choose the appropriate version bump (patch/minor/major)
6. Write a clear changelog entry
7. Commit your changes including the changeset file

### Release Process

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management and publishing. When your PR is merged:

1. Changesets action creates/updates a "Version Packages" PR
2. When that PR is merged, packages are published to npm automatically

See the [monorepo documentation](../../README.md#publishing-packages) for more details.
