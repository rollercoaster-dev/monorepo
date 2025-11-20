<script setup lang="ts">
import { ref } from 'vue';
import BadgeVerification from './BadgeVerification.vue';
import { mockAssertions, mockOB3Credential } from '../../services/mockData';

/**
 * # BadgeVerification
 *
 * The `BadgeVerification` component displays verification status and details for a badge,
 * including verification method, expiration status, and revocation status. It supports both
 * Open Badges 2.0 (OB2) and Open Badges 3.0 (OB3) formats.
 *
 * ## Features
 *
 * - Verifies badge authenticity using hosted or signed verification methods
 * - Checks badge expiration status
 * - Checks badge revocation status
 * - Displays verification errors and warnings
 * - Supports both OB2 and OB3 badge formats
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `badge` | `OB2.Assertion \| OB3.VerifiableCredential` | Required | The badge to verify |
 * | `showStatus` | `boolean` | `true` | Whether to show verification status |
 * | `showDetails` | `boolean` | `true` | Whether to show verification details |
 * | `showLastVerified` | `boolean` | `true` | Whether to show when the badge was last verified |
 * | `autoVerify` | `boolean` | `false` | Whether to automatically verify the badge when mounted |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `verified` | `boolean` | Emitted when verification is complete, with the verification result |
 *
 * ## Accessibility
 *
 * - The verification button is a proper button element with clear text
 * - The loading spinner has a `role="status"` attribute
 * - The loading spinner includes visually hidden text for screen readers
 * - Status changes are clearly indicated through both text and visual cues
 * - Color is not the only indicator of status (icons are also used)
 * - The component supports different themes, including high contrast
 */

const state = ref({
  badge: mockAssertions[0],
  showStatus: true,
  showDetails: true,
  showLastVerified: true,
  autoVerify: false,
});

// Create a badge with expiration
const expiredBadge = {
  ...mockAssertions[0],
  expires: '2020-01-01T00:00:00Z', // Past date
};

// Create a badge with revocation
const revokedBadge = {
  ...mockAssertions[0],
  revoked: true,
  revocationReason: 'Badge was issued in error',
};

function onVerified(isValid) {
  console.log('Badge verified:', isValid);
}
</script>

<template>
  <Story
    title="Components/Badges/BadgeVerification"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #controls>
      <HstCheckbox
        v-model="state.showStatus"
        title="Show Status"
      />
      <HstCheckbox
        v-model="state.showDetails"
        title="Show Details"
      />
      <HstCheckbox
        v-model="state.showLastVerified"
        title="Show Last Verified"
      />
      <HstCheckbox
        v-model="state.autoVerify"
        title="Auto Verify"
      />
    </template>

    <Variant title="Default">
      <BadgeVerification
        :badge="state.badge"
        :show-status="state.showStatus"
        :show-details="state.showDetails"
        :show-last-verified="state.showLastVerified"
        :auto-verify="state.autoVerify"
        @verified="onVerified"
      />
    </Variant>

    <Variant title="Expired Badge">
      <BadgeVerification
        :badge="expiredBadge"
        :show-status="state.showStatus"
        :show-details="state.showDetails"
        :show-last-verified="state.showLastVerified"
        :auto-verify="state.autoVerify"
        @verified="onVerified"
      />
    </Variant>

    <Variant title="Revoked Badge">
      <BadgeVerification
        :badge="revokedBadge"
        :show-status="state.showStatus"
        :show-details="state.showDetails"
        :show-last-verified="state.showLastVerified"
        :auto-verify="state.autoVerify"
        @verified="onVerified"
      />
    </Variant>

    <Variant title="OB3 Badge">
      <BadgeVerification
        :badge="mockOB3Credential"
        :show-status="state.showStatus"
        :show-details="state.showDetails"
        :show-last-verified="state.showLastVerified"
        :auto-verify="state.autoVerify"
        @verified="onVerified"
      />
    </Variant>
  </Story>
</template>
