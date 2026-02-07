<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { useBadgeIssuer } from "@composables/useBadgeIssuer";
import type { OB2 } from "@/types";
import { createIRI } from "@/utils/type-helpers";

interface Props {
  initialBadgeClass?: Partial<OB2.BadgeClass>;
  initialRecipientEmail?: string;
  /** Debounce duration (ms) for update event emissions */
  updateDebounceMs?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialBadgeClass: () => ({}),
  initialRecipientEmail: "",
  updateDebounceMs: 300,
});

const emit = defineEmits<{
  (e: "badge-issued", assertion: OB2.Assertion): void;
  (e: "reset"): void;
  (e: "update", payload: { badge: Partial<OB2.BadgeClass> }): void;
}>();

// Use the badge issuer composable
const { state, resetForm: resetIssuerForm, issueBadge } = useBadgeIssuer();

// Initialize with props if provided
if (props.initialBadgeClass) {
  Object.assign(state.badgeClass, props.initialBadgeClass);
}
if (props.initialRecipientEmail) {
  state.recipientEmail = props.initialRecipientEmail;
}

// Debounced update emission for live preview
const updateTimer = ref<ReturnType<typeof setTimeout> | undefined>(undefined);
const emitUpdate = () => {
  emit("update", { badge: { ...state.badgeClass } });
};
const scheduleEmitUpdate = () => {
  if (updateTimer.value) {
    clearTimeout(updateTimer.value);
  }
  updateTimer.value = setTimeout(emitUpdate, props.updateDebounceMs);
};
onBeforeUnmount(() => {
  if (updateTimer.value) {
    clearTimeout(updateTimer.value);
    updateTimer.value = undefined;
  }
});

// Helper refs for form fields that need special handling
const tagsInput = ref("");
const criteriaText = ref("");
const issuerName = ref("");
const issuerUrl = ref("");
const badgeImageUrl = ref("");

// Initialize from badge class if available
if (state.badgeClass.tags && state.badgeClass.tags.length > 0) {
  tagsInput.value = state.badgeClass.tags.join(", ");
}
if (
  state.badgeClass.criteria &&
  typeof state.badgeClass.criteria === "object" &&
  "narrative" in state.badgeClass.criteria
) {
  criteriaText.value = state.badgeClass.criteria.narrative as string;
}
if (typeof state.badgeClass.issuer === "object") {
  issuerName.value = state.badgeClass.issuer.name || "";
  issuerUrl.value = state.badgeClass.issuer.url || "";
} else if (typeof state.badgeClass.issuer === "string") {
  // If issuer is a string (URL), we'll need to fetch it or allow user to enter details
  issuerName.value = "Unknown Issuer";
}

// Handle badge image which could be a string or an object with an id field
if (state.badgeClass.image) {
  if (typeof state.badgeClass.image === "string") {
    badgeImageUrl.value = state.badgeClass.image;
  } else if (
    typeof state.badgeClass.image === "object" &&
    "id" in state.badgeClass.image
  ) {
    badgeImageUrl.value = state.badgeClass.image.id as string;
  }
}

// Watch for changes in the form fields and update the badge class
watch(tagsInput, (newValue) => {
  if (newValue.trim()) {
    state.badgeClass.tags = newValue
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  } else {
    state.badgeClass.tags = [];
  }
  scheduleEmitUpdate();
});

watch(criteriaText, (newValue) => {
  if (!state.badgeClass.criteria) {
    state.badgeClass.criteria = { narrative: "" };
  }

  if (typeof state.badgeClass.criteria === "object") {
    (state.badgeClass.criteria as OB2.Criteria).narrative = newValue;
  } else {
    // If criteria is an IRI, replace it with an object
    state.badgeClass.criteria = { narrative: newValue };
  }
  scheduleEmitUpdate();
});

watch([issuerName, issuerUrl], ([newName, newUrl]) => {
  if (typeof state.badgeClass.issuer !== "object") {
    state.badgeClass.issuer = {
      id: createIRI(state.badgeClass.id.replace(/\/badge\/.*$/, "/issuer")),
      type: "Profile",
      name: "",
    };
  }

  // Ensure issuer is an object before setting properties
  if (typeof state.badgeClass.issuer === "object") {
    (state.badgeClass.issuer as OB2.Profile).name = newName;
    if (newUrl) {
      (state.badgeClass.issuer as OB2.Profile).url = createIRI(newUrl);
    }
  }
  scheduleEmitUpdate();
});

// Watch for changes in the badge image URL and update the badge class
watch(badgeImageUrl, (newValue) => {
  if (newValue) {
    // Create an Image object with the URL as the id
    state.badgeClass.image = {
      id: createIRI(newValue),
      type: "Image",
    };
  } else {
    // If image is required, provide a default empty image instead of undefined
    state.badgeClass.image = {
      id: createIRI(""),
      type: "Image",
    };
  }
  scheduleEmitUpdate();
});
// Watch name and description changes to emit updates
watch(
  () => state.badgeClass.name,
  () => scheduleEmitUpdate(),
);

watch(
  () => state.badgeClass.description,
  () => scheduleEmitUpdate(),
);

// Check if a specific field has an error
const hasError = (field: string): boolean => {
  return state.errors.some((error) =>
    error.toLowerCase().includes(field.toLowerCase()),
  );
};

// Handle form submission
const handleSubmit = async () => {
  const assertion = await issueBadge();
  if (assertion) {
    emit("badge-issued", assertion);
  }
};

// Reset the form
const resetForm = () => {
  resetIssuerForm();
  tagsInput.value = "";
  criteriaText.value = "";
  issuerName.value = "";
  issuerUrl.value = "";
  badgeImageUrl.value = "";
  emit("reset");
};
</script>

<template>
  <div class="ob-badge-issuer-form">
    <form novalidate @submit.prevent="handleSubmit">
      <fieldset class="ob-badge-issuer-form__section">
        <legend class="ob-badge-issuer-form__section-title">
          Badge Information
        </legend>

        <!-- Badge Name -->
        <div class="ob-badge-issuer-form__field">
          <label for="badge-name" class="ob-badge-issuer-form__label"
            >Badge Name *</label
          >
          <input
            id="badge-name"
            v-model="state.badgeClass.name"
            type="text"
            class="ob-badge-issuer-form__input"
            :class="{ 'ob-badge-issuer-form__input--error': hasError('name') }"
            required
            aria-describedby="badge-name-error"
          />
          <div
            v-if="hasError('name')"
            id="badge-name-error"
            class="ob-badge-issuer-form__error"
            role="alert"
          >
            Badge name is required
          </div>
        </div>

        <!-- Badge Description -->
        <div class="ob-badge-issuer-form__field">
          <label for="badge-description" class="ob-badge-issuer-form__label"
            >Description *</label
          >
          <textarea
            id="badge-description"
            v-model="state.badgeClass.description"
            class="ob-badge-issuer-form__textarea"
            :class="{
              'ob-badge-issuer-form__input--error': hasError('description'),
            }"
            rows="3"
            required
            aria-describedby="badge-description-error"
          />
          <div
            v-if="hasError('description')"
            id="badge-description-error"
            class="ob-badge-issuer-form__error"
            role="alert"
          >
            Badge description is required
          </div>
        </div>

        <!-- Badge Image URL -->
        <div class="ob-badge-issuer-form__field">
          <label for="badge-image" class="ob-badge-issuer-form__label"
            >Image URL *</label
          >
          <input
            id="badge-image"
            v-model="badgeImageUrl"
            type="url"
            class="ob-badge-issuer-form__input"
            :class="{ 'ob-badge-issuer-form__input--error': hasError('image') }"
            placeholder="https://example.com/badge-image.png"
            required
            aria-describedby="badge-image-error badge-image-help"
          />
          <div
            v-if="hasError('image')"
            id="badge-image-error"
            class="ob-badge-issuer-form__error"
            role="alert"
          >
            Valid badge image URL is required
          </div>
          <div id="badge-image-help" class="ob-badge-issuer-form__help">
            Provide a URL to an image for this badge (PNG, SVG, or JPEG
            recommended)
          </div>
        </div>

        <!-- Badge Criteria -->
        <div class="ob-badge-issuer-form__field">
          <label for="badge-criteria" class="ob-badge-issuer-form__label"
            >Criteria</label
          >
          <textarea
            id="badge-criteria"
            v-model="criteriaText"
            class="ob-badge-issuer-form__textarea"
            rows="3"
            placeholder="Describe what someone must do to earn this badge"
          />
        </div>

        <!-- Badge Tags -->
        <div class="ob-badge-issuer-form__field">
          <label for="badge-tags" class="ob-badge-issuer-form__label"
            >Tags</label
          >
          <input
            id="badge-tags"
            v-model="tagsInput"
            type="text"
            class="ob-badge-issuer-form__input"
            placeholder="Enter comma-separated tags"
            aria-describedby="badge-tags-help"
          />
          <div id="badge-tags-help" class="ob-badge-issuer-form__help">
            Optional: Add comma-separated tags to help categorize this badge
          </div>
        </div>
      </fieldset>

      <fieldset class="ob-badge-issuer-form__section">
        <legend class="ob-badge-issuer-form__section-title">
          Issuer Information
        </legend>

        <!-- Issuer Name -->
        <div class="ob-badge-issuer-form__field">
          <label for="issuer-name" class="ob-badge-issuer-form__label"
            >Issuer Name *</label
          >
          <input
            id="issuer-name"
            v-model="issuerName"
            type="text"
            class="ob-badge-issuer-form__input"
            :class="{
              'ob-badge-issuer-form__input--error': hasError('issuer'),
            }"
            required
            aria-describedby="issuer-name-error"
          />
          <div
            v-if="hasError('issuer')"
            id="issuer-name-error"
            class="ob-badge-issuer-form__error"
            role="alert"
          >
            Issuer name is required
          </div>
        </div>

        <!-- Issuer URL -->
        <div class="ob-badge-issuer-form__field">
          <label for="issuer-url" class="ob-badge-issuer-form__label"
            >Issuer URL</label
          >
          <input
            id="issuer-url"
            v-model="issuerUrl"
            type="url"
            class="ob-badge-issuer-form__input"
            placeholder="https://example.org"
          />
        </div>
      </fieldset>

      <fieldset class="ob-badge-issuer-form__section">
        <legend class="ob-badge-issuer-form__section-title">
          Recipient Information
        </legend>

        <!-- Recipient Email -->
        <div class="ob-badge-issuer-form__field">
          <label for="recipient-email" class="ob-badge-issuer-form__label"
            >Recipient Email *</label
          >
          <input
            id="recipient-email"
            v-model="state.recipientEmail"
            type="email"
            class="ob-badge-issuer-form__input"
            :class="{
              'ob-badge-issuer-form__input--error': hasError('recipient'),
            }"
            required
            aria-describedby="recipient-email-error"
          />
          <div
            v-if="hasError('recipient')"
            id="recipient-email-error"
            class="ob-badge-issuer-form__error"
            role="alert"
          >
            Valid recipient email is required
          </div>
        </div>
      </fieldset>

      <!-- Form Actions -->
      <div class="ob-badge-issuer-form__actions">
        <button
          type="button"
          class="ob-badge-issuer-form__button ob-badge-issuer-form__button--secondary"
          :disabled="state.isSubmitting"
          @click="resetForm"
        >
          Reset
        </button>
        <button
          type="submit"
          class="ob-badge-issuer-form__button ob-badge-issuer-form__button--primary"
          :disabled="state.isSubmitting"
        >
          <span v-if="state.isSubmitting">Issuing...</span>
          <span v-else>Issue Badge</span>
        </button>
      </div>

      <!-- Form Errors -->
      <div
        v-if="state.errors.length > 0"
        class="ob-badge-issuer-form__errors"
        role="alert"
        aria-live="polite"
      >
        <p>Please correct the following errors:</p>
        <ul>
          <li v-for="(error, index) in state.errors" :key="index">
            {{ error }}
          </li>
        </ul>
      </div>

      <!-- Success Message -->
      <div
        v-if="state.success"
        class="ob-badge-issuer-form__success"
        role="status"
        aria-live="polite"
      >
        Badge successfully issued!
      </div>
    </form>
  </div>
</template>

<style>
.ob-badge-issuer-form {
  --form-border-color: var(--ob-form-border-color, var(--ob-border));
  --form-background: var(--ob-form-background, var(--ob-card));
  --form-text-color: var(--ob-form-text-color, var(--ob-foreground));
  --form-label-color: var(--ob-form-label-color, var(--ob-muted-foreground));
  --form-input-border: var(--ob-form-input-border, var(--ob-border));
  --form-input-focus: var(--ob-form-input-focus, var(--ob-primary));
  --form-error-color: var(--ob-form-error-color, var(--ob-error));
  --form-success-color: var(--ob-form-success-color, var(--ob-success));
  --form-help-color: var(--ob-form-help-color, var(--ob-muted-foreground));
  --form-button-primary-bg: var(
    --ob-form-button-primary-bg,
    var(--ob-highlight)
  );
  --form-button-primary-color: var(
    --ob-form-button-primary-color,
    var(--ob-highlight-foreground)
  );
  --form-button-secondary-bg: var(
    --ob-form-button-secondary-bg,
    var(--ob-muted)
  );
  --form-button-secondary-color: var(
    --ob-form-button-secondary-color,
    var(--ob-foreground)
  );
  --form-button-disabled-bg: var(--ob-form-button-disabled-bg, var(--ob-muted));
  --form-button-disabled-color: var(
    --ob-form-button-disabled-color,
    var(--ob-text-disabled)
  );

  max-width: 600px;
  margin: 0 auto;
  padding: var(--ob-space-6);
  background-color: var(--form-background);
  border: var(--ob-border-width-medium) solid var(--form-border-color);
  border-radius: var(--ob-border-radius-sm);
  box-shadow: var(--ob-shadow-hard-md);
  color: var(--form-text-color);
  font-family: var(--ob-font-family);
}

.ob-badge-issuer-form__section {
  margin-bottom: var(--ob-space-6);
  padding: 0;
  border: none;
}

.ob-badge-issuer-form__section-title {
  font-family: var(--ob-font-headline);
  font-size: var(--ob-font-size-xl);
  font-weight: var(--ob-font-weight-bold);
  letter-spacing: var(--ob-font-letterSpacing-tight);
  line-height: var(--ob-font-lineHeight-tight);
  margin-bottom: var(--ob-space-4);
  padding-bottom: var(--ob-space-2);
  border-bottom: var(--ob-border-width-medium) solid var(--form-border-color);
}

.ob-badge-issuer-form__field {
  margin-bottom: var(--ob-space-4);
}

.ob-badge-issuer-form__label {
  display: block;
  margin-bottom: var(--ob-space-1);
  font-weight: var(--ob-font-weight-medium);
  color: var(--form-label-color);
}

.ob-badge-issuer-form__input,
.ob-badge-issuer-form__textarea {
  width: 100%;
  padding: var(--ob-space-2) var(--ob-space-3);
  border: var(--ob-border-width-medium) solid var(--form-input-border);
  border-radius: var(--ob-border-radius-sm);
  font-size: var(--ob-font-size-md);
  line-height: var(--ob-line-height-normal);
  transition: border-color var(--ob-transition-fast) ease;
  color: var(--form-text-color);
  background: var(--ob-background);
}

.ob-badge-issuer-form__input:focus,
.ob-badge-issuer-form__textarea:focus {
  outline: none;
  border-color: var(--form-input-focus);
  box-shadow: var(--ob-shadow-focus);
}

.ob-badge-issuer-form__input--error {
  border-color: var(--form-error-color);
}

.ob-badge-issuer-form__error {
  color: var(--form-error-color);
  font-size: var(--ob-font-size-sm);
  margin-top: var(--ob-space-1);
}

.ob-badge-issuer-form__help {
  color: var(--form-help-color);
  font-size: var(--ob-font-size-sm);
  margin-top: var(--ob-space-1);
}

.ob-badge-issuer-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ob-space-3);
  margin-top: var(--ob-space-6);
}

.ob-badge-issuer-form__button {
  padding: var(--ob-space-2) var(--ob-space-4);
  border: var(--ob-border-width-medium) solid currentColor;
  border-radius: var(--ob-border-radius-sm);
  font-size: var(--ob-font-size-md);
  font-weight: var(--ob-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--ob-font-letterSpacing-wide);
  cursor: pointer;
  box-shadow: var(--ob-shadow-hard-sm);
  transition: background-color var(--ob-transition-fast) ease;
}

.ob-badge-issuer-form__button--primary {
  background-color: var(--form-button-primary-bg);
  color: var(--form-button-primary-color);
}

.ob-badge-issuer-form__button--primary:hover:not(:disabled) {
  background-color: var(--ob-primary-dark);
}

.ob-badge-issuer-form__button--secondary {
  background-color: var(--form-button-secondary-bg);
  color: var(--form-button-secondary-color);
}

.ob-badge-issuer-form__button--secondary:hover:not(:disabled) {
  background-color: var(--ob-gray-300);
}

.ob-badge-issuer-form__button:disabled {
  background-color: var(--form-button-disabled-bg);
  color: var(--form-button-disabled-color);
  cursor: not-allowed;
}

.ob-badge-issuer-form__errors {
  margin-top: var(--ob-space-6);
  padding: var(--ob-space-3);
  background-color: var(--ob-error-light);
  border: var(--ob-border-width) solid var(--ob-error-light);
  border-radius: var(--ob-border-radius-sm);
  color: var(--form-error-color);
}

.ob-badge-issuer-form__errors ul {
  margin: var(--ob-space-2) 0 0;
  padding-left: var(--ob-space-6);
}

.ob-badge-issuer-form__success {
  margin-top: var(--ob-space-6);
  padding: var(--ob-space-3);
  background-color: var(--ob-success-light);
  border: var(--ob-border-width) solid var(--ob-success-light);
  border-radius: var(--ob-border-radius-sm);
  color: var(--form-success-color);
  font-weight: var(--ob-font-weight-medium);
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .ob-badge-issuer-form {
    padding: var(--ob-space-4);
  }

  .ob-badge-issuer-form__actions {
    flex-direction: column;
  }

  .ob-badge-issuer-form__button {
    width: 100%;
  }
}
</style>
