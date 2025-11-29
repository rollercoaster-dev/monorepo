<script setup lang="ts">
import { ref } from "vue";
import IssuerCard from "./IssuerCard.vue";
import type { OB2, OB3 } from "openbadges-types";

/**
 * # IssuerCard
 *
 * The `IssuerCard` component displays information about a badge issuer.
 * It supports both Open Badges 2.0 (OB2) and Open Badges 3.0 (OB3) Profile formats.
 *
 * ## Features
 *
 * - Displays issuer logo, name, and description
 * - Shows contact information (URL and email) when enabled
 * - Supports interactive mode for clickable cards
 * - Provides density options for different display contexts
 * - Includes accessible fallback for missing images
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `issuer` | `OB2.Profile \| OB3.Profile` | Required | The issuer profile to display |
 * | `interactive` | `boolean` | `false` | Whether the card is clickable |
 * | `showDescription` | `boolean` | `true` | Whether to show the issuer description |
 * | `showContact` | `boolean` | `false` | Whether to show contact information |
 * | `density` | `'compact' \| 'normal' \| 'spacious'` | `'normal'` | Display density |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `click` | `OB2.Profile \| OB3.Profile` | Emitted when the card is clicked (if interactive) |
 *
 * ## Slots
 *
 * | Name | Description |
 * |------|-------------|
 * | `issuer-actions` | Additional actions to display below the issuer content |
 */

// Mock OB2 issuer data
const mockOB2Issuer: OB2.Profile = {
  id: "https://example.org/issuers/1",
  type: "Profile",
  name: "Tech Academy",
  url: "https://tech-academy.edu",
  email: "badges@tech-academy.edu",
  description:
    "A leading technology education institution offering cutting-edge digital credentials and professional certifications for modern learners.",
  image: "https://placehold.co/200x200/3182ce/white?text=TA",
};

// Mock OB3 issuer data
const mockOB3Issuer = {
  id: "https://example.org/issuers/2",
  type: ["Profile"] as [string, ...string[]],
  name: "Digital Skills Institute",
  url: "https://digital-skills.org",
  email: "info@digital-skills.org",
  description:
    "Empowering professionals with verified digital competencies through blockchain-backed credentials.",
  image: {
    id: "https://placehold.co/200x200/38a169/white?text=DSI",
    type: "Image" as const,
  },
} as OB3.Profile;

// Issuer without image
const issuerNoImage: OB2.Profile = {
  id: "https://example.org/issuers/3",
  type: "Profile",
  name: "Open Learning Foundation",
  url: "https://open-learning.org",
  description:
    "Promoting open education and accessible credentials for everyone.",
};

const state = ref({
  issuer: mockOB2Issuer,
  interactive: false,
  showDescription: true,
  showContact: false,
  density: "normal" as "compact" | "normal" | "spacious",
});

function onIssuerClick(issuer: OB2.Profile | OB3.Profile): void {
  console.log("Issuer clicked:", issuer);
}
</script>

<template>
  <Story
    title="Components/Directory/IssuerCard"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>IssuerCard</h1>

        <p>
          The <code>IssuerCard</code> component displays information about a
          badge issuer, including their logo, name, description, and contact
          details.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>When displaying issuer profiles in a directory or list</li>
          <li>When showing issuer information on badge detail pages</li>
          <li>When building an issuer selection interface</li>
        </ul>

        <h2>Examples</h2>

        <h3>Basic Usage</h3>
        <pre><code>&lt;IssuerCard :issuer="myIssuer" /&gt;</code></pre>

        <h3>Interactive Card</h3>
        <pre><code>&lt;IssuerCard :issuer="myIssuer" interactive @click="handleIssuerClick" /&gt;</code></pre>

        <h3>With Contact Information</h3>
        <pre><code>&lt;IssuerCard :issuer="myIssuer" show-contact /&gt;</code></pre>

        <h2>Accessibility</h2>
        <ul>
          <li>Uses semantic HTML with appropriate ARIA attributes</li>
          <li>Interactive cards receive <code>tabindex="0"</code></li>
          <li>Responds to keyboard events (Enter/Space) when interactive</li>
          <li>Provides fallback display when image is missing</li>
          <li>Focus states are clearly indicated</li>
        </ul>
      </div>
    </template>

    <template #controls>
      <HstCheckbox v-model="state.showDescription" title="Show Description" />
      <HstCheckbox v-model="state.showContact" title="Show Contact" />
      <HstCheckbox v-model="state.interactive" title="Interactive" />
      <HstSelect
        v-model="state.density"
        title="Density"
        :options="[
          { label: 'Compact', value: 'compact' },
          { label: 'Normal', value: 'normal' },
          { label: 'Spacious', value: 'spacious' },
        ]"
      />
    </template>

    <Variant title="Default (OB2)">
      <IssuerCard
        :issuer="mockOB2Issuer"
        :show-description="state.showDescription"
        :show-contact="state.showContact"
        :interactive="state.interactive"
        :density="state.density"
        @click="onIssuerClick"
      />
    </Variant>

    <Variant title="OB3 Format">
      <IssuerCard
        :issuer="mockOB3Issuer"
        :show-description="state.showDescription"
        :show-contact="state.showContact"
        :interactive="state.interactive"
        :density="state.density"
        @click="onIssuerClick"
      />
    </Variant>

    <Variant title="Interactive">
      <IssuerCard
        :issuer="mockOB2Issuer"
        :show-description="state.showDescription"
        :show-contact="state.showContact"
        interactive
        :density="state.density"
        @click="onIssuerClick"
      />
    </Variant>

    <Variant title="With Contact Info">
      <IssuerCard
        :issuer="mockOB2Issuer"
        :show-description="state.showDescription"
        show-contact
        :interactive="state.interactive"
        :density="state.density"
        @click="onIssuerClick"
      />
    </Variant>

    <Variant title="No Image (Fallback)">
      <IssuerCard
        :issuer="issuerNoImage"
        :show-description="state.showDescription"
        :show-contact="state.showContact"
        :interactive="state.interactive"
        :density="state.density"
        @click="onIssuerClick"
      />
    </Variant>

    <Variant title="Compact Density">
      <IssuerCard
        :issuer="mockOB2Issuer"
        :show-description="state.showDescription"
        :show-contact="state.showContact"
        :interactive="state.interactive"
        density="compact"
        @click="onIssuerClick"
      />
    </Variant>

    <Variant title="Spacious Density">
      <IssuerCard
        :issuer="mockOB2Issuer"
        :show-description="state.showDescription"
        :show-contact="state.showContact"
        :interactive="state.interactive"
        density="spacious"
        @click="onIssuerClick"
      />
    </Variant>
  </Story>
</template>
