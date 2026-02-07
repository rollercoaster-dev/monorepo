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

// Computed classes for content density
const densityClass = computed(() => {
  return `ob-badge-display--density-${props.contentDensity}`;
});
</script>

<template>
  <div
    class="ob-badge-display"
    :class="[densityClass, { 'is-interactive': interactive }]"
    :role="interactive ? 'button' : 'article'"
    :tabindex="interactive ? 0 : undefined"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="ob-badge-display__image">
      <img
        :src="normalizedBadge.image"
        :alt="generateAltText(normalizedBadge.name)"
        class="ob-badge-display__img"
      />
    </div>
    <div class="ob-badge-display__content">
      <h3 class="ob-badge-display__title">
        {{ normalizedBadge.name }}
      </h3>
      <p
        v-if="showDescription && !simplifiedView"
        class="ob-badge-display__description"
      >
        {{ normalizedBadge.description }}
      </p>
      <div v-if="!simplifiedView" class="ob-badge-display__issuer">
        <span>Issued by: {{ normalizedBadge.issuer.name }}</span>
      </div>
      <div
        v-if="showRecipient && normalizedBadge.recipient && !simplifiedView"
        class="ob-badge-display__recipient"
        role="region"
        aria-label="Recipient information"
      >
        <span
          v-if="normalizedBadge.recipient.name"
          class="ob-badge-display__recipient-name"
          aria-label="Recipient name"
        >
          Awarded to: {{ normalizedBadge.recipient.name }}
        </span>
        <span
          v-if="normalizedBadge.recipient.email"
          class="ob-badge-display__recipient-email"
          aria-label="Recipient email address"
        >
          Email: {{ normalizedBadge.recipient.email }}
        </span>
        <span
          v-if="normalizedBadge.recipient.role"
          class="ob-badge-display__recipient-role"
          aria-label="Recipient role"
        >
          Role: {{ normalizedBadge.recipient.role }}
        </span>
      </div>
      <div
        v-if="showIssuedDate && !simplifiedView"
        class="ob-badge-display__date"
      >
        <span>Issued: {{ formatDate(normalizedBadge.issuedOn) }}</span>
      </div>
      <div
        v-if="showExpiryDate && normalizedBadge.expires && !simplifiedView"
        class="ob-badge-display__expiry"
      >
        <span>Expires: {{ formatDate(normalizedBadge.expires) }}</span>
      </div>
      <div
        v-if="showVerification && !simplifiedView"
        class="ob-badge-display__verification-toggle"
      >
        <button
          class="ob-badge-display__verification-toggle-button"
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
        class="ob-badge-display__verification-container"
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
.ob-badge-display {
  --badge-border-color: var(--ob-badge-border-color, var(--ob-border));
  --badge-border-radius: var(
    --ob-badge-border-radius,
    var(--ob-border-radius-sm)
  );
  --badge-padding: var(--ob-badge-padding, var(--ob-space-4));
  --badge-background: var(--ob-badge-background, var(--ob-card));
  --badge-shadow: var(--ob-badge-shadow, var(--ob-shadow-hard-md));
  --badge-title-color: var(--ob-badge-title-color, var(--ob-foreground));
  --badge-text-color: var(--ob-badge-text-color, var(--ob-muted-foreground));
  --badge-hover-shadow: var(--ob-badge-hover-shadow, var(--ob-shadow-hard-lg));
  --badge-focus-outline-color: var(
    --ob-badge-focus-outline-color,
    var(--ob-primary)
  );

  display: flex;
  flex-direction: column;
  border: var(--ob-border-width-medium) solid var(--badge-border-color);
  border-radius: var(--badge-border-radius);
  padding: var(--badge-padding);
  background-color: var(--badge-background);
  box-shadow: var(--badge-shadow);
  transition: box-shadow var(--ob-transition-fast) ease;
  max-width: 300px;
  font-family: var(--ob-font-family);
  color: var(--badge-text-color);
}

.ob-badge-display.is-interactive {
  cursor: pointer;
}

.ob-badge-display.is-interactive:hover {
  box-shadow: var(--badge-hover-shadow);
}

.ob-badge-display.is-interactive:focus {
  outline: var(--ob-border-width-medium) solid var(--badge-focus-outline-color);
  outline-offset: var(--ob-border-offset);
}

.ob-badge-display__image {
  display: flex;
  justify-content: center;
  margin-bottom: var(--ob-space-3);
}

.ob-badge-display__img {
  max-width: 100%;
  height: auto;
  max-height: 150px;
  border-radius: var(--ob-border-radius-sm);
}

.ob-badge-display__content {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-2);
}

.ob-badge-display__title {
  margin: 0;
  font-family: var(--ob-font-headline);
  font-size: var(--ob-font-size-xl);
  font-weight: var(--ob-font-weight-bold);
  letter-spacing: var(--ob-font-letterSpacing-tight);
  line-height: var(--ob-font-lineHeight-tight);
  color: var(--badge-title-color);
}

.ob-badge-display__description {
  margin: 0;
  font-size: var(--ob-font-size-sm);
  color: var(--badge-text-color);
  line-height: var(--ob-line-height-normal);
}

.ob-badge-display__issuer {
  font-family: var(--ob-font-mono);
  font-size: var(--ob-font-size-xs);
  color: var(--ob-muted-foreground);
}

.ob-badge-display__date,
.ob-badge-display__expiry {
  font-family: var(--ob-font-mono);
  font-size: var(--ob-font-size-xs);
  color: var(--ob-muted-foreground);
}

.ob-badge-display__verification-toggle {
  font-size: var(--ob-font-size-xs);
  color: var(--badge-text-color);
}

.ob-badge-display__recipient {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-1);
  padding: var(--ob-space-2);
  background-color: var(--ob-bg-secondary);
  border-radius: var(--ob-border-radius-sm);
  border: var(--ob-border-width-medium) solid var(--ob-stroke-muted);
}

.ob-badge-display__recipient-name,
.ob-badge-display__recipient-email,
.ob-badge-display__recipient-role {
  font-family: var(--ob-font-mono);
  font-size: var(--ob-font-size-xs);
  color: var(--ob-muted-foreground);
}

.ob-badge-display__verification-toggle-button {
  background: none;
  border: none;
  color: var(--ob-primary);
  cursor: pointer;
  font-size: var(--ob-font-size-xs);
  padding: 0;
  text-decoration: underline;
}

.ob-badge-display__verification-toggle-button:hover {
  color: var(--ob-primary-dark);
}

.ob-badge-display__verification-container {
  margin-top: var(--ob-space-3);
  border-top: var(--ob-border-width-medium) solid var(--badge-border-color);
  padding-top: var(--ob-space-3);
}

/* Responsive adjustments */
@media (min-width: 640px) {
  .ob-badge-display {
    flex-direction: row;
    max-width: 500px;
  }

  .ob-badge-display__image {
    flex: 0 0 120px;
    margin-right: var(--ob-space-4);
    margin-bottom: 0;
  }

  .ob-badge-display__content {
    flex: 1;
  }
}

/* Content density styles */
.ob-badge-display.ob-badge-display--density-compact {
  padding: var(--ob-space-2);
  gap: var(--ob-space-1);
}
.ob-badge-display.ob-badge-display--density-normal {
  padding: var(--ob-space-4);
  gap: var(--ob-space-2);
}
.ob-badge-display.ob-badge-display--density-spacious {
  padding: var(--ob-space-6);
  gap: var(--ob-space-4);
}

.ob-badge-display:focus-visible,
.ob-badge-display.is-interactive:focus-visible {
  outline: var(--ob-badge-focus-outline-width, 3px) solid
    var(--ob-badge-focus-outline-color);
  outline-offset: var(--ob-space-1);
  box-shadow: var(--ob-shadow-focus);
}

.ob-badge-display__verification-toggle-button:focus-visible,
.ob-badge-display__verification-toggle-button:active {
  outline: var(--ob-border-width-medium) solid var(--ob-border-color-focus);
  background: var(--ob-warning-light);
}

.ob-badge-display__verification-toggle-button {
  transition:
    background var(--ob-transition-fast),
    color var(--ob-transition-fast);
}
</style>
