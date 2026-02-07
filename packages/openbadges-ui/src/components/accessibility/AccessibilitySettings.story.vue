<script setup lang="ts">
import { ref } from "vue";
import AccessibilitySettings from "./AccessibilitySettings.vue";

/**
 * # AccessibilitySettings
 *
 * The `AccessibilitySettings` component provides a comprehensive interface for users to customize
 * accessibility options, including font selection, theme selection, motion reduction, and focus mode.
 *
 * ## Features
 *
 * - Font selection with size and spacing options
 * - Theme selection with accessibility-focused themes
 * - Motion reduction option for users with vestibular disorders
 * - Focus mode to reduce visual distractions
 * - Reset option to return to default settings
 * - Collapsible panel for easy integration
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `theme` | `string` | `'default'` | The currently selected theme |
 * | `font` | `string` | `'system'` | The currently selected font |
 * | `open` | `boolean` | `false` | Whether the settings panel is open |
 * | `title` | `string` | `'Accessibility Settings'` | The title of the settings panel |
 * | `showMotionReduction` | `boolean` | `true` | Whether to show the motion reduction option |
 * | `showFocusMode` | `boolean` | `true` | Whether to show the focus mode option |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `update:theme` | `string` | Emitted when the selected theme changes |
 * | `update:font` | `string` | Emitted when the selected font changes |
 * | `update:open` | `boolean` | Emitted when the open state changes |
 * | `motionReductionChange` | `boolean` | Emitted when the motion reduction setting changes |
 * | `focusModeChange` | `boolean` | Emitted when the focus mode setting changes |
 * | `fontSizeChange` | `string` | Emitted when the font size changes |
 * | `textSpacingChange` | `boolean` | Emitted when the text spacing changes |
 * | `resetSettings` | - | Emitted when all settings are reset to defaults |
 */

const selectedTheme = ref("default");
const selectedFont = ref("system");
const isOpen = ref(true);
const showMotionReduction = ref(true);
const showFocusMode = ref(true);

function onThemeChange(value: string) {
  console.log("Theme changed:", value);
  selectedTheme.value = value;
}

function onFontChange(value: string) {
  console.log("Font changed:", value);
  selectedFont.value = value;
}

function onOpenChange(value: boolean) {
  console.log("Open state changed:", value);
  isOpen.value = value;
}

function onMotionReductionChange(value: boolean) {
  console.log("Motion reduction changed:", value);
}

function onFocusModeChange(value: boolean) {
  console.log("Focus mode changed:", value);
}

function onFontSizeChange(value: string) {
  console.log("Font size changed:", value);
}

function onTextSpacingChange(value: boolean) {
  console.log("Text spacing changed:", value);
}

function onResetSettings() {
  console.log("Settings reset");
  selectedTheme.value = "default";
  selectedFont.value = "system";
}
</script>

<template>
  <Story
    title="Components/Accessibility/AccessibilitySettings"
    :layout="{ type: 'single', iframe: true, iframeHeight: 1000 }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>AccessibilitySettings</h1>

        <p>
          The <code>AccessibilitySettings</code> component provides a
          comprehensive interface for users to customize accessibility options,
          including font selection, theme selection, motion reduction, and focus
          mode.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>
            When you want to provide users with a complete set of accessibility
            options
          </li>
          <li>
            When you need to support users with different accessibility needs
          </li>
          <li>
            When you want to give users control over the visual presentation and
            behavior
          </li>
          <li>
            In applications that prioritize accessibility and user customization
          </li>
        </ul>

        <h2>Examples</h2>

        <h3>Basic Usage</h3>
        <pre><code>&lt;AccessibilitySettings
  v-model:theme="selectedTheme"
  v-model:font="selectedFont"
  v-model:open="isOpen"
/&gt;</code></pre>

        <h3>Without Motion Reduction Option</h3>
        <pre><code>&lt;AccessibilitySettings
  v-model:theme="selectedTheme"
  v-model:font="selectedFont"
  v-model:open="isOpen"
  :show-motion-reduction="false"
/&gt;</code></pre>

        <h3>Without Focus Mode Option</h3>
        <pre><code>&lt;AccessibilitySettings
  v-model:theme="selectedTheme"
  v-model:font="selectedFont"
  v-model:open="isOpen"
  :show-focus-mode="false"
/&gt;</code></pre>

        <h3>With Custom Title</h3>
        <pre><code>&lt;AccessibilitySettings
  v-model:theme="selectedTheme"
  v-model:font="selectedFont"
  v-model:open="isOpen"
  title="Display Settings"
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
              <td><code>theme</code></td>
              <td><code>string</code></td>
              <td><code>'default'</code></td>
              <td>The currently selected theme</td>
            </tr>
            <tr>
              <td><code>font</code></td>
              <td><code>string</code></td>
              <td><code>'system'</code></td>
              <td>The currently selected font</td>
            </tr>
            <tr>
              <td><code>open</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Whether the settings panel is open</td>
            </tr>
            <tr>
              <td><code>title</code></td>
              <td><code>string</code></td>
              <td><code>'Accessibility Settings'</code></td>
              <td>The title of the settings panel</td>
            </tr>
            <tr>
              <td><code>showMotionReduction</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>Whether to show the motion reduction option</td>
            </tr>
            <tr>
              <td><code>showFocusMode</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>Whether to show the focus mode option</td>
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
              <td><code>update:theme</code></td>
              <td><code>string</code></td>
              <td>Emitted when the selected theme changes</td>
            </tr>
            <tr>
              <td><code>update:font</code></td>
              <td><code>string</code></td>
              <td>Emitted when the selected font changes</td>
            </tr>
            <tr>
              <td><code>update:open</code></td>
              <td><code>boolean</code></td>
              <td>Emitted when the open state changes</td>
            </tr>
            <tr>
              <td><code>motionReductionChange</code></td>
              <td><code>boolean</code></td>
              <td>Emitted when the motion reduction setting changes</td>
            </tr>
            <tr>
              <td><code>focusModeChange</code></td>
              <td><code>boolean</code></td>
              <td>Emitted when the focus mode setting changes</td>
            </tr>
            <tr>
              <td><code>fontSizeChange</code></td>
              <td><code>string</code></td>
              <td>Emitted when the font size changes</td>
            </tr>
            <tr>
              <td><code>textSpacingChange</code></td>
              <td><code>boolean</code></td>
              <td>Emitted when the text spacing changes</td>
            </tr>
            <tr>
              <td><code>resetSettings</code></td>
              <td>-</td>
              <td>Emitted when all settings are reset to defaults</td>
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
              <td>The border radius of smaller elements</td>
            </tr>
            <tr>
              <td><code>--ob-border-radius-lg</code></td>
              <td><code>8px</code></td>
              <td>The border radius of larger elements</td>
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
              <td><code>--ob-primary-dark</code></td>
              <td><code>#2c5282</code></td>
              <td>The darker primary color for hover states</td>
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
            <tr>
              <td><code>--ob-shadow-lg</code></td>
              <td><code>0 10px 15px -3px rgba(0, 0, 0, 0.1)</code></td>
              <td>The shadow for the panel</td>
            </tr>
            <tr>
              <td><code>--ob-z-index-modal</code></td>
              <td><code>1000</code></td>
              <td>The z-index for the panel</td>
            </tr>
          </tbody>
        </table>

        <h2>Accessibility</h2>
        <p>The component includes several accessibility features:</p>
        <ul>
          <li>All form controls have proper labels</li>
          <li>The component uses semantic HTML elements</li>
          <li>The toggle button has appropriate ARIA attributes</li>
          <li>The panel has a proper heading structure</li>
          <li>The component supports keyboard navigation</li>
          <li>The close button has an accessible label</li>
        </ul>
      </div>
    </template>
    <template #controls>
      <HstCheckbox
        v-model="showMotionReduction"
        title="Show Motion Reduction Option"
      />
      <HstCheckbox v-model="showFocusMode" title="Show Focus Mode Option" />
      <HstCheckbox v-model="isOpen" title="Panel Open" />
    </template>

    <Variant title="Default">
      <div
        style="
          display: flex;
          justify-content: flex-end;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 450px;
        "
      >
        <AccessibilitySettings
          v-model:theme="selectedTheme"
          v-model:font="selectedFont"
          v-model:open="isOpen"
          :show-motion-reduction="showMotionReduction"
          :show-focus-mode="showFocusMode"
          @update:theme="onThemeChange"
          @update:font="onFontChange"
          @update:open="onOpenChange"
          @motion-reduction-change="onMotionReductionChange"
          @focus-mode-change="onFocusModeChange"
          @font-size-change="onFontSizeChange"
          @text-spacing-change="onTextSpacingChange"
          @reset-settings="onResetSettings"
        />
      </div>
    </Variant>

    <Variant title="Without Motion Reduction">
      <div
        style="
          display: flex;
          justify-content: flex-end;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 450px;
        "
      >
        <AccessibilitySettings
          v-model:theme="selectedTheme"
          v-model:font="selectedFont"
          v-model:open="isOpen"
          :show-motion-reduction="false"
          :show-focus-mode="showFocusMode"
          @update:theme="onThemeChange"
          @update:font="onFontChange"
          @update:open="onOpenChange"
          @focus-mode-change="onFocusModeChange"
          @font-size-change="onFontSizeChange"
          @text-spacing-change="onTextSpacingChange"
          @reset-settings="onResetSettings"
        />
      </div>
    </Variant>

    <Variant title="Without Focus Mode">
      <div
        style="
          display: flex;
          justify-content: flex-end;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 450px;
        "
      >
        <AccessibilitySettings
          v-model:theme="selectedTheme"
          v-model:font="selectedFont"
          v-model:open="isOpen"
          :show-motion-reduction="showMotionReduction"
          :show-focus-mode="false"
          @update:theme="onThemeChange"
          @update:font="onFontChange"
          @update:open="onOpenChange"
          @motion-reduction-change="onMotionReductionChange"
          @font-size-change="onFontSizeChange"
          @text-spacing-change="onTextSpacingChange"
          @reset-settings="onResetSettings"
        />
      </div>
    </Variant>

    <Variant title="Custom Title">
      <div
        style="
          display: flex;
          justify-content: flex-end;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 450px;
        "
      >
        <AccessibilitySettings
          v-model:theme="selectedTheme"
          v-model:font="selectedFont"
          v-model:open="isOpen"
          title="Display Settings"
          :show-motion-reduction="showMotionReduction"
          :show-focus-mode="showFocusMode"
          @update:theme="onThemeChange"
          @update:font="onFontChange"
          @update:open="onOpenChange"
          @motion-reduction-change="onMotionReductionChange"
          @focus-mode-change="onFocusModeChange"
          @font-size-change="onFontSizeChange"
          @text-spacing-change="onTextSpacingChange"
          @reset-settings="onResetSettings"
        />
      </div>
    </Variant>
  </Story>
</template>
