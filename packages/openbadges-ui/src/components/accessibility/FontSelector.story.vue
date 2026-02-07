<script setup lang="ts">
import { ref } from "vue";
import FontSelector from "./FontSelector.vue";

/**
 * # FontSelector
 *
 * The `FontSelector` component allows users to choose from a selection of accessible fonts,
 * adjust font size, and enable enhanced text spacing for improved readability.
 *
 * ## Features
 *
 * - Selection of accessible and dyslexia-friendly fonts
 * - Font size adjustment options
 * - Text spacing enhancement controls
 * - Live preview of selected font
 * - Support for custom font options
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `modelValue` | `string` | `'system'` | The currently selected font family |
 * | `showFontSize` | `boolean` | `true` | Whether to show the font size controls |
 * | `showTextSpacing` | `boolean` | `true` | Whether to show the text spacing controls |
 * | `availableFonts` | `Array<{id: string, name: string, description?: string, className: string}>` | All fonts | The available font options to display |
 * | `fontLabel` | `string` | `'Font Family'` | The label for the font selector |
 * | `fontSizeLabel` | `string` | `'Font Size'` | The label for the font size selector |
 * | `textSpacingLabel` | `string` | `'Text Spacing'` | The label for the text spacing selector |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `update:modelValue` | `string` | Emitted when the selected font changes |
 * | `font-size-change` | `string` | Emitted when the font size changes |
 * | `text-spacing-change` | `boolean` | Emitted when the text spacing changes |
 */

const selectedFont = ref("system");
const showFontSize = ref(true);
const showTextSpacing = ref(true);

function onFontChange(value: string) {
  console.log("Font changed:", value);
}

function onFontSizeChange(value: string) {
  console.log("Font size changed:", value);
}

function onTextSpacingChange(value: boolean) {
  console.log("Text spacing changed:", value);
}
</script>

<template>
  <Story
    title="Components/Accessibility/FontSelector"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>FontSelector</h1>

        <p>
          The <code>FontSelector</code> component allows users to choose from a
          selection of accessible fonts, adjust font size, and enable enhanced
          text spacing for improved readability.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>When you want to provide users with accessible font options</li>
          <li>
            When you need to support users with dyslexia or visual impairments
          </li>
          <li>When you want to give users control over text presentation</li>
          <li>As part of a comprehensive accessibility settings panel</li>
        </ul>

        <h2>Examples</h2>
        <p>
          Use the controls in the right panel to customize the component
          behavior.
        </p>

        <h3>Basic Usage</h3>
        <pre><code>&lt;FontSelector v-model="selectedFont" /&gt;</code></pre>

        <h3>Without Font Size Controls</h3>
        <pre><code>&lt;FontSelector v-model="selectedFont" :show-font-size="false" /&gt;</code></pre>

        <h3>Without Text Spacing Controls</h3>
        <pre><code>&lt;FontSelector v-model="selectedFont" :show-text-spacing="false" /&gt;</code></pre>

        <h3>With Custom Font Options</h3>
        <pre><code>&lt;FontSelector
  v-model="selectedFont"
  :available-fonts="[
    {
      id: 'system',
      name: 'System Font',
      description: 'Your device\'s default font',
      className: 'ob-font-system'
    },
    {
      id: 'dyslexic',
      name: 'OpenDyslexic',
      description: 'Designed for readers with dyslexia',
      className: 'ob-font-dyslexic'
    }
  ]"
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
              <td><code>'system'</code></td>
              <td>The currently selected font family</td>
            </tr>
            <tr>
              <td><code>showFontSize</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>Whether to show the font size controls</td>
            </tr>
            <tr>
              <td><code>showTextSpacing</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>Whether to show the text spacing controls</td>
            </tr>
            <tr>
              <td><code>availableFonts</code></td>
              <td>
                <code
                  >Array&lt;{id: string, name: string, description?: string,
                  className: string}&gt;</code
                >
              </td>
              <td>All fonts</td>
              <td>The available font options to display</td>
            </tr>
            <tr>
              <td><code>fontLabel</code></td>
              <td><code>string</code></td>
              <td><code>'Font Family'</code></td>
              <td>The label for the font selector</td>
            </tr>
            <tr>
              <td><code>fontSizeLabel</code></td>
              <td><code>string</code></td>
              <td><code>'Font Size'</code></td>
              <td>The label for the font size selector</td>
            </tr>
            <tr>
              <td><code>textSpacingLabel</code></td>
              <td><code>string</code></td>
              <td><code>'Text Spacing'</code></td>
              <td>The label for the text spacing selector</td>
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
              <td>Emitted when the selected font changes</td>
            </tr>
            <tr>
              <td><code>font-size-change</code></td>
              <td><code>string</code></td>
              <td>Emitted when the font size changes</td>
            </tr>
            <tr>
              <td><code>text-spacing-change</code></td>
              <td><code>boolean</code></td>
              <td>Emitted when the text spacing changes</td>
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
              <td><code>0.375rem</code></td>
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
          <li>All form controls have proper labels</li>
          <li>The component uses semantic HTML elements</li>
          <li>The preview section demonstrates the selected font settings</li>
          <li>
            Font options include descriptions to help users understand their
            purpose
          </li>
          <li>The component supports keyboard navigation</li>
        </ul>

        <h2>Available Fonts</h2>
        <p>The component includes the following accessible fonts by default:</p>
        <ul>
          <li><strong>System Font</strong>: Your device's default font</li>
          <li>
            <strong>Atkinson Hyperlegible</strong>: Designed for low vision
            readers by the Braille Institute
          </li>
          <li>
            <strong>OpenDyslexic</strong>: Designed specifically for readers
            with dyslexia
          </li>
          <li>
            <strong>Lexend</strong>: Designed to reduce visual stress and
            improve reading fluency
          </li>
          <li>
            <strong>Instrument Sans</strong>: Primary body font from the
            neo-brutalist design language
          </li>
        </ul>
      </div>
    </template>
    <template #controls>
      <HstCheckbox v-model="showFontSize" title="Show Font Size Controls" />
      <HstCheckbox
        v-model="showTextSpacing"
        title="Show Text Spacing Controls"
      />
    </template>

    <Variant title="Default">
      <FontSelector
        v-model="selectedFont"
        :show-font-size="showFontSize"
        :show-text-spacing="showTextSpacing"
        @update:model-value="onFontChange"
        @font-size-change="onFontSizeChange"
        @text-spacing-change="onTextSpacingChange"
      />
    </Variant>

    <Variant title="Without Font Size Controls">
      <FontSelector
        v-model="selectedFont"
        :show-font-size="false"
        :show-text-spacing="showTextSpacing"
        @update:model-value="onFontChange"
        @text-spacing-change="onTextSpacingChange"
      />
    </Variant>

    <Variant title="Without Text Spacing Controls">
      <FontSelector
        v-model="selectedFont"
        :show-font-size="showFontSize"
        :show-text-spacing="false"
        @update:model-value="onFontChange"
        @font-size-change="onFontSizeChange"
      />
    </Variant>

    <Variant title="Limited Font Options">
      <FontSelector
        v-model="selectedFont"
        :show-font-size="showFontSize"
        :show-text-spacing="showTextSpacing"
        :available-fonts="[
          {
            id: 'system',
            name: 'System Font',
            description: 'Your device\'s default font',
            className: 'ob-font-system',
          },
          {
            id: 'opendyslexic',
            name: 'OpenDyslexic',
            description: 'Designed for readers with dyslexia',
            className: 'ob-font-dyslexic',
          },
        ]"
        @update:model-value="onFontChange"
        @font-size-change="onFontSizeChange"
        @text-spacing-change="onTextSpacingChange"
      />
    </Variant>
  </Story>
</template>
