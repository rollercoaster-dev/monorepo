<script setup lang="ts">
import { computed, ref } from 'vue';
import type { OB2, OB3 } from '@/types';
import { BadgeService } from '@services/BadgeService';
import BadgeVerification from '@components/badges/BadgeVerification.vue';

interface Props {
  badge: OB2.Assertion | OB3.VerifiableCredential;
  showDescription?: boolean;
  showIssuedDate?: boolean;
  showExpiryDate?: boolean;
  interactive?: boolean;
  showVerification?: boolean;
  autoVerify?: boolean;
  // Neurodiversity enhancements
  contentDensity?: 'compact' | 'normal' | 'spacious';
  simplifiedView?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDescription: true,
  showIssuedDate: true,
  showExpiryDate: false,
  interactive: false,
  showVerification: false,
  autoVerify: false,
  contentDensity: 'normal',
  simplifiedView: false,
});

const emit = defineEmits<{
  (e: 'click', badge: OB2.Assertion | OB3.VerifiableCredential): void;
  (e: 'verified', isValid: boolean): void;
}>();

// Normalize the badge for display
const normalizedBadge = computed(() => {
  return BadgeService.normalizeBadge(props.badge);
});

// Format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (_e) {
    return dateString;
  }
};

// Generate accessible alt text for badge image
const generateAltText = (badgeName: string): string => {
  return `Badge: ${badgeName}`;
};

// Handle click events when badge is interactive
const handleClick = () => {
  if (props.interactive) {
    emit('click', props.badge);
  }
};

// Handle verification events
const handleVerified = (isValid: boolean) => {
  emit('verified', isValid);
};

// Control whether to show verification details
const showVerificationDetails = ref(false);

// Toggle verification details
const toggleVerificationDetails = () => {
  showVerificationDetails.value = !showVerificationDetails.value;
};

// Focus state for accessibility
const isFocused = ref(false);
const onFocus = () => { isFocused.value = true; };
const onBlur = () => { isFocused.value = false; };

// Computed classes for content density
const densityClass = computed(() => {
  return `density-${props.contentDensity}`;
});
</script>

<template>
  <div
    class="manus-badge-display"
    :class="[densityClass, { 'is-interactive': interactive }]"
    :tabindex="interactive ? 0 : undefined"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
    @focus="onFocus"
    @blur="onBlur"
  >
    <div class="manus-badge-image">
      <img
        :src="normalizedBadge.image"
        :alt="generateAltText(normalizedBadge.name)"
        class="manus-badge-img"
      >
    </div>
    <div class="manus-badge-content">
      <h3 class="manus-badge-title">
        {{ normalizedBadge.name }}
      </h3>
      <p
        v-if="showDescription && !simplifiedView"
        class="manus-badge-description"
      >
        {{ normalizedBadge.description }}
      </p>
      <div v-if="!simplifiedView" class="manus-badge-issuer">
        <span>Issued by: {{ normalizedBadge.issuer.name }}</span>
      </div>
      <div
        v-if="showIssuedDate && !simplifiedView"
        class="manus-badge-date"
      >
        <span>Issued: {{ formatDate(normalizedBadge.issuedOn) }}</span>
      </div>
      <div
        v-if="showExpiryDate && normalizedBadge.expires && !simplifiedView"
        class="manus-badge-expiry"
      >
        <span>Expires: {{ formatDate(normalizedBadge.expires) }}</span>
      </div>
      <div
        v-if="showVerification && !simplifiedView"
        class="manus-badge-verification-toggle"
      >
        <button
          class="manus-badge-verification-toggle-button"
          type="button"
          @click.stop="toggleVerificationDetails"
        >
          {{ showVerificationDetails ? 'Hide Verification Details' : 'Show Verification Details' }}
        </button>
      </div>
      <div
        v-if="showVerification && showVerificationDetails && !simplifiedView"
        class="manus-badge-verification-container"
      >
        <BadgeVerification
          :badge="badge"
          :auto-verify="autoVerify"
          @verified="handleVerified"
        />
      </div>
      <slot name="badge-actions" />
    </div>
  </div>
</template>

<style>
.manus-badge-display {
  --badge-border-color: #e2e8f0;
  --badge-border-radius: 8px;
  --badge-padding: 16px;
  --badge-background: #ffffff;
  --badge-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --badge-title-color: #1a202c;
  --badge-text-color: #4a5568;
  --badge-hover-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  --badge-focus-outline-color: #3182ce;

  display: flex;
  flex-direction: column;
  border: 1px solid var(--badge-border-color);
  border-radius: var(--badge-border-radius);
  padding: var(--badge-padding);
  background-color: var(--badge-background);
  box-shadow: var(--badge-shadow);
  transition: box-shadow 0.2s ease;
  max-width: 300px;
}

.manus-badge-display.is-interactive {
  cursor: pointer;
}

.manus-badge-display.is-interactive:hover {
  box-shadow: var(--badge-hover-shadow);
}

.manus-badge-display.is-interactive:focus {
  outline: 2px solid var(--badge-focus-outline-color);
  outline-offset: 2px;
}

.manus-badge-image {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.manus-badge-img {
  max-width: 100%;
  height: auto;
  max-height: 150px;
  border-radius: 4px;
}

.manus-badge-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manus-badge-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--badge-title-color);
}

.manus-badge-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--badge-text-color);
  line-height: 1.4;
}

.manus-badge-issuer,
.manus-badge-date,
.manus-badge-expiry,
.manus-badge-verification-toggle {
  font-size: 0.75rem;
  color: var(--badge-text-color);
}

.manus-badge-verification-toggle-button {
  background: none;
  border: none;
  color: #3182ce;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0;
  text-decoration: underline;
}

.manus-badge-verification-toggle-button:hover {
  color: #2c5282;
}

.manus-badge-verification-container {
  margin-top: 12px;
  border-top: 1px solid var(--badge-border-color);
  padding-top: 12px;
}

/* Responsive adjustments */
@media (min-width: 640px) {
  .manus-badge-display {
    flex-direction: row;
    max-width: 500px;
  }

  .manus-badge-image {
    flex: 0 0 120px;
    margin-right: 16px;
    margin-bottom: 0;
  }

  .manus-badge-content {
    flex: 1;
  }
}

/* Content density styles */
.manus-badge-display.density-compact {
  padding: 8px;
  gap: 4px;
}
.manus-badge-display.density-normal {
  padding: 16px;
  gap: 8px;
}
.manus-badge-display.density-spacious {
  padding: 28px;
  gap: 16px;
}

.manus-badge-display:focus-visible,
.manus-badge-display.is-interactive:focus-visible {
  outline: 3px solid #ff9800;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px #ffe0b2;
}

.manus-badge-verification-toggle-button:focus-visible,
.manus-badge-verification-toggle-button:active {
  outline: 2px solid #ff9800;
  background: #fff3e0;
}

.manus-badge-verification-toggle-button {
  transition: background 0.2s, color 0.2s;
}
</style>
