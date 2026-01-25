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
# Using bun (recommended)
bun add openbadges-ui openbadges-types

# Using npm
npm install openbadges-ui openbadges-types

# Using yarn
yarn add openbadges-ui openbadges-types
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

## Utility Functions

### Type Helpers

The library exports utility functions for working with Open Badges data:

#### `typeIncludes(typeValue, targetType)`

Checks if a type value includes a specific type string. Handles both OB2 (string or array) and OB3 (array) formats.

```typescript
import { typeIncludes } from "openbadges-ui";

// OB2 string format
typeIncludes("Assertion", "Assertion"); // true

// OB3 array format
typeIncludes(
  ["VerifiableCredential", "OpenBadgeCredential"],
  "VerifiableCredential",
); // true

// Edge cases
typeIncludes(undefined, "Assertion"); // false
typeIncludes([], "Assertion"); // false
```

**Why this is needed:** Open Badges 2.0 allows `type` to be a string OR array, while OB3 requires an array. This utility provides consistent type checking across both formats.

#### Other Exported Utilities

- **`isOB2Assertion(badge)`** - Type guard for OB2 assertions
- **`isOB3VerifiableCredential(badge, strict?)`** - Type guard for OB3 credentials
- **`validateOB3Context(context)`** - Validates @context structure
- **`createIRI(url)`** - Creates IRI branded type
- **`createDateTime(dateTimeString)`** - Creates DateTime branded type
- **`OB2Guards`** - Namespace with OB2 type guards (IdentityObject, VerificationObject, Evidence, etc.)
- **`OB3Guards`** - Namespace with OB3 type guards (Proof, CredentialStatus, Issuer, etc.)

## OB3 Context Validation

Open Badges 3.0 (OB3) credentials use JSON-LD `@context` to define vocabulary and semantics. This library validates `@context` in OB3 VerifiableCredentials according to the W3C Verifiable Credentials and OB3 specifications.

### Supported Formats

The `@context` field accepts three formats:

**1. String (single context URI)**

```json
{
  "@context": "https://www.w3.org/2018/credentials/v1"
}
```

**2. Array (multiple contexts) - Recommended**

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context.json"
  ]
}
```

**3. Object (embedded context)**

```json
{
  "@context": {
    "@vocab": "https://www.w3.org/2018/credentials#",
    "ob": "https://purl.imsglobal.org/spec/ob/v3p0/vocab#"
  }
}
```

### Required Context URIs

When using array format, the following contexts must be present:

| Context                    | Required URIs (any of)                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| W3C Verifiable Credentials | `https://www.w3.org/2018/credentials/v1` or `https://www.w3.org/ns/credentials/v2`                                                           |
| Open Badges 3.0            | `https://purl.imsglobal.org/spec/ob/v3p0/context.json` or URLs containing `purl.imsglobal.org/spec/ob/v3p0` or `openbadges.org/spec/ob/v3p0` |

### Type Guards

Use the type guard with strict mode for complete validation:

```typescript
import { isOB3VerifiableCredential } from "openbadges-ui";

// Non-strict (default): validates structure, not context URIs
if (isOB3VerifiableCredential(badge)) {
  // badge has required OB3 fields
}

// Strict: also validates @context has required URIs (for array format)
if (isOB3VerifiableCredential(badge, true)) {
  // badge has valid structure AND proper context
}
```

### Validation Utility

For direct context validation:

```typescript
import { validateOB3Context } from "openbadges-ui";

const result = validateOB3Context(badge["@context"]);
if (!result.valid) {
  console.error(result.error); // e.g., "@context must include Open Badges 3.0 context"
}
```

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

**Test Results:** ✅ 195/195 tests passing (100%)

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
