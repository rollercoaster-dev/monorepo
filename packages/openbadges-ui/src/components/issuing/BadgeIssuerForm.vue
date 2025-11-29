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
  <div class="manus-badge-issuer-form">
    <form novalidate @submit.prevent="handleSubmit">
      <fieldset class="manus-form-section">
        <legend class="manus-form-section-title">Badge Information</legend>

        <!-- Badge Name -->
        <div class="manus-form-field">
          <label for="badge-name" class="manus-form-label">Badge Name *</label>
          <input
            id="badge-name"
            v-model="state.badgeClass.name"
            type="text"
            class="manus-form-input"
            :class="{ 'manus-form-input-error': hasError('name') }"
            required
            aria-describedby="badge-name-error"
          />
          <div
            v-if="hasError('name')"
            id="badge-name-error"
            class="manus-form-error"
            role="alert"
          >
            Badge name is required
          </div>
        </div>

        <!-- Badge Description -->
        <div class="manus-form-field">
          <label for="badge-description" class="manus-form-label"
            >Description *</label
          >
          <textarea
            id="badge-description"
            v-model="state.badgeClass.description"
            class="manus-form-textarea"
            :class="{ 'manus-form-input-error': hasError('description') }"
            rows="3"
            required
            aria-describedby="badge-description-error"
          />
          <div
            v-if="hasError('description')"
            id="badge-description-error"
            class="manus-form-error"
            role="alert"
          >
            Badge description is required
          </div>
        </div>

        <!-- Badge Image URL -->
        <div class="manus-form-field">
          <label for="badge-image" class="manus-form-label">Image URL *</label>
          <input
            id="badge-image"
            v-model="badgeImageUrl"
            type="url"
            class="manus-form-input"
            :class="{ 'manus-form-input-error': hasError('image') }"
            placeholder="https://example.com/badge-image.png"
            required
            aria-describedby="badge-image-error badge-image-help"
          />
          <div
            v-if="hasError('image')"
            id="badge-image-error"
            class="manus-form-error"
            role="alert"
          >
            Valid badge image URL is required
          </div>
          <div id="badge-image-help" class="manus-form-help">
            Provide a URL to an image for this badge (PNG, SVG, or JPEG
            recommended)
          </div>
        </div>

        <!-- Badge Criteria -->
        <div class="manus-form-field">
          <label for="badge-criteria" class="manus-form-label">Criteria</label>
          <textarea
            id="badge-criteria"
            v-model="criteriaText"
            class="manus-form-textarea"
            rows="3"
            placeholder="Describe what someone must do to earn this badge"
          />
        </div>

        <!-- Badge Tags -->
        <div class="manus-form-field">
          <label for="badge-tags" class="manus-form-label">Tags</label>
          <input
            id="badge-tags"
            v-model="tagsInput"
            type="text"
            class="manus-form-input"
            placeholder="Enter comma-separated tags"
            aria-describedby="badge-tags-help"
          />
          <div id="badge-tags-help" class="manus-form-help">
            Optional: Add comma-separated tags to help categorize this badge
          </div>
        </div>
      </fieldset>

      <fieldset class="manus-form-section">
        <legend class="manus-form-section-title">Issuer Information</legend>

        <!-- Issuer Name -->
        <div class="manus-form-field">
          <label for="issuer-name" class="manus-form-label"
            >Issuer Name *</label
          >
          <input
            id="issuer-name"
            v-model="issuerName"
            type="text"
            class="manus-form-input"
            :class="{ 'manus-form-input-error': hasError('issuer') }"
            required
            aria-describedby="issuer-name-error"
          />
          <div
            v-if="hasError('issuer')"
            id="issuer-name-error"
            class="manus-form-error"
            role="alert"
          >
            Issuer name is required
          </div>
        </div>

        <!-- Issuer URL -->
        <div class="manus-form-field">
          <label for="issuer-url" class="manus-form-label">Issuer URL</label>
          <input
            id="issuer-url"
            v-model="issuerUrl"
            type="url"
            class="manus-form-input"
            placeholder="https://example.org"
          />
        </div>
      </fieldset>

      <fieldset class="manus-form-section">
        <legend class="manus-form-section-title">Recipient Information</legend>

        <!-- Recipient Email -->
        <div class="manus-form-field">
          <label for="recipient-email" class="manus-form-label"
            >Recipient Email *</label
          >
          <input
            id="recipient-email"
            v-model="state.recipientEmail"
            type="email"
            class="manus-form-input"
            :class="{ 'manus-form-input-error': hasError('recipient') }"
            required
            aria-describedby="recipient-email-error"
          />
          <div
            v-if="hasError('recipient')"
            id="recipient-email-error"
            class="manus-form-error"
            role="alert"
          >
            Valid recipient email is required
          </div>
        </div>
      </fieldset>

      <!-- Form Actions -->
      <div class="manus-form-actions">
        <button
          type="button"
          class="manus-button manus-button-secondary"
          :disabled="state.isSubmitting"
          @click="resetForm"
        >
          Reset
        </button>
        <button
          type="submit"
          class="manus-button manus-button-primary"
          :disabled="state.isSubmitting"
        >
          <span v-if="state.isSubmitting">Issuing...</span>
          <span v-else>Issue Badge</span>
        </button>
      </div>

      <!-- Form Errors -->
      <div
        v-if="state.errors.length > 0"
        class="manus-form-errors"
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
        class="manus-form-success"
        role="status"
        aria-live="polite"
      >
        Badge successfully issued!
      </div>
    </form>
  </div>
</template>

<style>
.manus-badge-issuer-form {
  --form-border-color: #e2e8f0;
  --form-background: #ffffff;
  --form-text-color: #1a202c;
  --form-label-color: #4a5568;
  --form-input-border: #cbd5e0;
  --form-input-focus: #3182ce;
  --form-error-color: #e53e3e;
  --form-success-color: #38a169;
  --form-help-color: #718096;
  --form-button-primary-bg: #3182ce;
  --form-button-primary-color: #ffffff;
  --form-button-secondary-bg: #e2e8f0;
  --form-button-secondary-color: #4a5568;
  --form-button-disabled-bg: #edf2f7;
  --form-button-disabled-color: #a0aec0;

  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background-color: var(--form-background);
  border: 1px solid var(--form-border-color);
  border-radius: 8px;
  color: var(--form-text-color);
}

.manus-form-section {
  margin-bottom: 24px;
  padding: 0;
  border: none;
}

.manus-form-section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--form-border-color);
}

.manus-form-field {
  margin-bottom: 16px;
}

.manus-form-label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: var(--form-label-color);
}

.manus-form-input,
.manus-form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--form-input-border);
  border-radius: 4px;
  font-size: 1rem;
  line-height: 1.5;
  transition: border-color 0.2s ease;
}

.manus-form-input:focus,
.manus-form-textarea:focus {
  outline: none;
  border-color: var(--form-input-focus);
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.2);
}

.manus-form-input-error {
  border-color: var(--form-error-color);
}

.manus-form-error {
  color: var(--form-error-color);
  font-size: 0.875rem;
  margin-top: 4px;
}

.manus-form-help {
  color: var(--form-help-color);
  font-size: 0.875rem;
  margin-top: 4px;
}

.manus-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.manus-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.manus-button-primary {
  background-color: var(--form-button-primary-bg);
  color: var(--form-button-primary-color);
}

.manus-button-primary:hover:not(:disabled) {
  background-color: #2c5282;
}

.manus-button-secondary {
  background-color: var(--form-button-secondary-bg);
  color: var(--form-button-secondary-color);
}

.manus-button-secondary:hover:not(:disabled) {
  background-color: #cbd5e0;
}

.manus-button:disabled {
  background-color: var(--form-button-disabled-bg);
  color: var(--form-button-disabled-color);
  cursor: not-allowed;
}

.manus-form-errors {
  margin-top: 24px;
  padding: 12px;
  background-color: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 4px;
  color: var(--form-error-color);
}

.manus-form-errors ul {
  margin: 8px 0 0;
  padding-left: 24px;
}

.manus-form-success {
  margin-top: 24px;
  padding: 12px;
  background-color: #f0fff4;
  border: 1px solid #c6f6d5;
  border-radius: 4px;
  color: var(--form-success-color);
  font-weight: 500;
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .manus-badge-issuer-form {
    padding: 16px;
  }

  .manus-form-actions {
    flex-direction: column;
  }

  .manus-button {
    width: 100%;
  }
}
</style>
