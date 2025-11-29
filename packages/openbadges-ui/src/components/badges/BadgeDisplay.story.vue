<script setup lang="ts">
import { ref } from "vue";
import BadgeDisplay from "./BadgeDisplay.vue";
import { mockAssertions, mockOB3Credential } from "../../services/mockData";
import type { OB2, OB3 } from "openbadges-types";
import { createDateTime } from "openbadges-types";

/**
 * # BadgeDisplay
 *
 * The `BadgeDisplay` component renders a single badge with its image, name, description,
 * issuer information, and dates. It supports both Open Badges 2.0 (OB2) and Open Badges 3.0 (OB3) formats.
 *
 * ## Features
 *
 * - Displays badge image, name, and description
 * - Shows issuer information
 * - Displays issuance and expiry dates
 * - Supports interactive mode for clickable badges
 * - Integrates with badge verification
 * - Supports both OB2 and OB3 badge formats
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `badge` | `OB2.Assertion \| OB3.VerifiableCredential` | Required | The badge to display |
 * | `showDescription` | `boolean` | `true` | Whether to show the badge description |
 * | `showIssuedDate` | `boolean` | `true` | Whether to show the badge issue date |
 * | `showExpiryDate` | `boolean` | `false` | Whether to show the badge expiry date |
 * | `interactive` | `boolean` | `false` | Whether the badge is clickable |
 * | `showVerification` | `boolean` | `false` | Whether to show badge verification controls |
 * | `autoVerify` | `boolean` | `false` | Whether to automatically verify the badge |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `click` | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when the badge is clicked |
 * | `verified` | `boolean` | Emitted when a badge has been verified |
 *
 * ## Slots
 *
 * | Name | Description |
 * |------|-------------|
 * | `badge-actions` | Additional actions to display below the badge content |
 *
 * ## Accessibility
 *
 * - When interactive, the component receives a `tabindex="0"` attribute
 * - The component responds to both click and Enter key events when interactive
 * - Badge images have descriptive alt text
 * - Dates are formatted in a readable format
 * - Focus states are visually indicated with an outline
 */

const state = ref({
  badge: mockAssertions[0],
  showDescription: true,
  showIssuedDate: true,
  showExpiryDate: false,
  interactive: false,
  showVerification: false,
  autoVerify: false,
  // Neurodiversity enhancements
  contentDensity: "normal",
  simplifiedView: false,
});

const badgeWithExpiry: OB2.Assertion = {
  ...mockAssertions[0],
  expires: createDateTime("2026-01-15T12:00:00Z"),
};

function onBadgeClick(badge: OB2.Assertion | OB3.VerifiableCredential): void {
  console.log("Badge clicked:", badge);
}

function onVerified(isValid: boolean): void {
  console.log("Badge verified:", isValid);
}
</script>

<template>
  <Story
    title="Components/Badges/BadgeDisplay"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>BadgeDisplay</h1>

        <p>
          The <code>BadgeDisplay</code> component renders a single badge with
          its image, name, description, issuer information, and dates.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>When you need to display a single badge with its details</li>
          <li>
            When you want to show badge information in a consistent format
          </li>
          <li>
            When you need to display badges from different formats (OB2 and OB3)
          </li>
        </ul>

        <h2>Examples</h2>
        <p>
          Use the controls in the right panel to customize the component
          behavior.
        </p>

        <h3>Basic Usage</h3>
        <pre><code>&lt;BadgeDisplay :badge="myBadge" /&gt;</code></pre>

        <h3>Interactive Badge</h3>
        <pre><code>&lt;BadgeDisplay :badge="myBadge" :interactive="true" @click="handleBadgeClick" /&gt;</code></pre>

        <h3>With Verification</h3>
        <pre><code>&lt;BadgeDisplay
  :badge="myBadge"
  :show-verification="true"
  :auto-verify="true"
  @verified="handleVerified"
/&gt;</code></pre>

        <h3>Custom Display Options</h3>
        <pre><code>&lt;BadgeDisplay
  :badge="myBadge"
  :show-description="true"
  :show-issued-date="true"
  :show-expiry-date="true"
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
              <td><code>badge</code></td>
              <td><code>OB2.Assertion | OB3.VerifiableCredential</code></td>
              <td>Required</td>
              <td>The badge to display</td>
            </tr>
            <tr>
              <td><code>showDescription</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>Whether to show the badge description</td>
            </tr>
            <tr>
              <td><code>showIssuedDate</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>Whether to show the badge issue date</td>
            </tr>
            <tr>
              <td><code>showExpiryDate</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Whether to show the badge expiry date</td>
            </tr>
            <tr>
              <td><code>interactive</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Whether the badge is clickable</td>
            </tr>
            <tr>
              <td><code>showVerification</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Whether to show badge verification controls</td>
            </tr>
            <tr>
              <td><code>autoVerify</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Whether to automatically verify the badge</td>
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
              <td><code>click</code></td>
              <td><code>OB2.Assertion | OB3.VerifiableCredential</code></td>
              <td>
                Emitted when the badge is clicked (if interactive is true)
              </td>
            </tr>
            <tr>
              <td><code>verified</code></td>
              <td><code>boolean</code></td>
              <td>Emitted when a badge has been verified</td>
            </tr>
          </tbody>
        </table>

        <h2>Slots</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>badge-actions</code></td>
              <td>Additional actions to display below the badge content</td>
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
              <td><code>--badge-border-color</code></td>
              <td><code>#e2e8f0</code></td>
              <td>The color of the badge border</td>
            </tr>
            <tr>
              <td><code>--badge-border-radius</code></td>
              <td><code>8px</code></td>
              <td>The border radius of the badge</td>
            </tr>
            <tr>
              <td><code>--badge-background</code></td>
              <td><code>#ffffff</code></td>
              <td>The background color of the badge</td>
            </tr>
            <tr>
              <td><code>--badge-title-color</code></td>
              <td><code>#1a202c</code></td>
              <td>The color of the badge title</td>
            </tr>
            <tr>
              <td><code>--badge-text-color</code></td>
              <td><code>#4a5568</code></td>
              <td>The color of the badge text</td>
            </tr>
          </tbody>
        </table>

        <h2>Accessibility</h2>
        <p>The component includes several accessibility features:</p>
        <ul>
          <li>
            When interactive, the component receives a
            <code>tabindex="0"</code> attribute
          </li>
          <li>
            The component responds to both click and Enter key events when
            interactive
          </li>
          <li>Badge images have descriptive alt text</li>
          <li>Dates are formatted in a readable format</li>
          <li>Focus states are visually indicated with an outline</li>
        </ul>
      </div>
    </template>
    <template #controls>
      <HstCheckbox v-model="state.showDescription" title="Show Description" />
      <HstCheckbox v-model="state.showIssuedDate" title="Show Issued Date" />
      <HstCheckbox v-model="state.showExpiryDate" title="Show Expiry Date" />
      <HstCheckbox v-model="state.interactive" title="Interactive" />
      <HstCheckbox v-model="state.showVerification" title="Show Verification" />
      <HstCheckbox v-model="state.autoVerify" title="Auto Verify" />
      <HstSelect
        v-model="state.contentDensity"
        title="Content Density"
        :options="[
          { label: 'Normal', value: 'normal' },
          { label: 'Compact', value: 'compact' },
          { label: 'Spacious', value: 'spacious' },
        ]"
      />
      <HstCheckbox v-model="state.simplifiedView" title="Simplified View" />
    </template>

    <Variant title="Default">
      <BadgeDisplay
        :badge="state.badge"
        :show-description="state.showDescription"
        :show-issued-date="state.showIssuedDate"
        :show-expiry-date="state.showExpiryDate"
        :interactive="state.interactive"
        :show-verification="state.showVerification"
        :auto-verify="state.autoVerify"
        :content-density="state.contentDensity"
        :simplified-view="state.simplifiedView"
        @click="onBadgeClick"
        @verified="onVerified"
      />
    </Variant>

    <Variant title="Interactive">
      <BadgeDisplay
        :badge="state.badge"
        :show-description="state.showDescription"
        :show-issued-date="state.showIssuedDate"
        :show-expiry-date="state.showExpiryDate"
        interactive
        :show-verification="state.showVerification"
        :auto-verify="state.autoVerify"
        :content-density="state.contentDensity"
        :simplified-view="state.simplifiedView"
        @click="onBadgeClick"
        @verified="onVerified"
      />
    </Variant>

    <Variant title="Without Description">
      <BadgeDisplay
        :badge="state.badge"
        :show-description="false"
        :show-issued-date="state.showIssuedDate"
        :show-expiry-date="state.showExpiryDate"
        :interactive="state.interactive"
        :show-verification="state.showVerification"
        :auto-verify="state.autoVerify"
        :content-density="state.contentDensity"
        :simplified-view="state.simplifiedView"
        @click="onBadgeClick"
        @verified="onVerified"
      />
    </Variant>

    <Variant title="With Expiry Date">
      <BadgeDisplay
        :badge="badgeWithExpiry"
        :show-description="state.showDescription"
        :show-issued-date="state.showIssuedDate"
        show-expiry-date
        :interactive="state.interactive"
        :show-verification="state.showVerification"
        :auto-verify="state.autoVerify"
        :content-density="state.contentDensity"
        :simplified-view="state.simplifiedView"
        @click="onBadgeClick"
        @verified="onVerified"
      />
    </Variant>

    <Variant title="OB3 Format">
      <BadgeDisplay
        :badge="mockOB3Credential"
        :show-description="state.showDescription"
        :show-issued-date="state.showIssuedDate"
        :show-expiry-date="state.showExpiryDate"
        :interactive="state.interactive"
        :show-verification="state.showVerification"
        :auto-verify="state.autoVerify"
        :content-density="state.contentDensity"
        :simplified-view="state.simplifiedView"
        @click="onBadgeClick"
        @verified="onVerified"
      />
    </Variant>
  </Story>
</template>
