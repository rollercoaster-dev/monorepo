<script setup lang="ts">
import { computed, watch } from 'vue';
import type { OB2, OB3 } from '@/types';
import { useBadgeVerification } from '@composables/useBadgeVerification';
import { AccessibilityService } from '@services/AccessibilityService';

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
  (e: 'verified', isValid: boolean): void;
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
  emit('verified', result.isValid);
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
  { immediate: true }
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
    <div
      v-if="showStatus"
      class="ob-badge-verification-status"
    >
      <div
        v-if="isVerifying"
        class="ob-badge-verification-loading"
        role="status"
      >
        <span class="ob-visually-hidden">Verifying badge...</span>
        <div class="ob-badge-verification-spinner" />
      </div>

      <div
        v-else-if="hasBeenVerified"
        class="ob-badge-verification-result"
      >
        <div
          v-if="isValid"
          class="ob-badge-verification-valid"
        >
          <span class="ob-badge-verification-icon">✓</span>
          <span>Verified</span>
        </div>
        <div
          v-else
          class="ob-badge-verification-invalid"
        >
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
        {{ hasBeenVerified ? 'Verify Again' : 'Verify Badge' }}
      </button>
    </div>

    <div
      v-if="showDetails && hasBeenVerified"
      class="ob-badge-verification-details"
    >
      <div
        v-if="verificationMethod"
        class="ob-badge-verification-method"
      >
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
          {{ expirationStatus === 'expired' ? 'Expired' : 'Valid' }}
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
          {{ revocationStatus === 'revoked' ? 'Revoked' : 'Valid' }}
        </span>
      </div>

      <div
        v-if="errors.length > 0"
        class="ob-badge-verification-errors"
      >
        <h4 class="ob-badge-verification-section-title">
          Errors:
        </h4>
        <ul>
          <li
            v-for="(error, index) in errors"
            :key="index"
          >
            {{ error }}
          </li>
        </ul>
      </div>

      <div
        v-if="warnings.length > 0"
        class="ob-badge-verification-warnings"
      >
        <h4 class="ob-badge-verification-section-title">
          Warnings:
        </h4>
        <ul>
          <li
            v-for="(warning, index) in warnings"
            :key="index"
          >
            {{ warning }}
          </li>
        </ul>
      </div>

      <div
        v-if="showLastVerified && lastVerified"
        class="ob-badge-verification-timestamp"
      >
        <span class="ob-badge-verification-label">Last Verified:</span>
        <span class="ob-badge-verification-value">{{ formatDate(lastVerified) }}</span>
      </div>
    </div>
  </div>
</template>

<style>
.ob-badge-verification {
  --verification-border-color: #e2e8f0;
  --verification-background: #f7fafc;
  --verification-text-color: #4a5568;
  --verification-valid-color: #38a169;
  --verification-invalid-color: #e53e3e;
  --verification-warning-color: #dd6b20;
  --verification-button-bg: #4299e1;
  --verification-button-color: #ffffff;
  --verification-button-hover-bg: #3182ce;
  --verification-button-disabled-bg: #a0aec0;
  --verification-label-color: #718096;

  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--verification-border-color);
  border-radius: 0.375rem;
  background-color: var(--verification-background);
  color: var(--verification-text-color);
}

.ob-badge-verification-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
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
  margin-right: 0.25rem;
  font-weight: bold;
}

.ob-badge-verification-button {
  background-color: var(--verification-button-bg);
  color: var(--verification-button-color);
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.ob-badge-verification-button:hover:not(:disabled) {
  background-color: var(--verification-button-hover-bg);
}

.ob-badge-verification-button:disabled {
  background-color: var(--verification-button-disabled-bg);
  cursor: not-allowed;
}

.ob-badge-verification-details {
  margin-top: 1rem;
  border-top: 1px solid var(--verification-border-color);
  padding-top: 1rem;
}

.ob-badge-verification-method,
.ob-badge-verification-expiration,
.ob-badge-verification-revocation,
.ob-badge-verification-timestamp {
  margin-bottom: 0.5rem;
}

.ob-badge-verification-label {
  color: var(--verification-label-color);
  margin-right: 0.5rem;
  font-weight: 500;
}

.ob-badge-verification-errors,
.ob-badge-verification-warnings {
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

.ob-badge-verification-errors {
  color: var(--verification-invalid-color);
}

.ob-badge-verification-warnings {
  color: var(--verification-warning-color);
}

.ob-badge-verification-section-title {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.ob-badge-verification-errors ul,
.ob-badge-verification-warnings ul {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  padding-left: 1.5rem;
  font-size: 0.875rem;
}

.ob-badge-verification-loading {
  display: flex;
  align-items: center;
}

.ob-badge-verification-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--verification-button-bg);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;
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

/* Dark theme support */
.ob-dark-theme .ob-badge-verification {
  --verification-border-color: #2d3748;
  --verification-background: #1a202c;
  --verification-text-color: #e2e8f0;
  --verification-valid-color: #48bb78;
  --verification-invalid-color: #f56565;
  --verification-warning-color: #ed8936;
  --verification-button-bg: #4299e1;
  --verification-button-color: #ffffff;
  --verification-button-hover-bg: #3182ce;
  --verification-button-disabled-bg: #718096;
  --verification-label-color: #a0aec0;
}

/* High contrast theme support */
.ob-high-contrast-theme .ob-badge-verification {
  --verification-border-color: #000000;
  --verification-background: #ffffff;
  --verification-text-color: #000000;
  --verification-valid-color: #006400;
  --verification-invalid-color: #8b0000;
  --verification-warning-color: #b8860b;
  --verification-button-bg: #000000;
  --verification-button-color: #ffffff;
  --verification-button-hover-bg: #333333;
  --verification-button-disabled-bg: #666666;
  --verification-label-color: #000000;
}
</style>
