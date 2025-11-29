<script setup lang="ts">
import { ref } from "vue";
import ThemeSelector from "./ThemeSelector.vue";

/**
 * # ThemeSelector
 *
 * The `ThemeSelector` component allows users to choose from a selection of accessibility-focused themes,
 * including options for dyslexia, low vision, and autism-friendly designs.
 *
 * ## Features
 *
 * - Selection of accessibility-focused themes
 * - Theme descriptions to help users understand their purpose
 * - Live preview of selected theme
 * - Support for custom theme options
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `modelValue` | `string` | `'default'` | The currently selected theme |
 * | `availableThemes` | `Array<{id: string, name: string, description?: string, className: string}>` | All themes | The available theme options to display |
 * | `themeLabel` | `string` | `'Theme'` | The label for the theme selector |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `update:modelValue` | `string` | Emitted when the selected theme changes |
 */

const selectedTheme = ref("default");

function onThemeChange(value: string) {
  console.log("Theme changed:", value);
}

const customThemes = ref([
  {
    id: "default",
    name: "Default Theme",
    description: "Standard theme with balanced colors and spacing",
    className: "ob-default-theme",
  },
  {
    id: "dyslexia",
    name: "Dyslexia-Friendly",
    description: "Optimized for readers with dyslexia",
    className: "ob-dyslexia-friendly-theme",
  },
  {
    id: "dark",
    name: "Dark Theme",
    description: "Reduced light emission for comfortable viewing",
    className: "ob-dark-theme",
  },
]);
</script>

<template>
  <Story
    title="Components/Accessibility/ThemeSelector"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>ThemeSelector</h1>

        <p>
          The <code>ThemeSelector</code> component allows users to choose from a
          selection of accessibility-focused themes, including options for
          dyslexia, low vision, and autism-friendly designs.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>When you want to provide users with accessible theme options</li>
          <li>
            When you need to support users with different accessibility needs
          </li>
          <li>
            When you want to give users control over the visual presentation
          </li>
          <li>As part of a comprehensive accessibility settings panel</li>
        </ul>

        <h2>Examples</h2>

        <h3>Basic Usage</h3>
        <pre><code>&lt;ThemeSelector v-model="selectedTheme" /&gt;</code></pre>

        <h3>With Custom Theme Options</h3>
        <pre><code>&lt;ThemeSelector
  v-model="selectedTheme"
  :available-themes="[
    {
      id: 'default',
      name: 'Default Theme',
      description: 'Standard theme with balanced colors and spacing',
      className: 'ob-default-theme'
    },
    {
      id: 'dark',
      name: 'Dark Theme',
      description: 'Reduced light emission for comfortable viewing',
      className: 'ob-dark-theme'
    }
  ]"
/&gt;</code></pre>

        <h3>With Custom Label</h3>
        <pre><code>&lt;ThemeSelector
  v-model="selectedTheme"
  theme-label="Color Theme"
/&gt;</code></pre>

        <h2>Props</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>modelValue</code></td>
              <td><code>string</code></td>
              <td><code>'default'</code></td>
              <td>The currently selected theme</td>
            </tr>
            <tr>
              <td><code>availableThemes</code></td>
              <td>
                <code
                  >Array&lt;{id: string, name: string, description?: string,
                  className: string}&gt;</code
                >
              </td>
              <td>All themes</td>
              <td>The available theme options to display</td>
            </tr>
            <tr>
              <td><code>themeLabel</code></td>
              <td><code>string</code></td>
              <td><code>'Theme'</code></td>
              <td>The label for the theme selector</td>
            </tr>
          </tbody>
        </table>

        <h2>Events</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Payload</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>update:modelValue</code></td>
              <td><code>string</code></td>
              <td>Emitted when the selected theme changes</td>
            </tr>
          </tbody>
        </table>

        <h2>CSS Variables</h2>
        <p>
          The component uses CSS variables for styling, which can be overridden
          to customize its appearance:
        </p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>--ob-border-color</code></td>
              <td><code>#e2e8f0</code></td>
              <td>The color of borders</td>
            </tr>
            <tr>
              <td><code>--ob-border-radius-md</code></td>
              <td><code>4px</code></td>
              <td>The border radius of elements</td>
            </tr>
            <tr>
              <td><code>--ob-bg-primary</code></td>
              <td><code>#ffffff</code></td>
              <td>The primary background color</td>
            </tr>
            <tr>
              <td><code>--ob-bg-secondary</code></td>
              <td><code>#f8f9fa</code></td>
              <td>The secondary background color</td>
            </tr>
            <tr>
              <td><code>--ob-primary</code></td>
              <td><code>#3182ce</code></td>
              <td>The primary accent color</td>
            </tr>
            <tr>
              <td><code>--ob-text-primary</code></td>
              <td><code>#1a202c</code></td>
              <td>The primary text color</td>
            </tr>
            <tr>
              <td><code>--ob-text-secondary</code></td>
              <td><code>#4a5568</code></td>
              <td>The secondary text color</td>
            </tr>
          </tbody>
        </table>

        <h2>Accessibility</h2>
        <p>The component includes several accessibility features:</p>
        <ul>
          <li>The select element has a proper label</li>
          <li>The component uses semantic HTML elements</li>
          <li>The preview section demonstrates the selected theme</li>
          <li>
            Theme options include descriptions to help users understand their
            purpose
          </li>
          <li>The component supports keyboard navigation</li>
        </ul>

        <h2>Available Themes</h2>
        <p>
          The component includes the following accessibility-focused themes by
          default:
        </p>
        <ul>
          <li>
            <strong>Default Theme</strong>: Standard theme with balanced colors
            and spacing
          </li>
          <li>
            <strong>Dyslexia-Friendly</strong>: Optimized for readers with
            dyslexia, with improved spacing and readability
          </li>
          <li>
            <strong>Low Vision</strong>: High contrast theme with larger text
            for low vision users
          </li>
          <li>
            <strong>Low Information Density</strong>: Reduced visual complexity
            for easier focus
          </li>
          <li>
            <strong>Autism-Friendly</strong>: Predictable layouts with reduced
            sensory stimulation
          </li>
          <li>
            <strong>Dark Theme</strong>: Reduced light emission for comfortable
            viewing in low light
          </li>
          <li>
            <strong>High Contrast</strong>: Maximum contrast for better
            visibility
          </li>
        </ul>
      </div>
    </template>

    <Variant title="Default">
      <ThemeSelector
        v-model="selectedTheme"
        @update:model-value="onThemeChange"
      />
    </Variant>

    <Variant title="With Custom Themes">
      <ThemeSelector
        v-model="selectedTheme"
        :available-themes="customThemes"
        @update:model-value="onThemeChange"
      />
    </Variant>

    <Variant title="With Custom Label">
      <ThemeSelector
        v-model="selectedTheme"
        theme-label="Color Theme"
        @update:model-value="onThemeChange"
      />
    </Variant>
  </Story>
</template>
