# Installation

This guide will help you install the OpenBadges UI library in your project.

## Requirements

- Vue 3.2 or higher
- TypeScript 4.5 or higher (recommended, but not required)
- Node.js 14 or higher
- npm 7 or higher (or yarn/pnpm)

## Installation

### Using npm

```bash
npm install openbadges-ui
```

### Using yarn

```bash
yarn add openbadges-ui
```

### Using pnpm

```bash
pnpm add openbadges-ui
```

## Including Styles

The OpenBadges UI library includes styles that need to be imported in your application.

```javascript
// In your main.js or main.ts file
import "openbadges-ui/dist/style.css";
```

## Setting Up the Plugin

The easiest way to use OpenBadges UI is to register it as a Vue plugin. This will globally register all components.

```javascript
// In your main.js or main.ts file
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

## Using Individual Components

If you prefer to use only specific components, you can import them individually.

```vue
<template>
  <BadgeDisplay :badge="badge" />
</template>

<script setup>
import { BadgeDisplay } from "openbadges-ui";
import { ref } from "vue";

const badge = ref({
  // Badge data...
});
</script>
```

## TypeScript Support

The OpenBadges UI library is written in TypeScript and provides full type definitions. If you're using TypeScript in your project, you'll get type checking and autocompletion for all components, composables, and services.

```typescript
import { BadgeService } from "openbadges-ui";
import type { OB2, OB3 } from "openbadges-types";

// TypeScript will provide type checking for badge data
const badge: OB2.Assertion = {
  // Badge data with type checking...
};

// TypeScript will provide autocompletion for methods
const isValid = BadgeService.validateAssertion(badge);
```

## Next Steps

- [Quick Start Guide](./quick-start.md) - Learn how to use the library with a simple example
- [Basic Concepts](./basic-concepts.md) - Understand the core concepts of the library
- [API Documentation](../api/index.md) - Explore the full API documentation
