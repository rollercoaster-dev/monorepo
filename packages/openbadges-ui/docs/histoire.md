# Histoire Integration

The Open Badges Component Library includes Histoire integration for component development, testing, and documentation. Histoire provides an isolated environment to develop and showcase UI components, powered by Vite for fast development.

## Running Histoire

To start the Histoire development server:

```bash
# From monorepo root
bun --filter openbadges-ui run story:dev

# Or from the package directory
bun run story:dev
```

This will launch Histoire on port 4000 by default. Open your browser to http://localhost:4000 to view the component stories.

## Building Histoire

To build a static version of Histoire for deployment:

```bash
# From monorepo root
bun --filter openbadges-ui run story:build

# Or from the package directory
bun run story:build
```

This will create a `histoire-dist` directory with the built Histoire that can be deployed to any static hosting service.

## Previewing the Built Histoire

To preview the built Histoire locally:

```bash
# From monorepo root
bun --filter openbadges-ui run story:preview

# Or from the package directory
bun run story:preview
```

## Writing Stories

Histoire uses a Vue-based approach to writing stories. Stories are defined in `.story.vue` files, which are Vue components that use the `<Story>` and `<Variant>` components to define the stories and their variants.

### Basic Story Structure

```vue
<script setup lang="ts">
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

// Define reactive state for controls
const state = ref({
  prop1: 'value1',
  prop2: true
})
</script>

<template>
  <Story title="Components/Category/MyComponent">
    <!-- Controls that apply to all variants -->
    <template #controls>
      <HstText v-model="state.prop1" title="Prop 1" />
      <HstCheckbox v-model="state.prop2" title="Prop 2" />
    </template>

    <!-- Variants -->
    <Variant title="Default">
      <MyComponent
        :prop1="state.prop1"
        :prop2="state.prop2"
      />
    </Variant>

    <Variant title="Another Variant">
      <MyComponent
        :prop1="state.prop1"
        :prop2="!state.prop2"
      />
    </Variant>
  </Story>
</template>
```

### Controls

Histoire provides built-in controls for common input types:

- `HstText`: Text input
- `HstTextarea`: Textarea input
- `HstNumber`: Number input
- `HstCheckbox`: Checkbox input
- `HstRadio`: Radio input
- `HstSelect`: Select input
- `HstJson`: JSON editor

### Layouts

You can customize the layout of your stories using the `layout` prop on the `<Story>` component:

```vue
<Story title="My Story" :layout="{ type: 'single', iframe: true }">
  <!-- Story content -->
</Story>
```

Available layouts:
- `single`: Display one variant at a time (default)
- `grid`: Display all variants in a grid

## Available Stories

The following components have Histoire stories:

- **Badges**
  - BadgeDisplay
  - BadgeList
  - ProfileViewer
- **Issuing**
  - BadgeIssuerForm
  - IssuerDashboard

## Accessibility Testing

Histoire doesn't have built-in accessibility testing like Storybook's a11y addon. For accessibility testing, consider using browser extensions like:

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Evaluation Tool](https://wave.webaim.org/extension/)

Or integrate automated accessibility testing in your CI/CD pipeline using tools like:

- [axe-core](https://github.com/dequelabs/axe-core)
- [Pa11y](https://pa11y.org/)
