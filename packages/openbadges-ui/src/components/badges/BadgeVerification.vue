<script setup lang="ts">
import { computed, watch } from "vue";
import type { OB2, OB3 } from "@/types";
import { useBadgeVerification } from "@composables/useBadgeVerification";
import { AccessibilityService } from "@services/AccessibilityService";

interface Props {
  badge: OB2.Assertion | OB3.VerifiableCredential;
  showStatus?: boolean;
  showDetails?: boolean;
  showLastVerified?: boolean;
  autoVerify?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showStatus: true,
  showDetails: true,
  showLastVerified: true,
  autoVerify: false,
});

const emit = defineEmits<{
  (e: "verified", isValid: boolean): void;
}>();

// Use the badge verification composable
const {
  state,
  isValid,
  errors,
  warnings,
  verificationMethod,
  expirationStatus,
  revocationStatus,
  hasBeenVerified,
  verifyBadge,
  // clearVerification is imported but not used
} = useBadgeVerification();

// Computed properties
const isVerifying = computed(() => state.value.isVerifying);
const lastVerified = computed(() => state.value.lastVerified);

// Format verification method for display
const formatVerificationMethod = (method: string) => {
  return method.charAt(0).toUpperCase() + method.slice(1);
};

// Format date for display
const formatDate = (date: Date) => {
  return AccessibilityService.formatDate(date.toISOString());
};

// Handle verify button click
const handleVerify = async () => {
  const result = await verifyBadge(props.badge);
  emit("verified", result.isValid);
};

// Auto-verify reactively when badge or flag changes
watch(
  [() => props.badge, () => props.autoVerify],
  async ([newBadge, auto]) => {
    // Avoid overlapping requests if verification is in progress
    if (!auto || !newBadge || isVerifying.value) {
      return;
    }
    await handleVerify();
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="ob-badge-verification"
    :class="{
      'is-valid': isValid,
      'is-invalid': !isValid && hasBeenVerified,
      'is-verifying': isVerifying,
      'is-expired': expirationStatus === 'expired',
      'is-revoked': revocationStatus === 'revoked',
    }"
  >
    <div v-if="showStatus" class="ob-badge-verification-status">
      <div
        v-if="isVerifying"
        class="ob-badge-verification-loading"
        role="status"
      >
        <span class="ob-visually-hidden">Verifying badge...</span>
        <div class="ob-badge-verification-spinner" />
      </div>

      <div v-else-if="hasBeenVerified" class="ob-badge-verification-result">
        <div v-if="isValid" class="ob-badge-verification-valid">
          <span class="ob-badge-verification-icon">✓</span>
          <span>Verified</span>
        </div>
        <div v-else class="ob-badge-verification-invalid">
          <span class="ob-badge-verification-icon">✗</span>
          <span>Invalid</span>
        </div>
      </div>

      <button
        v-if="!isVerifying"
        :disabled="isVerifying"
        class="ob-badge-verification-button"
        @click="handleVerify"
      >
        {{ hasBeenVerified ? "Verify Again" : "Verify Badge" }}
      </button>
    </div>

    <div
      v-if="showDetails && hasBeenVerified"
      class="ob-badge-verification-details"
    >
      <div v-if="verificationMethod" class="ob-badge-verification-method">
        <span class="ob-badge-verification-label">Verification Method:</span>
        <span class="ob-badge-verification-value">{{
          formatVerificationMethod(verificationMethod)
        }}</span>
      </div>

      <div
        v-if="expirationStatus && expirationStatus !== 'not-applicable'"
        class="ob-badge-verification-expiration"
      >
        <span class="ob-badge-verification-label">Expiration Status:</span>
        <span
          class="ob-badge-verification-value"
          :class="{ 'is-expired': expirationStatus === 'expired' }"
        >
          {{ expirationStatus === "expired" ? "Expired" : "Valid" }}
        </span>
      </div>

      <div
        v-if="revocationStatus && revocationStatus !== 'unknown'"
        class="ob-badge-verification-revocation"
      >
        <span class="ob-badge-verification-label">Revocation Status:</span>
        <span
          class="ob-badge-verification-value"
          :class="{ 'is-revoked': revocationStatus === 'revoked' }"
        >
          {{ revocationStatus === "revoked" ? "Revoked" : "Valid" }}
        </span>
      </div>

      <div v-if="errors.length > 0" class="ob-badge-verification-errors">
        <h4 class="ob-badge-verification-section-title">Errors:</h4>
        <ul>
          <li v-for="(error, index) in errors" :key="index">
            {{ error }}
          </li>
        </ul>
      </div>

      <div v-if="warnings.length > 0" class="ob-badge-verification-warnings">
        <h4 class="ob-badge-verification-section-title">Warnings:</h4>
        <ul>
          <li v-for="(warning, index) in warnings" :key="index">
            {{ warning }}
          </li>
        </ul>
      </div>

      <div
        v-if="showLastVerified && lastVerified"
        class="ob-badge-verification-timestamp"
      >
        <span class="ob-badge-verification-label">Last Verified:</span>
        <span class="ob-badge-verification-value">{{
          formatDate(lastVerified)
        }}</span>
      </div>
    </div>
  </div>
</template>

<style>
.ob-badge-verification {
  --verification-border-color: var(
    --ob-verification-border-color,
    var(--ob-border)
  );
  --verification-background: var(--ob-verification-background, var(--ob-card));
  --verification-text-color: var(
    --ob-verification-text-color,
    var(--ob-foreground)
  );
  --verification-valid-color: var(
    --ob-verification-valid-color,
    var(--ob-narrative-relief-accent)
  );
  --verification-invalid-color: var(
    --ob-verification-invalid-color,
    var(--ob-error)
  );
  --verification-warning-color: var(
    --ob-verification-warning-color,
    var(--ob-warning)
  );
  --verification-button-bg: var(
    --ob-verification-button-bg,
    var(--ob-highlight)
  );
  --verification-button-color: var(
    --ob-verification-button-color,
    var(--ob-highlight-foreground)
  );
  --verification-button-hover-bg: var(
    --ob-verification-button-hover-bg,
    var(--ob-primary)
  );
  --verification-button-disabled-bg: var(
    --ob-verification-button-disabled-bg,
    var(--ob-muted)
  );
  --verification-label-color: var(
    --ob-verification-label-color,
    var(--ob-muted-foreground)
  );

  margin-top: var(--ob-space-4);
  padding: var(--ob-space-4);
  border: var(--ob-border-width-medium) solid var(--verification-border-color);
  border-radius: var(--ob-border-radius-sm);
  background-color: var(--verification-background);
  box-shadow: var(--ob-shadow-hard-sm);
  color: var(--verification-text-color);
  font-family: var(--ob-font-family);
}

.ob-badge-verification-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--ob-space-2);
}

.ob-badge-verification-result {
  display: flex;
  align-items: center;
}

.ob-badge-verification-valid {
  color: var(--verification-valid-color);
  display: flex;
  align-items: center;
}

.ob-badge-verification-invalid {
  color: var(--verification-invalid-color);
  display: flex;
  align-items: center;
}

.ob-badge-verification-icon {
  margin-right: var(--ob-space-1);
  font-weight: bold;
}

.ob-badge-verification-button {
  background-color: var(--verification-button-bg);
  color: var(--verification-button-color);
  border: var(--ob-border-width-medium) solid currentColor;
  border-radius: var(--ob-border-radius-sm);
  padding: var(--ob-space-2) var(--ob-space-4);
  cursor: pointer;
  font-size: var(--ob-font-size-sm);
  font-weight: var(--ob-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--ob-font-letterSpacing-wide);
  box-shadow: var(--ob-shadow-hard-sm);
  transition: background-color var(--ob-transition-fast);
}

.ob-badge-verification-button:hover:not(:disabled) {
  background-color: var(--verification-button-hover-bg);
}

.ob-badge-verification-button:disabled {
  background-color: var(--verification-button-disabled-bg);
  cursor: not-allowed;
}

.ob-badge-verification-details {
  margin-top: var(--ob-space-4);
  border-top: var(--ob-border-width-medium) solid
    var(--verification-border-color);
  padding-top: var(--ob-space-4);
}

.ob-badge-verification-method,
.ob-badge-verification-expiration,
.ob-badge-verification-revocation,
.ob-badge-verification-timestamp {
  margin-bottom: var(--ob-space-2);
}

.ob-badge-verification-label {
  font-family: var(--ob-font-mono);
  font-size: var(--ob-font-size-xs);
  color: var(--verification-label-color);
  margin-right: var(--ob-space-2);
  font-weight: var(--ob-font-weight-medium);
}

.ob-badge-verification-errors,
.ob-badge-verification-warnings {
  margin-top: var(--ob-space-3);
  margin-bottom: var(--ob-space-3);
}

.ob-badge-verification-errors {
  color: var(--verification-invalid-color);
}

.ob-badge-verification-warnings {
  color: var(--verification-warning-color);
}

.ob-badge-verification-section-title {
  margin-top: 0;
  margin-bottom: var(--ob-space-2);
  font-size: var(--ob-font-size-sm);
  font-weight: var(--ob-font-weight-semibold);
}

.ob-badge-verification-errors ul,
.ob-badge-verification-warnings ul {
  margin-top: var(--ob-space-1);
  margin-bottom: var(--ob-space-1);
  padding-left: var(--ob-space-6);
  font-size: var(--ob-font-size-sm);
}

.ob-badge-verification-loading {
  display: flex;
  align-items: center;
}

.ob-badge-verification-spinner {
  width: 1rem;
  height: 1rem;
  border: var(--ob-border-width-medium) solid var(--verification-button-bg);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spinner var(--ob-transition-slow) linear infinite;
}

.is-expired .ob-badge-verification-value {
  color: var(--verification-invalid-color);
}

.is-revoked .ob-badge-verification-value {
  color: var(--verification-invalid-color);
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}
</style>
