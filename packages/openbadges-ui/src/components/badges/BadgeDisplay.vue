<script setup lang="ts">
import { computed, ref } from "vue";
import type { OB2, OB3 } from "@/types";
import { BadgeService } from "@services/BadgeService";
import BadgeVerification from "@components/badges/BadgeVerification.vue";

interface Props {
  badge: OB2.Assertion | OB3.VerifiableCredential;
  showDescription?: boolean;
  showIssuedDate?: boolean;
  showExpiryDate?: boolean;
  showRecipient?: boolean;
  interactive?: boolean;
  showVerification?: boolean;
  autoVerify?: boolean;
  // Neurodiversity enhancements
  contentDensity?: "compact" | "normal" | "spacious";
  simplifiedView?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDescription: true,
  showIssuedDate: true,
  showExpiryDate: false,
  showRecipient: false,
  interactive: false,
  showVerification: false,
  autoVerify: false,
  contentDensity: "normal",
  simplifiedView: false,
});

const emit = defineEmits<{
  (e: "click", badge: OB2.Assertion | OB3.VerifiableCredential): void;
  (e: "verified", isValid: boolean): void;
}>();

// Normalize the badge for display
const normalizedBadge = computed(() => {
  return BadgeService.normalizeBadge(props.badge);
});

// Format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
    emit("click", props.badge);
  }
};

// Handle verification events
const handleVerified = (isValid: boolean) => {
  emit("verified", isValid);
};

// Control whether to show verification details
const showVerificationDetails = ref(false);

// Toggle verification details
const toggleVerificationDetails = () => {
  showVerificationDetails.value = !showVerificationDetails.value;
};

// Focus state for accessibility
const isFocused = ref(false);
const onFocus = () => {
  isFocused.value = true;
};
const onBlur = () => {
  isFocused.value = false;
};

// Computed classes for content density
const densityClass = computed(() => {
  return `density-${props.contentDensity}`;
});
</script>

<template>
  <div
    class="manus-badge-display"
    :class="[densityClass, { 'is-interactive': interactive }]"
    :role="interactive ? 'button' : 'article'"
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
      />
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
        v-if="showRecipient && normalizedBadge.recipient && !simplifiedView"
        class="manus-badge-recipient"
        role="region"
        aria-label="Recipient information"
      >
        <span
          v-if="normalizedBadge.recipient.name"
          class="manus-badge-recipient-name"
          aria-label="Recipient name"
        >
          Awarded to: {{ normalizedBadge.recipient.name }}
        </span>
        <span
          v-if="normalizedBadge.recipient.email"
          class="manus-badge-recipient-email"
          aria-label="Recipient email address"
        >
          Email: {{ normalizedBadge.recipient.email }}
        </span>
        <span
          v-if="normalizedBadge.recipient.role"
          class="manus-badge-recipient-role"
          aria-label="Recipient role"
        >
          Role: {{ normalizedBadge.recipient.role }}
        </span>
      </div>
      <div v-if="showIssuedDate && !simplifiedView" class="manus-badge-date">
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
          {{
            showVerificationDetails
              ? "Hide Verification Details"
              : "Show Verification Details"
          }}
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
  --badge-border-color: var(--ob-badge-border-color, var(--ob-border-color));
  --badge-border-radius: var(
    --ob-badge-border-radius,
    var(--ob-border-radius-lg)
  );
  --badge-padding: var(--ob-badge-padding, var(--ob-space-4));
  --badge-background: var(--ob-badge-background, var(--ob-bg-primary));
  --badge-shadow: var(--ob-badge-shadow, var(--ob-shadow-sm));
  --badge-title-color: var(--ob-badge-title-color, var(--ob-text-primary));
  --badge-text-color: var(--ob-badge-text-color, var(--ob-text-secondary));
  --badge-hover-shadow: var(--ob-badge-hover-shadow, var(--ob-shadow-md));
  --badge-focus-outline-color: var(
    --ob-badge-focus-outline-color,
    var(--ob-primary)
  );

  display: flex;
  flex-direction: column;
  border: 1px solid var(--badge-border-color);
  border-radius: var(--badge-border-radius);
  padding: var(--badge-padding);
  background-color: var(--badge-background);
  box-shadow: var(--badge-shadow);
  transition: box-shadow var(--ob-transition-fast) ease;
  max-width: 300px;
  font-family: var(--ob-font-family);
  color: var(--badge-text-color);
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
  margin-bottom: var(--ob-space-3);
}

.manus-badge-img {
  max-width: 100%;
  height: auto;
  max-height: 150px;
  border-radius: var(--ob-border-radius-sm);
}

.manus-badge-content {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-2);
}

.manus-badge-title {
  margin: 0;
  font-size: var(--ob-font-size-xl);
  font-weight: var(--ob-font-weight-semibold);
  color: var(--badge-title-color);
}

.manus-badge-description {
  margin: 0;
  font-size: var(--ob-font-size-sm);
  color: var(--badge-text-color);
  line-height: var(--ob-line-height-normal);
}

.manus-badge-issuer,
.manus-badge-date,
.manus-badge-expiry,
.manus-badge-verification-toggle {
  font-size: var(--ob-font-size-xs);
  color: var(--badge-text-color);
}

.manus-badge-recipient {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-1);
  padding: var(--ob-space-2);
  background-color: var(--ob-bg-secondary);
  border-radius: var(--ob-border-radius-sm);
  border: 1px solid var(--badge-border-color);
}

.manus-badge-recipient-name,
.manus-badge-recipient-email,
.manus-badge-recipient-role {
  font-size: var(--ob-font-size-xs);
  color: var(--badge-text-color);
}

.manus-badge-verification-toggle-button {
  background: none;
  border: none;
  color: var(--ob-primary);
  cursor: pointer;
  font-size: var(--ob-font-size-xs);
  padding: 0;
  text-decoration: underline;
}

.manus-badge-verification-toggle-button:hover {
  color: var(--ob-primary-dark);
}

.manus-badge-verification-container {
  margin-top: var(--ob-space-3);
  border-top: 1px solid var(--badge-border-color);
  padding-top: var(--ob-space-3);
}

/* Responsive adjustments */
@media (min-width: 640px) {
  .manus-badge-display {
    flex-direction: row;
    max-width: 500px;
  }

  .manus-badge-image {
    flex: 0 0 120px;
    margin-right: var(--ob-space-4);
    margin-bottom: 0;
  }

  .manus-badge-content {
    flex: 1;
  }
}

/* Content density styles */
.manus-badge-display.density-compact {
  padding: var(--ob-space-2);
  gap: var(--ob-space-1);
}
.manus-badge-display.density-normal {
  padding: var(--ob-space-4);
  gap: var(--ob-space-2);
}
.manus-badge-display.density-spacious {
  padding: var(--ob-space-6);
  gap: var(--ob-space-4);
}

.manus-badge-display:focus-visible,
.manus-badge-display.is-interactive:focus-visible {
  outline: var(--ob-badge-focus-outline-width, 3px) solid
    var(--ob-badge-focus-outline-color);
  outline-offset: var(--ob-space-1);
  box-shadow: var(--ob-shadow-focus);
}

.manus-badge-verification-toggle-button:focus-visible,
.manus-badge-verification-toggle-button:active {
  outline: 2px solid var(--ob-border-color-focus);
  background: var(--ob-warning-light);
}

.manus-badge-verification-toggle-button {
  transition:
    background var(--ob-transition-fast),
    color var(--ob-transition-fast);
}
</style>
